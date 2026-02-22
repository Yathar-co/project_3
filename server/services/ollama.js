const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b';
const TIMEOUT_MS = 60_000; // 60s — gemma3:1b is fast

/**
 * Check if Ollama is reachable
 */
export async function checkOllamaHealth() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(5000) });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Send a prompt to Ollama and get the response
 * @param {string} prompt - The full prompt to send
 * @returns {Promise<string>} Raw LLM response text
 */
export async function callOllama(prompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL,
                prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 2048,
                    top_p: 0.9
                }
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Ollama returned ${res.status}: ${errText}`);
        }

        const data = await res.json();
        return data.response || '';
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('Ollama request timed out after ' + (TIMEOUT_MS / 1000) + 's');
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Extract JSON from LLM response that may contain markdown fences or extra text
 * @param {string} text - Raw LLM output
 * @returns {object|null} Parsed JSON or null
 */
export function extractJSON(text) {
    if (!text) return null;

    // Try direct parse first
    try {
        return JSON.parse(text.trim());
    } catch { /* continue */ }

    // Try extracting from ```json ... ``` blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            return JSON.parse(jsonBlockMatch[1].trim());
        } catch { /* continue */ }
    }

    // Try finding the first { ... } block
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
        try {
            return JSON.parse(braceMatch[0]);
        } catch { /* continue */ }
    }

    return null;
}

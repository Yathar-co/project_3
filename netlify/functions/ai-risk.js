// Netlify Function: AI Risk Assessment via Groq
// Analyzes AI/ML systems against EU AI Act, NIST AI RMF, IEEE Ethically Aligned Design

const MAX_BODY_SIZE = 10_000;
const ALLOWED_FRAMEWORKS = ['EU AI Act', 'NIST AI RMF', 'ISO 42001', 'IEEE EAD'];
const ALLOWED_RISK_TIERS = ['Unacceptable', 'High', 'Limited', 'Minimal'];

function sanitize(str, maxLen = 120) {
    if (typeof str !== 'string') return '';
    return str.replace(/[\n\r\t]/g, ' ').replace(/[{}[\]"'`\\<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function sanitizeArray(arr, maxLen = 15) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, maxLen).map(v => sanitize(String(v), 80)).filter(Boolean);
}

function securityHeaders() {
    return { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store' };
}

export async function handler(event) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: securityHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
    if (event.body && event.body.length > MAX_BODY_SIZE) return { statusCode: 413, headers: securityHeaders(), body: JSON.stringify({ error: 'Request too large' }) };

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return { statusCode: 503, headers: securityHeaders(), body: JSON.stringify({ error: 'Service temporarily unavailable' }) };

    try {
        let body;
        try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid request' }) }; }

        const { system, framework } = body;
        if (!system || typeof system !== 'object') return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid request' }) };

        const systemName = sanitize(system.name, 100);
        const systemType = sanitize(system.type, 80);
        const purpose = sanitize(system.purpose, 300);
        const dataUsed = sanitizeArray(system.dataUsed || []);
        const fw = sanitize(framework, 50);

        if (!systemName) return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'System name required' }) };
        if (!fw) return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Framework required' }) };

        const prompt = `You are an AI governance and risk assessment expert.

Analyze the following AI/ML system for compliance and risk against ${fw}:
- System Name: ${systemName}
- Type: ${systemType || 'General AI'}
- Purpose: ${purpose || 'Not specified'}
- Training Data: ${dataUsed.join(', ') || 'Not specified'}

Return ONLY valid JSON:
{"system_name":"string","framework":"string","risk_tier":"Unacceptable|High|Limited|Minimal","risk_score":75,"summary":"2-3 sentence overall assessment","categories":[{"name":"category name","status":"PASS|WARN|FAIL","score":80,"finding":"what was found","recommendation":"specific action"}],"transparency_requirements":["list of required disclosures"],"human_oversight":"required level of human oversight"}

Analyze exactly 6 categories: Bias & Fairness, Data Quality, Transparency, Human Oversight, Safety & Robustness, Accountability. Be concise and factual.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are an AI governance expert. Return only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3, max_tokens: 2048, response_format: { type: 'json_object' }
            })
        });

        if (!res.ok) return { statusCode: 502, headers: securityHeaders(), body: JSON.stringify({ error: 'AI service temporarily unavailable' }) };

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '{}';
        let parsed;
        try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }

        if (!parsed) return { statusCode: 200, headers: securityHeaders(), body: JSON.stringify({ system_name: systemName, framework: fw, risk_tier: 'High', risk_score: 50, summary: 'Assessment could not be completed. Please retry.', categories: [], transparency_requirements: [], human_oversight: 'Required' }) };

        const VALID_STATUSES = ['PASS', 'WARN', 'FAIL'];
        const result = {
            system_name: typeof parsed.system_name === 'string' ? parsed.system_name.slice(0, 150) : systemName,
            framework: typeof parsed.framework === 'string' ? parsed.framework.slice(0, 50) : fw,
            risk_tier: ALLOWED_RISK_TIERS.includes(parsed.risk_tier) ? parsed.risk_tier : 'High',
            risk_score: typeof parsed.risk_score === 'number' ? Math.min(100, Math.max(0, Math.round(parsed.risk_score))) : 50,
            summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : 'Assessment completed.',
            categories: (Array.isArray(parsed.categories) ? parsed.categories : []).slice(0, 8).map(c => ({
                name: typeof c.name === 'string' ? c.name.slice(0, 100) : 'Unnamed',
                status: VALID_STATUSES.includes(c.status) ? c.status : 'WARN',
                score: typeof c.score === 'number' ? Math.min(100, Math.max(0, Math.round(c.score))) : 50,
                finding: typeof c.finding === 'string' ? c.finding.slice(0, 300) : 'Review needed',
                recommendation: typeof c.recommendation === 'string' ? c.recommendation.slice(0, 300) : 'Consult governance team'
            })),
            transparency_requirements: Array.isArray(parsed.transparency_requirements) ? parsed.transparency_requirements.slice(0, 10).map(t => typeof t === 'string' ? t.slice(0, 200) : '') : [],
            human_oversight: typeof parsed.human_oversight === 'string' ? parsed.human_oversight.slice(0, 200) : 'Review required'
        };

        return { statusCode: 200, headers: securityHeaders(), body: JSON.stringify(result) };
    } catch {
        return { statusCode: 500, headers: securityHeaders(), body: JSON.stringify({ error: 'Request could not be processed' }) };
    }
}

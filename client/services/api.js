// API service — calls Netlify Functions in production, local Express in dev
const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/.netlify/functions';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
    return data;
}

// AI endpoints (through Netlify Functions or local Express)
export async function runComplianceScan(payload) {
    return request(import.meta.env.DEV ? '/scan' : '/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function generateDocument(payload) {
    return request(import.meta.env.DEV ? '/docs/generate' : '/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

// Health check — only used in dev mode
export async function checkHealth() {
    if (!import.meta.env.DEV) return { status: 'ok', ollama: 'connected' };
    return request('/health');
}

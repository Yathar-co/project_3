// API service — calls Netlify Functions in production, local Express in dev
const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/.netlify/functions';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request could not be processed');
    return data;
}

// Compliance scan
export async function runComplianceScan(payload) {
    return request('/scan', { method: 'POST', body: JSON.stringify(payload) });
}

// Document generation
export async function generateDocument(payload) {
    return request(import.meta.env.DEV ? '/docs/generate' : '/generate', { method: 'POST', body: JSON.stringify(payload) });
}

// AI Risk Assessment
export async function runAIRiskAssessment(payload) {
    return request('/ai-risk', { method: 'POST', body: JSON.stringify(payload) });
}

// Data Classification
export async function classifyData(payload) {
    return request('/classify', { method: 'POST', body: JSON.stringify(payload) });
}

// Health check
export async function checkHealth() {
    if (!import.meta.env.DEV) return { status: 'ok' };
    return request('/health');
}

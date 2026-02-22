const API_BASE = '/api';

async function request(path, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(err.message || err.error || 'Request failed');
        }

        return await res.json();
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Is the backend running on port 3001?');
        }
        throw err;
    }
}

export async function checkHealth() {
    return request('/health');
}

export async function runComplianceScan(payload) {
    return request('/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getScanHistory() {
    return request('/scan/history');
}

export async function getScanById(id) {
    return request(`/scan/${id}`);
}

export async function generateDocument(payload) {
    return request('/docs/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getDocTypes() {
    return request('/docs/types');
}

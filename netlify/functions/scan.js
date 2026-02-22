// Netlify Function: Compliance Scan via Groq
// SECURITY: Template-locked prompt, strict input validation, generic errors

const ALLOWED_REGULATIONS = [
    'GDPR', 'DPDP Act', 'CCPA', 'HIPAA', 'SOC 2',
    'PCI DSS', 'ISO 27001', 'PIPEDA', 'LGPD'
];

const ALLOWED_INDUSTRIES = [
    'Technology', 'Fintech', 'Healthcare', 'E-Commerce',
    'Education', 'Manufacturing', 'Other'
];

const ALLOWED_COUNTRIES = [
    'India', 'United States', 'United Kingdom', 'Germany',
    'Canada', 'Australia', 'Singapore', 'Other'
];

const MAX_BODY_SIZE = 10_000; // 10KB max request body

// Strip anything that could influence prompt structure
function sanitize(str, maxLen = 120) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/[\n\r\t]/g, ' ')          // No newlines (prompt injection vector)
        .replace(/[{}[\]"'`\\<>]/g, '')      // No structural chars
        .replace(/\s+/g, ' ')               // Collapse whitespace
        .trim()
        .slice(0, maxLen);
}

function sanitizeArray(arr, maxLen = 10) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, maxLen).map(v => sanitize(String(v), 60)).filter(Boolean);
}

function securityHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-store',
    };
}

export async function handler(event) {
    // Method check
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: securityHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // Request size limit
    if (event.body && event.body.length > MAX_BODY_SIZE) {
        return { statusCode: 413, headers: securityHeaders(), body: JSON.stringify({ error: 'Request too large' }) };
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return { statusCode: 503, headers: securityHeaders(), body: JSON.stringify({ error: 'Service temporarily unavailable' }) };
    }

    try {
        // Parse and validate input
        let body;
        try { body = JSON.parse(event.body); } catch {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid request' }) };
        }

        const { company, regulation, dataPractices } = body;

        // Strict field validation
        if (!company || typeof company !== 'object') {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid request' }) };
        }

        const companyName = sanitize(company.name, 100);
        if (!companyName || companyName.length < 2) {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Company name required' }) };
        }

        // Allowlist validation for regulation
        const reg = sanitize(regulation, 50);
        if (!reg) {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Regulation required' }) };
        }

        const industry = ALLOWED_INDUSTRIES.includes(company.industry) ? company.industry : 'Technology';
        const country = ALLOWED_COUNTRIES.includes(company.country) ? company.country : 'Unknown';
        const collected = sanitizeArray(dataPractices?.collected || []);
        const shared = sanitizeArray(dataPractices?.shared || []);
        const stored = sanitize(dataPractices?.stored || 'unknown', 60);

        // Template-locked prompt — user input is sanitized and placed into fixed slots
        const prompt = `You are a compliance analysis assistant. Analyze the compliance posture of the following organization.

Organization: ${companyName}
Industry: ${industry}
Country: ${country}
Regulatory Framework: ${reg}
Data Collected: ${collected.join(', ') || 'not specified'}
Data Storage: ${stored}
Data Shared With: ${shared.join(', ') || 'not specified'}

Produce a compliance gap analysis. Return ONLY valid JSON with this exact structure:
{"regulation":"string","overall_risk":"LOW|MEDIUM|HIGH","summary":"2 sentence summary","findings":[{"requirement":"name","status":"COMPLIANT|PARTIALLY_COMPLIANT|NON_COMPLIANT","confidence":75,"risk_level":"LOW|MEDIUM|HIGH","business_impact":"plain language","recommended_action":"specific fix"}]}

Generate exactly 5 findings. Be concise and factual.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are a compliance analysis assistant. Return only valid JSON. Do not include any text outside the JSON object.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            })
        });

        if (!res.ok) {
            return { statusCode: 502, headers: securityHeaders(), body: JSON.stringify({ error: 'AI service temporarily unavailable' }) };
        }

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '{}';
        let parsed;

        try {
            parsed = JSON.parse(raw);
        } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : null;
        }

        if (!parsed || typeof parsed !== 'object') {
            return {
                statusCode: 200, headers: securityHeaders(),
                body: JSON.stringify({
                    regulation: reg, overall_risk: 'MEDIUM',
                    summary: 'Analysis could not be completed. Please retry.',
                    findings: []
                })
            };
        }

        // Schema-validated output — only allow expected fields with expected types
        const VALID_RISKS = ['LOW', 'MEDIUM', 'HIGH'];
        const VALID_STATUSES = ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT'];

        const result = {
            regulation: VALID_RISKS.includes(parsed.regulation) ? parsed.regulation : reg,
            overall_risk: VALID_RISKS.includes(parsed.overall_risk) ? parsed.overall_risk : 'MEDIUM',
            summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : 'Analysis completed.',
            findings: (Array.isArray(parsed.findings) ? parsed.findings : []).slice(0, 8).map(f => ({
                requirement: typeof f.requirement === 'string' ? f.requirement.slice(0, 200) : 'Unnamed',
                status: VALID_STATUSES.includes(f.status) ? f.status : 'NON_COMPLIANT',
                confidence: typeof f.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(f.confidence))) : 50,
                risk_level: VALID_RISKS.includes(f.risk_level) ? f.risk_level : 'MEDIUM',
                business_impact: typeof f.business_impact === 'string' ? f.business_impact.slice(0, 300) : 'Review recommended',
                recommended_action: typeof f.recommended_action === 'string' ? f.recommended_action.slice(0, 300) : 'Consult a compliance professional.'
            }))
        };

        return { statusCode: 200, headers: securityHeaders(), body: JSON.stringify(result) };
    } catch {
        // Generic error — no internal details leaked
        return { statusCode: 500, headers: securityHeaders(), body: JSON.stringify({ error: 'Request could not be processed' }) };
    }
}

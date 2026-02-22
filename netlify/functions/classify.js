// Netlify Function: Data Classification via Groq
// Classifies data types and flags sensitive data handling risks

const MAX_BODY_SIZE = 15_000;

function sanitize(str, maxLen = 120) {
    if (typeof str !== 'string') return '';
    return str.replace(/[\n\r\t]/g, ' ').replace(/[{}[\]"'`\\<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
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

        const { dataDescription, industry, regulation } = body;
        const desc = sanitize(dataDescription, 2000);
        const ind = sanitize(industry, 80);
        const reg = sanitize(regulation, 50);

        if (!desc || desc.length < 10) return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Data description required (minimum 10 characters)' }) };

        const prompt = `You are a data privacy and classification expert.

Analyze the following data description and classify the data types present. Identify sensitive data, PII, PHI, and financial data.

Industry: ${ind || 'Technology'}
Applicable Regulation: ${reg || 'General'}
Data Description: ${desc}

Return ONLY valid JSON:
{"total_fields_analyzed":10,"risk_level":"LOW|MEDIUM|HIGH|CRITICAL","summary":"2-3 sentence assessment","classifications":[{"field_name":"name of data field","category":"PII|PHI|Financial|Behavioral|Technical|Public","sensitivity":"PUBLIC|INTERNAL|CONFIDENTIAL|RESTRICTED","risk":"LOW|MEDIUM|HIGH|CRITICAL","handling":"specific handling requirement"}],"recommendations":["list of action items"],"applicable_regulations":["list of relevant regulations"]}

Identify 6-10 data fields from the description. Be specific and practical.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are a data classification expert. Return only valid JSON.' },
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

        if (!parsed) return { statusCode: 200, headers: securityHeaders(), body: JSON.stringify({ total_fields_analyzed: 0, risk_level: 'MEDIUM', summary: 'Classification could not be completed.', classifications: [], recommendations: [], applicable_regulations: [] }) };

        const VALID_RISKS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const VALID_CATS = ['PII', 'PHI', 'Financial', 'Behavioral', 'Technical', 'Public'];
        const VALID_SENS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

        const result = {
            total_fields_analyzed: typeof parsed.total_fields_analyzed === 'number' ? parsed.total_fields_analyzed : 0,
            risk_level: VALID_RISKS.includes(parsed.risk_level) ? parsed.risk_level : 'MEDIUM',
            summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : 'Classification completed.',
            classifications: (Array.isArray(parsed.classifications) ? parsed.classifications : []).slice(0, 15).map(c => ({
                field_name: typeof c.field_name === 'string' ? c.field_name.slice(0, 100) : 'Unknown',
                category: VALID_CATS.includes(c.category) ? c.category : 'Technical',
                sensitivity: VALID_SENS.includes(c.sensitivity) ? c.sensitivity : 'INTERNAL',
                risk: VALID_RISKS.includes(c.risk) ? c.risk : 'MEDIUM',
                handling: typeof c.handling === 'string' ? c.handling.slice(0, 200) : 'Review required'
            })),
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 10).map(r => typeof r === 'string' ? r.slice(0, 200) : '') : [],
            applicable_regulations: Array.isArray(parsed.applicable_regulations) ? parsed.applicable_regulations.slice(0, 10).map(r => typeof r === 'string' ? r.slice(0, 50) : '') : []
        };

        return { statusCode: 200, headers: securityHeaders(), body: JSON.stringify(result) };
    } catch {
        return { statusCode: 500, headers: securityHeaders(), body: JSON.stringify({ error: 'Request could not be processed' }) };
    }
}

// Netlify Function: Document Generation via Groq
// SECURITY: Template-locked prompts, strict allowlist, generic errors

const ALLOWED_DOC_TYPES = ['privacy_policy', 'data_retention_policy', 'incident_response_plan'];
const ALLOWED_REGULATIONS = ['GDPR', 'DPDP Act', 'CCPA', 'HIPAA', 'SOC 2', 'PCI DSS', 'ISO 27001'];
const MAX_BODY_SIZE = 5_000;

function sanitize(str, maxLen = 120) {
    if (typeof str !== 'string') return '';
    return str.replace(/[\n\r\t]/g, ' ').replace(/[{}[\]"'`\\<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
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
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: securityHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (event.body && event.body.length > MAX_BODY_SIZE) {
        return { statusCode: 413, headers: securityHeaders(), body: JSON.stringify({ error: 'Request too large' }) };
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return { statusCode: 503, headers: securityHeaders(), body: JSON.stringify({ error: 'Service temporarily unavailable' }) };
    }

    try {
        let body;
        try { body = JSON.parse(event.body); } catch {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid request' }) };
        }

        const { type, company, regulation } = body;

        // Strict allowlist for document type
        if (!ALLOWED_DOC_TYPES.includes(type)) {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid document type' }) };
        }

        if (!company || typeof company !== 'object') {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Invalid request' }) };
        }

        const companyName = sanitize(company.name, 100);
        const industry = sanitize(company.industry, 60);
        const country = sanitize(company.country, 60);
        const reg = sanitize(regulation, 50);

        if (!companyName || companyName.length < 2) {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Company name required' }) };
        }
        if (!reg) {
            return { statusCode: 400, headers: securityHeaders(), body: JSON.stringify({ error: 'Regulation required' }) };
        }

        const date = new Date().toISOString().split('T')[0];

        // Template-locked prompts — no user content can alter structure
        const PROMPT_TEMPLATES = {
            privacy_policy: {
                title: 'Privacy Policy',
                sections: 'Introduction, Data Collection, Data Usage, Data Sharing, User Rights'
            },
            data_retention_policy: {
                title: 'Data Retention Policy',
                sections: 'Purpose, Data Categories, Retention Periods, Deletion Procedures, Review Schedule'
            },
            incident_response_plan: {
                title: 'Incident Response Plan',
                sections: 'Detection, Containment, Notification, Recovery, Post-Incident Review'
            }
        };

        const template = PROMPT_TEMPLATES[type];

        const prompt = `You are a compliance document drafting assistant.

Generate a ${template.title} for the following organization:
- Organization: ${companyName}
- Industry: ${industry || 'Technology'}
- Country: ${country || 'Not specified'}
- Regulatory Framework: ${reg}
- Date: ${date}

Return ONLY valid JSON with this exact structure:
{"title":"${template.title}","company":"string","regulation":"string","last_updated":"${date}","sections":[{"heading":"string","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}

Include exactly 5 sections: ${template.sections}. Be concise and professional.`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are a compliance document drafting assistant. Return only valid JSON. Do not include text outside the JSON object.' },
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
        try { parsed = JSON.parse(raw); } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : null;
        }

        if (!parsed || typeof parsed !== 'object') {
            return {
                statusCode: 200, headers: securityHeaders(),
                body: JSON.stringify({
                    title: template.title, company: companyName, regulation: reg,
                    last_updated: date,
                    sections: [{ heading: 'Notice', content: 'Document generation failed. Please retry.' }],
                    disclaimer: 'Template only, not legal advice.'
                })
            };
        }

        // Schema-validated output
        const result = {
            title: typeof parsed.title === 'string' ? parsed.title.slice(0, 200) : template.title,
            company: typeof parsed.company === 'string' ? parsed.company.slice(0, 150) : companyName,
            regulation: typeof parsed.regulation === 'string' ? parsed.regulation.slice(0, 50) : reg,
            last_updated: date,
            sections: (Array.isArray(parsed.sections) ? parsed.sections : []).slice(0, 10).map(s => ({
                heading: typeof s.heading === 'string' ? s.heading.slice(0, 200) : 'Section',
                content: typeof s.content === 'string' ? s.content.slice(0, 2000) : ''
            })),
            disclaimer: 'Template only, not legal advice. Review with qualified counsel before use.'
        };

        return { statusCode: 200, headers: securityHeaders(), body: JSON.stringify(result) };
    } catch {
        return { statusCode: 500, headers: securityHeaders(), body: JSON.stringify({ error: 'Request could not be processed' }) };
    }
}

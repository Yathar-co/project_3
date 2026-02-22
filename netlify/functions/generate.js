// Netlify Function: Document Generation via Groq
export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_API_KEY not configured' }) };
    }

    try {
        const { type, company, regulation } = JSON.parse(event.body);
        const date = new Date().toISOString().split('T')[0];

        const prompts = {
            privacy_policy: `Generate a Privacy Policy for ${company.name} (${company.industry}, ${company.country}) under ${regulation}. Return ONLY JSON:
{"title":"Privacy Policy","company":"${company.name}","regulation":"${regulation}","last_updated":"${date}","sections":[{"heading":"title","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}
Include 5 sections: Introduction, Data Collection, Data Usage, Data Sharing, User Rights. Be concise.`,

            data_retention_policy: `Generate a Data Retention Policy for ${company.name} (${company.industry}, ${company.country}) under ${regulation}. Return ONLY JSON:
{"title":"Data Retention Policy","company":"${company.name}","regulation":"${regulation}","last_updated":"${date}","sections":[{"heading":"title","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}
Include 5 sections: Purpose, Data Categories, Retention Periods, Deletion Procedures, Review Schedule. Be concise.`,

            incident_response_plan: `Generate an Incident Response Plan for ${company.name} (${company.industry}, ${company.country}) under ${regulation}. Return ONLY JSON:
{"title":"Incident Response Plan","company":"${company.name}","regulation":"${regulation}","last_updated":"${date}","sections":[{"heading":"title","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}
Include 5 sections: Detection, Containment, Notification, Recovery, Post-Incident Review. Be concise.`
        };

        const prompt = prompts[type];
        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: `Unknown doc type: ${type}` }) };
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: 'json_object' }
            })
        });

        if (!res.ok) {
            const err = await res.text();
            return { statusCode: 502, body: JSON.stringify({ error: `Groq API error: ${err}` }) };
        }

        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content || '{}';
        let parsed;
        try { parsed = JSON.parse(raw); } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : null;
        }

        if (!parsed) {
            return {
                statusCode: 200, body: JSON.stringify({
                    title: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    company: company.name, regulation, last_updated: date,
                    sections: [{ heading: 'Notice', content: 'Could not generate document. Please retry.' }],
                    disclaimer: 'Template only.'
                })
            };
        }

        return { statusCode: 200, body: JSON.stringify(parsed) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
}

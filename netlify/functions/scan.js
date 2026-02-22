// Netlify Function: Compliance Scan via Groq
export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_API_KEY not configured' }) };
    }

    try {
        const { company, regulation, dataPractices, documents } = JSON.parse(event.body);
        const collected = JSON.stringify(dataPractices?.collected || []);
        const shared = JSON.stringify(dataPractices?.shared || []);

        const prompt = `Analyze compliance of "${company.name}" (${company.industry || 'tech'}, ${company.country || 'Unknown'}) against ${regulation}.

Data collected: ${collected}
Data stored: ${dataPractices?.stored || 'unknown'}
Data shared with: ${shared}
${documents ? `Documents: ${documents.substring(0, 500)}` : ''}

Return ONLY valid JSON, no other text:
{"regulation":"${regulation}","overall_risk":"LOW|MEDIUM|HIGH","summary":"2 sentences","findings":[{"requirement":"name","status":"COMPLIANT|PARTIALLY_COMPLIANT|NON_COMPLIANT","confidence":75,"risk_level":"LOW|MEDIUM|HIGH","business_impact":"plain language","recommended_action":"specific fix"}]}

Generate exactly 5 findings for the most critical requirements. Be concise.`;

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

        try {
            parsed = JSON.parse(raw);
        } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            parsed = match ? JSON.parse(match[0]) : null;
        }

        if (!parsed) {
            return {
                statusCode: 200, body: JSON.stringify({
                    regulation, overall_risk: 'HIGH',
                    summary: 'AI returned unparseable response. Please retry.',
                    findings: []
                })
            };
        }

        // Validate
        const validRisks = ['LOW', 'MEDIUM', 'HIGH'];
        const validStatuses = ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT'];
        const result = {
            regulation: parsed.regulation || regulation,
            overall_risk: validRisks.includes(parsed.overall_risk) ? parsed.overall_risk : 'MEDIUM',
            summary: parsed.summary || 'Analysis completed.',
            findings: (parsed.findings || []).slice(0, 8).map(f => ({
                requirement: f.requirement || 'Unnamed',
                status: validStatuses.includes(f.status) ? f.status : 'NON_COMPLIANT',
                confidence: typeof f.confidence === 'number' ? Math.min(100, Math.max(0, f.confidence)) : 50,
                risk_level: validRisks.includes(f.risk_level) ? f.risk_level : 'MEDIUM',
                business_impact: f.business_impact || 'Insufficient information',
                recommended_action: f.recommended_action || 'Consult a compliance professional.'
            }))
        };

        return { statusCode: 200, body: JSON.stringify(result) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
}

import { callOllama, extractJSON } from './ollama.js';

/**
 * Build a compact compliance prompt optimized for small models
 */
function buildCompliancePrompt(company, regulation, dataPractices, documents) {
    const collected = JSON.stringify(dataPractices?.collected || []);
    const shared = JSON.stringify(dataPractices?.shared || []);

    return `Analyze compliance of "${company.name}" (${company.industry || 'tech'}, ${company.country || 'Unknown'}) against ${regulation}.

Data collected: ${collected}
Data stored: ${dataPractices?.stored || 'unknown'}
Data shared with: ${shared}
${documents ? `Documents: ${documents.substring(0, 500)}` : ''}

Return ONLY valid JSON, no other text:
{"regulation":"${regulation}","overall_risk":"LOW|MEDIUM|HIGH","summary":"2 sentences","findings":[{"requirement":"name","status":"COMPLIANT|PARTIALLY_COMPLIANT|NON_COMPLIANT","confidence":75,"risk_level":"LOW|MEDIUM|HIGH","business_impact":"plain language","recommended_action":"specific fix"}]}

Generate exactly 5 findings for the most critical requirements. Be concise.`;
}

/**
 * Validate the compliance response JSON structure
 */
function validateResponse(data) {
    if (!data || typeof data !== 'object') return null;

    const validRisks = ['LOW', 'MEDIUM', 'HIGH'];
    const validStatuses = ['COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT'];

    const result = {
        regulation: data.regulation || 'Unknown',
        overall_risk: validRisks.includes(data.overall_risk) ? data.overall_risk : 'MEDIUM',
        summary: data.summary || 'Analysis completed. Review individual findings for details.',
        findings: []
    };

    if (Array.isArray(data.findings)) {
        result.findings = data.findings.slice(0, 8).map(f => ({
            requirement: f.requirement || 'Unnamed requirement',
            status: validStatuses.includes(f.status) ? f.status : 'NON_COMPLIANT',
            confidence: typeof f.confidence === 'number' ? Math.min(100, Math.max(0, f.confidence)) : 50,
            risk_level: validRisks.includes(f.risk_level) ? f.risk_level : 'MEDIUM',
            business_impact: f.business_impact || 'INSUFFICIENT_INFORMATION',
            recommended_action: f.recommended_action || 'Consult with a qualified compliance professional.'
        }));
    }

    return result;
}

/**
 * Run a compliance analysis
 */
export async function analyzeCompliance(company, regulation, dataPractices, documents) {
    const prompt = buildCompliancePrompt(company, regulation, dataPractices, documents);

    console.log(`[ComplianceEngine] Analyzing ${regulation} for ${company.name}...`);
    const startTime = Date.now();

    const rawResponse = await callOllama(prompt);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ComplianceEngine] Ollama responded in ${elapsed}s`);

    const parsed = extractJSON(rawResponse);

    if (!parsed) {
        console.warn('[ComplianceEngine] Failed to parse JSON from LLM. Returning fallback.');
        return {
            regulation,
            overall_risk: 'HIGH',
            summary: 'The AI model returned an unparseable response. Please try again.',
            findings: [{
                requirement: 'General Compliance Assessment',
                status: 'NON_COMPLIANT',
                confidence: 0,
                risk_level: 'HIGH',
                business_impact: 'Unable to determine compliance status.',
                recommended_action: 'Please retry the scan.'
            }],
            _meta: { raw_response: rawResponse.substring(0, 300), parse_error: true }
        };
    }

    const validated = validateResponse(parsed);
    validated._meta = {
        analyzed_at: new Date().toISOString(),
        model: 'gemma3:1b',
        response_time_seconds: parseFloat(elapsed)
    };

    return validated;
}

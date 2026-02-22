import { callOllama, extractJSON } from './ollama.js';

const DOC_TYPES = {
  privacy_policy: {
    label: 'Privacy Policy',
    prompt: (company, regulation) =>
      `Generate a Privacy Policy for ${company.name} (${company.industry}, ${company.country}) under ${regulation}. Return ONLY JSON:
{"title":"Privacy Policy","company":"${company.name}","regulation":"${regulation}","last_updated":"${new Date().toISOString().split('T')[0]}","sections":[{"heading":"title","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}
Include 5 sections: Introduction, Data Collection, Data Usage, Data Sharing, User Rights. Be concise.`
  },

  data_retention_policy: {
    label: 'Data Retention Policy',
    prompt: (company, regulation) =>
      `Generate a Data Retention Policy for ${company.name} (${company.industry}, ${company.country}) under ${regulation}. Return ONLY JSON:
{"title":"Data Retention Policy","company":"${company.name}","regulation":"${regulation}","last_updated":"${new Date().toISOString().split('T')[0]}","sections":[{"heading":"title","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}
Include 5 sections: Purpose, Data Categories, Retention Periods, Deletion Procedures, Review Schedule. Be concise.`
  },

  incident_response_plan: {
    label: 'Incident Response Plan',
    prompt: (company, regulation) =>
      `Generate an Incident Response Plan for ${company.name} (${company.industry}, ${company.country}) under ${regulation}. Return ONLY JSON:
{"title":"Incident Response Plan","company":"${company.name}","regulation":"${regulation}","last_updated":"${new Date().toISOString().split('T')[0]}","sections":[{"heading":"title","content":"paragraph"}],"disclaimer":"Template only, not legal advice."}
Include 5 sections: Detection, Containment, Notification, Recovery, Post-Incident Review. Be concise.`
  }
};

export async function generateDocument(type, company, regulation) {
  const docType = DOC_TYPES[type];
  if (!docType) {
    throw new Error(`Unknown document type: ${type}. Valid: ${Object.keys(DOC_TYPES).join(', ')}`);
  }

  console.log(`[DocumentGenerator] Generating ${docType.label} for ${company.name}...`);
  const startTime = Date.now();

  const prompt = docType.prompt(company, regulation);
  const rawResponse = await callOllama(prompt);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[DocumentGenerator] Generated in ${elapsed}s`);

  const parsed = extractJSON(rawResponse);

  if (!parsed) {
    return {
      title: docType.label,
      company: company.name,
      regulation,
      last_updated: new Date().toISOString().split('T')[0],
      sections: [{
        heading: 'Generation Notice',
        content: 'Document could not be generated. Please try again.'
      }],
      disclaimer: 'Template only, not legal advice.',
      _meta: { parse_error: true, response_time_seconds: parseFloat(elapsed) }
    };
  }

  parsed._meta = {
    generated_at: new Date().toISOString(),
    model: 'gemma3:1b',
    document_type: type,
    response_time_seconds: parseFloat(elapsed)
  };

  return parsed;
}

export function getAvailableDocTypes() {
  return Object.entries(DOC_TYPES).map(([key, val]) => ({
    key,
    label: val.label
  }));
}

import { generateDocument } from '../services/api.js';
import { saveDocument } from '../services/supabase.js';
let currentUser = null;

export function renderGenerator(container, user) {
  currentUser = user;
  container.innerHTML = `
    <div class="page-header animate-in"><h1>Document Generator</h1><p>Generate compliance policy documents with AI</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
      <div class="card animate-in">
        <div class="card-header"><h2 class="card-title">Configuration</h2></div>
        <div class="form-group"><label class="form-label">Document type *</label><select class="form-select" id="doc-type"><option value="">Select type...</option><option value="privacy_policy">Privacy Policy</option><option value="data_retention_policy">Data Retention Policy</option><option value="incident_response_plan">Incident Response Plan</option></select></div>
        <div class="form-group"><label class="form-label">Company name *</label><input type="text" class="form-input" id="gen-name" placeholder="Your company name"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Industry</label><select class="form-select" id="gen-ind"><option value="">Select...</option><option>Technology</option><option>Fintech</option><option>Healthcare</option><option>E-Commerce</option><option>Other</option></select></div>
          <div class="form-group"><label class="form-label">Country</label><select class="form-select" id="gen-country"><option value="">Select...</option><option>India</option><option value="United States">US</option><option value="United Kingdom">UK</option><option>Germany</option><option>Other</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Regulation *</label><select class="form-select" id="gen-reg"><option value="">Select...</option><option>GDPR</option><option>DPDP Act</option><option>CCPA</option><option>HIPAA</option><option>SOC 2</option><option>PCI DSS</option></select></div>
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--sp-3);" id="btn-gen">Generate document</button>
        <p style="margin-top:var(--sp-3);font-size:var(--font-xs);color:var(--text-4);">Templates only — review with legal counsel before use.</p>
      </div>
      <div class="animate-in" id="gen-preview"><div class="empty-state" style="margin-top:var(--sp-10);"><h3>Preview</h3><p>Configure and generate to see your document</p></div></div>
    </div>`;
  document.getElementById('btn-gen').addEventListener('click', handleGen);
}

async function handleGen() {
  const type = document.getElementById('doc-type').value, name = document.getElementById('gen-name').value.trim();
  const industry = document.getElementById('gen-ind').value, country = document.getElementById('gen-country').value;
  const regulation = document.getElementById('gen-reg').value;
  if (!type) return window.showToast('Select a document type', 'error');
  if (!name) return window.showToast('Company name is required', 'error');
  if (!regulation) return window.showToast('Select a regulation', 'error');

  const preview = document.getElementById('gen-preview'), btn = document.getElementById('btn-gen');
  btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Generating...';
  preview.innerHTML = '<div class="loading-container"><div class="spinner"></div><div class="loading-text">Drafting document...</div><div class="loading-subtext">5–15 seconds</div></div>';

  try {
    const doc = await generateDocument({ type, company: { name, industry, country }, regulation });
    if (currentUser) try { await saveDocument(currentUser.id, { type, title: doc.title, company_name: name, regulation, content: doc }); } catch (e) { console.warn(e); }
    renderPreview(preview, doc);
    window.showToast('Document generated', 'success');
  } catch (err) {
    preview.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-8);"><h3>Generation failed</h3><p style="font-size:var(--font-sm);color:var(--text-3);">${err.message}</p></div>`;
    window.showToast('Failed', 'error');
  } finally { btn.disabled = false; btn.textContent = 'Generate document'; }
}

function renderPreview(el, doc) {
  const sections = doc.sections || [];
  el.innerHTML = `<div class="doc-preview">
    <div class="doc-preview-header"><div><div class="doc-preview-title">${doc.title || 'Document'}</div><div style="font-size:var(--font-xs);color:var(--text-4);margin-top:2px;">${doc.company || ''} · ${doc.regulation || ''}</div></div>
    <div class="doc-preview-actions"><button class="btn btn-ghost" id="cp-doc">Copy</button><button class="btn btn-ghost" id="dl-doc">↓ Save</button></div></div>
    <div class="doc-preview-body">${sections.map(s => `<div class="doc-section"><h3>${s.heading}</h3><p>${s.content}</p></div>`).join('')}</div>
    ${doc.disclaimer ? `<div class="doc-disclaimer">${doc.disclaimer}</div>` : ''}</div>`;
  document.getElementById('cp-doc')?.addEventListener('click', () => { navigator.clipboard.writeText(sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')).then(() => window.showToast('Copied', 'success')); });
  document.getElementById('dl-doc')?.addEventListener('click', () => { const t = `${doc.title}\n\n${sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}\n\n---\n${doc.disclaimer || ''}`; const b = new Blob([t], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${(doc.title || 'doc').replace(/\s+/g, '-').toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(u); window.showToast('Saved', 'success'); });
}

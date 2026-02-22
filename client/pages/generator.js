import { generateDocument } from '../services/api.js';
import { saveDocument } from '../services/supabase.js';

let currentUser = null;

export function renderGenerator(container, user) {
  currentUser = user;
  container.innerHTML = `
    <div class="page-header animate-in"><h1>Doc Generator</h1><p>> generate compliance policy documents</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
      <div class="card animate-in" id="gen-form-card">
        <div class="card-header"><h2 class="card-title">Config</h2></div>
        <div class="form-group"><label class="form-label">Document Type *</label><select class="form-select" id="doc-type"><option value="">Select...</option><option value="privacy_policy">▤ Privacy Policy</option><option value="data_retention_policy">▤ Data Retention Policy</option><option value="incident_response_plan">▤ Incident Response Plan</option></select></div>
        <div class="form-group"><label class="form-label">Company *</label><input type="text" class="form-input" id="gen-company-name" placeholder="Company name"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Industry</label><select class="form-select" id="gen-industry"><option value="">Select...</option><option value="Technology">Technology</option><option value="Fintech">Fintech</option><option value="Healthcare">Healthcare</option><option value="E-Commerce">E-Commerce</option><option value="Other">Other</option></select></div>
          <div class="form-group"><label class="form-label">Country</label><select class="form-select" id="gen-country"><option value="">Select...</option><option value="India">India</option><option value="United States">US</option><option value="United Kingdom">UK</option><option value="Germany">Germany</option><option value="Other">Other</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Regulation *</label><select class="form-select" id="gen-regulation"><option value="">Select...</option><option value="GDPR">GDPR</option><option value="DPDP Act">DPDP Act</option><option value="CCPA">CCPA</option><option value="HIPAA">HIPAA</option><option value="SOC 2">SOC 2</option><option value="PCI DSS">PCI DSS</option></select></div>
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--sp-3);" id="btn-generate">◆ GENERATE</button>
        <p style="margin-top:var(--sp-3);font-family:var(--font-mono);font-size:9px;color:var(--text-tertiary);">[!] templates only. review with legal counsel.</p>
      </div>
      <div class="animate-in" id="gen-preview"><div class="empty-state" style="margin-top:var(--sp-10);"><div style="font-size:48px;opacity:0.15;margin-bottom:var(--sp-3);">▤</div><h3>Document Preview</h3><p>> configure and generate to preview</p></div></div>
    </div>`;
  document.getElementById('btn-generate').addEventListener('click', handleGenerate);
}

async function handleGenerate() {
  const type = document.getElementById('doc-type').value;
  const name = document.getElementById('gen-company-name').value.trim();
  const industry = document.getElementById('gen-industry').value;
  const country = document.getElementById('gen-country').value;
  const regulation = document.getElementById('gen-regulation').value;
  if (!type) return window.showToast('select doc type', 'error');
  if (!name) return window.showToast('company name required', 'error');
  if (!regulation) return window.showToast('select regulation', 'error');

  const preview = document.getElementById('gen-preview');
  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> GENERATING...';
  preview.innerHTML = '<div class="loading-container"><div class="spinner"></div><div class="loading-text">> drafting document...</div><div class="loading-subtext">~5-15 seconds</div></div>';

  try {
    const doc = await generateDocument({ type, company: { name, industry, country }, regulation });

    // Save to Supabase
    if (currentUser) {
      try { await saveDocument(currentUser.id, { type, title: doc.title, company_name: name, regulation, content: doc }); } catch (e) { console.warn('Failed to save doc:', e); }
    }

    renderDocPreview(preview, doc);
    window.showToast('document generated', 'success');
  } catch (err) {
    preview.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-8);"><div style="color:var(--neon-red);font-size:24px;margin-bottom:var(--sp-2);">✕</div><h3 style="font-family:var(--font-mono);">FAILED</h3><p style="font-family:var(--font-mono);font-size:var(--font-xs);color:var(--text-secondary);">${err.message}</p></div>`;
    window.showToast('generation failed', 'error');
  } finally { btn.disabled = false; btn.innerHTML = '◆ GENERATE'; }
}

function renderDocPreview(container, doc) {
  const sections = doc.sections || [];
  container.innerHTML = `<div class="doc-preview">
    <div class="doc-preview-header"><div><div class="doc-preview-title">${doc.title || 'Document'}</div><div style="font-family:var(--font-mono);font-size:9px;color:var(--text-tertiary);margin-top:2px;">${doc.company || ''} · ${doc.regulation || ''} · ${doc.last_updated || ''}</div></div>
    <div class="doc-preview-actions"><button class="btn btn-ghost" id="btn-copy-doc">COPY</button><button class="btn btn-ghost" id="btn-dl-doc">↓ SAVE</button></div></div>
    <div class="doc-preview-body">${sections.map(s => `<div class="doc-section"><h3>${s.heading}</h3><p>${s.content}</p></div>`).join('')}</div>
    ${doc.disclaimer ? `<div class="doc-disclaimer">[!] ${doc.disclaimer}</div>` : ''}</div>`;

  document.getElementById('btn-copy-doc')?.addEventListener('click', () => {
    const text = sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => window.showToast('copied', 'success'));
  });
  document.getElementById('btn-dl-doc')?.addEventListener('click', () => {
    const text = `${doc.title}\n${'='.repeat(doc.title?.length || 20)}\n\n${sections.map(s => `## ${s.heading}\n\n${s.content}`).join('\n\n')}\n\n---\n${doc.disclaimer || ''}`;
    const blob = new Blob([text], { type: 'text/plain' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${(doc.title || 'doc').replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click(); URL.revokeObjectURL(url); window.showToast('saved', 'success');
  });
}

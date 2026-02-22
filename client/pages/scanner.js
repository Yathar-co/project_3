import { runComplianceScan } from '../services/api.js';
import { saveScan } from '../services/supabase.js';

let currentStep = 0, currentUser = null;
const REGULATIONS = ['GDPR', 'DPDP Act', 'CCPA', 'HIPAA', 'SOC 2', 'PCI DSS', 'ISO 27001', 'PIPEDA', 'LGPD'];

export function renderScanner(container, user) {
  currentStep = 0; currentUser = user;
  container.innerHTML = `
    <div class="page-header animate-in"><h1>Compliance Scanner</h1><p>AI-powered regulatory gap analysis</p></div>
    <div class="steps-bar animate-in" id="steps-bar">
      <div class="step active" data-step="0"><span class="step-number">1</span><span>Company</span></div><div class="step-divider"></div>
      <div class="step" data-step="1"><span class="step-number">2</span><span>Regulation</span></div><div class="step-divider"></div>
      <div class="step" data-step="2"><span class="step-number">3</span><span>Data</span></div><div class="step-divider"></div>
      <div class="step" data-step="3"><span class="step-number">4</span><span>Review</span></div>
    </div>
    <div class="card animate-in" id="scanner-form-card">
      <div id="step-content"></div>
      <div style="display:flex;justify-content:space-between;margin-top:var(--sp-5);padding-top:var(--sp-4);border-top:1px solid var(--border-1);">
        <button class="btn btn-secondary" id="btn-prev" style="display:none;">← Back</button><div style="flex:1;"></div>
        <button class="btn btn-primary" id="btn-next">Next →</button>
      </div>
    </div>
    <div id="scan-results" style="display:none;"></div>`;
  renderStep();
  document.getElementById('btn-next').addEventListener('click', nextStep);
  document.getElementById('btn-prev').addEventListener('click', prevStep);
}

function renderStep() {
  const c = document.getElementById('step-content');
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  prev.style.display = currentStep > 0 ? 'inline-flex' : 'none';
  document.querySelectorAll('.step').forEach((el, i) => { el.classList.remove('active', 'completed'); if (i < currentStep) el.classList.add('completed'); if (i === currentStep) el.classList.add('active'); });
  const sd = window._sd || { company: {}, dp: {} };
  switch (currentStep) {
    case 0:
      next.textContent = 'Next →'; next.classList.remove('btn-lg');
      c.innerHTML = `<h3 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--sp-4);">Company details</h3>
        <div class="form-row"><div class="form-group"><label class="form-label">Company name *</label><input type="text" class="form-input" id="f-name" placeholder="Acme Corp" value="${sd.company.name || ''}"/></div>
        <div class="form-group"><label class="form-label">Industry *</label><select class="form-select" id="f-ind">${['', 'Technology', 'Fintech', 'Healthcare', 'E-Commerce', 'Education', 'Manufacturing', 'Other'].map(v => `<option value="${v}" ${sd.company.industry === v ? 'selected' : ''}>${v || 'Select...'}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Company size</label><select class="form-select" id="f-size">${['', '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map(v => `<option value="${v}" ${sd.company.size === v ? 'selected' : ''}>${v || 'Select...'}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Country *</label><select class="form-select" id="f-country">${['', 'India', 'United States', 'United Kingdom', 'Germany', 'Canada', 'Australia', 'Singapore', 'Other'].map(v => `<option value="${v}" ${sd.company.country === v ? 'selected' : ''}>${v || 'Select...'}</option>`).join('')}</select></div></div>`; break;
    case 1:
      next.textContent = 'Next →'; next.classList.remove('btn-lg');
      c.innerHTML = `<h3 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--sp-4);">Regulatory framework</h3>
        <div class="form-group"><label class="form-label">Framework *</label><select class="form-select" id="f-reg"><option value="">Select framework...</option>${REGULATIONS.map(r => `<option value="${r}" ${sd.regulation === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="form-group" style="margin-top:var(--sp-3);"><label class="form-label">Custom framework</label><input type="text" class="form-input" id="f-custom" placeholder="e.g., NIST CSF" value="${sd.customReg || ''}"/><p class="form-hint">Type a custom framework if not listed above</p></div>`; break;
    case 2:
      next.textContent = 'Next →'; next.classList.remove('btn-lg');
      c.innerHTML = `<h3 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--sp-4);">Data practices</h3>
        <div class="form-group"><label class="form-label">Data collected</label><input type="text" class="form-input" id="f-collected" placeholder="name, email, phone, payment info" value="${sd.dp.collected?.join(', ') || ''}"/><p class="form-hint">Comma-separated list</p></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Storage provider</label><input type="text" class="form-input" id="f-stored" placeholder="AWS, Supabase, etc." value="${sd.dp.stored || ''}"/></div>
        <div class="form-group"><label class="form-label">Shared with</label><input type="text" class="form-input" id="f-shared" placeholder="Partners, processors" value="${sd.dp.shared?.join(', ') || ''}"/></div></div>
        <div class="form-group"><label class="form-label">Documents (optional)</label><textarea class="form-textarea" id="f-docs" placeholder="Paste existing privacy policies, SOPs, or compliance docs...">${sd.docs || ''}</textarea></div>`; break;
    case 3:
      next.textContent = 'Run scan'; next.classList.add('btn-lg');
      const d = collectData();
      c.innerHTML = `<h3 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--sp-4);">Review & confirm</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);">
          <div class="card" style="padding:var(--sp-3);"><div class="card-title" style="margin-bottom:var(--sp-2);">Company</div><div style="font-weight:500;">${d.company.name || '—'}</div><div style="font-size:var(--font-xs);color:var(--text-4);">${d.company.industry || '—'} · ${d.company.country || '—'}</div></div>
          <div class="card" style="padding:var(--sp-3);"><div class="card-title" style="margin-bottom:var(--sp-2);">Regulation</div><div style="font-weight:500;">${d.regulation || '—'}</div></div>
          <div class="card" style="padding:var(--sp-3);grid-column:1/-1;"><div class="card-title" style="margin-bottom:var(--sp-2);">Data practices</div><div style="font-size:var(--font-sm);color:var(--text-2);">Collected: ${d.dp.collected?.join(', ') || '—'} · Stored: ${d.dp.stored || '—'} · Shared: ${d.dp.shared?.join(', ') || '—'}</div></div>
        </div>
        <p style="margin-top:var(--sp-3);font-size:var(--font-xs);color:var(--text-4);">This is a compliance readiness analysis, not legal advice.</p>`; break;
  }
}

function collectData() {
  if (!window._sd) window._sd = { company: {}, dp: {} };
  const s = window._sd, g = id => document.getElementById(id);
  if (g('f-name')) s.company.name = g('f-name').value.trim();
  if (g('f-ind')) s.company.industry = g('f-ind').value;
  if (g('f-size')) s.company.size = g('f-size').value;
  if (g('f-country')) s.company.country = g('f-country').value;
  if (g('f-reg')) s.regulation = g('f-reg').value;
  if (g('f-custom') && g('f-custom').value.trim()) { s.regulation = g('f-custom').value.trim(); s.customReg = g('f-custom').value.trim(); }
  if (g('f-collected')) s.dp.collected = g('f-collected').value.split(',').map(v => v.trim()).filter(Boolean);
  if (g('f-stored')) s.dp.stored = g('f-stored').value.trim();
  if (g('f-shared')) s.dp.shared = g('f-shared').value.split(',').map(v => v.trim()).filter(Boolean);
  if (g('f-docs')) s.docs = g('f-docs').value.trim();
  return s;
}

function nextStep() { collectData(); if (currentStep === 0 && !window._sd.company.name) return window.showToast('Company name is required', 'error'); if (currentStep === 1 && !window._sd.regulation) return window.showToast('Select a framework', 'error'); if (currentStep === 3) return runScan(); currentStep++; renderStep(); }
function prevStep() { collectData(); if (currentStep > 0) { currentStep--; renderStep(); } }

async function runScan() {
  document.getElementById('scanner-form-card').style.display = 'none'; document.getElementById('steps-bar').style.display = 'none';
  const r = document.getElementById('scan-results'); r.style.display = 'block';
  r.innerHTML = '<div class="loading-container"><div class="spinner"></div><div class="loading-text">Analyzing compliance posture...</div><div class="loading-subtext">This typically takes 5–15 seconds</div></div>';
  try {
    const sd = window._sd;
    const result = await runComplianceScan({ company: sd.company, regulation: sd.regulation, dataPractices: sd.dp, documents: sd.docs || undefined });
    if (currentUser) try { await saveScan(currentUser.id, { company: sd.company, regulation: sd.regulation, dataPractices: sd.dp }, result); } catch (e) { console.warn(e); }
    renderResults(r, result, sd);
    window.showToast('Scan complete', 'success');
  } catch (err) {
    r.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-12);"><h3 style="margin-bottom:var(--sp-2);">Scan failed</h3><p style="font-size:var(--font-sm);color:var(--text-3);margin-bottom:var(--sp-4);">${err.message}</p><button class="btn btn-primary" onclick="window.location.hash='#/scanner'">Try again</button></div>`;
    window.showToast('Scan failed: ' + err.message, 'error');
  }
  window._sd = null;
}

function renderResults(el, result, sd) {
  const rc = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' }, sc = { COMPLIANT: 'green', PARTIALLY_COMPLIANT: 'amber', NON_COMPLIANT: 'red' };
  const findings = result.findings || [];
  const hi = findings.filter(f => f.risk_level === 'HIGH').length, md = findings.filter(f => f.risk_level === 'MEDIUM').length, lo = findings.filter(f => f.risk_level === 'LOW').length;
  el.innerHTML = `
    <div class="page-header animate-in"><div style="display:flex;align-items:center;gap:var(--sp-3);"><h1>Scan Results</h1><span class="badge badge-${rc[result.overall_risk] || 'amber'}">${result.overall_risk} risk</span></div><p>${sd.company.name} · ${result.regulation}</p></div>
    <div class="card animate-in" style="margin-bottom:var(--sp-5);"><p style="font-size:var(--font-base);color:var(--text-2);line-height:1.7;">${result.summary}</p></div>
    <div class="risk-summary animate-in"><div class="risk-item high"><div class="risk-count">${hi}</div><div class="risk-label">High</div></div><div class="risk-item medium"><div class="risk-count">${md}</div><div class="risk-label">Medium</div></div><div class="risk-item low"><div class="risk-count">${lo}</div><div class="risk-label">Low</div></div></div>
    <div style="margin-bottom:var(--sp-3);"><h2 class="card-title">${findings.length} findings</h2></div>
    <div class="findings-list">${findings.map(f => { const cc = f.confidence >= 70 ? 'high' : f.confidence >= 40 ? 'medium' : 'low'; return `<div class="finding-card animate-in" onclick="this.classList.toggle('expanded')"><div class="finding-header"><span class="finding-title">${f.requirement}</span><div class="finding-meta"><span class="badge badge-${sc[f.status] || 'amber'}">${f.status?.replace('_', ' ')}</span><span class="badge badge-${rc[f.risk_level] || 'amber'}">${f.risk_level}</span></div></div><div class="finding-details"><div class="finding-detail-row"><span class="finding-detail-label">Confidence</span><span class="finding-detail-value"><div class="confidence-bar"><div class="confidence-track"><div class="confidence-fill ${cc}" style="width:${f.confidence}%;"></div></div><span>${f.confidence}%</span></div></span></div><div class="finding-detail-row"><span class="finding-detail-label">Impact</span><span class="finding-detail-value">${f.business_impact}</span></div><div class="finding-detail-row"><span class="finding-detail-label">Action</span><span class="finding-detail-value">${f.recommended_action}</span></div></div></div>`; }).join('')}</div>
    <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-8);"><button class="btn btn-primary" onclick="window.location.hash='#/scanner'">New scan</button><button class="btn btn-secondary" id="btn-dl">↓ Export JSON</button><a href="#/" class="btn btn-ghost">← Dashboard</a></div>`;
  document.getElementById('btn-dl')?.addEventListener('click', () => { const b = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `shield-scan-${sd.company.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(u); window.showToast('Downloaded', 'success'); });
}

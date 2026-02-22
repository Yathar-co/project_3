import { runComplianceScan } from '../services/api.js';
import { saveScan } from '../services/supabase.js';

let currentStep = 0;
let currentUser = null;

const REGULATIONS = ['GDPR', 'DPDP Act', 'CCPA', 'HIPAA', 'SOC 2', 'PCI DSS', 'ISO 27001', 'PIPEDA', 'LGPD'];

export function renderScanner(container, user) {
  currentStep = 0;
  currentUser = user;
  container.innerHTML = `
    <div class="page-header animate-in">
      <h1>Scanner</h1>
      <p>> ai-powered regulatory compliance gap analysis</p>
    </div>
    <div class="steps-bar animate-in" id="steps-bar">
      <div class="step active" data-step="0"><span class="step-number">1</span><span>Company</span></div>
      <div class="step-divider"></div>
      <div class="step" data-step="1"><span class="step-number">2</span><span>Regulation</span></div>
      <div class="step-divider"></div>
      <div class="step" data-step="2"><span class="step-number">3</span><span>Data</span></div>
      <div class="step-divider"></div>
      <div class="step" data-step="3"><span class="step-number">4</span><span>Scan</span></div>
    </div>
    <div class="card animate-in" id="scanner-form-card">
      <div id="step-content"></div>
      <div style="display:flex;justify-content:space-between;margin-top:var(--sp-5);padding-top:var(--sp-4);border-top:1px solid var(--border-dim);">
        <button class="btn btn-secondary" id="btn-prev" style="display:none;">← BACK</button>
        <div style="flex:1;"></div>
        <button class="btn btn-primary" id="btn-next">NEXT →</button>
      </div>
    </div>
    <div id="scan-results" style="display:none;"></div>
  `;
  renderStep();
  document.getElementById('btn-next').addEventListener('click', nextStep);
  document.getElementById('btn-prev').addEventListener('click', prevStep);
}

function renderStep() {
  const content = document.getElementById('step-content');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  prevBtn.style.display = currentStep > 0 ? 'inline-flex' : 'none';
  document.querySelectorAll('.step').forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i < currentStep) el.classList.add('completed');
    if (i === currentStep) el.classList.add('active');
  });
  const sd = window._scanData || { company: {}, dataPractices: {} };
  switch (currentStep) {
    case 0:
      nextBtn.textContent = 'NEXT →'; nextBtn.classList.remove('btn-lg');
      content.innerHTML = `<h3 style="font-family:var(--font-mono);margin-bottom:var(--sp-4);color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.06em;">Company Profile</h3>
        <div class="form-row"><div class="form-group"><label class="form-label">Company Name *</label><input type="text" class="form-input" id="company-name" placeholder="e.g., Acme Corp" value="${sd.company.name || ''}"/></div>
        <div class="form-group"><label class="form-label">Industry *</label><select class="form-select" id="company-industry">${['', 'Technology', 'Fintech', 'Healthcare', 'E-Commerce', 'Education', 'Manufacturing', 'Other'].map(i => `<option value="${i}" ${sd.company.industry === i ? 'selected' : ''}>${i || 'Select...'}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Size</label><select class="form-select" id="company-size">${['', '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'].map(s => `<option value="${s}" ${sd.company.size === s ? 'selected' : ''}>${s || 'Select...'}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Country *</label><select class="form-select" id="company-country">${['', 'India', 'United States', 'United Kingdom', 'Germany', 'Canada', 'Australia', 'Singapore', 'Other'].map(c => `<option value="${c}" ${sd.company.country === c ? 'selected' : ''}>${c || 'Select...'}</option>`).join('')}</select></div></div>`;
      break;
    case 1:
      nextBtn.textContent = 'NEXT →'; nextBtn.classList.remove('btn-lg');
      content.innerHTML = `<h3 style="font-family:var(--font-mono);margin-bottom:var(--sp-4);color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.06em;">Select Regulation</h3>
        <div class="form-group"><label class="form-label">Framework *</label><select class="form-select" id="regulation-select"><option value="">Choose...</option>${REGULATIONS.map(r => `<option value="${r}" ${sd.regulation === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        <div class="form-group" style="margin-top:var(--sp-3);"><label class="form-label">Or Custom</label><input type="text" class="form-input" id="regulation-custom" placeholder="e.g., NIST CSF" value="${sd.customRegulation || ''}"/><p class="form-hint">> type custom framework if not listed</p></div>`;
      break;
    case 2:
      nextBtn.textContent = 'NEXT →'; nextBtn.classList.remove('btn-lg');
      content.innerHTML = `<h3 style="font-family:var(--font-mono);margin-bottom:var(--sp-4);color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.06em;">Data Practices</h3>
        <div class="form-group"><label class="form-label">Data Collected</label><input type="text" class="form-input" id="data-collected" placeholder="name, email, phone" value="${sd.dataPractices.collected?.join(', ') || ''}"/><p class="form-hint">> comma-separated</p></div>
        <div class="form-row"><div class="form-group"><label class="form-label">Storage</label><input type="text" class="form-input" id="data-stored" placeholder="AWS, GCP" value="${sd.dataPractices.stored || ''}"/></div>
        <div class="form-group"><label class="form-label">Shared With</label><input type="text" class="form-input" id="data-shared" placeholder="processors" value="${sd.dataPractices.shared?.join(', ') || ''}"/></div></div>
        <div class="form-group"><label class="form-label">Documents (Optional)</label><textarea class="form-textarea" id="data-documents" placeholder="Paste existing policies...">${sd.documents || ''}</textarea></div>`;
      break;
    case 3:
      nextBtn.textContent = '◆ EXECUTE SCAN'; nextBtn.classList.add('btn-lg');
      const d = collectData();
      content.innerHTML = `<h3 style="font-family:var(--font-mono);margin-bottom:var(--sp-4);color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.06em;">Review & Confirm</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);">
        <div class="card" style="padding:var(--sp-3);"><div style="font-family:var(--font-mono);font-size:9px;color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sp-2);">Company</div><div style="font-family:var(--font-mono);font-weight:700;">${d.company.name || '—'}</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-tertiary);">${d.company.industry || '—'} · ${d.company.country || '—'}</div></div>
        <div class="card" style="padding:var(--sp-3);"><div style="font-family:var(--font-mono);font-size:9px;color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sp-2);">Regulation</div><div style="font-family:var(--font-mono);font-weight:700;">${d.regulation || '—'}</div></div>
        <div class="card" style="padding:var(--sp-3);grid-column:1/-1;"><div style="font-family:var(--font-mono);font-size:9px;color:var(--neon-mint);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:var(--sp-2);">Data</div><div style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);"><strong>Collected:</strong> ${d.dataPractices.collected?.join(', ') || '—'} · <strong>Stored:</strong> ${d.dataPractices.stored || '—'} · <strong>Shared:</strong> ${d.dataPractices.shared?.join(', ') || '—'}</div></div></div>
        <p style="margin-top:var(--sp-3);font-family:var(--font-mono);font-size:9px;color:var(--text-tertiary);">[!] compliance readiness analysis only. not legal advice.</p>`;
      break;
  }
}

function collectData() {
  if (!window._scanData) window._scanData = { company: {}, dataPractices: {} };
  const sd = window._scanData;
  const el = id => document.getElementById(id);
  if (el('company-name')) sd.company.name = el('company-name').value.trim();
  if (el('company-industry')) sd.company.industry = el('company-industry').value;
  if (el('company-size')) sd.company.size = el('company-size').value;
  if (el('company-country')) sd.company.country = el('company-country').value;
  if (el('regulation-select')) sd.regulation = el('regulation-select').value;
  if (el('regulation-custom') && el('regulation-custom').value.trim()) { sd.regulation = el('regulation-custom').value.trim(); sd.customRegulation = el('regulation-custom').value.trim(); }
  if (el('data-collected')) sd.dataPractices.collected = el('data-collected').value.split(',').map(s => s.trim()).filter(Boolean);
  if (el('data-stored')) sd.dataPractices.stored = el('data-stored').value.trim();
  if (el('data-shared')) sd.dataPractices.shared = el('data-shared').value.split(',').map(s => s.trim()).filter(Boolean);
  if (el('data-documents')) sd.documents = el('data-documents').value.trim();
  return sd;
}

function nextStep() {
  collectData();
  if (currentStep === 0 && !window._scanData.company.name) return window.showToast('Company name required', 'error');
  if (currentStep === 1 && !window._scanData.regulation) return window.showToast('Select a regulation', 'error');
  if (currentStep === 3) return runScan();
  currentStep++;
  renderStep();
}

function prevStep() { collectData(); if (currentStep > 0) { currentStep--; renderStep(); } }

async function runScan() {
  const formCard = document.getElementById('scanner-form-card');
  const stepsBar = document.getElementById('steps-bar');
  const resultsDiv = document.getElementById('scan-results');
  formCard.style.display = 'none';
  stepsBar.style.display = 'none';
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = `<div class="loading-container"><div class="spinner"></div><div class="loading-text">> analyzing compliance posture...</div><div class="loading-subtext">shield ai engine processing · ~5-15 seconds</div></div>`;

  try {
    const sd = window._scanData;
    const result = await runComplianceScan({ company: sd.company, regulation: sd.regulation, dataPractices: sd.dataPractices, documents: sd.documents || undefined });

    // Save to Supabase
    if (currentUser) {
      try { await saveScan(currentUser.id, sd, result); } catch (e) { console.warn('Failed to save scan:', e); }
    }

    renderResults(resultsDiv, result, sd);
    window.showToast('scan complete', 'success');
  } catch (err) {
    resultsDiv.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-12);"><div style="font-size:32px;margin-bottom:var(--sp-3);color:var(--neon-red);">✕</div><h3 style="font-family:var(--font-mono);margin-bottom:var(--sp-2);">SCAN FAILED</h3><p style="font-family:var(--font-mono);font-size:var(--font-xs);color:var(--text-secondary);margin-bottom:var(--sp-4);">${err.message}</p><button class="btn btn-primary" onclick="window.location.hash='#/scanner'">RETRY</button></div>`;
    window.showToast('scan failed: ' + err.message, 'error');
  }
  window._scanData = null;
}

function renderResults(container, result, scanData) {
  const rc = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };
  const sc = { COMPLIANT: 'green', PARTIALLY_COMPLIANT: 'amber', NON_COMPLIANT: 'red' };
  const findings = result.findings || [];
  const hi = findings.filter(f => f.risk_level === 'HIGH').length;
  const md = findings.filter(f => f.risk_level === 'MEDIUM').length;
  const lo = findings.filter(f => f.risk_level === 'LOW').length;

  container.innerHTML = `
    <div class="page-header animate-in"><div style="display:flex;align-items:center;gap:var(--sp-3);"><h1>Results</h1><span class="badge badge-${rc[result.overall_risk] || 'amber'}">${result.overall_risk} RISK</span></div><p>> ${scanData.company.name} · ${result.regulation}</p></div>
    <div class="card animate-in" style="margin-bottom:var(--sp-5);border-left:2px solid var(--neon-${rc[result.overall_risk] || 'amber'});"><p style="font-family:var(--font-mono);font-size:var(--font-sm);color:var(--text-secondary);line-height:1.7;">${result.summary}</p></div>
    <div class="risk-summary animate-in"><div class="risk-item high"><div class="risk-count">${hi}</div><div class="risk-label">High</div></div><div class="risk-item medium"><div class="risk-count">${md}</div><div class="risk-label">Medium</div></div><div class="risk-item low"><div class="risk-count">${lo}</div><div class="risk-label">Low</div></div></div>
    <div class="card-header animate-in" style="margin-bottom:var(--sp-3);"><h2 class="card-title">Findings (${findings.length})</h2></div>
    <div class="findings-list">
      ${findings.map(f => {
    const cc = f.confidence >= 70 ? 'high' : f.confidence >= 40 ? 'medium' : 'low';
    return `<div class="finding-card animate-in" onclick="this.classList.toggle('expanded')"><div class="finding-header"><span class="finding-title">${f.requirement}</span><div class="finding-meta"><span class="badge badge-${sc[f.status] || 'amber'}">${f.status?.replace('_', ' ')}</span><span class="badge badge-${rc[f.risk_level] || 'amber'}">${f.risk_level}</span></div></div>
        <div class="finding-details"><div class="finding-detail-row"><span class="finding-detail-label">Confidence</span><span class="finding-detail-value"><div class="confidence-bar"><div class="confidence-track"><div class="confidence-fill ${cc}" style="width:${f.confidence}%;"></div></div><span>${f.confidence}%</span></div></span></div>
        <div class="finding-detail-row"><span class="finding-detail-label">Impact</span><span class="finding-detail-value">${f.business_impact}</span></div>
        <div class="finding-detail-row"><span class="finding-detail-label">Action</span><span class="finding-detail-value" style="color:var(--neon-mint);">${f.recommended_action}</span></div></div></div>`;
  }).join('')}
    </div>
    <div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-8);"><button class="btn btn-primary" onclick="window.location.hash='#/scanner'">NEW SCAN</button><button class="btn btn-secondary" id="btn-dl-json">↓ JSON</button><a href="#/" class="btn btn-ghost">← DASHBOARD</a></div>`;

  document.getElementById('btn-dl-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `shield-scan-${scanData.company.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url); window.showToast('downloaded', 'success');
  });
}

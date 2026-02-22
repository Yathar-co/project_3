import { getScans, getScanById as fetchScan } from '../services/supabase.js';

export function renderHistory(container, user) {
  container.innerHTML = `
    <div class="page-header animate-in"><h1>Scan History</h1><p>View past compliance scan results</p></div>
    <div class="card animate-in" id="history-card"><div class="loading-container" style="padding:var(--sp-6);"><div class="spinner"></div><div class="loading-text">Loading records...</div></div></div>
    <div id="history-detail" style="display:none;margin-top:var(--sp-4);"></div>`;
  load(user);
}

async function load(user) {
  const card = document.getElementById('history-card');
  try {
    const scans = await getScans(user.id);
    if (!scans.length) { card.innerHTML = '<div class="empty-state"><h3>No scans yet</h3><p>Run your first compliance scan to see results here</p><a href="#/scanner" class="btn btn-primary" style="margin-top:var(--sp-4);">Run scan</a></div>'; return; }
    card.innerHTML = `<table class="history-table"><thead><tr><th>Company</th><th>Framework</th><th>Risk</th><th>Findings</th><th>Date</th><th></th></tr></thead><tbody>
      ${scans.map(s => {
      const c = s.overall_risk === 'HIGH' ? 'red' : s.overall_risk === 'MEDIUM' ? 'amber' : 'green'; const d = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); const fc = Array.isArray(s.findings) ? s.findings.length : 0;
      return `<tr><td style="font-weight:500;color:var(--text-1);">${s.company_name}</td><td>${s.regulation}</td><td><span class="badge badge-${c}">${s.overall_risk}</span></td><td>${fc}</td><td style="color:var(--text-4);font-size:var(--font-xs);">${d}</td><td><button class="btn btn-ghost btn-v" data-id="${s.id}">View →</button></td></tr>`;
    }).join('')}</tbody></table>`;
    card.querySelectorAll('.btn-v').forEach(b => b.addEventListener('click', () => viewDetail(b.dataset.id)));
  } catch (err) { card.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`; }
}

async function viewDetail(id) {
  const d = document.getElementById('history-detail'); d.style.display = 'block';
  d.innerHTML = '<div class="loading-container" style="padding:var(--sp-6);"><div class="spinner"></div></div>';
  d.scrollIntoView({ behavior: 'smooth' });
  try {
    const r = await fetchScan(id); const rc = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' }, sc = { COMPLIANT: 'green', PARTIALLY_COMPLIANT: 'amber', NON_COMPLIANT: 'red' };
    d.innerHTML = `<div class="card"><div class="card-header"><div><h2 style="font-size:var(--font-md);font-weight:600;">${r.company_name} — ${r.regulation}</h2><div style="margin-top:2px;"><span class="badge badge-${rc[r.overall_risk]}">${r.overall_risk} risk</span></div></div>
    <button class="btn btn-ghost" onclick="document.getElementById('history-detail').style.display='none'">✕ Close</button></div>
    <p style="font-size:var(--font-base);color:var(--text-2);margin-bottom:var(--sp-4);line-height:1.7;">${r.summary}</p>
    <div class="findings-list">${(r.findings || []).map(f => { const cc = f.confidence >= 70 ? 'high' : f.confidence >= 40 ? 'medium' : 'low'; return `<div class="finding-card" onclick="this.classList.toggle('expanded')"><div class="finding-header"><span class="finding-title">${f.requirement}</span><div class="finding-meta"><span class="badge badge-${sc[f.status]}">${f.status?.replace('_', ' ')}</span><span class="badge badge-${rc[f.risk_level]}">${f.risk_level}</span></div></div><div class="finding-details"><div class="finding-detail-row"><span class="finding-detail-label">Confidence</span><span class="finding-detail-value"><div class="confidence-bar"><div class="confidence-track"><div class="confidence-fill ${cc}" style="width:${f.confidence}%;"></div></div><span>${f.confidence}%</span></div></span></div><div class="finding-detail-row"><span class="finding-detail-label">Impact</span><span class="finding-detail-value">${f.business_impact}</span></div><div class="finding-detail-row"><span class="finding-detail-label">Action</span><span class="finding-detail-value">${f.recommended_action}</span></div></div></div>`; }).join('')}</div></div>`;
  } catch (err) { d.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-8);"><h3>Failed to load</h3><p style="color:var(--text-3);">${err.message}</p></div>`; }
}

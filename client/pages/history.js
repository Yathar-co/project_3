import { getScanHistory, getScanById } from '../services/api.js';

export function renderHistory(container) {
  container.innerHTML = `
    <div class="page-header animate-in">
      <h1>History</h1>
      <p>> past compliance scan records</p>
    </div>
    <div class="card animate-in" id="history-card">
      <div class="loading-container" style="padding:var(--sp-6);"><div class="spinner"></div><div class="loading-text">> loading records...</div></div>
    </div>
    <div id="history-detail" style="display:none;margin-top:var(--sp-4);"></div>
  `;
  loadHistory();
}

async function loadHistory() {
  const card = document.getElementById('history-card');
  try {
    const scans = await getScanHistory();
    if (scans.length === 0) {
      card.innerHTML = `<div class="empty-state"><div style="font-size:32px;opacity:0.15;margin-bottom:var(--sp-3);">◷</div><h3>No Records</h3><p>> run a scan to populate history</p><a href="#/scanner" class="btn btn-primary" style="margin-top:var(--sp-4);">RUN SCAN</a></div>`;
      return;
    }
    card.innerHTML = `
      <table class="history-table"><thead><tr><th>Company</th><th>Regulation</th><th>Risk</th><th>Items</th><th>Date</th><th></th></tr></thead><tbody>
        ${scans.map(s => {
      const rc = s.overall_risk === 'HIGH' ? 'red' : s.overall_risk === 'MEDIUM' ? 'amber' : 'green';
      const date = new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `<tr><td style="font-weight:700;color:var(--text-primary);">${s.company_name || '?'}</td><td>${s.regulation}</td><td><span class="badge badge-${rc}">${s.overall_risk}</span></td><td>${s.findings_count}</td><td style="color:var(--text-tertiary);font-size:10px;">${date}</td><td><button class="btn btn-ghost btn-view" data-id="${s.id}">VIEW →</button></td></tr>`;
    }).join('')}
      </tbody></table>
    `;
    card.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); viewDetail(b.dataset.id); }));
  } catch (err) {
    card.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

async function viewDetail(id) {
  const detail = document.getElementById('history-detail');
  detail.style.display = 'block';
  detail.innerHTML = `<div class="loading-container" style="padding:var(--sp-6);"><div class="spinner"></div><div class="loading-text">> loading...</div></div>`;
  detail.scrollIntoView({ behavior: 'smooth' });
  try {
    const r = await getScanById(id);
    const rc = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };
    const sc = { COMPLIANT: 'green', PARTIALLY_COMPLIANT: 'amber', NON_COMPLIANT: 'red' };
    detail.innerHTML = `
      <div class="card">
        <div class="card-header"><div><h2 class="card-title">${r.regulation}</h2><div class="card-subtitle">Risk: <span class="badge badge-${rc[r.overall_risk]}">${r.overall_risk}</span></div></div>
        <button class="btn btn-ghost" onclick="document.getElementById('history-detail').style.display='none'">✕</button></div>
        <p style="font-family:var(--font-mono);font-size:var(--font-sm);color:var(--text-secondary);margin-bottom:var(--sp-4);line-height:1.7;">${r.summary}</p>
        <div class="findings-list">
          ${(r.findings || []).map(f => {
      const cc = f.confidence >= 70 ? 'high' : f.confidence >= 40 ? 'medium' : 'low';
      return `<div class="finding-card" onclick="this.classList.toggle('expanded')"><div class="finding-header"><span class="finding-title">${f.requirement}</span><div class="finding-meta"><span class="badge badge-${sc[f.status]}">${f.status?.replace('_', ' ')}</span><span class="badge badge-${rc[f.risk_level]}">${f.risk_level}</span></div></div><div class="finding-details"><div class="finding-detail-row"><span class="finding-detail-label">Confidence</span><span class="finding-detail-value"><div class="confidence-bar"><div class="confidence-track"><div class="confidence-fill ${cc}" style="width:${f.confidence}%;"></div></div><span>${f.confidence}%</span></div></span></div><div class="finding-detail-row"><span class="finding-detail-label">Impact</span><span class="finding-detail-value">${f.business_impact}</span></div><div class="finding-detail-row"><span class="finding-detail-label">Action</span><span class="finding-detail-value" style="color:var(--neon-mint);">${f.recommended_action}</span></div></div></div>`;
    }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    detail.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-8);"><h3>Failed</h3><p style="color:var(--text-secondary);">${err.message}</p></div>`;
  }
}

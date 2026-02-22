import { getScanHistory } from '../services/api.js';

export function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header animate-in">
      <h1>Command Center</h1>
      <p>> shield compliance intelligence system initialized</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card mint animate-in">
        <div class="stat-icon">⧫</div>
        <div class="stat-value" id="sv-scans">0</div>
        <div class="stat-label">Total Scans</div>
      </div>
      <div class="stat-card green animate-in">
        <div class="stat-icon">✓</div>
        <div class="stat-value" id="sv-compliant">0</div>
        <div class="stat-label">Low Risk</div>
      </div>
      <div class="stat-card amber animate-in">
        <div class="stat-icon">△</div>
        <div class="stat-value" id="sv-partial">0</div>
        <div class="stat-label">Medium Risk</div>
      </div>
      <div class="stat-card red animate-in">
        <div class="stat-icon">✕</div>
        <div class="stat-value" id="sv-noncompliant">0</div>
        <div class="stat-label">High Risk</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4);">
      <div class="card animate-in">
        <div class="card-header">
          <h2 class="card-title">Quick Actions</h2>
        </div>
        <div style="display: flex; flex-direction: column; gap: var(--sp-3);">
          <a href="#/scanner" class="btn btn-primary btn-lg" style="width: 100%;">
            ⧫ Run Compliance Scan
          </a>
          <a href="#/generator" class="btn btn-secondary btn-lg" style="width: 100%;">
            ▤ Generate Policy Doc
          </a>
        </div>
      </div>

      <div class="card animate-in" id="recent-scans-card">
        <div class="card-header">
          <h2 class="card-title">Recent Scans</h2>
          <a href="#/history" class="btn btn-ghost">VIEW ALL →</a>
        </div>
        <div id="recent-scans-list">
          <div class="empty-state" style="padding: var(--sp-4);">
            <p>> no scan records found</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card animate-in" style="margin-top: var(--sp-4);">
      <div class="card-header">
        <h2 class="card-title">Supported Frameworks</h2>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: var(--sp-2);">
        ${['GDPR', 'DPDP Act', 'CCPA', 'HIPAA', 'SOC 2', 'PCI DSS', 'ISO 27001', 'PIPEDA', 'LGPD'].map(r =>
    `<span class="badge badge-mint">${r}</span>`
  ).join('')}
      </div>
      <p style="margin-top: var(--sp-3); font-family: var(--font-mono); font-size: 9px; color: var(--text-tertiary); letter-spacing: 0.04em;">
        [!] Shield assists with compliance readiness only. Not legal advice.
      </p>
    </div>
  `;

  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const scans = await getScanHistory();
    const total = scans.length;
    let low = 0, med = 0, high = 0;
    scans.forEach(s => {
      if (s.overall_risk === 'LOW') low++;
      else if (s.overall_risk === 'MEDIUM') med++;
      else high++;
    });

    document.getElementById('sv-scans').textContent = total;
    document.getElementById('sv-compliant').textContent = low;
    document.getElementById('sv-partial').textContent = med;
    document.getElementById('sv-noncompliant').textContent = high;

    const recent = scans.slice(0, 5);
    const listEl = document.getElementById('recent-scans-list');
    if (recent.length === 0) return;

    listEl.innerHTML = recent.map(s => {
      const rc = s.overall_risk === 'HIGH' ? 'red' : s.overall_risk === 'MEDIUM' ? 'amber' : 'green';
      const date = new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border-dim);">
          <div>
            <div style="font-family:var(--font-mono);font-weight:700;font-size:var(--font-sm);">${s.company_name || '???'}</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-tertiary);">${s.regulation} · ${date}</div>
          </div>
          <span class="badge badge-${rc}">${s.overall_risk}</span>
        </div>
      `;
    }).join('');
  } catch { /* silent */ }
}

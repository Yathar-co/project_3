import { getScans } from '../services/supabase.js';
import { esc } from '../services/security.js';

export function renderDashboard(container, user) {
  const name = esc(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there');
  container.innerHTML = `
    <div class="page-header animate-in">
      <h1>Welcome back, ${name}</h1>
      <p>Here's your compliance overview</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card default animate-in">
        <div class="stat-value" id="sv-scans">—</div>
        <div class="stat-label">Total scans</div>
      </div>
      <div class="stat-card green animate-in">
        <div class="stat-value" id="sv-low">—</div>
        <div class="stat-label">Low risk</div>
      </div>
      <div class="stat-card amber animate-in">
        <div class="stat-value" id="sv-med">—</div>
        <div class="stat-label">Medium risk</div>
      </div>
      <div class="stat-card red animate-in">
        <div class="stat-value" id="sv-high">—</div>
        <div class="stat-label">High risk</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
      <div class="card animate-in">
        <div class="card-header"><h2 class="card-title">Quick actions</h2></div>
        <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
          <a href="#/scanner" class="btn btn-primary" style="width:100%;">Run compliance scan</a>
          <a href="#/generator" class="btn btn-secondary" style="width:100%;">Generate document</a>
        </div>
      </div>
      <div class="card animate-in">
        <div class="card-header"><h2 class="card-title">Recent scans</h2><a href="#/history" class="btn btn-ghost">View all →</a></div>
        <div id="recent-list">
          <div class="loading-container" style="padding:var(--sp-3);"><div class="spinner" style="width:18px;height:18px;"></div></div>
        </div>
      </div>
    </div>

    <div class="card animate-in" style="margin-top:var(--sp-4);">
      <div class="card-header"><h2 class="card-title">Supported frameworks</h2></div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);">
        ${['GDPR', 'DPDP Act', 'CCPA', 'HIPAA', 'SOC 2', 'PCI DSS', 'ISO 27001', 'PIPEDA', 'LGPD'].map(r => `<span class="badge badge-default">${r}</span>`).join('')}
      </div>
    </div>
  `;
  loadData(user);
}

async function loadData(user) {
  try {
    const scans = await getScans(user.id);
    let low = 0, med = 0, high = 0;
    scans.forEach(s => { if (s.overall_risk === 'LOW') low++; else if (s.overall_risk === 'MEDIUM') med++; else high++; });

    document.getElementById('sv-scans').textContent = scans.length;
    document.getElementById('sv-low').textContent = low;
    document.getElementById('sv-med').textContent = med;
    document.getElementById('sv-high').textContent = high;

    const list = document.getElementById('recent-list');
    const recent = scans.slice(0, 5);
    if (!recent.length) { list.innerHTML = '<div class="empty-state" style="padding:var(--sp-3);"><p>No scans yet</p></div>'; return; }

    list.innerHTML = recent.map(s => {
      const c = s.overall_risk === 'HIGH' ? 'red' : s.overall_risk === 'MEDIUM' ? 'amber' : 'green';
      const d = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) 0;border-bottom:1px solid var(--border-1);">
        <div><div style="font-size:var(--font-sm);font-weight:500;">${esc(s.company_name)}</div>
        <div style="font-size:var(--font-xs);color:var(--text-4);">${esc(s.regulation)} · ${d}</div></div>
        <span class="badge badge-${c}">${esc(s.overall_risk)}</span></div>`;
    }).join('');
  } catch { }
}

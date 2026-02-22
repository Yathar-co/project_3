import { esc } from '../services/security.js';

const FRAMEWORKS = {
    'GDPR': { region: 'EU', focus: 'Data Protection', scope: 'Any org processing EU resident data', key: ['Right to erasure', 'Data portability', 'DPO required', 'Consent-based', '72h breach notification', 'Privacy by design'] },
    'CCPA': { region: 'US (California)', focus: 'Consumer Privacy', scope: 'Businesses meeting CA thresholds', key: ['Right to know', 'Right to delete', 'Opt-out of sale', 'No discrimination', 'Financial incentive disclosure', 'Service provider contracts'] },
    'HIPAA': { region: 'US', focus: 'Health Data', scope: 'Healthcare providers & associates', key: ['PHI safeguards', 'Minimum necessary', 'BAA required', 'Patient access rights', 'Breach notification', 'Administrative safeguards'] },
    'DPDP Act': { region: 'India', focus: 'Digital Personal Data', scope: 'Processing digital personal data in India', key: ['Consent-based', 'Data fiduciary duties', 'Right to correction', 'Data protection board', 'Cross-border restrictions', 'Significant data fiduciary obligations'] },
    'SOC 2': { region: 'Global', focus: 'Service Organization Controls', scope: 'SaaS & service providers', key: ['Security', 'Availability', 'Processing integrity', 'Confidentiality', 'Privacy', 'Trust service criteria'] },
    'PCI DSS': { region: 'Global', focus: 'Payment Card Data', scope: 'Orgs handling cardholder data', key: ['Network security', 'Data encryption', 'Access control', 'Monitoring & testing', 'Security policy', 'Vulnerability management'] },
    'ISO 27001': { region: 'Global', focus: 'Information Security', scope: 'Any organization', key: ['Risk assessment', 'Security controls', 'ISMS', 'Continuous improvement', 'Asset management', 'Incident management'] },
    'EU AI Act': { region: 'EU', focus: 'AI Governance', scope: 'AI systems deployed/developed in EU', key: ['Risk classification', 'Transparency obligations', 'Human oversight', 'Data governance', 'Conformity assessment', 'Prohibited practices'] },
    'NIST AI RMF': { region: 'US', focus: 'AI Risk Management', scope: 'Voluntary framework for AI systems', key: ['Govern', 'Map', 'Measure', 'Manage', 'Trustworthiness', 'Stakeholder engagement'] },
};

export function renderComparison(container) {
    const fwKeys = Object.keys(FRAMEWORKS);
    container.innerHTML = `
    <div class="page-header animate-in"><h1>Regulatory Comparison</h1><p>Side-by-side comparison of compliance frameworks</p></div>
    <div class="card animate-in" style="margin-bottom:var(--sp-4);">
      <div class="card-header"><h2 class="card-title">Select Frameworks</h2></div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);" id="fw-selector">
        ${fwKeys.map(k => `<button class="btn btn-secondary btn-fw" data-fw="${k}" style="font-size:var(--font-xs);">${k}</button>`).join('')}
      </div>
      <p class="form-hint" style="margin-top:var(--sp-2);">Select 2-4 frameworks to compare</p>
    </div>
    <div id="comparison-result"></div>
  `;

    const selected = new Set();
    document.querySelectorAll('.btn-fw').forEach(btn => {
        btn.addEventListener('click', () => {
            const fw = btn.dataset.fw;
            if (selected.has(fw)) { selected.delete(fw); btn.classList.remove('active'); btn.style.background = ''; btn.style.color = ''; }
            else if (selected.size < 4) { selected.add(fw); btn.classList.add('active'); btn.style.background = 'var(--text-1)'; btn.style.color = 'var(--bg-0)'; }
            else { window.showToast('Max 4 frameworks', 'info'); return; }
            if (selected.size >= 2) renderComparator([...selected]);
            else document.getElementById('comparison-result').innerHTML = '';
        });
    });
}

function renderComparator(keys) {
    const el = document.getElementById('comparison-result');
    const cols = keys.length;

    el.innerHTML = `
    <div class="card animate-in" style="overflow-x:auto;">
      <table class="history-table" style="min-width:${cols * 200}px;">
        <thead>
          <tr><th style="width:120px;"></th>${keys.map(k => `<th style="font-weight:600;">${esc(k)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          <tr><td style="font-weight:500;color:var(--text-3);">Region</td>${keys.map(k => `<td>${esc(FRAMEWORKS[k].region)}</td>`).join('')}</tr>
          <tr><td style="font-weight:500;color:var(--text-3);">Focus</td>${keys.map(k => `<td><span class="badge badge-default">${esc(FRAMEWORKS[k].focus)}</span></td>`).join('')}</tr>
          <tr><td style="font-weight:500;color:var(--text-3);">Scope</td>${keys.map(k => `<td style="font-size:var(--font-xs);color:var(--text-2);">${esc(FRAMEWORKS[k].scope)}</td>`).join('')}</tr>
          <tr><td colspan="${cols + 1}" style="padding:var(--sp-3) 0;"><div style="font-weight:600;font-size:var(--font-sm);">Key Requirements</div></td></tr>
          ${Array.from({ length: 6 }, (_, i) => `<tr>${[
        `<td style="color:var(--text-4);font-size:var(--font-xs);">${i + 1}</td>`,
        ...keys.map(k => `<td style="font-size:var(--font-xs);">${esc(FRAMEWORKS[k].key[i] || '—')}</td>`)
    ].join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:var(--sp-4);margin-top:var(--sp-4);">
      ${keys.map(k => {
        const fw = FRAMEWORKS[k];
        const isAI = k.includes('AI') || k.includes('NIST');
        return `<div class="card animate-in">
          <h3 style="font-size:var(--font-md);font-weight:600;margin-bottom:var(--sp-2);">${esc(k)}</h3>
          <span class="badge badge-${isAI ? 'amber' : 'green'}" style="margin-bottom:var(--sp-3);">${isAI ? 'AI/ML Relevant' : 'General'}</span>
          <div style="font-size:var(--font-xs);color:var(--text-3);line-height:1.7;">
            <div><strong>Region:</strong> ${esc(fw.region)}</div>
            <div><strong>Focus:</strong> ${esc(fw.focus)}</div>
            <div><strong>Scope:</strong> ${esc(fw.scope)}</div>
          </div>
          <div style="margin-top:var(--sp-3);display:flex;flex-wrap:wrap;gap:4px;">
            ${fw.key.map(r => `<span class="badge badge-default" style="font-size:10px;">${esc(r)}</span>`).join('')}
          </div>
        </div>`;
    }).join('')}
    </div>
  `;
}

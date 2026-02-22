import { classifyData } from '../services/api.js';
import { esc } from '../services/security.js';

export function renderClassifier(container, user) {
    container.innerHTML = `
    <div class="page-header animate-in"><h1>Data Classifier</h1><p>AI-powered data sensitivity classification</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
      <div class="card animate-in">
        <div class="card-header"><h2 class="card-title">Describe Your Data</h2></div>
        <div class="form-group"><label class="form-label">Data Description *</label><textarea class="form-textarea" id="cls-desc" rows="6" placeholder="Describe the data your system collects, processes, or stores. Example:&#10;&#10;We collect user names, email addresses, IP addresses, device fingerprints, purchase history, credit card numbers (tokenized), health survey responses, and location data from mobile app users."></textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Industry</label><select class="form-select" id="cls-industry"><option value="">Select...</option><option>Technology</option><option>Healthcare</option><option>Fintech</option><option>E-Commerce</option><option>Education</option><option>Other</option></select></div>
          <div class="form-group"><label class="form-label">Regulation</label><select class="form-select" id="cls-reg"><option value="">Any</option><option>GDPR</option><option>CCPA</option><option>HIPAA</option><option>DPDP Act</option><option>PCI DSS</option></select></div>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--sp-3);" id="btn-classify">Classify Data</button>
      </div>
      <div id="cls-result" class="animate-in">
        <div class="empty-state" style="margin-top:var(--sp-10);">
          <h3>Classification Preview</h3><p>Describe your data to identify PII, PHI, and sensitive information</p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);justify-content:center;margin-top:var(--sp-4);">
            ${['PII', 'PHI', 'Financial', 'Behavioral', 'Technical', 'Public'].map(c => `<span class="badge badge-default">${c}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
    document.getElementById('btn-classify').addEventListener('click', handleClassify);
}

async function handleClassify() {
    const desc = document.getElementById('cls-desc').value.trim();
    const industry = document.getElementById('cls-industry').value;
    const regulation = document.getElementById('cls-reg').value;

    if (!desc || desc.length < 10) return window.showToast('Please describe your data (min 10 characters)', 'error');

    const btn = document.getElementById('btn-classify');
    const result = document.getElementById('cls-result');
    btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Classifying...';
    result.innerHTML = '<div class="loading-container"><div class="spinner"></div><div class="loading-text">Analyzing data types...</div><div class="loading-subtext">Identifying PII, PHI, and sensitive data</div></div>';

    try {
        const data = await classifyData({ dataDescription: desc, industry, regulation });
        renderResult(result, data);
        window.showToast('Classification complete', 'success');
    } catch (err) {
        result.innerHTML = '<div class="card" style="text-align:center;padding:var(--sp-8);"><h3>Classification failed</h3><p style="color:var(--text-3);">Could not classify data</p></div>';
        window.showToast('Classification failed', 'error');
    } finally { btn.disabled = false; btn.textContent = 'Classify Data'; }
}

function renderResult(el, data) {
    const riskColor = { LOW: 'green', MEDIUM: 'amber', HIGH: 'red', CRITICAL: 'red' };
    const catColor = { PII: 'red', PHI: 'red', Financial: 'amber', Behavioral: 'amber', Technical: 'green', Public: 'green' };
    const sensColor = { RESTRICTED: 'red', CONFIDENTIAL: 'red', INTERNAL: 'amber', PUBLIC: 'green' };

    const cats = data.classifications || [];
    const byCategory = {};
    cats.forEach(c => { byCategory[c.category] = (byCategory[c.category] || 0) + 1; });

    el.innerHTML = `
    <div class="card" style="margin-bottom:var(--sp-4);">
      <div class="card-header">
        <div><h2 style="font-size:var(--font-md);font-weight:600;">${data.total_fields_analyzed} fields analyzed</h2></div>
        <span class="badge badge-${riskColor[data.risk_level] || 'amber'}">${esc(data.risk_level)} Risk</span>
      </div>
      <p style="font-size:var(--font-base);color:var(--text-2);line-height:1.7;">${esc(data.summary)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-top:var(--sp-3);">
        ${Object.entries(byCategory).map(([k, v]) => `<span class="badge badge-${catColor[k] || 'default'}">${esc(k)}: ${v}</span>`).join('')}
      </div>
    </div>

    <div style="margin-bottom:var(--sp-3);"><h3 class="card-title">Data Fields</h3></div>
    <div class="card" style="padding:0;overflow:hidden;">
      <table class="history-table" style="margin:0;">
        <thead><tr><th>Field</th><th>Category</th><th>Sensitivity</th><th>Risk</th><th>Handling</th></tr></thead>
        <tbody>${cats.map(c => `
          <tr>
            <td style="font-weight:500;color:var(--text-1);">${esc(c.field_name)}</td>
            <td><span class="badge badge-${catColor[c.category] || 'default'}">${esc(c.category)}</span></td>
            <td><span class="badge badge-${sensColor[c.sensitivity] || 'default'}">${esc(c.sensitivity)}</span></td>
            <td><span class="badge badge-${riskColor[c.risk] || 'amber'}">${esc(c.risk)}</span></td>
            <td style="font-size:var(--font-xs);color:var(--text-3);max-width:200px;">${esc(c.handling)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    ${data.recommendations?.length ? `
    <div class="card" style="margin-top:var(--sp-4);">
      <div class="card-header"><h3 class="card-title">Recommendations</h3></div>
      <ul style="padding-left:var(--sp-4);color:var(--text-2);font-size:var(--font-sm);line-height:1.8;">
        ${data.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${data.applicable_regulations?.length ? `
    <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);margin-top:var(--sp-4);">
      <span style="font-size:var(--font-xs);color:var(--text-4);margin-right:var(--sp-1);">Applicable:</span>
      ${data.applicable_regulations.map(r => `<span class="badge badge-default">${esc(r)}</span>`).join('')}
    </div>` : ''}

    <div style="margin-top:var(--sp-6);"><button class="btn btn-primary" onclick="window.location.hash='#/classifier'">New Classification</button></div>
  `;
}

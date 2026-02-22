import { runAIRiskAssessment } from '../services/api.js';
import { esc } from '../services/security.js';

const AI_FRAMEWORKS = ['EU AI Act', 'NIST AI RMF', 'ISO 42001', 'IEEE EAD'];
const SYSTEM_TYPES = ['Classification', 'Generation', 'Recommendation', 'Computer Vision', 'NLP', 'Prediction', 'Autonomous', 'Other'];

export function renderAIRisk(container, user) {
    container.innerHTML = `
    <div class="page-header animate-in"><h1>AI Risk Assessment</h1><p>Evaluate AI/ML systems against governance frameworks</p></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);">
      <div class="card animate-in">
        <div class="card-header"><h2 class="card-title">System Details</h2></div>
        <div class="form-group"><label class="form-label">AI System Name *</label><input type="text" class="form-input" id="ai-name" placeholder="e.g., Customer Churn Predictor"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">System Type *</label><select class="form-select" id="ai-type"><option value="">Select...</option>${SYSTEM_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Framework *</label><select class="form-select" id="ai-framework"><option value="">Select...</option>${AI_FRAMEWORKS.map(f => `<option value="${f}">${f}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Purpose / Use Case</label><textarea class="form-textarea" id="ai-purpose" placeholder="Describe what this AI system does, who it affects, and its decision-making scope..."></textarea></div>
        <div class="form-group"><label class="form-label">Training Data Used</label><input type="text" class="form-input" id="ai-data" placeholder="user behavior, demographics, transaction history"/><p class="form-hint">Comma-separated list of data categories</p></div>
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:var(--sp-3);" id="btn-ai-assess">Run Assessment</button>
      </div>
      <div id="ai-result" class="animate-in">
        <div class="empty-state" style="margin-top:var(--sp-10);"><h3>Assessment Preview</h3><p>Configure your AI system and run an assessment</p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--sp-2);justify-content:center;margin-top:var(--sp-4);">
            ${AI_FRAMEWORKS.map(f => `<span class="badge badge-default">${f}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
    document.getElementById('btn-ai-assess').addEventListener('click', handleAssess);
}

async function handleAssess() {
    const name = document.getElementById('ai-name').value.trim();
    const type = document.getElementById('ai-type').value;
    const framework = document.getElementById('ai-framework').value;
    const purpose = document.getElementById('ai-purpose').value.trim();
    const dataUsed = document.getElementById('ai-data').value.split(',').map(v => v.trim()).filter(Boolean);

    if (!name) return window.showToast('System name is required', 'error');
    if (!type) return window.showToast('System type is required', 'error');
    if (!framework) return window.showToast('Select a framework', 'error');

    const btn = document.getElementById('btn-ai-assess');
    const result = document.getElementById('ai-result');
    btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Assessing...';
    result.innerHTML = '<div class="loading-container"><div class="spinner"></div><div class="loading-text">Analyzing AI system...</div><div class="loading-subtext">Evaluating bias, fairness, transparency, and safety</div></div>';

    try {
        const data = await runAIRiskAssessment({ system: { name, type, purpose, dataUsed }, framework });
        renderResult(result, data);
        window.showToast('Assessment complete', 'success');
    } catch (err) {
        result.innerHTML = `<div class="card" style="text-align:center;padding:var(--sp-8);"><h3>Assessment failed</h3><p style="color:var(--text-3);">Could not complete the assessment</p></div>`;
        window.showToast('Assessment failed', 'error');
    } finally { btn.disabled = false; btn.textContent = 'Run Assessment'; }
}

function renderResult(el, data) {
    const tierColor = { Unacceptable: 'red', High: 'red', Limited: 'amber', Minimal: 'green' };
    const statusColor = { PASS: 'green', WARN: 'amber', FAIL: 'red' };
    const scoreColor = s => s >= 70 ? 'green' : s >= 40 ? 'amber' : 'red';

    el.innerHTML = `
    <div class="card" style="margin-bottom:var(--sp-4);">
      <div class="card-header">
        <div>
          <h2 style="font-size:var(--font-md);font-weight:600;">${esc(data.system_name)}</h2>
          <div style="font-size:var(--font-xs);color:var(--text-4);margin-top:2px;">${esc(data.framework)}</div>
        </div>
        <div style="text-align:right;">
          <span class="badge badge-${tierColor[data.risk_tier] || 'amber'}">${esc(data.risk_tier)} Risk</span>
          <div style="font-size:var(--font-xl);font-weight:700;margin-top:var(--sp-2);color:var(--${scoreColor(data.risk_score)});">${data.risk_score}<span style="font-size:var(--font-xs);color:var(--text-4);">/100</span></div>
        </div>
      </div>
      <p style="font-size:var(--font-base);color:var(--text-2);line-height:1.7;">${esc(data.summary)}</p>
    </div>

    <div style="margin-bottom:var(--sp-3);"><h3 class="card-title">${data.categories?.length || 0} categories assessed</h3></div>
    <div class="findings-list">
      ${(data.categories || []).map(c => `
        <div class="finding-card" onclick="this.classList.toggle('expanded')">
          <div class="finding-header">
            <span class="finding-title">${esc(c.name)}</span>
            <div class="finding-meta">
              <span class="badge badge-${statusColor[c.status] || 'amber'}">${esc(c.status)}</span>
              <span style="font-size:var(--font-sm);font-weight:600;color:var(--${scoreColor(c.score)});">${c.score}%</span>
            </div>
          </div>
          <div class="finding-details">
            <div class="finding-detail-row"><span class="finding-detail-label">Finding</span><span class="finding-detail-value">${esc(c.finding)}</span></div>
            <div class="finding-detail-row"><span class="finding-detail-label">Action</span><span class="finding-detail-value">${esc(c.recommendation)}</span></div>
          </div>
        </div>`).join('')}
    </div>

    ${data.transparency_requirements?.length ? `
    <div class="card" style="margin-top:var(--sp-4);">
      <div class="card-header"><h3 class="card-title">Transparency Requirements</h3></div>
      <ul style="padding-left:var(--sp-4);color:var(--text-2);font-size:var(--font-sm);line-height:1.8;">
        ${data.transparency_requirements.map(t => `<li>${esc(t)}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${data.human_oversight ? `
    <div class="card" style="margin-top:var(--sp-4);">
      <div class="card-header"><h3 class="card-title">Human Oversight</h3></div>
      <p style="font-size:var(--font-sm);color:var(--text-2);">${esc(data.human_oversight)}</p>
    </div>` : ''}

    <div style="margin-top:var(--sp-6);"><button class="btn btn-primary" onclick="window.location.hash='#/ai-risk'">New Assessment</button></div>
  `;
}

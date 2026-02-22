import { renderDashboard } from './pages/dashboard.js';
import { renderScanner } from './pages/scanner.js';
import { renderGenerator } from './pages/generator.js';
import { renderHistory } from './pages/history.js';
import { checkHealth } from './services/api.js';

const container = document.getElementById('page-container');
const breadcrumb = document.getElementById('page-breadcrumb');

const routes = {
    '/': { render: renderDashboard, label: 'SYS://DASHBOARD' },
    '/scanner': { render: renderScanner, label: 'SYS://SCANNER' },
    '/generator': { render: renderGenerator, label: 'SYS://DOC_GEN' },
    '/history': { render: renderHistory, label: 'SYS://HISTORY' },
};

function navigate() {
    const hash = window.location.hash.replace('#', '') || '/';
    const route = routes[hash] || routes['/'];

    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.dataset.page;
        const isActive = (hash === '/' && page === 'dashboard') || hash === `/${page}`;
        link.classList.toggle('active', isActive);
    });

    // Update breadcrumb
    if (breadcrumb) breadcrumb.textContent = route.label;

    // Render with transition
    container.style.opacity = '0';
    container.style.transform = 'translateY(6px)';
    setTimeout(() => {
        route.render(container);
        container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 120);
}

// Clock
function updateClock() {
    const el = document.getElementById('topbar-clock');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC+' + (-now.getTimezoneOffset() / 60);
    }
}

// Ollama health
async function updateOllamaStatus() {
    const indicator = document.getElementById('ollamaStatus');
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('span');
    try {
        const health = await checkHealth();
        if (health.ollama === 'connected') {
            dot.className = 'status-dot connected';
            text.textContent = 'AI: ONLINE';
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = 'AI: OFFLINE';
        }
    } catch {
        dot.className = 'status-dot disconnected';
        text.textContent = 'SRV: DOWN';
    }
}

// Toast
window.showToast = function (message, type = 'info') {
    let tc = document.querySelector('.toast-container');
    if (!tc) {
        tc = document.createElement('div');
        tc.className = 'toast-container';
        document.body.appendChild(tc);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = `> ${message}`;
    tc.appendChild(t);
    setTimeout(() => t.remove(), 5000);
};

// Init
window.addEventListener('hashchange', navigate);
navigate();
updateOllamaStatus();
updateClock();
setInterval(updateOllamaStatus, 30000);
setInterval(updateClock, 1000);

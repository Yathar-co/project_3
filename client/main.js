import { renderDashboard } from './pages/dashboard.js';
import { initChatbot } from './components/chatbot.js';
import { renderScanner } from './pages/scanner.js';
import { renderGenerator } from './pages/generator.js';
import { renderHistory } from './pages/history.js';
import { renderAIRisk } from './pages/ai-risk.js';
import { renderClassifier } from './pages/classifier.js';
import { renderComparison } from './pages/comparison.js';
import { renderAuth } from './pages/auth.js';
import { getUser, onAuthChange, signOut } from './services/supabase.js';

const container = document.getElementById('page-container');
const sidebar = document.getElementById('sidebar');

let currentUser = null;

const routes = {
    '/': { render: renderDashboard, label: 'Dashboard' },
    '/scanner': { render: renderScanner, label: 'Scanner' },
    '/generator': { render: renderGenerator, label: 'Documents' },
    '/history': { render: renderHistory, label: 'History' },
    '/ai-risk': { render: renderAIRisk, label: 'AI Risk' },
    '/classifier': { render: renderClassifier, label: 'Classifier' },
    '/comparison': { render: renderComparison, label: 'Compare' },
};

function navigate() {
    if (!currentUser) {
        sidebar.style.display = 'none';
        container.style.padding = '0';
        container.style.maxWidth = 'none';
        renderAuth(container, async () => {
            currentUser = await getUser();
            if (currentUser) initApp();
        });
        return;
    }

    sidebar.style.display = 'flex';
    container.style.padding = '';
    container.style.maxWidth = '';

    const hash = window.location.hash.replace('#', '') || '/';
    const route = routes[hash] || routes['/'];

    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.dataset.page;
        const isActive = (hash === '/' && page === 'dashboard') || hash === `/${page}`;
        link.classList.toggle('active', isActive);
    });

    container.style.opacity = '0';
    container.style.transform = 'translateY(4px)';
    setTimeout(() => {
        route.render(container, currentUser);
        container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 80);
}

function initApp() {
    sidebar.style.display = 'flex';
    initChatbot();
    const footer = document.getElementById('sidebar-footer');
    if (footer && currentUser) {
        const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
        footer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--sp-2);">
        <div style="display:flex;align-items:center;gap:var(--sp-2);">
          <div style="width:24px;height:24px;border-radius:50%;background:var(--bg-4);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--text-2);">${name.charAt(0).toUpperCase()}</div>
          <span style="font-size:var(--font-xs);color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${name}</span>
        </div>
        <button id="btn-logout" style="background:none;border:none;color:var(--text-4);font-size:var(--font-xs);cursor:pointer;font-family:var(--font);padding:var(--sp-1);" title="Sign out">↗</button>
      </div>
    `;
        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            await signOut();
            currentUser = null;
            navigate();
        });
    }
    navigate();
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
    t.textContent = message;
    tc.appendChild(t);
    setTimeout(() => t.remove(), 5000);
};

// Auth state
onAuthChange(async (user) => {
    currentUser = user;
    if (user) initApp();
    else navigate();
});

window.addEventListener('hashchange', navigate);
(async () => {
    currentUser = await getUser();
    if (currentUser) initApp();
    else navigate();
})();

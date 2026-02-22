import { renderDashboard } from './pages/dashboard.js';
import { renderScanner } from './pages/scanner.js';
import { renderGenerator } from './pages/generator.js';
import { renderHistory } from './pages/history.js';
import { renderAuth } from './pages/auth.js';
import { getUser, onAuthChange, signOut } from './services/supabase.js';

const container = document.getElementById('page-container');
const breadcrumb = document.getElementById('page-breadcrumb');
const sidebar = document.getElementById('sidebar');

let currentUser = null;

const routes = {
    '/': { render: renderDashboard, label: 'SYS://DASHBOARD' },
    '/scanner': { render: renderScanner, label: 'SYS://SCANNER' },
    '/generator': { render: renderGenerator, label: 'SYS://DOC_GEN' },
    '/history': { render: renderHistory, label: 'SYS://HISTORY' },
};

function navigate() {
    if (!currentUser) {
        sidebar.style.display = 'none';
        document.querySelector('.topbar')?.style.setProperty('display', 'none');
        container.style.padding = '0';
        renderAuth(container, async () => {
            currentUser = await getUser();
            if (currentUser) initApp();
        });
        return;
    }

    sidebar.style.display = 'flex';
    document.querySelector('.topbar')?.style.setProperty('display', 'flex');
    container.style.padding = '';

    const hash = window.location.hash.replace('#', '') || '/';
    const route = routes[hash] || routes['/'];

    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.dataset.page;
        const isActive = (hash === '/' && page === 'dashboard') || hash === `/${page}`;
        link.classList.toggle('active', isActive);
    });

    if (breadcrumb) breadcrumb.textContent = route.label;

    container.style.opacity = '0';
    container.style.transform = 'translateY(6px)';
    setTimeout(() => {
        route.render(container, currentUser);
        container.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, 120);
}

function initApp() {
    sidebar.style.display = 'flex';

    // Add user info and logout to sidebar footer
    const footer = document.querySelector('.sidebar-footer');
    if (footer && currentUser) {
        footer.innerHTML = `
      <div class="status-indicator">
        <div class="status-dot connected"></div>
        <span>AI: ONLINE</span>
      </div>
      <div style="margin-top:var(--sp-2);display:flex;align-items:center;justify-content:space-between;">
        <span style="font-family:var(--font-mono);font-size:9px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${currentUser.email}</span>
        <button id="btn-logout" style="background:none;border:none;color:var(--neon-red);font-family:var(--font-mono);font-size:9px;cursor:pointer;font-weight:700;">EXIT</button>
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

// Clock
function updateClock() {
    const el = document.getElementById('topbar-clock');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + ' UTC+' + (-now.getTimezoneOffset() / 60);
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

onAuthChange(async (user) => {
    currentUser = user;
    if (user) initApp();
    else navigate();
});

(async () => {
    currentUser = await getUser();
    if (currentUser) initApp();
    else navigate();
})();

setInterval(updateClock, 1000);
updateClock();

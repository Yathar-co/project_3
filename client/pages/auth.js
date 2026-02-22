export function renderAuth(container, onLogin) {
    let isLogin = true;

    function render() {
        container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;">
        <div style="width:100%;max-width:420px;">
          <div style="text-align:center;margin-bottom:var(--sp-8);">
            <div style="font-family:var(--font-display);font-size:28px;color:var(--neon-mint);text-shadow:var(--glow-text);letter-spacing:0.15em;margin-bottom:var(--sp-2);">◆ SHIELD</div>
            <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-tertiary);letter-spacing:0.1em;">COMPLIANCE INTELLIGENCE PLATFORM</div>
          </div>

          <div class="card" style="padding:var(--sp-6);">
            <div style="display:flex;gap:0;margin-bottom:var(--sp-5);border:1px solid var(--border-retro);border-radius:var(--radius-sm);overflow:hidden;">
              <button class="auth-tab ${isLogin ? 'active' : ''}" id="tab-login"
                style="flex:1;padding:var(--sp-2);font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:none;cursor:pointer;transition:all var(--t-fast);
                ${isLogin ? 'background:var(--neon-mint-med);color:var(--neon-mint);' : 'background:transparent;color:var(--text-tertiary);'}">
                LOGIN
              </button>
              <button class="auth-tab ${!isLogin ? 'active' : ''}" id="tab-signup"
                style="flex:1;padding:var(--sp-2);font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;border:none;border-left:1px solid var(--border-retro);cursor:pointer;transition:all var(--t-fast);
                ${!isLogin ? 'background:var(--neon-mint-med);color:var(--neon-mint);' : 'background:transparent;color:var(--text-tertiary);'}">
                SIGN UP
              </button>
            </div>

            <form id="auth-form">
              ${!isLogin ? `
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input type="text" class="form-input" id="auth-name" placeholder="Your name" required />
                </div>
              ` : ''}
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="auth-email" placeholder="you@company.com" required />
              </div>
              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-input" id="auth-password" placeholder="${isLogin ? 'Enter password' : 'Min 6 characters'}" required minlength="6" />
              </div>
              <div id="auth-error" style="display:none;padding:var(--sp-2) var(--sp-3);background:var(--neon-red-soft);border:1px solid rgba(255,71,87,0.3);border-radius:var(--radius-sm);margin-bottom:var(--sp-3);font-family:var(--font-mono);font-size:11px;color:var(--neon-red);"></div>
              <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="auth-submit">
                ${isLogin ? '◆ LOGIN' : '◆ CREATE ACCOUNT'}
              </button>
            </form>

            <p style="text-align:center;margin-top:var(--sp-4);font-family:var(--font-mono);font-size:10px;color:var(--text-tertiary);">
              ${isLogin ? 'No account?' : 'Already have one?'}
              <a href="#" id="auth-toggle" style="color:var(--neon-mint);text-decoration:none;">
                ${isLogin ? 'Sign up' : 'Login'}
              </a>
            </p>
          </div>

          <p style="text-align:center;margin-top:var(--sp-4);font-family:var(--font-mono);font-size:9px;color:var(--text-tertiary);letter-spacing:0.03em;">
            [!] shield assists with compliance readiness only
          </p>
        </div>
      </div>
    `;

        document.getElementById('tab-login').addEventListener('click', () => { isLogin = true; render(); });
        document.getElementById('tab-signup').addEventListener('click', () => { isLogin = false; render(); });
        document.getElementById('auth-toggle').addEventListener('click', (e) => { e.preventDefault(); isLogin = !isLogin; render(); });
        document.getElementById('auth-form').addEventListener('submit', handleSubmit);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const errorEl = document.getElementById('auth-error');
        const submitBtn = document.getElementById('auth-submit');

        errorEl.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;"></div>';

        try {
            const { signIn, signUp } = await import('../services/supabase.js');
            if (isLogin) {
                await signIn(email, password);
            } else {
                const name = document.getElementById('auth-name')?.value.trim() || '';
                await signUp(email, password, name);
                window.showToast('Account created! Check email to confirm.', 'success');
            }
            if (onLogin) onLogin();
        } catch (err) {
            errorEl.textContent = err.message || 'Authentication failed';
            errorEl.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = isLogin ? '◆ LOGIN' : '◆ CREATE ACCOUNT';
        }
    }

    render();
}

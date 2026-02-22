import { supabase } from '../services/supabase.js';

export function renderAuth(container, onLogin) {
  let mode = 'login'; // 'login' | 'signup' | 'forgot'

  function render() {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:var(--sp-4);">
        <div style="width:100%;max-width:380px;">
          <div style="text-align:center;margin-bottom:var(--sp-8);">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:var(--text-1);color:var(--bg-0);border-radius:var(--radius-md);font-weight:700;font-size:20px;margin-bottom:var(--sp-3);">S</div>
            <h1 style="font-size:var(--font-xl);font-weight:700;letter-spacing:-0.03em;">Shield</h1>
            <p style="font-size:var(--font-sm);color:var(--text-3);margin-top:var(--sp-1);">Compliance intelligence platform</p>
          </div>

          <div class="card" style="padding:var(--sp-6);">
            ${mode === 'forgot' ? renderForgotForm() : renderAuthForm()}
          </div>

          <p style="text-align:center;margin-top:var(--sp-4);font-size:var(--font-xs);color:var(--text-4);">
            By continuing you agree to our terms of service
          </p>
        </div>
      </div>
    `;

    if (mode === 'forgot') {
      document.getElementById('auth-forgot-form').addEventListener('submit', handleForgotPassword);
      document.getElementById('back-to-login').addEventListener('click', (e) => { e.preventDefault(); mode = 'login'; render(); });
    } else {
      if (mode === 'login') {
        document.getElementById('switch-signup').addEventListener('click', (e) => { e.preventDefault(); mode = 'signup'; render(); });
        document.getElementById('forgot-link').addEventListener('click', (e) => { e.preventDefault(); mode = 'forgot'; render(); });
      } else {
        document.getElementById('switch-login').addEventListener('click', (e) => { e.preventDefault(); mode = 'login'; render(); });
      }
      document.getElementById('auth-form').addEventListener('submit', handleSubmit);
    }
  }

  function renderAuthForm() {
    const isLogin = mode === 'login';
    return `
      <div style="margin-bottom:var(--sp-5);">
        <h2 style="font-size:var(--font-lg);font-weight:600;">${isLogin ? 'Welcome back' : 'Create account'}</h2>
        <p style="font-size:var(--font-sm);color:var(--text-3);margin-top:2px;">${isLogin ? 'Sign in to your account' : 'Get started with Shield'}</p>
      </div>
      <form id="auth-form">
        ${!isLogin ? `<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="auth-name" placeholder="Your full name" required /></div>` : ''}
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="auth-email" placeholder="you@company.com" required /></div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label class="form-label" style="margin-bottom:0;">Password</label>
            ${isLogin ? `<a href="#" id="forgot-link" style="font-size:var(--font-xs);color:var(--text-3);text-decoration:none;">Forgot?</a>` : ''}
          </div>
          <input type="password" class="form-input" id="auth-password" placeholder="${isLogin ? 'Enter password' : 'Min 6 characters'}" required minlength="6" style="margin-top:var(--sp-2);" />
        </div>
        <div id="auth-error" style="display:none;padding:var(--sp-2) var(--sp-3);background:var(--red-soft);border:1px solid var(--red-border);border-radius:var(--radius-sm);margin-bottom:var(--sp-3);font-size:var(--font-xs);color:var(--red);"></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="auth-submit">${isLogin ? 'Sign in' : 'Create account'}</button>
      </form>
      <p style="text-align:center;margin-top:var(--sp-4);font-size:var(--font-sm);color:var(--text-3);">
        ${isLogin
        ? `Don't have an account? <a href="#" id="switch-signup" style="color:var(--text-1);text-decoration:none;font-weight:500;">Sign up</a>`
        : `Already have an account? <a href="#" id="switch-login" style="color:var(--text-1);text-decoration:none;font-weight:500;">Sign in</a>`
      }
      </p>
    `;
  }

  function renderForgotForm() {
    return `
      <div style="margin-bottom:var(--sp-5);">
        <h2 style="font-size:var(--font-lg);font-weight:600;">Reset password</h2>
        <p style="font-size:var(--font-sm);color:var(--text-3);margin-top:2px;">We'll send you a link to reset it</p>
      </div>
      <form id="auth-forgot-form">
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="forgot-email" placeholder="you@company.com" required /></div>
        <div id="forgot-message" style="display:none;padding:var(--sp-2) var(--sp-3);border-radius:var(--radius-sm);margin-bottom:var(--sp-3);font-size:var(--font-xs);"></div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%;" id="forgot-submit">Send reset link</button>
      </form>
      <p style="text-align:center;margin-top:var(--sp-4);font-size:var(--font-sm);color:var(--text-3);">
        <a href="#" id="back-to-login" style="color:var(--text-1);text-decoration:none;font-weight:500;">← Back to sign in</a>
      </p>
    `;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit');

    errorEl.style.display = 'none';
    btn.disabled = true;
    const origText = btn.textContent;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>';

    try {
      const { signIn, signUp } = await import('../services/supabase.js');
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        const name = document.getElementById('auth-name')?.value.trim() || '';
        const result = await signUp(email, password, name);
        if (result.user && !result.session) {
          errorEl.style.display = 'block';
          errorEl.style.background = 'var(--green-soft)';
          errorEl.style.borderColor = 'var(--green-border)';
          errorEl.style.color = 'var(--green)';
          errorEl.textContent = 'Check your email to confirm your account';
          btn.disabled = false;
          btn.textContent = origText;
          return;
        }
      }
      if (onLogin) onLogin();
    } catch (err) {
      errorEl.textContent = err.message || 'Authentication failed';
      errorEl.style.display = 'block';
      errorEl.style.background = 'var(--red-soft)';
      errorEl.style.borderColor = 'var(--red-border)';
      errorEl.style.color = 'var(--red)';
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const msgEl = document.getElementById('forgot-message');
    const btn = document.getElementById('forgot-submit');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>';

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/#/reset'
      });
      if (error) throw error;
      msgEl.style.display = 'block';
      msgEl.style.background = 'var(--green-soft)';
      msgEl.style.borderColor = 'var(--green-border)';
      msgEl.style.color = 'var(--green)';
      msgEl.textContent = 'Reset link sent! Check your email.';
    } catch (err) {
      msgEl.style.display = 'block';
      msgEl.style.background = 'var(--red-soft)';
      msgEl.style.border = '1px solid var(--red-border)';
      msgEl.style.color = 'var(--red)';
      msgEl.textContent = err.message || 'Failed to send reset email';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send reset link';
    }
  }

  render();
}

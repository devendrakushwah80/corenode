/**
 * CoreNode – Login Page Logic
 * Handles user sign-in with Supabase Auth.
 * Requires: supabase.js loaded first.
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof AuthManager === 'undefined' || typeof window.supabase === 'undefined') return;

  // If already authenticated, skip the login page
  const session = await AuthManager.init();
  if (session) {
    const params = new URLSearchParams(window.location.search);
    window.location.href = params.get('redirect') || 'dashboard.html';
    return;
  }

  const btn     = document.getElementById('login-btn');
  const errEl   = document.getElementById('auth-error');
  const succEl  = document.getElementById('auth-success');
  const emailEl = document.getElementById('login-email');
  const passEl  = document.getElementById('login-password');

  function showError(msg) {
    errEl.textContent  = msg;
    errEl.style.display  = 'block';
    succEl.style.display = 'none';
  }

  function showSuccess(msg) {
    succEl.textContent  = msg;
    succEl.style.display  = 'block';
    errEl.style.display   = 'none';
  }

  async function doLogin() {
    const email    = (emailEl?.value || '').trim();
    const password = passEl?.value || '';

    if (!email || !password) {
      showError('Please enter your email and password.');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    errEl.style.display = 'none';

    const { error } = await AuthManager.signIn(email, password);

    if (error) {
      showError(error.message || 'Sign in failed. Please check your credentials.');
      if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      return;
    }

    showSuccess('Signed in! Redirecting…');
    const params = new URLSearchParams(window.location.search);
    setTimeout(() => {
      window.location.href = params.get('redirect') || 'dashboard.html';
    }, 800);
  }

  btn?.addEventListener('click', doLogin);
  emailEl?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  passEl?.addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
});

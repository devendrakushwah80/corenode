/**
 * CoreNode – Admin Authentication
 * ─────────────────────────────────────────────────────────────────
 * Admin access requires:
 *   1. A valid Supabase session
 *   2. profiles.role = 'admin' for that user id
 *
 * Grant admin:
 *   UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
 *
 * WHY the login flow calls getSB() directly instead of AuthManager.init():
 *   supabase.js no longer auto-inits, but admin.html does not include
 *   navbar-auth.js, so no init() has been called when initLoginPage() runs.
 *   Calling AuthManager.init() once is fine here for the "already logged in"
 *   check. However the actual login sequence (signInWithPassword + role check)
 *   goes straight to getSB() so we own every step with no shared state races.
 */

const AdminAuth = (() => {

  /* ─────────────────────────────────────────────────────────────
     INTERNAL HELPERS
  ─────────────────────────────────────────────────────────────── */

  /** Fetch role from profiles for a given user id. Returns 'admin'|'user'|null */
  async function _fetchRole(userId) {
    const { data, error } = await getSB()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error) { console.error('[AdminAuth] profile fetch:', error.message); return null; }
    return data?.role ?? null;
  }

  function _showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 5000);
  }

  function _hideError(el) {
    if (!el) return;
    clearTimeout(el._t);
    el.classList.add('hidden');
  }

  /* ─────────────────────────────────────────────────────────────
     GUARD — protect admin-dashboard.html
  ─────────────────────────────────────────────────────────────── */
  async function guard() {
    if (typeof getSB === 'undefined' || typeof window.supabase === 'undefined') {
      window.location.href = 'index.html';
      return false;
    }

    // Read session directly — AuthManager.init() is not called again here
    // because admin-dashboard.html does not include navbar-auth.js, so we
    // need one init() call; do it through AuthManager so _profile is populated.
    const session = await AuthManager.init();

    if (!session) {
      window.location.href = 'admin.html';
      return false;
    }

    if (!AuthManager.isAdmin()) {
      await getSB().auth.signOut();
      window.location.href = 'index.html';
      return false;
    }

    const emailEl = document.getElementById('admin-user-email');
    if (emailEl) emailEl.textContent = AuthManager.getUserEmail();   // Bug 2 fix: getUserEmail now exists

    return true;
  }

  /* ─────────────────────────────────────────────────────────────
     LOGOUT
  ─────────────────────────────────────────────────────────────── */
  async function logout() {
    await getSB().auth.signOut();
    window.location.href = 'admin.html';   // Bug 11 fix: go back to admin login, not index
  }

  /* ─────────────────────────────────────────────────────────────
     LOGIN PAGE — wire up admin.html
  ─────────────────────────────────────────────────────────────── */
  async function initLoginPage() {
    if (typeof getSB === 'undefined' || typeof window.supabase === 'undefined') return;

    const btn   = document.getElementById('admin-login-btn');
    const errEl = document.getElementById('admin-login-error');
    const form  = document.getElementById('admin-login-form');
    if (!form) return;

    /* If already logged in as admin → skip straight to dashboard */
    const { data: sessionData } = await getSB().auth.getSession();
    const existing = sessionData?.session;
    if (existing) {
      const role = await _fetchRole(existing.user.id);
      if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
        return;
      }
      // Has a non-admin session — clear it so the form starts clean
      await getSB().auth.signOut();
    }

    /* Form submit */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rawInput = (document.getElementById('admin-username')?.value || '').trim();
      const password = (document.getElementById('admin-password')?.value || '');
      if (!rawInput || !password) {
        _showError(errEl, 'Please enter your credentials.');
        return;
      }

      // Accept bare username (appends @corenode.in) or full email
      const email = rawInput.includes('@') ? rawInput : `${rawInput}@corenode.in`;

      if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
      _hideError(errEl);

      try {
        /* Step 1 — Supabase Auth */
        const { data: authData, error: authError } =
          await getSB().auth.signInWithPassword({ email, password });

        if (authError || !authData?.user) {
          _showError(errEl, 'Invalid credentials. Please try again.');
          if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
          return;
        }

        /* Step 2 — Role check */
        const role = await _fetchRole(authData.user.id);
        if (role !== 'admin') {
          await getSB().auth.signOut();   // Bug 11 fix: signOut here, not via AuthManager
          _showError(errEl, 'Access denied. This account is not an admin.');
          if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
          return;
        }

        /* Step 3 — Redirect */
        window.location.href = 'admin-dashboard.html';

      } catch (err) {
        // Safety net: any unexpected JS error must not leave the button stuck
        console.error('[AdminAuth] unexpected login error:', err);
        _showError(errEl, 'An unexpected error occurred. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      }
    });
  }

  return { guard, logout, initLoginPage };
})();

/* ─────────────────────────────────────────────────────────────────
   PAGE-LEVEL INIT
───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  if (page === 'admin.html') {
    await AdminAuth.initLoginPage();   // Bug 9 fix: must be awaited
  }

  if (page === 'admin-dashboard.html') {
    const ok = await AdminAuth.guard();
    if (!ok) return;
  }
});

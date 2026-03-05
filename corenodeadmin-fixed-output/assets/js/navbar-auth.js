/**
 * CoreNode – Navbar Auth Injector
 * ─────────────────────────────────────────────────────────────────
 * Injects auth-dependent nav links once the session is resolved.
 * Included after supabase.js on all public pages.
 *
 * This file is the single place that calls AuthManager.init() on
 * public pages, so only one onAuthStateChange listener is registered.
 *
 * Logged out:  Login | Sign Up
 * Logged in:   My Orders | [email pill] | Dashboard | Logout
 */
(function () {

  function injectNavAuth(session) {
    const navRight = document.getElementById('navbar-right-content');
    if (!navRight) return;

    navRight.querySelectorAll('.auth-nav-links').forEach(el => el.remove());

    const authDiv = document.createElement('div');
    authDiv.className = 'auth-nav-links';

    if (session) {
      // getUserEmail() is now defined on AuthManager (Bug 2 fix)
      const email = _esc(
        (typeof AuthManager !== 'undefined' ? AuthManager.getUserEmail() : '') ||
        session.user?.email || ''
      );
      authDiv.innerHTML = `
        <a href="orders.html"    class="btn btn-ghost btn-sm" style="font-size:0.78rem">My Orders</a>
        <div class="nav-user-pill" title="${email}">
          <span class="nav-dot"></span>
          <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${email}</span>
        </div>
        <a href="dashboard.html" class="btn btn-ghost btn-sm" style="font-size:0.78rem">Dashboard</a>
        <button class="btn btn-ghost btn-sm" id="nav-logout-btn" style="font-size:0.78rem">Logout</button>`;
    } else {
      authDiv.innerHTML = `
        <a href="login.html"  class="btn btn-ghost btn-sm"   style="font-size:0.78rem">Login</a>
        <a href="signup.html" class="btn btn-primary btn-sm" style="font-size:0.78rem">Sign Up</a>`;
    }

    const hamburger = navRight.querySelector('.hamburger');
    if (hamburger) navRight.insertBefore(authDiv, hamburger);
    else           navRight.appendChild(authDiv);

    document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
      if (typeof AuthManager !== 'undefined') await AuthManager.signOut();
    });

    _updateMobileMenu(session);
  }

  function _updateMobileMenu(session) {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;

    menu.querySelectorAll('.mobile-auth-link').forEach(el => el.remove());

    if (session) {
      menu.insertAdjacentHTML('beforeend', `
        <a href="orders.html"    class="mobile-auth-link">My Orders</a>
        <a href="dashboard.html" class="mobile-auth-link" style="color:var(--accent);font-weight:600">Dashboard</a>
        <a href="#" class="mobile-auth-link" id="mobile-logout-link" style="color:var(--text-muted)">Logout</a>`);
      document.getElementById('mobile-logout-link')?.addEventListener('click', async e => {
        e.preventDefault();
        if (typeof AuthManager !== 'undefined') await AuthManager.signOut();
      });
    } else {
      menu.insertAdjacentHTML('beforeend', `
        <a href="login.html"  class="mobile-auth-link">Login</a>
        <a href="signup.html" class="mobile-auth-link" style="color:var(--accent);font-weight:600">Sign Up →</a>`);
    }
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(s || ''));
    return d.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (typeof AuthManager === 'undefined' || typeof window.supabase === 'undefined') return;

    // init() now returns the session (Bug 1 fix) so injectNavAuth gets the real value
    const session = await AuthManager.init();
    injectNavAuth(session);

    // onAuthChange() now exists (Bug 3 fix) — re-render on every future state change
    AuthManager.onAuthChange(s => injectNavAuth(s));
  });

})();

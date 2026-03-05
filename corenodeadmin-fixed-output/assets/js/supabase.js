/**
 * CoreNode – Supabase Client + AuthManager + DB
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for ALL Supabase interactions.
 *
 * KEY RULES that prevent the race-condition bugs this file has suffered:
 *
 *  1. NO auto-init.  This file intentionally does NOT call AuthManager.init()
 *     on DOMContentLoaded.  Each page (or navbar-auth.js) calls init() exactly
 *     once, so only one onAuthStateChange listener is ever registered per page.
 *
 *  2. init() RETURNS _session.  Every caller does:
 *       const session = await AuthManager.init();
 *       if (!session) { redirect; return; }
 *     That only works if init() actually returns the session object.
 *
 *  3. getUserEmail() is exported.  Several files call AuthManager.getUserEmail();
 *     it must exist (it's an alias for getEmail()).
 *
 *  4. onAuthChange(fn) is exported.  navbar-auth.js needs it to re-render the
 *     navbar whenever auth state changes without calling init() a second time.
 *
 *  5. The DB object is defined here and exposes every table operation needed
 *     by dashboard.html, orders.js, support.js, checkout.js, settings.js, and
 *     admin-dashboard.html.
 */

const SUPABASE_URL  = 'https://bwxxudmhvvmfcqkdpvji.supabase.co';
const SUPABASE_ANON = 'sb_publishable_aGdNeAjncuHW-g_9qscn5A_UDxDsCol';

/* ─────────────────────────────────────────────────────────────────
   SUPABASE CLIENT (singleton)
───────────────────────────────────────────────────────────────── */
let _sb = null;
function getSB() {
  if (!_sb) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _sb;
}

/* ─────────────────────────────────────────────────────────────────
   AUTH MANAGER
───────────────────────────────────────────────────────────────── */
const AuthManager = (() => {
  let _session   = null;
  let _profile   = null;
  let _listeners = [];   // callbacks registered via onAuthChange()

  /**
   * Restore the persisted session, load the user profile, register the
   * single onAuthStateChange listener, and return the current session.
   *
   * IMPORTANT: returns _session so callers can branch:
   *   const session = await AuthManager.init();
   *   if (!session) { window.location.href = 'login.html'; return; }
   */
  async function init() {
    const sb = getSB();

    const { data } = await sb.auth.getSession();
    _session = data.session;

    if (_session) {
      await _loadProfile(_session.user.id);
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      _profile = null;
      if (session) {
        await _loadProfile(session.user.id);
      }
      _syncDataAuthElements();
      _listeners.forEach(fn => { try { fn(session); } catch (e) { console.error('[AuthManager] onAuthChange listener threw:', e); } });
    });

    _syncDataAuthElements();
    return _session;   // ← CRITICAL: callers depend on this return value
  }

  async function _loadProfile(userId) {
    const { data } = await getSB()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) _profile = data;
  }

  /* ── Getters ──────────────────────────────────────────────────── */
  function getUser()      { return _session?.user  || null; }
  function getUserId()    { return _session?.user?.id    || null; }
  function getEmail()     { return _session?.user?.email || ''; }
  function getUserEmail() { return _session?.user?.email || ''; }  // alias — many callers use this name
  function isLoggedIn()   { return !!_session; }
  function isAdmin()      { return _profile?.role === 'admin'; }

  /**
   * Register a callback to be called whenever auth state changes.
   * Used by navbar-auth.js to re-render the navbar on login/logout
   * without triggering a second init() call.
   */
  function onAuthChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  /* ── Auth actions ─────────────────────────────────────────────── */
  async function signUp(email, password) {
    const { data, error } = await getSB().auth.signUp({ email, password });
    if (data?.user) {
      await getSB().from('profiles').insert([{ id: data.user.id, email, role: 'user' }]);
    }
    return { data, error };
  }

  async function signIn(email, password) {
    const { data, error } = await getSB().auth.signInWithPassword({ email, password });
    if (!error) {
      _session = data.session;
      await _loadProfile(data.user.id);
    }
    return { data, error };
  }

  async function signOut() {
    await getSB().auth.signOut();
    _session = null;
    _profile = null;
    window.location.href = 'index.html';
  }

  /* ── Guards ───────────────────────────────────────────────────── */
  function requireAuth() {
    if (!_session) { window.location.href = 'login.html'; return false; }
    return true;
  }
  function requireAdmin() {
    if (!_session || !isAdmin()) { window.location.href = 'index.html'; return false; }
    return true;
  }

  /* ── Internal: toggle data-auth elements ─────────────────────── */
  function _syncDataAuthElements() {
    document.querySelectorAll("[data-auth='out']").forEach(el => {
      el.style.display = _session ? 'none' : '';
    });
    document.querySelectorAll("[data-auth='in']").forEach(el => {
      el.style.display = _session ? '' : 'none';
    });
  }

  return {
    init,
    signUp,
    signIn,
    signOut,
    getUser,
    getUserId,
    getEmail,
    getUserEmail,   // alias — do NOT remove
    isLoggedIn,
    isAdmin,
    onAuthChange,   // required by navbar-auth.js
    requireAuth,
    requireAdmin,
  };
})();

/* ─────────────────────────────────────────────────────────────────
   DB — all Supabase table operations
   Every method returns the raw Supabase { data, error } object.
───────────────────────────────────────────────────────────────── */
const DB = (() => {

  /* ── Orders ───────────────────────────────────────────────────── */

  async function getMyOrders(userId) {
    return getSB()
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  }

  async function getAllOrders() {
    return getSB()
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async function insertOrder(order) {
    return getSB().from('orders').insert([order]).select().single();
  }

  async function updateOrder(id, fields) {
    return getSB().from('orders').update(fields).eq('id', id);
  }

  async function decrementStock(planId) {
    const { data } = await getSB().from('plans').select('stock').eq('id', planId).single();
    if (data && data.stock > 0) {
      return getSB().from('plans').update({ stock: data.stock - 1 }).eq('id', planId);
    }
    return { error: null };
  }

  /* ── Tickets ──────────────────────────────────────────────────── */

  async function getMyTickets(userId) {
    return getSB()
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  }

  async function getAllTickets() {
    return getSB()
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
  }

  async function insertTicket(ticket) {
    return getSB().from('tickets').insert([ticket]).select().single();
  }

  async function updateTicket(id, updates) {
    return getSB().from('tickets').update(updates).eq('id', id);
  }

  async function deleteTicket(id) {
    return getSB().from('tickets').delete().eq('id', id);
  }

  /* ── Settings ─────────────────────────────────────────────────── */

  /**
   * Read the single settings row (id = 1).
   * Returns { data: { id, qr_image, upi_id, updated_at } | null, error }
   */
  async function getSettings() {
    return getSB()
      .from('settings')
      .select('id, qr_image, upi_id, updated_at')
      .eq('id', 1)
      .maybeSingle();
  }

  /**
   * Update individual settings fields.
   * @param {string|null} qr   – new QR data-URL (pass null to skip)
   * @param {string|null} upi  – new UPI ID string (pass null to skip)
   */
  async function updateSettings(qr, upi) {
    const payload = { updated_at: new Date().toISOString() };
    if (qr  != null) payload.qr_image = qr;
    if (upi != null) payload.upi_id   = upi;
    return getSB().from('settings').update(payload).eq('id', 1);
  }

  /**
   * Upsert the settings row — safe on first run when row may not exist.
   * @param {{ qr_image?: string, upi_id?: string }} updates
   */
  async function upsertSettings(updates) {
    const payload = { id: 1, updated_at: new Date().toISOString() };
    if (updates.qr_image !== undefined) payload.qr_image = updates.qr_image;
    if (updates.upi_id   !== undefined) payload.upi_id   = updates.upi_id;
    return getSB().from('settings').upsert(payload, { onConflict: 'id' });
  }

  /* ── Plans ────────────────────────────────────────────────────── */

  async function getPlans() {
    return getSB()
      .from('plans')
      .select('*')
      .eq('deleted', false)
      .order('sort_order', { ascending: true });
  }

  return {
    getMyOrders, getAllOrders, insertOrder, updateOrder, decrementStock,
    getMyTickets, getAllTickets, insertTicket, updateTicket, deleteTicket,
    getSettings, updateSettings, upsertSettings,
    getPlans,
  };
})();

/*
 * NO auto-init intentionally.
 * navbar-auth.js calls AuthManager.init() on every public page.
 * dashboard.html, login.html, and admin pages call it themselves.
 * Having a second fire-and-forget init() here causes duplicate
 * onAuthStateChange listeners and race conditions on _profile.
 */

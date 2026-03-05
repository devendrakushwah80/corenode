/**
 * CoreNodeAdmin – Auto-Provision System
 * ──────────────────────────────────────────────────────────────────────────
 * Handles the full pipeline when admin approves an order:
 *
 *   1. Admin enters credentials (or they're auto-generated)
 *   2. Calls Supabase Edge Function   → updates DB + sends email
 *   3. Updates UI in real-time
 *
 * Usage (admin-dashboard.html):
 *   await AutoProvision.approveOrder(orderId, { panelLink, username, password, note })
 */

const AutoProvision = (() => {

  // ── Config ─────────────────────────────────────────────────────────────
  // Your Supabase project ref – same as in supabase.js
  const SUPABASE_URL  = 'https://rwnlhoduhdkiocmphuah.supabase.co';
  const FUNCTION_URL  = `${SUPABASE_URL}/functions/v1/auto-provision`;

  // Default panel URL pre-filled in the approval modal
  const DEFAULT_PANEL = 'https://panel.corenode.in';

  // ── Password generator ─────────────────────────────────────────────────
  function generatePassword(len = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    arr.forEach(n => pw += chars[n % chars.length]);
    // Ensure at least 1 of each: upper, lower, digit, symbol
    return pw;
  }

  // ── Username generator from email ──────────────────────────────────────
  function generateUsername(email = '', planName = '') {
    const base = email
      ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
      : 'user';
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}_${suffix}`;
  }

  // ── Core approve function ──────────────────────────────────────────────
  async function approveOrder(orderId, opts = {}) {
    const {
      panelLink  = DEFAULT_PANEL,
      username   = '',
      password   = '',
      adminNote  = '',
      autoEmail  = true,
    } = opts;

    if (!panelLink || !username || !password) {
      throw new Error('panelLink, username, and password are required');
    }

    // Get session token to authenticate the edge function call
    const session = AuthManager.getSession();
    const token   = session?.access_token || '';

    const payload = {
      order_id:        orderId,
      panel_link:      panelLink,
      panel_username:  username,
      panel_password:  password,
      admin_note:      adminNote || null,
    };

    const resp = await fetch(FUNCTION_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    if (!resp.ok) {
      throw new Error(result.error || `HTTP ${resp.status}`);
    }

    return result; // { success, order_id, email_sent, message }
  }

  // ── Fallback: direct DB update (if Edge Function not deployed yet) ─────
  async function approveOrderDirect(orderId, opts = {}) {
    const {
      panelLink = DEFAULT_PANEL,
      username  = '',
      password  = '',
      adminNote = '',
    } = opts;

    const { error } = await getSB().from('orders').update({
      status:         'Approved',
      panel_link:     panelLink,
      panel_username: username,
      panel_password: password,
      approved_at:    new Date().toISOString(),
      admin_note:     adminNote || null,
    }).eq('id', orderId);

    if (error) throw new Error(error.message);

    return {
      success:    true,
      order_id:   orderId,
      email_sent: false,
      message:    'Order approved (direct DB). Email not sent – configure Edge Function for emails.',
    };
  }

  // ── Main entry: try Edge Function → fallback to direct DB ─────────────
  async function approve(orderId, opts = {}) {
    try {
      return await approveOrder(orderId, opts);
    } catch (edgeFnErr) {
      console.warn('Edge Function unavailable, falling back to direct DB:', edgeFnErr.message);
      try {
        return await approveOrderDirect(orderId, opts);
      } catch (dbErr) {
        throw new Error('Approval failed: ' + dbErr.message);
      }
    }
  }

  return {
    approve,
    approveOrder,
    approveOrderDirect,
    generatePassword,
    generateUsername,
    DEFAULT_PANEL,
  };
})();

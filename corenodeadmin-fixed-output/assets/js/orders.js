/**
 * CoreNode – Orders Page
 * ─────────────────────────────────────────────────────────────────
 * Loads orders from Supabase for the logged-in user.
 * orders.html includes navbar-auth.js which calls AuthManager.init(),
 * so by the time OrdersPage.init() runs the session is already available.
 * We do NOT call AuthManager.init() again here — that would register a
 * duplicate onAuthStateChange listener (Bug 12 fix).
 */
const OrdersPage = (() => {
  let userId       = null;
  let userEmail    = '';
  let pollInterval = null;
  let prevStatuses = {};
  let approvalAnimated = {};
  let _orders = [];

  /* ── Data loading ─────────────────────────────────────────────── */

  async function loadOrders() {
    if (typeof DB !== 'undefined' && typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
      const { data, error } = await DB.getMyOrders(AuthManager.getUserId());
      if (!error) return data || [];
      console.error('[Orders] loadOrders Supabase error:', error.message);
    }
    // localStorage fallback (used when Supabase is unavailable, not as primary)
    userEmail = localStorage.getItem('cna_last_email') || '';
    try {
      const all = JSON.parse(localStorage.getItem('cna_orders') || '[]');
      return userEmail
        ? all.filter(o => (o.email || o.customer_email || '').toLowerCase() === userEmail.toLowerCase())
        : all;
    } catch (e) { return []; }
  }

  /* ── Rendering ────────────────────────────────────────────────── */

  async function render() {
    _orders = await loadOrders();
    const container = document.getElementById('orders-container');
    const empty     = document.getElementById('orders-empty');

    // Show logged-in email at the top of the page if element exists
    const emailDisp = document.getElementById('user-email-display');
    const dispEmail = (typeof AuthManager !== 'undefined' && AuthManager.getUserEmail()) || userEmail;
    if (emailDisp && dispEmail) {
      emailDisp.textContent = dispEmail;
      document.getElementById('user-email-row')?.classList.remove('hidden');
    }

    if (!container) return;
    if (_orders.length === 0) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    container.innerHTML = _orders.map(o => renderOrderCard(o)).join('');

    _orders.forEach(o => {
      const oid = o.id || o.orderId;
      if (prevStatuses[oid] && prevStatuses[oid] !== 'Approved' && o.status === 'Approved' && !approvalAnimated[oid]) {
        approvalAnimated[oid] = true;
        showApprovalNotification(o);
      }
      prevStatuses[oid] = o.status;
    });
    if (Object.keys(prevStatuses).length === 0) {
      _orders.forEach(o => { prevStatuses[o.id || o.orderId] = o.status; });
    }
  }

  function renderOrderCard(order) {
    const oid       = order.id || order.orderId;
    const plan      = order.plan_name || order.plan;
    const type      = order.plan_type || order.type;
    const utr       = order.utr || '—';
    const email     = order.customer_email || order.email || '—';
    const date      = order.created_at || order.createdAt;
    const panelLink = order.panel_link || order.panelLink;
    const panelUser = order.panel_username || order.panelUsername;
    const panelPass = order.panel_password || order.panelPassword;

    const statusConfig = {
      'Pending':  { cls: 'status-pending-card',  dot: '#d97706', label: 'Pending Verification' },
      'Approved': { cls: 'status-approved-card', dot: '#16a34a', label: 'Approved' },
      'Rejected': { cls: 'status-rejected-card', dot: '#dc2626', label: 'Rejected' },
    };
    const sc = statusConfig[order.status] || statusConfig['Pending'];

    let activationCard = '';
    if (order.status === 'Approved' && panelLink) {
      const approvedAt = order.approved_at ? `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.35rem">Activated ${fmt(order.approved_at)}</div>` : '';
      const adminNote  = order.admin_note  ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:0.5rem;padding:0.5rem 0.75rem;background:var(--bg-base);border-left:2px solid var(--accent);border-radius:0 4px 4px 0">📋 ${esc(order.admin_note)}</div>` : '';
      activationCard = `<div class="activation-card" id="activation-${oid}">
        <div class="activation-header"><div class="activation-icon">✅</div>
          <div><div style="font-weight:700;color:#4ade80;font-size:0.95rem">Your server has been activated!</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.15rem">Use the credentials below to access your control panel.</div>
          ${approvedAt}</div></div>
        <div class="cred-grid">
          <div class="cred-item"><div class="cred-label">Panel Link</div><div class="cred-value">${esc(panelLink)}</div></div>
          <div class="cred-item"><div class="cred-label">Username</div><div class="cred-value font-mono">${esc(panelUser || '—')}</div></div>
          <div class="cred-item"><div class="cred-label">Password</div>
            <div class="cred-value font-mono" id="pw-${oid}" style="filter:blur(4px);cursor:pointer" onclick="document.getElementById('pw-${esc(String(oid))}').style.filter='none'">${esc(panelPass || '—')}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem">Click to reveal</div></div></div>
        ${adminNote}
        <a href="${esc(panelLink)}" target="_blank" rel="noopener" class="btn btn-success" style="margin-top:0.5rem;gap:0.5rem">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
          Open Control Panel</a></div>`;
    } else if (order.status === 'Approved') {
      activationCard = `<div class="activation-card"><div style="display:flex;align-items:center;gap:0.6rem;">
        <span style="font-size:1.2rem">✅</span><div>
        <div style="font-weight:700;color:#4ade80;font-size:0.875rem">Order Approved</div>
        <div style="font-size:0.78rem;color:var(--text-muted)">Your panel credentials will be shared shortly.</div></div></div></div>`;
    }

    let statusMessage = '';
    if (order.status === 'Pending') {
      statusMessage = `<div class="pending-notice"><div class="pending-spinner"></div><span>Human verification is in progress. This may take up to 48 hours.</span></div>`;
    } else if (order.status === 'Rejected') {
      statusMessage = `<div class="rejected-notice"><span>❌</span><span>Your order was rejected. Please contact support or resubmit your payment details.</span></div>`;
    }

    const typeIcon   = type?.toLowerCase().includes('minecraft') ? '⛏️' : type?.toLowerCase().includes('vps') ? '🖥️' : type?.toLowerCase().includes('domain') ? '🌐' : '📦';
    const oidDisplay = typeof oid === 'number' ? `#${oid}` : oid;

    return `<div class="order-card ${sc.cls}" id="order-card-${oid}">
      <div class="order-card-header">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div class="order-type-icon">${typeIcon}</div>
          <div><div class="order-plan-name">${esc(plan)}</div>
          <div class="order-meta">${esc(type || '')} · ${fmt(date)}</div></div></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.3rem;">
          <div class="order-status-dot" style="background:${sc.dot}">${sc.label}</div>
          <div class="order-price">₹${Number(order.price || 0).toLocaleString('en-IN')}</div></div></div>
      <div class="order-details">
        <div class="order-detail-item"><span class="order-detail-label">Order ID</span><span class="order-detail-val font-mono">${esc(String(oidDisplay))}</span></div>
        <div class="order-detail-item"><span class="order-detail-label">UTR / Txn ID</span><span class="order-detail-val font-mono">${esc(utr)}</span></div>
        <div class="order-detail-item"><span class="order-detail-label">Email</span><span class="order-detail-val">${esc(email)}</span></div></div>
      ${statusMessage}${activationCard}
      <div class="order-card-footer">
        <button class="btn btn-ghost btn-sm" onclick="OrdersPage.openSupport('${esc(String(oid))}','${esc(plan)}')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>
          Contact Support</button></div></div>`;
  }

  /* ── Notifications ────────────────────────────────────────────── */

  function showApprovalNotification(order) {
    const plan  = order.plan_name || order.plan;
    const notif = document.createElement('div');
    notif.className = 'approval-notif';
    notif.innerHTML = `<div class="approval-notif-inner"><div class="approval-check">✔</div>
      <div><div style="font-weight:700;font-size:0.9rem">Order Approved!</div>
      <div style="font-size:0.78rem;opacity:0.85">${esc(plan)} is now active</div></div></div>`;
    document.body.appendChild(notif);
    requestAnimationFrame(() => requestAnimationFrame(() => notif.classList.add('show')));
    setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 400); }, 5000);
    render();
  }

  /* ── Support modal ────────────────────────────────────────────── */

  function openSupport(orderId, planName) {
    const modal = document.getElementById('support-modal-overlay');
    if (!modal) return;
    const oEl = document.getElementById('support-order-id');    if (oEl) oEl.textContent  = orderId;
    const pEl = document.getElementById('support-plan-ref');    if (pEl) pEl.textContent  = planName;
    document.getElementById('support-order-ref').value = orderId;
    const emailEl = document.getElementById('support-email');
    if (emailEl) emailEl.value = (typeof AuthManager !== 'undefined' && AuthManager.getUserEmail()) || userEmail || '';
    document.getElementById('support-message').value = '';
    const notice = document.getElementById('support-notice'); if (notice) notice.classList.add('hidden');
    const btn    = document.getElementById('support-submit');  if (btn)    { btn.disabled = false; btn.textContent = 'Send Message'; }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSupport() {
    document.getElementById('support-modal-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  async function submitSupport() {
    const email    = (document.getElementById('support-email')?.value    || '').trim();
    const message  = (document.getElementById('support-message')?.value  || '').trim();
    const orderRef = (document.getElementById('support-order-ref')?.value || '').trim();
    if (!email || !message) { showToast('Please fill in all fields', 'error'); return; }

    const btn = document.getElementById('support-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    const ticket = {
      user_id:        (typeof AuthManager !== 'undefined' && AuthManager.getUserId()) || null,
      subject:        `Support for order ${orderRef}`,
      message,
      status:         'Open',
      admin_reply:    null,
      order_ref:      orderRef,
      customer_email: email,
    };

    let saved = false;
    if (typeof DB !== 'undefined') {
      const { error } = await DB.insertTicket(ticket);
      if (!error) saved = true;
      else console.error('[Orders] insertTicket error:', error.message);
    }
    if (!saved) {
      try {
        const tickets = JSON.parse(localStorage.getItem('cna_support_tickets') || '[]');
        tickets.unshift({ ticketId: 'TKT-' + Date.now().toString(36).toUpperCase(), ...ticket, createdAt: new Date().toISOString() });
        localStorage.setItem('cna_support_tickets', JSON.stringify(tickets));
      } catch (e) {}
    }

    document.getElementById('support-notice')?.classList.remove('hidden');
    if (btn) { btn.disabled = true; btn.textContent = 'Sent!'; }
    showToast('Support ticket submitted!', 'success');
    setTimeout(closeSupport, 2500);
  }

  /* ── Polling & real-time ──────────────────────────────────────── */

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
      const fresh = await loadOrders();
      fresh.forEach(o => {
        const oid  = o.id || o.orderId;
        const prev = prevStatuses[oid];
        if (prev && prev !== o.status && o.status === 'Approved' && !approvalAnimated[oid]) {
          approvalAnimated[oid] = true;
          showApprovalNotification(o);
        }
        prevStatuses[oid] = o.status;
      });
      _orders = fresh;
      const container = document.getElementById('orders-container');
      if (container && container.children.length > 0) render();
    }, 10000);
  }

  function subscribeRealtime() {
    if (typeof getSB === 'undefined' || !userId) return;
    getSB().channel('orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => render())
      .subscribe();
  }

  /* ── Toast ────────────────────────────────────────────────────── */

  function showToast(message, type = 'info') {
    let toast = document.getElementById('orders-toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'orders-toast'; toast.className = 'toast'; document.body.appendChild(toast); }
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  /* ── Helpers ──────────────────────────────────────────────────── */
  function esc(s)  { const d = document.createElement('div'); d.appendChild(document.createTextNode(s || '')); return d.innerHTML; }
  function fmt(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }

  /* ── Init ─────────────────────────────────────────────────────── */
  async function init() {
    // navbar-auth.js (loaded before this file on orders.html) has already called
    // AuthManager.init() and awaited it, so the session is available immediately.
    // We do NOT call AuthManager.init() again to avoid a duplicate listener.
    if (typeof AuthManager !== 'undefined') {
      if (!AuthManager.isLoggedIn()) {
        // Edge case: navbar-auth init completed but user is not logged in
        window.location.href = 'login.html';
        return;
      }
      userId    = AuthManager.getUserId();
      userEmail = AuthManager.getUserEmail();
    }

    userEmail = userEmail || localStorage.getItem('cna_last_email') || '';

    await render();
    startPolling();
    subscribeRealtime();

    document.getElementById('support-close')?.addEventListener('click', closeSupport);
    document.getElementById('support-modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'support-modal-overlay') closeSupport();
    });
    document.getElementById('support-submit')?.addEventListener('click', submitSupport);
  }

  return { init, render, openSupport, closeSupport, submitSupport, showToast };
})();

document.addEventListener('DOMContentLoaded', () => OrdersPage.init());

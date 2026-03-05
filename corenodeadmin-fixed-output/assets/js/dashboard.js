/**
 * CoreNode – Dashboard Page Logic
 * Handles the user-facing dashboard: orders, tickets, account, password change.
 * Requires: supabase.js, support.js loaded first.
 */

/* ── Module-level state ── */
let _dashOrders  = [];
let _dashTickets = [];

/* ── Utilities ── */
function _esc(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s || ''));
  return d.innerHTML;
}
function _fmt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (e) { return iso; }
}

/* ── Tab switching ── */
function switchTab(name, btn) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  const section = document.querySelector('#tab-' + name);
  if (section) section.classList.add('active');
  document.querySelectorAll('.dash-nav-item, .dash-mobile-btn').forEach(b => {
    if (b.dataset.tab) b.classList.toggle('active', b.dataset.tab === name);
  });
}

/* ── New-ticket form toggle ── */
function toggleNewTicket() {
  const form = document.getElementById('new-ticket-form');
  const icon = document.getElementById('ticket-toggle-icon');
  const open = form.classList.toggle('open');
  if (icon) icon.style.transform = open ? 'rotate(45deg)' : '';
}

/* ── Load & render orders ── */
async function loadOrders() {
  const userId = AuthManager.getUserId();
  if (!userId) return;

  const { data, error } = await DB.getMyOrders(userId);
  if (error) { console.error('[Dashboard] loadOrders error:', error.message); return; }

  _dashOrders = data || [];

  // Stats
  document.getElementById('ov-total').textContent   = _dashOrders.length;
  document.getElementById('ov-active').textContent  = _dashOrders.filter(o => o.status === 'Approved').length;
  document.getElementById('ov-pending').textContent = _dashOrders.filter(o => o.status === 'Pending').length;

  const badge = document.getElementById('orders-count-badge');
  if (badge) {
    badge.textContent = _dashOrders.length;
    badge.classList.toggle('hidden', _dashOrders.length === 0);
  }

  _renderOrders(_dashOrders,          document.getElementById('orders-list'));
  _renderOrders(_dashOrders.slice(0, 3), document.getElementById('overview-recent-orders'));
}

function _renderOrders(orders, container) {
  if (!container) return;
  if (!orders || orders.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--text-muted);font-size:0.88rem">No orders found. <a href="minecraft.html" style="color:var(--accent)">Browse plans →</a></div>';
    return;
  }

  const statusDots  = { Approved: '#00ff9c', Pending: '#d97706', Rejected: '#dc2626' };
  const statusLabels = { Approved: 'Approved', Pending: 'Pending Verification', Rejected: 'Rejected' };
  const statusCls   = { Approved: 'status-approved', Pending: 'status-pending', Rejected: 'status-rejected' };

  container.innerHTML = orders.map(o => {
    const dot   = statusDots[o.status]  || '#888';
    const label = statusLabels[o.status] || o.status;
    const cls   = statusCls[o.status]   || '';
    const icon  = (o.plan_type || '').toLowerCase().includes('minecraft') ? '⛏️'
                : (o.plan_type || '').toLowerCase().includes('vps')       ? '🖥️'
                : (o.plan_type || '').toLowerCase().includes('domain')    ? '🌐' : '📦';

    let creds = '';
    if (o.status === 'Approved' && o.panel_link) {
      creds = `<div class="creds-card">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem">
          <span>✅</span><span style="font-weight:700;font-size:0.85rem;color:#4ade80">Server Activated</span>
        </div>
        <div class="creds-grid">
          <div class="cred-item"><div class="cred-label">Panel Link</div>
            <div class="cred-value"><a href="${_esc(o.panel_link)}" target="_blank" style="color:var(--accent)">${_esc(o.panel_link)}</a></div></div>
          <div class="cred-item"><div class="cred-label">Username</div>
            <div class="cred-value">${_esc(o.panel_username || '—')}</div></div>
          <div class="cred-item"><div class="cred-label">Password</div>
            <div class="cred-value cred-pw" onclick="this.classList.add('revealed')">${_esc(o.panel_password || '—')}
              <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.2rem;font-family:sans-serif">Click to reveal</div></div>
        </div></div>
      </div>`;
    }

    return `<div class="d-order-card ${cls}">
      <div class="d-order-header">
        <div>
          <div class="d-order-name">${icon} ${_esc(o.plan_name)}</div>
          <div class="d-order-meta">${_esc(o.plan_type || '')} · ${_fmt(o.created_at)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.35rem">
          <div style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:600;color:var(--text-secondary)">
            <span style="width:7px;height:7px;border-radius:50%;background:${dot};display:inline-block;box-shadow:0 0 6px ${dot}"></span>${label}
          </div>
          <div class="d-order-price">₹${Number(o.price || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div class="d-order-details">
        <div class="d-detail"><div class="d-detail-label">Order ID</div>
          <div class="d-detail-val">${_esc(String(o.id || '—').slice(0, 8))}</div></div>
        <div class="d-detail"><div class="d-detail-label">UTR</div>
          <div class="d-detail-val">${_esc(o.utr || '—')}</div></div>
      </div>
      ${creds}
    </div>`;
  }).join('');
}

/* ── Load & render tickets ── */
async function loadTickets() {
  const userId = AuthManager.getUserId();
  if (!userId) return;

  const { data, error } = await DB.getMyTickets(userId);
  if (error) { console.error('[Dashboard] loadTickets error:', error.message); return; }

  _dashTickets = data || [];
  const countEl = document.getElementById('ov-tickets');
  if (countEl) countEl.textContent = _dashTickets.length;
  _renderTickets();
}

function _renderTickets() {
  const container = document.getElementById('tickets-list');
  if (!container) return;

  if (_dashTickets.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--text-muted);font-size:0.88rem">No tickets yet. Submit one above if you need help.</div>';
    return;
  }

  const colors = { Open: '#d97706', Answered: '#00ff9c', Closed: '#64748b' };
  container.innerHTML = _dashTickets.map(t => `
    <div class="ticket-card">
      <div class="ticket-header">
        <div>
          <div class="ticket-subject">${_esc(t.subject || '(No subject)')}</div>
          <div class="ticket-meta">${_fmt(t.created_at)}</div>
        </div>
        <span style="font-size:0.75rem;font-weight:700;color:${colors[t.status] || '#d97706'};white-space:nowrap;background:rgba(0,0,0,.2);padding:0.2rem 0.6rem;border-radius:20px;border:1px solid currentColor">${_esc(t.status || 'Open')}</span>
      </div>
      <div class="ticket-body">${_esc(t.message)}</div>
      ${t.admin_reply ? `<div class="ticket-reply"><div class="ticket-reply-label">✅ Support Reply</div>${_esc(t.admin_reply)}</div>` : ''}
    </div>`).join('');
}

/* ── Submit new ticket ── */
async function submitTicket() {
  const subject = (document.getElementById('new-ticket-subject')?.value || '').trim();
  const message = (document.getElementById('new-ticket-message')?.value || '').trim();
  const errEl   = document.getElementById('ticket-error');
  const succEl  = document.getElementById('ticket-success');
  const btn     = document.getElementById('submit-ticket-btn');

  if (errEl) errEl.style.display = 'none';
  if (succEl) succEl.style.display = 'none';

  if (!subject || !message) {
    if (errEl) { errEl.textContent = 'Please fill in subject and message.'; errEl.style.display = 'block'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  const { error } = await DB.insertTicket({
    user_id:        AuthManager.getUserId(),
    customer_email: AuthManager.getUserEmail(),
    subject,
    message,
    status:      'Open',
    admin_reply: null,
    order_ref:   null,
  });

  if (btn) { btn.disabled = false; btn.textContent = 'Submit Ticket'; }

  if (error) {
    if (errEl) { errEl.textContent = error.message; errEl.style.display = 'block'; }
    return;
  }

  if (succEl) { succEl.textContent = "Ticket submitted! We'll get back to you soon."; succEl.style.display = 'block'; }
  if (document.getElementById('new-ticket-subject')) document.getElementById('new-ticket-subject').value = '';
  if (document.getElementById('new-ticket-message')) document.getElementById('new-ticket-message').value = '';
  await loadTickets();
}

/* ── Change password ── */
async function changePassword() {
  const np  = (document.getElementById('new-password')?.value  || '');
  const cp  = (document.getElementById('confirm-password')?.value || '');
  const msg = document.getElementById('pw-change-msg');

  const _show = (text, ok) => {
    if (!msg) return;
    msg.textContent = text;
    msg.style.display    = 'block';
    msg.style.background = ok ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)';
    msg.style.border     = ok ? '1px solid rgba(22,163,74,.3)' : '1px solid rgba(220,38,38,.3)';
    msg.style.color      = ok ? '#4ade80' : '#f87171';
    msg.style.borderRadius = 'var(--radius)';
    msg.style.padding    = '0.7rem 1rem';
  };

  if (!np || !cp)   { _show('Please fill in both fields.');         return; }
  if (np !== cp)    { _show('Passwords do not match.');             return; }
  if (np.length < 6){ _show('Password must be at least 6 characters.'); return; }

  const { error } = await getSB().auth.updateUser({ password: np });
  if (error) { _show(error.message); return; }

  _show('Password updated successfully!', true);
  if (document.getElementById('new-password'))    document.getElementById('new-password').value    = '';
  if (document.getElementById('confirm-password')) document.getElementById('confirm-password').value = '';
}

/* ── Page init ── */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof AuthManager === 'undefined' || typeof window.supabase === 'undefined') return;

  // Gate: redirect to login if not authenticated
  const session = await AuthManager.init();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const user = AuthManager.getUser();

  // Populate header / account section
  const emailEl = document.getElementById('dash-user-email');
  if (emailEl) emailEl.textContent = user.email || '';
  const acctEmail = document.getElementById('account-email');
  if (acctEmail) acctEmail.textContent = user.email || '';
  const acctUid = document.getElementById('account-uid');
  if (acctUid) acctUid.textContent = user.id || '';
  const acctCreated = document.getElementById('account-created');
  if (acctCreated) acctCreated.textContent = _fmt(user.created_at);

  // Logout
  document.getElementById('dash-logout-btn')
    ?.addEventListener('click', () => AuthManager.signOut());

  // Mobile sidebar toggle
  const toggleBtn = document.getElementById('dash-sidebar-toggle');
  const sidebar   = document.querySelector('.dash-sidebar');
  if (toggleBtn && sidebar) {
    if (window.innerWidth <= 768) toggleBtn.style.display = 'flex';
    window.addEventListener('resize', () => {
      toggleBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    });
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('visible');
    });
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('visible');
    });
  }

  // Load data
  await Promise.all([loadOrders(), loadTickets()]);

  // Real-time updates
  getSB()
    .channel('dash-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
      () => loadOrders())
    .subscribe();

  getSB()
    .channel('dash-tickets')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `user_id=eq.${user.id}` },
      () => loadTickets())
    .subscribe();
});

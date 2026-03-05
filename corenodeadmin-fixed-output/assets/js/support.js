/**
 * CoreNode – Support Ticket System
 * ──────────────────────────────────────────────────────────────
 * Ticket statuses: Open | Answered | Closed
 *
 * UserSupport  – for user-facing dashboard
 * SupportAdmin – for admin panel
 */

/* ═══════════════════════════════════════════════════════
   USER-FACING SUPPORT
═══════════════════════════════════════════════════════ */
const UserSupport = (() => {

  /**
   * Submit a new ticket.
   * @param {object} opts - { subject, message, orderRef }
   * @returns {{ data, error }}
   */
  async function submitTicket({ subject, message, orderRef = '' }) {
    if (!subject?.trim() || !message?.trim()) {
      return { data: null, error: { message: 'Subject and message are required.' } };
    }

    const user          = (typeof AuthManager !== 'undefined') ? AuthManager.getUser() : null;
    const userId        = user?.id || null;
    const customerEmail = user?.email || '';

    const ticket = {
      user_id:        userId,
      customer_email: customerEmail,
      subject:        subject.trim(),
      message:        message.trim(),
      order_ref:      orderRef.trim() || null,
      status:         'Open',
      admin_reply:    null,
    };

    // Try Supabase
    if (typeof DB !== 'undefined') {
      const { data, error } = await DB.insertTicket(ticket);
      if (!error) return { data, error: null };
      console.warn('[Support] Supabase insert failed:', error.message);
    }

    // localStorage fallback
    try {
      const all = JSON.parse(localStorage.getItem('cna_support_tickets') || '[]');
      const local = { ...ticket, id: 'local_' + Date.now(), created_at: new Date().toISOString() };
      all.push(local);
      localStorage.setItem('cna_support_tickets', JSON.stringify(all));
      return { data: local, error: null };
    } catch (e) {
      return { data: null, error: { message: 'Failed to save ticket.' } };
    }
  }

  /**
   * Fetch current user's tickets.
   * @returns {Array}
   */
  async function getMyTickets() {
    const userId = (typeof AuthManager !== 'undefined') ? AuthManager.getUserId() : null;

    if (userId && typeof DB !== 'undefined') {
      const { data, error } = await DB.getMyTickets(userId);
      if (!error) return data || [];
    }

    // localStorage fallback
    try { return JSON.parse(localStorage.getItem('cna_support_tickets') || '[]'); }
    catch (e) { return []; }
  }

  /**
   * Render a "New Ticket" form into a container element.
   * @param {string} containerId
   * @param {Function} [onSuccess] - called with new ticket data after submit
   */
  function initNewTicketForm(containerId, onSuccess) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="new-ticket-panel">
        <div class="new-ticket-toggle" id="nt-toggle" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-radius:var(--radius-lg);background:var(--bg-card);border:1px solid var(--border);">
          <span style="font-weight:700;font-size:0.9rem;display:flex;align-items:center;gap:0.5rem">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"/></svg>
            Open a Support Ticket
          </span>
          <svg id="nt-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="transition:transform .2s;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div id="nt-form" style="display:none;padding:1.25rem;background:var(--bg-card);border:1px solid var(--border);border-top:none;border-radius:0 0 var(--radius-lg) var(--radius-lg);">
          <div id="nt-msg" style="display:none;padding:0.65rem 0.9rem;border-radius:var(--radius);font-size:0.83rem;margin-bottom:0.75rem"></div>
          <div class="form-group">
            <label class="form-label">Subject *</label>
            <input class="form-input" id="nt-subject" type="text" placeholder="Brief description of your issue" />
          </div>
          <div class="form-group">
            <label class="form-label">Order Reference <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
            <input class="form-input" id="nt-order-ref" type="text" placeholder="Order ID if issue is order-related" />
          </div>
          <div class="form-group">
            <label class="form-label">Message *</label>
            <textarea class="form-input" id="nt-message" rows="4" placeholder="Describe your issue in detail…" style="resize:vertical"></textarea>
          </div>
          <button class="btn btn-primary" id="nt-submit-btn" style="min-width:140px">Submit Ticket</button>
        </div>
      </div>`;

    // Toggle open/close
    document.getElementById('nt-toggle').addEventListener('click', () => {
      const form    = document.getElementById('nt-form');
      const chevron = document.getElementById('nt-chevron');
      const open    = form.style.display === 'none';
      form.style.display    = open ? '' : 'none';
      chevron.style.transform = open ? 'rotate(180deg)' : '';
    });

    // Submit handler
    document.getElementById('nt-submit-btn').addEventListener('click', async () => {
      const subject  = (document.getElementById('nt-subject')?.value  || '').trim();
      const message  = (document.getElementById('nt-message')?.value  || '').trim();
      const orderRef = (document.getElementById('nt-order-ref')?.value || '').trim();
      const msgEl    = document.getElementById('nt-msg');

      if (!subject || !message) {
        _showMsg(msgEl, 'Please fill in Subject and Message.', 'error');
        return;
      }

      const btn = document.getElementById('nt-submit-btn');
      btn.disabled = true;
      btn.textContent = 'Submitting…';

      const { data, error } = await submitTicket({ subject, message, orderRef });

      btn.disabled = false;
      btn.textContent = 'Submit Ticket';

      if (error) {
        _showMsg(msgEl, error.message || 'Failed to submit ticket. Please try again.', 'error');
      } else {
        _showMsg(msgEl, '✓ Ticket submitted! Our team will reply within 24 hours.', 'success');
        document.getElementById('nt-subject').value   = '';
        document.getElementById('nt-message').value   = '';
        document.getElementById('nt-order-ref').value = '';
        // Collapse form
        document.getElementById('nt-form').style.display = 'none';
        document.getElementById('nt-chevron').style.transform = '';
        if (typeof onSuccess === 'function') onSuccess(data);
      }
    });
  }

  function _showMsg(el, msg, type) {
    if (!el) return;
    el.textContent    = msg;
    el.style.display  = 'block';
    el.style.background = type === 'error' ? 'rgba(220,38,38,.12)' : 'rgba(22,163,74,.12)';
    el.style.border     = `1px solid ${type === 'error' ? 'rgba(220,38,38,.3)' : 'rgba(22,163,74,.3)'}`;
    el.style.color      = type === 'error' ? '#f87171' : '#4ade80';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

  return { submitTicket, getMyTickets, initNewTicketForm };
})();


/* ═══════════════════════════════════════════════════════
   ADMIN TICKET MANAGEMENT
═══════════════════════════════════════════════════════ */
const SupportAdmin = (() => {
  let _tickets = [];

  /* ── Load all tickets ── */
  async function loadTickets() {
    if (typeof DB !== 'undefined') {
      const { data, error } = await DB.getAllTickets();
      if (!error) { _tickets = data || []; return _tickets; }
    }
    try { _tickets = JSON.parse(localStorage.getItem('cna_support_tickets') || '[]'); }
    catch (e) { _tickets = []; }
    return _tickets;
  }

  /* ── Update ticket status ── */
  async function updateTicketStatus(id, status) {
    if (typeof DB !== 'undefined') {
      const { error } = await DB.updateTicket(id, { status });
      if (!error) { await renderTickets(); await updateTicketStats(); return; }
    }
    // localStorage fallback
    const all = JSON.parse(localStorage.getItem('cna_support_tickets') || '[]');
    const idx = all.findIndex(t => String(t.id) === String(id));
    if (idx !== -1) { all[idx].status = status; localStorage.setItem('cna_support_tickets', JSON.stringify(all)); }
    await renderTickets();
    await updateTicketStats();
  }

  /* ── Reply to a ticket ── */
  async function replyToTicket(id, reply) {
    if (typeof DB !== 'undefined') {
      const { error } = await DB.updateTicket(id, { admin_reply: reply, status: 'Answered' });
      if (!error) { await renderTickets(); await updateTicketStats(); return; }
    }
  }

  /* ── Delete a ticket ── */
  async function deleteTicket(id) {
    if (typeof DB !== 'undefined') {
      await DB.deleteTicket(id);
    } else {
      const all = JSON.parse(localStorage.getItem('cna_support_tickets') || '[]')
        .filter(t => String(t.id) !== String(id));
      localStorage.setItem('cna_support_tickets', JSON.stringify(all));
    }
    await renderTickets();
    await updateTicketStats();
  }

  /* ── Open the reply modal ── */
  function openReplyModal(id) {
    let modal = document.getElementById('reply-modal-overlay');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="reply-modal-overlay" class="modal-overlay">
          <div class="modal" style="max-width:460px">
            <div class="modal-header">
              <h3>Reply to Ticket</h3>
              <button class="modal-close" onclick="_closeReplyModal()">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="reply-ticket-id" />
              <div class="form-group">
                <label class="form-label">Reply Message</label>
                <textarea class="form-input" id="reply-message" rows="5"
                  placeholder="Type your reply to the customer…" style="resize:vertical"></textarea>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-primary" style="flex:1;min-width:120px"
                  onclick="SupportAdmin.submitReply()">Send Reply</button>
                <button class="btn btn-ghost" onclick="_closeReplyModal()">Cancel</button>
              </div>
            </div>
          </div>
        </div>`);
      document.getElementById('reply-modal-overlay').addEventListener('click', e => {
        if (e.target.id === 'reply-modal-overlay') _closeReplyModal();
      });
      modal = document.getElementById('reply-modal-overlay');
    }
    document.getElementById('reply-ticket-id').value  = id;
    document.getElementById('reply-message').value    = '';
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function _closeReplyModal() {
    document.getElementById('reply-modal-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Submit reply from modal ── */
  async function submitReply() {
    const id    = document.getElementById('reply-ticket-id')?.value;
    const reply = (document.getElementById('reply-message')?.value || '').trim();
    if (!reply) { _adminToast('Please enter a reply message.', 'error'); return; }
    await replyToTicket(id, reply);
    _closeReplyModal();
    _adminToast('Reply sent successfully!', 'success');
  }

  /* ── Render tickets table ── */
  async function renderTickets() {
    await loadTickets();
    const tbody = document.getElementById('support-tickets-tbody');
    const empty = document.getElementById('support-tickets-empty');
    if (!tbody) return;

    if (_tickets.length === 0) {
      tbody.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    tbody.innerHTML = _tickets.map(t => {
      const id         = t.id || t.ticketId;
      const email      = escHtml(t.customer_email || t.email || '—');
      const orderRef   = escHtml(String(t.order_ref || '—'));
      const statusCls  = { Open: 'pending', Answered: 'approved', Closed: 'status-closed' }[t.status] || 'pending';
      const safeid     = escHtml(String(id || '—'));

      return `<tr>
        <td>
          <span style="font-family:monospace;font-size:0.78rem;color:var(--text-primary)">${safeid.slice(0,8)}</span>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.1rem">${_fmt(t.created_at)}</div>
        </td>
        <td style="font-size:0.85rem">${email}</td>
        <td style="font-size:0.78rem;font-family:monospace;color:var(--text-muted)">${orderRef}</td>
        <td style="max-width:240px">
          ${t.subject ? `<div style="font-size:0.78rem;font-weight:600;color:var(--text-primary);margin-bottom:0.2rem">${escHtml(t.subject)}</div>` : ''}
          <div style="font-size:0.8rem;color:var(--text-secondary);white-space:pre-wrap;word-break:break-word">${escHtml(t.message)}</div>
          ${t.admin_reply ? `<div style="font-size:0.75rem;color:var(--accent);margin-top:0.4rem;border-left:2px solid var(--accent);padding-left:0.5rem">↳ ${escHtml(t.admin_reply)}</div>` : ''}
        </td>
        <td><span class="status-pill ${statusCls}">${escHtml(t.status || 'Open')}</span></td>
        <td>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm"
              onclick="SupportAdmin.openReplyModal('${safeid}')">Reply</button>
            ${t.status !== 'Closed'
              ? `<button class="btn btn-ghost btn-sm"
                  onclick="SupportAdmin.updateTicketStatus('${safeid}','Closed')">Close</button>`
              : `<button class="btn btn-ghost btn-sm"
                  onclick="SupportAdmin.updateTicketStatus('${safeid}','Open')">Reopen</button>`}
            <button class="btn btn-danger btn-sm"
              onclick="SupportAdmin.deleteTicket('${safeid}')">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Update open ticket count in header ── */
  async function updateTicketStats() {
    await loadTickets();
    const open  = _tickets.filter(t => t.status === 'Open' || t.status === 'Answered').length;
    const openEl = document.getElementById('stat-tickets-open');
    if (openEl) openEl.textContent = open;
    const badge = document.getElementById('support-badge');
    if (badge) {
      badge.textContent = open;
      badge.classList.toggle('hidden', open === 0);
    }
  }

  function _adminToast(message, type = 'info') {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escHtml(message)}</span>`;
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function _fmt(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return iso; }
  }

  async function init() {
    await renderTickets();
    await updateTicketStats();
  }

  return {
    init, loadTickets, renderTickets,
    updateTicketStatus, deleteTicket, updateTicketStats,
    openReplyModal, submitReply,
  };
})();

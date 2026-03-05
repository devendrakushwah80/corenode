/**
 * CoreNode – Support Tickets Page
 * Loads the authenticated user's support tickets from Supabase.
 * Requires: supabase.js loaded first.
 */
const TicketsPage = (() => {
  let _userId  = null;
  let _tickets = [];

  /* ── Load tickets ── */
  async function loadTickets() {
    if (!_userId) return [];
    const { data, error } = await DB.getMyTickets(_userId);
    if (error) { console.error('[Tickets] loadTickets:', error.message); return []; }
    return data || [];
  }

  /* ── Render ticket list ── */
  async function render() {
    _tickets = await loadTickets();

    const container = document.getElementById('tickets-container');
    const empty     = document.getElementById('tickets-empty');

    if (!container) return;

    if (_tickets.length === 0) {
      container.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    const statusColors = { Open: '#d97706', Answered: '#00ff9c', Closed: '#64748b' };

    container.innerHTML = _tickets.map(t => {
      const statusColor = statusColors[t.status] || '#d97706';
      return `
        <div class="ticket-card">
          <div class="ticket-header">
            <div>
              <div class="ticket-subject">${_esc(t.subject || '(No subject)')}</div>
              <div class="ticket-meta">${_fmt(t.created_at)}</div>
            </div>
            <span style="
              font-size:0.75rem;font-weight:700;
              color:${statusColor};white-space:nowrap;
              background:rgba(0,0,0,.2);padding:0.2rem 0.6rem;
              border-radius:20px;border:1px solid currentColor">
              ${_esc(t.status || 'Open')}
            </span>
          </div>
          <div class="ticket-body">${_esc(t.message)}</div>
          ${t.admin_reply
            ? `<div class="ticket-reply">
                 <div class="ticket-reply-label">✅ Support Reply</div>
                 ${_esc(t.admin_reply)}
               </div>`
            : ''}
        </div>`;
    }).join('');
  }

  /* ── Submit new ticket (from a form on the page) ── */
  async function submitTicket() {
    const subject  = (document.getElementById('ticket-subject')?.value  || '').trim();
    const message  = (document.getElementById('ticket-message')?.value  || '').trim();
    const orderRef = (document.getElementById('ticket-order-ref')?.value || '').trim();
    const errEl    = document.getElementById('ticket-error');
    const succEl   = document.getElementById('ticket-success');
    const btn      = document.getElementById('ticket-submit-btn');

    if (errEl)  errEl.style.display  = 'none';
    if (succEl) succEl.style.display = 'none';

    if (!subject || !message) {
      if (errEl) { errEl.textContent = 'Please fill in subject and message.'; errEl.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    const { error } = await DB.insertTicket({
      user_id:        _userId,
      customer_email: AuthManager.getUserEmail(),
      subject,
      message,
      order_ref:   orderRef || null,
      status:      'Open',
      admin_reply: null,
    });

    if (btn) { btn.disabled = false; btn.textContent = 'Submit Ticket'; }

    if (error) {
      if (errEl) { errEl.textContent = error.message; errEl.style.display = 'block'; }
      return;
    }

    if (succEl) {
      succEl.textContent = "Ticket submitted! We'll get back to you within 24 hours.";
      succEl.style.display = 'block';
    }
    if (document.getElementById('ticket-subject'))   document.getElementById('ticket-subject').value   = '';
    if (document.getElementById('ticket-message'))   document.getElementById('ticket-message').value   = '';
    if (document.getElementById('ticket-order-ref')) document.getElementById('ticket-order-ref').value = '';

    await render();   // refresh list
  }

  /* ── Helpers ── */
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

  /* ── Page init ── */
  async function init() {
    if (typeof AuthManager === 'undefined' || typeof window.supabase === 'undefined') return;

    const session = await AuthManager.init();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }

    _userId = AuthManager.getUserId();

    // Show email if the page has a display element for it
    const emailEl = document.getElementById('user-email-display');
    if (emailEl) emailEl.textContent = AuthManager.getUserEmail();

    await render();

    document.getElementById('ticket-submit-btn')
      ?.addEventListener('click', submitTicket);

    // Real-time subscription
    getSB()
      .channel('tickets-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tickets',
        filter: `user_id=eq.${_userId}`,
      }, () => render())
      .subscribe();
  }

  return { init, render, submitTicket };
})();

document.addEventListener('DOMContentLoaded', () => TicketsPage.init());

/**
 * CoreNodeAdmin – Checkout System (Supabase Edition)
 */
const Checkout = (() => {
  async function getSettings() {
    // Bug fix: SettingsCache was never defined — use DB.getSettings() directly.
    if (typeof DB !== 'undefined') {
      try {
        const { data, error } = await DB.getSettings();
        if (!error && data) return data;
      } catch (e) {}
    }
    // localStorage fallback
    try { const raw = localStorage.getItem('cna_settings'); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  }

  function open() { ensureModal(); populateQR(); populateOrderSummary(); clearForm(); const o=document.getElementById('checkout-overlay'); if(o){o.classList.add('open');document.body.style.overflow='hidden';} }
  function close() { const o=document.getElementById('checkout-overlay'); if(o){o.classList.remove('open');document.body.style.overflow='';} }

  function clearForm() {
    ['checkout-name','checkout-email','checkout-utr'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
      const emailEl = document.getElementById('checkout-email');
      if (emailEl) emailEl.value = AuthManager.getUserEmail();
    }
    const notice = document.getElementById('checkout-notice');
    if (notice) notice.classList.add('hidden');
    const submitBtn = document.getElementById('checkout-submit');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Payment'; }
  }

  async function populateQR() {
    const settings = await getSettings();
    const qrImg = document.getElementById('checkout-qr');
    const upiEl = document.getElementById('checkout-upi');
    if (qrImg) { qrImg.src = settings.qr_image || settings.qrImage || 'assets/images/payment-qr.png'; qrImg.onerror = () => { qrImg.src = 'assets/images/payment-qr.png'; }; }
    if (upiEl) upiEl.textContent = settings.upi_id || settings.upiId || 'payments@corenodeadmin';
  }

  function populateOrderSummary() {
    if (typeof Cart === 'undefined') return;
    const items = Cart.getAll(); const total = Cart.getTotal();
    const summaryEl = document.getElementById('checkout-summary');
    if (!summaryEl) return;
    if (items.length === 0) { summaryEl.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted)">No items in cart.</p>'; return; }
    summaryEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem;">
      ${items.map(item => `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;color:var(--text-secondary);">
        <span>${escHtml(item.name)} <span style="color:var(--text-muted);font-size:0.75rem">(${escHtml(item.type)})</span></span>
        <span style="font-weight:600;color:var(--text-primary)">₹${Number(item.price).toLocaleString('en-IN')}</span></div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:0.6rem;border-top:1px solid var(--border);font-weight:700;font-size:0.9rem;">
        <span>Total</span><span style="color:var(--accent)">₹${total.toLocaleString('en-IN')}</span></div>`;
  }

  async function handleSubmit(e) {
    e && e.preventDefault();
    const name  = (document.getElementById('checkout-name')?.value  || '').trim();
    const email = (document.getElementById('checkout-email')?.value || '').trim();
    const utr   = (document.getElementById('checkout-utr')?.value   || '').trim();
    if (!name || !email || !utr) { Cart.showToast('Please fill in all fields', 'error'); return; }
    if (!isValidEmail(email)) { Cart.showToast('Please enter a valid email address', 'error'); return; }
    if (utr.length < 6) { Cart.showToast('Please enter a valid Transaction ID / UTR', 'error'); return; }
    const items = Cart.getAll();
    if (items.length === 0) { Cart.showToast('Your cart is empty', 'error'); return; }
    const submitBtn = document.getElementById('checkout-submit');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }
    const userId = (typeof AuthManager !== 'undefined' && AuthManager.getUserId()) || null;
    for (const item of items) {
      const orderPayload = {
        user_id: userId, plan_name: item.name, plan_type: item.type, price: item.price,
        utr, customer_name: name, customer_email: email,
        status: 'Pending', panel_link: null, panel_username: null, panel_password: null
      };
      if (typeof DB !== 'undefined') {
        const { error } = await DB.insertOrder(orderPayload);
        if (error) { console.warn('Supabase insert failed, using localStorage fallback:', error.message); _saveOrderLocal({ ...orderPayload, orderId: _generateOrderId(), createdAt: new Date().toISOString() }); }
      } else { _saveOrderLocal({ ...orderPayload, orderId: _generateOrderId(), createdAt: new Date().toISOString() }); }
      if (item.id) {
        if (typeof DB !== 'undefined') await DB.decrementStock(item.id).catch(()=>{});
        else if (typeof PlanManager !== 'undefined') PlanManager.decrementStock(item.id);
      }
    }
    localStorage.setItem('cna_last_email', email);
    Cart.clear();
    const notice = document.getElementById('checkout-notice');
    if (notice) notice.classList.remove('hidden');
    if (submitBtn) submitBtn.classList.add('hidden');
    Cart.showToast('Payment submitted! Redirecting…', 'success');
    setTimeout(() => {
      if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) window.location.href = 'dashboard.html';
      else window.location.href = 'orders.html';
    }, 1800);
  }

  function _saveOrderLocal(order) {
    try { const orders = JSON.parse(localStorage.getItem('cna_orders') || '[]'); orders.unshift(order); localStorage.setItem('cna_orders', JSON.stringify(orders)); } catch(e) {}
  }
  function _generateOrderId() { return `CNA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

  function ensureModal() {
    if (document.getElementById('checkout-overlay')) return;
    const html = `<div id="checkout-overlay" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Checkout">
      <div class="modal"><div class="modal-header"><h3>Complete Payment</h3>
        <button class="modal-close" id="checkout-close" aria-label="Close"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div style="margin-bottom:1.25rem;"><div class="form-label" style="margin-bottom:0.5rem;">Order Summary</div>
            <div id="checkout-summary" style="background:var(--bg-base);border:1px solid var(--border);border-radius:var(--radius);padding:0.85rem;"></div></div>
          <div class="qr-box"><img id="checkout-qr" src="assets/images/payment-qr.png" alt="Payment QR Code" />
            <div class="form-label" style="margin:0">UPI ID</div><div class="qr-upi" id="checkout-upi">payments@corenodeadmin</div></div>
          <div class="steps">
            <div class="step"><div class="step-num">1</div><span>Scan the QR code or copy the UPI ID above</span></div>
            <div class="step"><div class="step-num">2</div><span>Complete the payment in your UPI app</span></div>
            <div class="step"><div class="step-num">3</div><span>Enter the UTR / Transaction ID below and submit</span></div></div>
          <div class="form-group"><label class="form-label" for="checkout-name">Full Name</label><input class="form-input" id="checkout-name" type="text" placeholder="Your full name" autocomplete="name" /></div>
          <div class="form-group"><label class="form-label" for="checkout-email">Email Address</label><input class="form-input" id="checkout-email" type="email" placeholder="you@example.com" autocomplete="email" /></div>
          <div class="form-group"><label class="form-label" for="checkout-utr">Transaction ID / UTR Number</label><input class="form-input" id="checkout-utr" type="text" placeholder="e.g. 416521234567" autocomplete="off" /></div>
          <div id="checkout-notice" class="alert alert-success hidden" role="alert">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div><div style="font-weight:600;margin-bottom:0.2rem">Payment submitted successfully!</div><div style="font-size:0.82rem;opacity:0.85">Redirecting to your orders…</div></div></div>
          <button id="checkout-submit" class="btn btn-primary btn-full btn-lg">Submit Payment</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('checkout-close')?.addEventListener('click', close);
    document.getElementById('checkout-overlay')?.addEventListener('click', e => { if (e.target.id==='checkout-overlay') close(); });
    document.getElementById('checkout-submit')?.addEventListener('click', handleSubmit);
  }

  function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function escHtml(str) { const d=document.createElement('div'); d.appendChild(document.createTextNode(str||'')); return d.innerHTML; }
  return { open, close };
})();

/**
 * CoreNodeAdmin – Cart System
 * Manages cart state, sidebar UI, and localStorage persistence.
 */

const Cart = (() => {
  const STORAGE_KEY = 'cna_cart';

  // ── State ──────────────────────────────────────────────────────────────────
  let items = [];

  // ── Persistence ───────────────────────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      items = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function add(item) {
    // item: { id, name, type, price }
    // Avoid duplicates by id
    const exists = items.find(i => i.id === item.id);
    if (exists) {
      showToast('Item already in cart', 'info');
      return;
    }
    items.push({ ...item, cartId: Date.now() + Math.random() });
    save();
    render();
    openSidebar();
    showToast(`${item.name} added to cart`, 'success');
  }

  function remove(cartId) {
    items = items.filter(i => i.cartId !== cartId);
    save();
    render();
  }

  function clear() {
    items = [];
    save();
    render();
  }

  function getAll() {
    return [...items];
  }

  function getTotal() {
    return items.reduce((sum, i) => sum + Number(i.price), 0);
  }

  function getCount() {
    return items.length;
  }

  // ── UI: Sidebar ────────────────────────────────────────────────────────────
  function openSidebar() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');
    if (overlay) overlay.classList.add('open');
    if (sidebar) sidebar.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    const overlay = document.getElementById('cart-overlay');
    const sidebar = document.getElementById('cart-sidebar');
    if (overlay) overlay.classList.remove('open');
    if (sidebar) sidebar.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  // ── UI: Render ─────────────────────────────────────────────────────────────
  function render() {
    updateBadge();
    renderItems();
    renderTotal();
  }

  function updateBadge() {
    const badges = document.querySelectorAll('.cart-count');
    badges.forEach(badge => {
      const count = getCount();
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    });
  }

  function renderItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.137a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
          </svg>
          <span>Your cart is empty</span>
        </div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="cart-item-icon">${getTypeIcon(item.type)}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(item.name)}</div>
          <div class="cart-item-type">${escHtml(item.type)}</div>
        </div>
        <div class="cart-item-price">₹${Number(item.price).toLocaleString('en-IN')}</div>
        <button class="cart-item-remove" onclick="Cart.remove(${item.cartId})" title="Remove item" aria-label="Remove">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>`).join('');
  }

  function renderTotal() {
    const el = document.getElementById('cart-total-amount');
    if (el) el.textContent = `₹${getTotal().toLocaleString('en-IN')}`;
  }

  function getTypeIcon(type) {
    if (!type) return '📦';
    const t = type.toLowerCase();
    if (t.includes('minecraft')) return '⛏️';
    if (t.includes('vps'))       return '🖥️';
    if (t.includes('domain'))    return '🌐';
    return '📦';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    let toast = document.getElementById('cna-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cna-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    const icons = {
      success: '✓',
      error:   '✕',
      info:    'ℹ'
    };

    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;

    // Trigger show
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    load();
    render();

    // Cart toggle button
    document.querySelectorAll('[data-cart-toggle]').forEach(el => {
      el.addEventListener('click', toggleSidebar);
    });

    // Close button
    document.querySelectorAll('[data-cart-close]').forEach(el => {
      el.addEventListener('click', closeSidebar);
    });

    // Overlay click to close
    const overlay = document.getElementById('cart-overlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Clear cart button
    const clearBtn = document.getElementById('cart-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      clear();
      showToast('Cart cleared', 'info');
    });

    // Checkout button
    const checkoutBtn = document.getElementById('cart-checkout');
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
      if (items.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
      }
      closeSidebar();
      if (typeof Checkout !== 'undefined') {
        Checkout.open();
      }
    });
  }

  // Public API
  return { init, add, remove, clear, getAll, getTotal, getCount, openSidebar, closeSidebar, showToast };
})();

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => Cart.init());

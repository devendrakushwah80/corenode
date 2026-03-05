/**
 * CoreNode – Payment Settings
 * ─────────────────────────────────────────────────────────────────
 * Reads from and writes to the Supabase `settings` table (row id=1).
 *
 * Bug fixed: the old version referenced SettingsCache which was never
 * defined anywhere in the project, so load() always fell through to
 * localStorage and settings were never read from Supabase.
 */
const PaymentSettings = (() => {
  const DEFAULTS = {
    qr_image: 'assets/images/payment-qr.png',
    upi_id:   'payments@corenode.in',
  };

  /**
   * Load settings — Supabase first, localStorage fallback.
   * @returns {{ qr_image: string, upi_id: string }}
   */
  async function load() {
    if (typeof DB !== 'undefined') {
      try {
        const { data, error } = await DB.getSettings();
        if (!error && data) {
          return {
            qr_image: data.qr_image || DEFAULTS.qr_image,
            upi_id:   data.upi_id   || DEFAULTS.upi_id,
          };
        }
        if (error) console.warn('[PaymentSettings] getSettings error:', error.message);
      } catch (e) { console.warn('[PaymentSettings] load threw:', e); }
    }
    // localStorage fallback
    try {
      const raw = localStorage.getItem('cna_settings');
      const ls  = raw ? JSON.parse(raw) : {};
      return {
        qr_image: ls.qr_image || ls.qrImage || DEFAULTS.qr_image,
        upi_id:   ls.upi_id   || ls.upiId   || DEFAULTS.upi_id,
      };
    } catch (e) { return { ...DEFAULTS }; }
  }

  /**
   * Save settings — Supabase upsert first, localStorage fallback.
   * @param {{ qr_image?: string, upi_id?: string }} data
   */
  async function save(data) {
    if (typeof DB !== 'undefined') {
      const { error } = await DB.upsertSettings(data);
      if (!error) return true;
      console.warn('[PaymentSettings] upsertSettings error:', error.message);
    }
    // localStorage fallback
    try {
      const current = JSON.parse(localStorage.getItem('cna_settings') || '{}');
      localStorage.setItem('cna_settings', JSON.stringify({ ...current, ...data }));
    } catch (e) {}
    return true;
  }

  /**
   * Wire up the settings panel in admin-dashboard.html.
   */
  async function initAdminSettingsUI() {
    const settings  = await load();
    const upiInput  = document.getElementById('settings-upi');
    const qrPreview = document.getElementById('settings-qr-preview');
    const fileInput = document.getElementById('settings-qr-file');

    if (upiInput)  upiInput.value = settings.upi_id  || DEFAULTS.upi_id;
    if (qrPreview) {
      qrPreview.src    = settings.qr_image || DEFAULTS.qr_image;
      qrPreview.onerror = () => { qrPreview.src = DEFAULTS.qr_image; };
    }

    if (fileInput) {
      fileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showSettingsMsg('Please upload an image file.', 'error'); return; }
        if (file.size > 2 * 1024 * 1024) { showSettingsMsg('Image must be under 2 MB.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = ev => {
          const dataUrl = ev.target.result;
          if (qrPreview) qrPreview.src = dataUrl;
          fileInput._pendingDataUrl = dataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    document.getElementById('settings-save')?.addEventListener('click', async () => {
      const upi = (document.getElementById('settings-upi')?.value || '').trim();
      if (!upi) { showSettingsMsg('UPI ID cannot be empty.', 'error'); return; }
      const payload = { upi_id: upi };
      if (fileInput?._pendingDataUrl) payload.qr_image = fileInput._pendingDataUrl;
      await save(payload);
      showSettingsMsg('Settings saved successfully!', 'success');
      if (fileInput) fileInput._pendingDataUrl = null;
    });

    document.getElementById('settings-reset')?.addEventListener('click', async () => {
      if (!confirm('Reset payment settings to defaults?')) return;
      await save(DEFAULTS);
      if (upiInput)  upiInput.value = DEFAULTS.upi_id;
      if (qrPreview) qrPreview.src  = DEFAULTS.qr_image;
      if (fileInput) { fileInput.value = ''; fileInput._pendingDataUrl = null; }
      showSettingsMsg('Settings reset to defaults.', 'info');
    });
  }

  function showSettingsMsg(msg, type = 'info') {
    const el = document.getElementById('settings-msg');
    if (!el) return;
    const cls = { success: 'alert-success', error: 'alert-danger', info: 'alert-info' };
    el.className = `alert ${cls[type] || 'alert-info'}`;
    el.innerHTML = `<span>${msg}</span>`;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 4000);
  }

  return { load, save, initAdminSettingsUI };
})();

/**
 * CoreNodeAdmin – Pricing Configuration
 * Base plan data. Runtime overrides stored in localStorage key: cna_plans_override
 */

const CNA_PRICING = {

  /* ─── AMD EPYC Minecraft (Premium Node) ─── */
  minecraft: {
    basic: [
      { id:"mc-spark",   name:"CORE–SPARK",  ram:"2GB",  vcores:1,  nvme:"15GB",  backups:1, price:120,  stock:10, tag:null,        node:"amd" },
      { id:"mc-flare",   name:"CORE–FLARE",  ram:"4GB",  vcores:1,  nvme:"25GB",  backups:1, price:240,  stock:10, tag:null,        node:"amd" },
      { id:"mc-blaze",   name:"CORE–BLAZE",  ram:"6GB",  vcores:2,  nvme:"35GB",  backups:1, price:360,  stock:8,  tag:null,        node:"amd" },
      { id:"mc-ember",   name:"CORE–EMBER+", ram:"8GB",  vcores:2,  nvme:"45GB",  backups:2, price:480,  stock:5,  tag:"Popular",   node:"amd" }
    ],
    performance: [
      { id:"mc-inferno", name:"CORE–INFERNO", ram:"10GB", vcores:3, nvme:"55GB",  backups:2, price:600,  stock:5,  tag:null,        node:"amd" },
      { id:"mc-vulcan",  name:"CORE–VULCAN",  ram:"12GB", vcores:3, nvme:"65GB",  backups:2, price:720,  stock:4,  tag:null,        node:"amd" },
      { id:"mc-phoenix", name:"CORE–PHOENIX", ram:"16GB", vcores:4, nvme:"85GB",  backups:3, price:960,  stock:3,  tag:"Best Value", node:"amd" },
      { id:"mc-titan",   name:"CORE–TITAN",   ram:"20GB", vcores:5, nvme:"110GB", backups:4, price:1200, stock:2,  tag:null,        node:"amd" }
    ],
    enterprise: [
      { id:"mc-colossus", name:"CORE–COLOSSUS", ram:"32GB", vcores:8,  nvme:"180GB", backups:5, price:1920, stock:2, tag:null,      node:"amd" },
      { id:"mc-dominus",  name:"CORE–DOMINUS",  ram:"64GB", vcores:16, nvme:"320GB", backups:6, price:3840, stock:1, tag:"Ultimate", node:"amd" }
    ]
  },

  /* ─── Intel Xeon Minecraft (Budget Node) ─── */
  minecraft_xeon: {
    basic: [
      { id:"xeon-spark",  name:"XEON–SPARK",  ram:"2GB",  vcores:1,  nvme:"15GB",  backups:1, price:70,   stock:20, tag:null,      node:"intel" },
      { id:"xeon-flare",  name:"XEON–FLARE",  ram:"4GB",  vcores:1,  nvme:"25GB",  backups:1, price:140,  stock:20, tag:null,      node:"intel" },
      { id:"xeon-blaze",  name:"XEON–BLAZE",  ram:"6GB",  vcores:2,  nvme:"35GB",  backups:1, price:210,  stock:15, tag:null,      node:"intel" },
      { id:"xeon-ember",  name:"XEON–EMBER+", ram:"8GB",  vcores:2,  nvme:"45GB",  backups:2, price:280,  stock:10, tag:"Popular", node:"intel" }
    ],
    performance: [
      { id:"xeon-inferno", name:"XEON–INFERNO", ram:"10GB", vcores:3, nvme:"55GB",  backups:2, price:350,  stock:10, tag:null,       node:"intel" },
      { id:"xeon-vulcan",  name:"XEON–VULCAN",  ram:"12GB", vcores:3, nvme:"65GB",  backups:2, price:420,  stock:8,  tag:null,       node:"intel" },
      { id:"xeon-phoenix", name:"XEON–PHOENIX", ram:"16GB", vcores:4, nvme:"85GB",  backups:3, price:560,  stock:6,  tag:"Best Value", node:"intel" },
      { id:"xeon-titan",   name:"XEON–TITAN",   ram:"20GB", vcores:5, nvme:"110GB", backups:4, price:700,  stock:4,  tag:null,       node:"intel" }
    ],
    enterprise: [
      { id:"xeon-colossus", name:"XEON–COLOSSUS", ram:"32GB", vcores:8,  nvme:"180GB", backups:5, price:1120, stock:4, tag:null,     node:"intel" },
      { id:"xeon-dominus",  name:"XEON–DOMINUS",  ram:"64GB", vcores:16, nvme:"320GB", backups:6, price:2240, stock:2, tag:"Ultimate", node:"intel" }
    ]
  },

  /* ─── AMD EPYC VPS (Premium) ─── */
  vps: [
    { id:"vps-xs", name:"AMD Very Small",  vcores:2,  ram:"8GB",  nvme:"48GB",  ipv4:1, bandwidth:"500GB", price:799,  stock:10, tag:null,         node:"amd" },
    { id:"vps-sm", name:"AMD Small",       vcores:4,  ram:"16GB", nvme:"96GB",  ipv4:1, bandwidth:"500GB", price:1499, stock:8,  tag:"Popular",    node:"amd" },
    { id:"vps-md", name:"AMD Medium",      vcores:8,  ram:"32GB", nvme:"128GB", ipv4:1, bandwidth:"500GB", price:2899, stock:5,  tag:null,         node:"amd" },
    { id:"vps-lg", name:"AMD Large",       vcores:12, ram:"48GB", nvme:"128GB", ipv4:1, bandwidth:"500GB", price:4099, stock:3,  tag:null,         node:"amd" },
    { id:"vps-xl", name:"AMD Extra Large", vcores:16, ram:"64GB", nvme:"256GB", ipv4:1, bandwidth:"500GB", price:4699, stock:2,  tag:"Enterprise", node:"amd" }
  ],

  /* ─── Intel Xeon VPS (Budget) ─── */
  vps_intel: [
    { id:"ivps-xs", name:"Intel Very Small",  vcores:2,  ram:"4GB",  nvme:"24GB",  ipv4:1, bandwidth:"500GB", price:399,  stock:20, tag:null,      node:"intel" },
    { id:"ivps-sm", name:"Intel Small",       vcores:4,  ram:"8GB",  nvme:"48GB",  ipv4:1, bandwidth:"500GB", price:749,  stock:15, tag:"Popular", node:"intel" },
    { id:"ivps-md", name:"Intel Medium",      vcores:8,  ram:"16GB", nvme:"64GB",  ipv4:1, bandwidth:"500GB", price:1449, stock:10, tag:null,      node:"intel" },
    { id:"ivps-lg", name:"Intel Large",       vcores:12, ram:"24GB", nvme:"64GB",  ipv4:1, bandwidth:"500GB", price:2049, stock:6,  tag:null,      node:"intel" },
    { id:"ivps-xl", name:"Intel Extra Large", vcores:16, ram:"32GB", nvme:"128GB", ipv4:1, bandwidth:"500GB", price:2349, stock:4,  tag:"Budget XL", node:"intel" }
  ],

  /* ─── Domains ─── */
  domains: [
    { tld:".com",    price:319,  popular:true  },
    { tld:".in",     price:121,  popular:false },
    { tld:".online", price:209,  popular:false },
    { tld:".io",     price:2919, popular:false },
    { tld:".icu",    price:299,  popular:false },
    { tld:".xyz",    price:299,  popular:false },
    { tld:".pro",    price:389,  popular:false },
    { tld:".cloud",  price:299,  popular:false }
  ],

  /* ─── Reseller ─── */
  reseller: {
    id:    "reseller-base",
    name:  "Reseller Base",
    price: 299,
    stock: 99,
    features: [
      "Your own branded hosting website",
      "Admin dashboard with sales analytics",
      "Unlimited VPS & Minecraft stock",
      "Automatic server provisioning to customer email",
      "Earn credits on every sale",
      "500GB bandwidth",
      "100% uptime SLA"
    ]
  }

};

/**
 * PlanManager – Supabase-first, localStorage fallback.
 * Keeps all original API methods intact.
 */
const PlanManager = (() => {
  const OVERRIDE_KEY = 'cna_plans_override';
  // In-memory cache of Supabase plans (set after async load)
  let _sbPlans = null;

  // ── Supabase plan helpers ──────────────────────────────────────────────────
  async function loadFromSupabase() {
    if (_sbPlans !== null) return _sbPlans;
    if (typeof DB !== 'undefined') {
      const { data, error } = await DB.getPlans();
      if (!error && data && data.length > 0) { _sbPlans = data; return _sbPlans; }
    }
    return null;
  }

  // Map Supabase plan row → PlanManager format
  function _rowToPlan(row) {
    return {
      id: row.plan_id || row.id,
      name: row.name,
      price: row.price,
      ram: row.ram,
      vcores: row.vcores,
      nvme: row.nvme,
      bandwidth: row.bandwidth,
      backups: row.backups,
      stock: row.stock ?? 99,
      tag: row.tag,
      node: row.node,
      planType: row.plan_type,
      deleted: row.deleted || false
    };
  }

  // ── localStorage overrides (kept for backward compat) ─────────────────────
  function loadOverrides() {
    try { const raw = localStorage.getItem(OVERRIDE_KEY); return raw ? JSON.parse(raw) : {}; } catch(e) { return {}; }
  }
  function saveOverrides(data) { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(data)); }

  function getAllBasePlans() {
    // If Supabase plans loaded, use them
    if (_sbPlans && _sbPlans.length > 0) return _sbPlans.map(_rowToPlan);
    return [
      ...CNA_PRICING.minecraft.basic, ...CNA_PRICING.minecraft.performance, ...CNA_PRICING.minecraft.enterprise,
      ...CNA_PRICING.minecraft_xeon.basic, ...CNA_PRICING.minecraft_xeon.performance, ...CNA_PRICING.minecraft_xeon.enterprise,
      ...CNA_PRICING.vps, ...CNA_PRICING.vps_intel
    ];
  }

  function getAllPlans() {
    const base = getAllBasePlans();
    if (_sbPlans && _sbPlans.length > 0) return base.filter(p => !p.deleted);
    // localStorage merge
    const overrides = loadOverrides();
    const merged = base.map(plan => { const ov = overrides[plan.id]; return ov ? { ...plan, ...ov } : { ...plan }; });
    Object.keys(overrides).forEach(id => {
      if (!base.find(p => p.id === id) && !overrides[id].deleted) merged.push({ ...overrides[id] });
    });
    return merged.filter(p => !p.deleted);
  }

  function getPlanById(id) { return getAllPlans().find(p => p.id === id) || null; }

  async function updatePlan(id, fields) {
    if (_sbPlans) {
      // Update via Supabase
      const row = _sbPlans.find(r => (r.plan_id||r.id) === id);
      if (row && typeof DB !== 'undefined') {
        await DB.updatePlan(row.id, fields);
        _sbPlans = null; // invalidate cache
        await loadFromSupabase();
        return;
      }
    }
    const overrides = loadOverrides();
    overrides[id] = { ...(overrides[id] || {}), ...fields };
    saveOverrides(overrides);
  }

  function getStock(id) { const plan = getPlanById(id); return plan != null ? (plan.stock ?? 99) : 0; }
  function isSoldOut(id) { return getStock(id) === 0; }

  async function decrementStock(id) {
    if (_sbPlans && typeof DB !== 'undefined') {
      await DB.decrementStock(id); _sbPlans = null; await loadFromSupabase(); return;
    }
    const plan = getPlanById(id);
    if (!plan) return;
    const overrides = loadOverrides();
    overrides[id] = { ...(overrides[id]||{}), stock: Math.max(0,(plan.stock??99)-1) };
    saveOverrides(overrides);
  }

  async function addPlan(plan) {
    if (typeof DB !== 'undefined') {
      const payload = { plan_id: plan.id, name: plan.name, price: plan.price, ram: plan.ram||null, vcores: plan.vcores||null, nvme: plan.nvme||null, bandwidth: plan.bandwidth||null, stock: plan.stock||10, tag: plan.tag||null, node: plan.node||'amd', plan_type: plan.planType||plan.type||'Minecraft Hosting', deleted: false, sort_order: Date.now() };
      const { error } = await DB.insertPlan(payload);
      if (!error) { _sbPlans = null; await loadFromSupabase(); return; }
    }
    const overrides = loadOverrides();
    overrides[plan.id] = { ...plan, deleted: false };
    saveOverrides(overrides);
  }

  async function deletePlan(id) {
    if (_sbPlans && typeof DB !== 'undefined') {
      const row = _sbPlans.find(r => (r.plan_id||r.id) === id);
      if (row) { await DB.deletePlan(row.id); _sbPlans = null; await loadFromSupabase(); return; }
    }
    const overrides = loadOverrides();
    overrides[id] = { ...(overrides[id]||{}), deleted: true };
    saveOverrides(overrides);
  }

  function isDeleted(id) {
    if (_sbPlans) { const row = _sbPlans.find(r => (r.plan_id||r.id) === id); return row ? !!row.deleted : false; }
    const overrides = loadOverrides(); return !!(overrides[id] && overrides[id].deleted);
  }

  // Expose async loader for init
  async function init() { await loadFromSupabase(); }

  return {
    init, getAllPlans, getAllBasePlans, getPlanById,
    updatePlan, getStock, decrementStock, isSoldOut,
    addPlan, deletePlan, isDeleted,
    loadOverrides, saveOverrides,
    _loadFromSupabase: loadFromSupabase
  };
})();

if (typeof module !== "undefined") {
  module.exports = { CNA_PRICING, PlanManager };
}

-- ═══════════════════════════════════════════════════════════════
--  CoreNodeAdmin – Supabase Database Schema
--  Run this in your Supabase SQL Editor:
--  https://supabase.com/dashboard/project/rwnlhoduhdkiocmphuah/sql
-- ═══════════════════════════════════════════════════════════════

-- ── ORDERS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_name        TEXT NOT NULL,
  plan_type        TEXT,
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  utr              TEXT,
  customer_name    TEXT,
  customer_email   TEXT,
  status           TEXT NOT NULL DEFAULT 'Pending',
  panel_link       TEXT,
  panel_username   TEXT,
  panel_password   TEXT,
  approved_at      TIMESTAMPTZ,
  admin_note       TEXT,
  email_sent       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can see only their own orders
CREATE POLICY "Users see own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role (admin) can do everything
CREATE POLICY "Service role full access on orders" ON orders
  USING (true) WITH CHECK (true);

-- ── TICKETS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject         TEXT,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'Open',
  admin_reply     TEXT,
  order_ref       TEXT,
  customer_email  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own tickets" ON tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role full access on tickets" ON tickets
  USING (true) WITH CHECK (true);

-- ── PLANS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id          BIGSERIAL PRIMARY KEY,
  plan_id     TEXT UNIQUE,
  name        TEXT NOT NULL,
  plan_type   TEXT DEFAULT 'Minecraft Hosting',
  node        TEXT DEFAULT 'amd',
  ram         TEXT,
  vcores      INTEGER,
  nvme        TEXT,
  bandwidth   TEXT,
  backups     INTEGER DEFAULT 1,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 10,
  tag         TEXT,
  deleted     BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans are publicly readable
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are public" ON plans
  FOR SELECT USING (true);

CREATE POLICY "Service role manages plans" ON plans
  USING (true) WITH CHECK (true);

-- ── SETTINGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id        INTEGER PRIMARY KEY DEFAULT 1,
  qr_image  TEXT DEFAULT 'assets/images/payment-qr.png',
  upi_id    TEXT DEFAULT 'payments@corenode.in',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO settings (id, qr_image, upi_id)
VALUES (1, 'assets/images/payment-qr.png', 'payments@corenode.in')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are public" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Service role manages settings" ON settings
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
--  IMPORTANT: For admin to access ALL orders/tickets,
--  you need to use the service_role key in your admin backend,
--  OR disable RLS for admin operations (not recommended for production).
--
--  Quick option for development - disable RLS on orders/tickets:
--    ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
--    ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
--
--  For production, use a Supabase Edge Function with service_role key.
-- ═══════════════════════════════════════════════════════════════

-- Grant anon role read access to plans and settings
GRANT SELECT ON plans TO anon;
GRANT SELECT ON settings TO anon;
GRANT ALL ON orders TO anon;
GRANT ALL ON tickets TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ═══════════════════════════════════════════════════════════════
--  PROFILES TABLE (for role-based admin access)
--  Run this AFTER the existing schema above.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Service role can manage all profiles
CREATE POLICY "Service role manages profiles" ON profiles
  USING (true) WITH CHECK (true);

-- Trigger: auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant anon/authenticated access to read own profile
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- ── Set your admin account ──────────────────────────────────────
-- After running this schema, run this with your admin user's UUID:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@corenode.in';

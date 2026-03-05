-- ═══════════════════════════════════════════════════════════════
--  CoreNodeAdmin – Auto-Provision Migration
--  Run this if you already have the orders table (adds new columns)
--  https://supabase.com/dashboard/project/rwnlhoduhdkiocmphuah/sql
-- ═══════════════════════════════════════════════════════════════

-- Add new columns to existing orders table (safe – IF NOT EXISTS)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS email_sent    BOOLEAN NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
--  DONE. Now deploy the Edge Function (see README below).
-- ═══════════════════════════════════════════════════════════════

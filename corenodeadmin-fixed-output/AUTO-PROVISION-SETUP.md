# 🚀 Auto-Provision Setup Guide
### CoreNodeAdmin – User buys → Payment approved → Server created → Credentials emailed

---

## How It Works

```
User pays  →  Admin clicks Approve  →  Edge Function runs
                                           │
                                           ├─ Saves credentials to DB
                                           ├─ Sends email via Resend
                                           └─ User sees server in dashboard
```

---

## Step 1 — Run Migration SQL

If you already have the `orders` table, run this in Supabase SQL Editor:

```
https://supabase.com/dashboard/project/rwnlhoduhdkiocmphuah/sql
```

Paste the contents of: `supabase/migration-auto-provision.sql`

This adds `approved_at`, `admin_note`, `email_sent` columns.

---

## Step 2 — Get a Free Resend API Key

1. Go to → https://resend.com
2. Sign up (free — 3,000 emails/month)
3. Add your domain OR use `onboarding@resend.dev` for testing
4. Copy your API key

---

## Step 3 — Install Supabase CLI

```bash
npm install -g supabase
supabase login
```

---

## Step 4 — Set Environment Variables in Supabase Dashboard

Go to:
```
https://supabase.com/dashboard/project/rwnlhoduhdkiocmphuah/settings/functions
```

Add these secrets:
```
SUPABASE_URL          = https://rwnlhoduhdkiocmphuah.supabase.co
SUPABASE_SERVICE_ROLE = <your service role key from Project Settings → API>
RESEND_API_KEY        = <your Resend API key>
FROM_EMAIL            = noreply@corenodeadmin.in
PANEL_BASE_URL        = https://panel.corenode.in
```

> ⚠️ SUPABASE_SERVICE_ROLE is secret — never expose it to frontend. Only use in Edge Functions.

---

## Step 5 — Deploy Edge Function

```bash
cd /path/to/corenodeadmin-hosting
supabase link --project-ref rwnlhoduhdkiocmphuah
supabase functions deploy auto-provision
```

Done! The function URL will be:
```
https://rwnlhoduhdkiocmphuah.supabase.co/functions/v1/auto-provision
```

---

## Step 6 — Test It

1. Place a test order on the website
2. Go to `admin-dashboard.html`
3. Click **Approve** on the order
4. Fill in (or auto-generate) credentials
5. Click **Approve & Send Email**
6. Watch the pipeline steps complete ✅
7. Check customer inbox for the email

---

## Without Edge Function (Fallback Mode)

If you haven't deployed the Edge Function yet, the system automatically falls back to **direct DB update** — credentials are saved but no email is sent.

The admin panel will show:
> ⚠️ Email not sent (configure Resend API key)

Everything else works normally.

---

## Email Preview

The customer receives a branded dark-theme HTML email with:
- 🚀 "Your server is live!" heading
- Control panel link (clickable button)
- Username & password in styled boxes
- Security warning to change password
- Optional admin note
- Order ID & plan name

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Email not sent | Check RESEND_API_KEY in Supabase secrets |
| "Order not found" error | Make sure the migration SQL was run |
| Edge Function 401 error | Admin must be logged in (Supabase Auth session required) |
| Function not found (404) | Run `supabase functions deploy auto-provision` |

---

## Files Added

```
assets/js/auto-provision.js              ← Client-side module (loaded in admin dashboard)
supabase/functions/auto-provision/
  index.ts                               ← Supabase Edge Function (deploy this)
supabase/migration-auto-provision.sql    ← Run in SQL Editor for existing DBs
AUTO-PROVISION-SETUP.md                  ← This file
```

# CoreNode – Hosting Website

## Production Setup Guide

### 1. Supabase Database Setup

Run `supabase-schema.sql` in your Supabase SQL Editor:
https://supabase.com/dashboard/project/rwnlhoduhdkiocmphuah/sql

This creates:
- `orders` — customer hosting orders
- `tickets` — support tickets (statuses: Open / Answered / Closed)
- `plans`   — hosting plans with stock control
- `settings` — payment QR + UPI ID
- `profiles` — user roles (user / admin)

### 2. Set Admin Account

After running the schema, run this SQL to make your admin account:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'admin@corenode.in';
```

Or use the Supabase dashboard to update the `profiles` table directly.

### 3. Deploy Edge Function

The `supabase/functions/auto-provision/` folder contains the auto-provisioning function.

Deploy with Supabase CLI:
```bash
supabase functions deploy auto-provision
```

Set required secrets:
```bash
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Admin Panel Access

1. Go to `admin.html`
2. Log in with your admin email + Supabase password
3. Non-admin accounts are redirected to homepage

Admin panel features:
- View / Approve / Reject all orders
- Approve launches Edge Function → saves credentials + emails customer
- Reply to / close support tickets
- Edit plan prices, stock, specs in real-time
- Update payment QR code and UPI ID (changes reflect on checkout immediately)

---

## File Structure

```
/
├── index.html          — Homepage
├── minecraft.html      — Minecraft hosting plans
├── vps.html            — VPS plans
├── domains.html        — Domain pricing
├── reseller.html       — Reseller program
├── orders.html         — User order tracker (no login required)
├── login.html          — User login (Supabase Auth)
├── signup.html         — User registration
├── dashboard.html      — User dashboard (My Orders, Tickets, Settings)
├── admin.html          — Admin login
├── admin-dashboard.html — Admin panel
│
├── assets/
│   ├── css/styles.css  — All styles + responsive breakpoints
│   └── js/
│       ├── supabase.js      — DB client, AuthManager, DB helpers, PlanCache
│       ├── admin.js         — Admin auth + role-based guard
│       ├── navbar-auth.js   — Dynamic login/logout nav links
│       ├── cart.js          — Cart sidebar + localStorage
│       ├── checkout.js      — UTR checkout modal (QR loaded from Supabase)
│       ├── orders.js        — Orders page (with Supabase + localStorage fallback)
│       ├── support.js       — UserSupport + SupportAdmin modules
│       ├── settings.js      — Admin payment settings
│       └── auto-provision.js — Edge Function caller with fallback
│
├── config/pricing.js   — Local plan data (fallback if Supabase table empty)
├── supabase-schema.sql — Full database schema including profiles table
└── supabase/           — Edge Function source
```

---

## User Flow

1. User visits site → browses plans
2. User adds plan to cart → checks out
3. Enters name, email, UTR → order saved to Supabase
4. Admin sees order in dashboard → approves
5. Approval calls Edge Function → credentials saved + email sent
6. User checks dashboard/orders page → sees activated server with credentials

---

## Responsive Breakpoints

- **320px** — Small phones (stacked layout, large touch targets)
- **480px** — Standard phones
- **640px** — Large phones / small tablets
- **768px** — Tablets (sidebar drawer, 2-col grids)
- **900px** — Small laptops
- **1024px** — Standard laptops
- **1440px** — Desktops (full sidebar, multi-column)

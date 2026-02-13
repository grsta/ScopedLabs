# ScopedLabs Payments + Accounts (v1)

Goal: **Magic-link login + one-time Stripe payment to unlock a category** (lifetime).

This is the minimal, low-maintenance stack:
- Static site on **Cloudflare Pages**
- **Supabase Auth** (magic link) + `entitlements` table
- **Stripe Checkout** + webhook to grant unlocks

---

## 0) Deploy model

You will host the **tool site** on Cloudflare Pages.

You can keep Squarespace for your marketing domain, but the tool app should live on Cloudflare Pages so we can run `/functions` for Stripe + webhooks.

---

## 1) Supabase setup

### 1.1 Create project
- Create a new Supabase project
- Note:
  - **Project URL** (SUPABASE_URL)
  - **anon public key** (SUPABASE_ANON_KEY)
  - **service role key** (SUPABASE_SERVICE_ROLE_KEY) *(keep secret)*

### 1.2 Enable magic link
Supabase dashboard → Authentication → Providers → Email
- Enable Email provider
- Enable **Magic Link / OTP**
- Set Site URL to your deployed app URL later (Cloudflare Pages URL)
- Add Redirect URL:
  - `https://YOUR_APP_DOMAIN/upgrade/`
  - `https://YOUR_APP_DOMAIN/account/`

### 1.3 Create `entitlements` table
Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null,
  source text not null default 'stripe',
  created_at timestamptz not null default now()
);

create unique index if not exists entitlements_user_category_unique
on public.entitlements(user_id, category);

alter table public.entitlements enable row level security;

-- Users can read their own entitlements
create policy "read own entitlements"
on public.entitlements
for select
to authenticated
using (auth.uid() = user_id);
```

---

## 2) Stripe setup

### 2.1 Create a single shared price (same $ for all categories)
In Stripe (test mode first):
- Product: `ScopedLabs Category Unlock`
- Price: one-time (e.g. **$19.99**)
- Copy the **Price ID** (STRIPE_PRICE_ID_CATEGORY)

> Category is attached per purchase using Checkout Session metadata.

### 2.2 Create webhook endpoint (Cloudflare URL)
Stripe → Developers → Webhooks
- Add endpoint:
  - `https://YOUR_APP_DOMAIN/api/stripe-webhook`
- Listen to event:
  - `checkout.session.completed`
- Copy webhook signing secret (STRIPE_WEBHOOK_SECRET)

---

## 3) Cloudflare Pages setup

### 3.1 Put site on GitHub
- Create a repo and push the `ScopedLabs/` folder contents to repo root.

### 3.2 Create Cloudflare Pages project
- Pages → Create project → Connect to GitHub repo
- Framework preset: **None**
- Build command: *(none)*
- Output/public directory: `/` (root)

### 3.3 Add environment variables
Pages → Settings → Environment variables (Production and Preview):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_CATEGORY`
- `STRIPE_WEBHOOK_SECRET`

---

## 4) Wire the client config

Edit:

- `/assets/auth.js`

Replace:

- `REPLACE_WITH_SUPABASE_URL`
- `REPLACE_WITH_SUPABASE_ANON_KEY`

That’s it.

---

## 5) How unlocks work (v1)

- `/upgrade/?category=power#checkout`
- User signs in (magic link)
- Clicks Checkout → calls `/api/create-checkout-session`
- Stripe returns to `/account/?success=1`
- Webhook writes `entitlements(user_id, category)`
- `/account` and `/upgrade` read entitlements and set the localStorage flags used by `/assets/pro.js`

Pro pages remain **simple** (no Supabase client on every page) — they only check localStorage.

---

## 6) Categories (allowed)

The backend currently allows these category slugs:

- access-control
- compute
- infrastructure
- network
- performance
- physical-security
- power
- thermal
- video-storage
- wireless

If you rename category slugs later, update:
- `/functions/api/create-checkout-session.js` allowed list
- Upgrade links in `/upgrade/index.html`
- Any entitlement-to-localStorage mapping in `/assets/auth.js`

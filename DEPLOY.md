# Deploy Guide

## 1. Frontend on Vercel

This Vercel project only needs the public frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The landing does **not** need:

- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_TOKEN`
- `RESEND_API_KEY`

Those stay on the automation side only.

### Recommended Vercel setup

1. Create a new Vercel project from this repository.
2. Framework preset: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add the two `VITE_...` variables in:
   - Production
   - Preview
   - Development if you want to use `vercel dev`
6. Redeploy after saving the variables.

### Quick verification

After deploy:

1. Open the production URL.
2. Submit a fresh email and visible Google Maps name.
3. Confirm:
   - the form inserts into `review_submissions`
   - the page stays on the thank-you state
   - the review link opens the exact Google Maps review URL

## 2. Resend sender verification

For production delivery, verify a sending domain in Resend.

Recommended setup:

1. In Resend, go to `Domains`.
2. Add a subdomain such as:
   - `mail.tudominio.com`
   - `news.tudominio.com`
   - `promo.tudominio.com`
3. Copy the DNS records Resend gives you.
4. Add those records in your DNS provider.
5. Wait until the domain status becomes `verified`.
6. Use a real sender like:
   - `McDonald's <promo@mail.tudominio.com>`

Suggested production values for the automation:

- `RESEND_FROM_EMAIL=McDonald's <promo@mail.tudominio.com>`
- `RESEND_REPLY_TO=soporte@tudominio.com`

### How to verify it is ready

In Resend, confirm:

- the domain status is `verified`
- the sender address uses that verified domain
- a manual test email to your own inbox arrives successfully

## 3. Automation secrets

These are **not** Vercel variables.

They belong in your automation runtime, ideally Supabase Edge Function secrets:

- `APIFY_TOKEN`
- `APIFY_TASK_ID`
- `APIFY_DATASET_LIMIT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`
- `RESEND_TO_OVERRIDE` optional for tests only
- `RESTAURANT_NAME`
- `WHATSAPP_URL`

## 4. Supabase cron plan

The intended production split is:

- Vercel hosts the landing
- Supabase stores submissions
- a Supabase Edge Function runs the nightly workflow
- Supabase Cron triggers that function every night

See:

- `supabase/functions/review-automation`
- `supabase/cron/review-automation.sql`

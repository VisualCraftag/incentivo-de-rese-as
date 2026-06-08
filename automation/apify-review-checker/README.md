# Apify Review Checker

This folder contains the server-side workflow that:

1. runs the Apify task,
2. matches pending Supabase submissions against the scraped reviewer name,
3. generates coupons for positive matches,
4. sends the correct email through Resend,
5. updates Supabase so the same submission is not processed again.

## Purpose

The current flow is:

1. A cron job runs `node automation/apify-review-checker/index.mjs`
2. The script launches the configured Apify task and fetches the dataset rows
3. Pending `review_submissions` are matched by normalized display name
4. `matched_reviews` rows are inserted and submissions move to:
   - `matched_positive`
   - `matched_low_rating`
   - `not_found`
5. If Resend is configured, the script then processes email delivery:
   - `matched_positive` -> generates a coupon and sends it by email
   - `matched_low_rating` -> sends a private-support email with WhatsApp
   - `not_found` -> sends the "we couldn't find your review" email with WhatsApp
6. After a successful send, the submission advances to:
   - `coupon_sent`
   - `followup_sent`

## Expected Environment Variables

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_TOKEN`
- `APIFY_TASK_ID`

Optional:

- `APIFY_DATASET_LIMIT`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`
- `RESEND_TO_OVERRIDE`
- `RESTAURANT_NAME`
- `WHATSAPP_URL`

## Local Test Mode

For local development with Resend, you can use:

- `RESEND_FROM_EMAIL=McDonald's <onboarding@resend.dev>`
- `RESEND_TO_OVERRIDE=delivered+reviews@resend.dev`

That lets the workflow send to a safe Resend test inbox instead of the real customer email.

Important:

- `RESEND_TO_OVERRIDE` changes the actual recipient used by the script
- if the send succeeds, the submission is still marked as delivered
- because of that, test with a fresh dummy submission instead of a real customer row

## GitHub Actions Cron

The repo now includes `.github/workflows/nightly-review-automation.yml`.

It runs:

- every day at `03:00 UTC`
- manually through `workflow_dispatch`

To enable it, add these GitHub Actions secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APIFY_TOKEN`
- `APIFY_TASK_ID`
- `APIFY_DATASET_LIMIT` optional
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO` optional
- `RESEND_TO_OVERRIDE` optional
- `RESTAURANT_NAME`
- `WHATSAPP_URL`

## Notes

- This script is intended for server-side execution only
- The browser should never call Apify directly
- In the current Apify task output, the reviewer display name comes in the `name` field. The script falls back to `user` only as a defensive fallback.

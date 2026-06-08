# review-automation

Supabase Edge Function that runs the full nightly workflow:

1. call the configured Apify task
2. match pending `review_submissions`
3. update `matched_reviews`
4. generate coupons for positive matches
5. send the appropriate Resend email
6. move submissions to `coupon_sent` or `followup_sent`

## Required secrets

- `APIFY_TOKEN`
- `APIFY_TASK_ID`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESTAURANT_NAME`
- `WHATSAPP_URL`

Optional:

- `APIFY_DATASET_LIMIT`
- `RESEND_REPLY_TO`
- `RESEND_TO_OVERRIDE`

Built-in Supabase secrets used by the function:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEYS` or legacy `SUPABASE_SERVICE_ROLE_KEY`

## Suggested local commands

If you want to use the Supabase CLI without installing it globally:

```bash
npx supabase functions serve review-automation --env-file .env.server.example
```

Deploy:

```bash
npx supabase functions deploy review-automation
```

Set secrets:

```bash
npx supabase secrets set APIFY_TOKEN=...
npx supabase secrets set APIFY_TASK_ID=...
npx supabase secrets set RESEND_API_KEY=...
npx supabase secrets set RESEND_FROM_EMAIL="McDonald's <promo@mail.tudominio.com>"
npx supabase secrets set RESTAURANT_NAME="McDonald's"
npx supabase secrets set WHATSAPP_URL="https://wa.me/54911XXXXXXXX"
```

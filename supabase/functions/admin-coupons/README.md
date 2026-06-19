# Admin Coupons Edge Function

This function powers the `/admin` coupon checker.

## Required secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PANEL_USERNAME`
- `ADMIN_PANEL_PASSWORD`
- `ADMIN_PANEL_SESSION_SECRET`

## Actions

Send `POST` requests to `/functions/v1/admin-coupons` with JSON:

### Login

```json
{
  "action": "login",
  "username": "admin",
  "password": "secret"
}
```

### Lookup

```json
{
  "action": "lookup",
  "token": "admin-session-token",
  "code": "MCABC123"
}
```

### Redeem

```json
{
  "action": "redeem",
  "token": "admin-session-token",
  "code": "MCABC123"
}
```

## Notes

- This function is intentionally configured with `verify_jwt = false` in `supabase/config.toml`.
- Because it is public at the platform level, it must validate the fixed admin credentials and the signed session token inside the handler.
- The browser never receives the Supabase service role key.

# Admin Coupon Panel Design

## Summary

Add a protected `/admin` area to the landing project so restaurant staff can validate coupon codes and mark them as redeemed without exposing Supabase service credentials in the browser.

This admin flow should reuse Supabase as the backend surface by adding a dedicated Edge Function for admin authentication, coupon lookup, and coupon redemption.

## Scope

### In Scope

- Add a new `/admin` route inside the existing frontend
- Show an admin login screen with fixed username and password
- Validate admin credentials through a Supabase Edge Function
- Return a short-lived admin session token after successful login
- Allow admin users to search a coupon by code
- Show coupon status and submission details
- Allow marking eligible coupons as redeemed
- Persist redemption timing in the database
- Keep the public landing flow unchanged
- Update the implementation kit and guide so this admin feature can be replicated for future restaurant projects

### Out Of Scope

- Multi-user admin management
- Supabase Auth-based back office users
- Coupon voiding from the admin panel
- Advanced analytics and reporting
- Full audit trail beyond the redemption timestamp and existing coupon state

## Product Constraints

- Only one admin account is needed for this project
- Credentials should be easy to rotate through environment variables
- No service-role key or sensitive lookup logic may be exposed to the browser
- The panel must be usable from mobile devices in a cashier or counter context
- A redeemed coupon must not be redeemable again through the panel

## Recommended Architecture

### Frontend

Keep the project as a simple Vite + React SPA and route by `window.location.pathname` instead of adding a router dependency just for two screens.

The app should branch between:

- `/` for the public landing
- `/admin` for the private coupon panel

### Backend Surface

Use a new Supabase Edge Function dedicated to admin coupon operations.

The function should expose these actions over HTTP:

- `POST /functions/v1/admin-coupons` with `{ action: "login", username, password }`
- `POST /functions/v1/admin-coupons` with `{ action: "lookup", token, code }`
- `POST /functions/v1/admin-coupons` with `{ action: "redeem", token, code }`

This keeps deployment simple and avoids adding a separate Vercel backend.

## Security Design

### Credential Storage

Store fixed admin credentials as Supabase Edge Function secrets:

- `ADMIN_PANEL_USERNAME`
- `ADMIN_PANEL_PASSWORD`
- `ADMIN_PANEL_SESSION_SECRET`

The password must never be shipped to the client bundle.

### Session Model

After a successful login, the Edge Function should issue a short-lived signed session token.

Token requirements:

- signed using `ADMIN_PANEL_SESSION_SECRET`
- contains `sub`, `role`, and `exp`
- expires quickly, for example after 8 hours

The frontend can store this token in `sessionStorage` because the panel is operational tooling, not a customer-facing authenticated product. If the tab closes, the operator can log in again.

### Function Authorization

The Edge Function should run without relying on Supabase Auth JWTs because this admin uses fixed credentials, not Auth users.

Instead:

- login action validates the raw credentials
- lookup and redeem actions validate the signed admin session token
- all database reads and writes use the service role from inside the function only

## Data Model Changes

### `coupons`

Add:

- `redeemed_at timestamptz null`

Existing `status` remains the primary state flag.

Behavior:

- `generated` and `sent` can be redeemed
- `redeemed` cannot be redeemed again
- `void` cannot be redeemed

## Admin UX

### Login Screen

Fields:

- `Usuario`
- `Contrasena`

Behavior:

- shows loading state while logging in
- shows clear error if credentials are invalid
- keeps the UI compact and optimized for phone use

### Coupon Checker

Fields:

- `Codigo de cupon`

Results should show:

- code
- status
- generated date
- redeemed date if present
- customer email
- Google Maps visible name

Actions:

- `Buscar`
- `Marcar como canjeado` when status is redeemable
- `Cerrar sesion`

### Redeem Rules

When redeeming:

- if coupon is `generated` or `sent`, update it to `redeemed`
- set `redeemed_at`
- return the updated record
- if coupon is already `redeemed`, return a safe informative response
- if coupon is `void`, block redemption

## Testing Strategy

### Frontend

Add tests for:

- rendering `/admin` login screen
- successful login storing a session token
- failed login showing an error
- successful lookup showing coupon data
- redeem button calling the helper and refreshing the result

### Backend Helpers

Where feasible, test the client helper functions that talk to the admin Edge Function by mocking fetch responses.

## Deliverables

1. Frontend `/admin` screen and supporting helper modules
2. Supabase schema update adding `redeemed_at`
3. New Supabase Edge Function for admin coupon actions
4. Updated tests, env examples, and deploy guidance
5. Refreshed implementation kit and guide in `OUTPUT GENERADO`

## Risks And Notes

- A fixed admin password is simpler operationally but must be rotated if shared too widely
- `sessionStorage` is acceptable here because the browser is staff-operated and the token is short-lived
- Route handling in Vercel must continue to serve the SPA for `/admin`
- The admin panel should not depend on the public landing client privileges or public RLS access

# Supabase Capture And Apify Automation Design

## Summary

Extend the current landing page so it stores review-submission data in Supabase from the frontend, while also defining the full database model needed for later nightly review matching, coupon generation, and notification workflows.

This subproject covers three connected areas:

1. Supabase SQL schema and security
2. Landing page persistence to Supabase
3. Automation architecture for nightly Apify-based review checking

The implementation should fully deliver areas 1 and 2, and prepare a clear implementation skeleton for area 3 without needing to complete the full outbound email workflow yet.

## Scope

### In Scope

- Use a two-field landing form:
  - `google_maps_name`
  - `email`
- Save landing submissions directly to Supabase from the frontend
- Prevent duplicate usage of the same email address at the database level
- Show a user-facing duplicate/already-submitted state when possible
- Create a complete Supabase SQL schema for:
  - review submissions
  - nightly review-check runs
  - matched reviews
  - coupons
  - email events
- Apply RLS and grants so the public landing can insert into the submission table with minimal privileges
- Define the Supabase-first automation architecture that will later call Apify and process results
- Add a starter automation file or function scaffold for the nightly process
- Define future matching as exact normalized comparison between:
  - the submitted Google Maps display name
  - the `user` or equivalent field from Apify output

### Out Of Scope For This Phase

- Final coupon email delivery
- WhatsApp integration
- Production-grade fuzzy matching logic
- Production secrets setup in the user account
- Full cron deployment in Supabase
- Full Apps Script implementation

## Product Constraints

- This project is for one restaurant/local only
- Each restaurant will eventually have its own separate landing and separate automation setup
- Matching against scraped reviews must use only the review display name, not the email
- Email is used only for outbound communication
- The same email must not be allowed to submit twice
- If the same person reopens the QR on the same browser/device, the page should ideally show a local already-submitted indication
- Matching should be exact after normalization, not fuzzy

## Recommended Architecture

### Orchestrator

Use Supabase as the primary system of record and future automation orchestrator.

Why:

- The form data already lives there
- Scheduled processing can be run with Supabase Cron and Edge Functions
- Matching, coupon generation, and audit logs stay close to the source data
- This avoids splitting the critical workflow across too many tools too early

Apps Script can still be used later for secondary integration if the user chooses Gmail- or Drive-specific handling, but it should not be the primary workflow owner.

## Data Model

### 1. `review_submissions`

This is the only table the public landing writes to directly in this phase.

Columns:

- `id uuid primary key`
- `google_maps_name text not null`
- `email text not null unique`
- `status text not null default 'pending_review_check'`
- `review_checked_at timestamptz null`
- `matched_review_id uuid null`
- `coupon_id uuid null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Purpose:

- Store form submissions
- Enforce one submission per email
- Track whether the record has already been checked by the nightly process

### 2. `review_check_runs`

Columns:

- `id uuid primary key`
- `source_type text not null default 'apify'`
- `source_reference text null`
- `status text not null`
- `started_at timestamptz not null default now()`
- `finished_at timestamptz null`
- `notes text null`
- `created_at timestamptz not null default now()`

Purpose:

- Track each nightly matching run
- Provide traceability for failures and reruns

### 3. `matched_reviews`

Columns:

- `id uuid primary key`
- `submission_id uuid not null references review_submissions(id) on delete cascade`
- `run_id uuid null references review_check_runs(id) on delete set null`
- `review_user text not null`
- `review_text text null`
- `rating integer null`
- `review_date timestamptz null`
- `external_review_key text null`
- `match_confidence numeric null`
- `created_at timestamptz not null default now()`

Purpose:

- Store the specific review that was considered a match
- Preserve evidence of what the automation found

### 4. `coupons`

Columns:

- `id uuid primary key`
- `submission_id uuid not null unique references review_submissions(id) on delete cascade`
- `code text not null unique`
- `prefix text not null`
- `status text not null default 'generated'`
- `generated_at timestamptz not null default now()`
- `sent_at timestamptz null`
- `created_at timestamptz not null default now()`

Purpose:

- Store coupon generation results
- Keep maximum one coupon per submission

### 5. `email_events`

Columns:

- `id uuid primary key`
- `submission_id uuid not null references review_submissions(id) on delete cascade`
- `type text not null`
- `recipient_email text not null`
- `status text not null`
- `provider_message_id text null`
- `error_message text null`
- `sent_at timestamptz null`
- `created_at timestamptz not null default now()`

Purpose:

- Audit email attempts and outcomes

## Status Design

Use simple text statuses for now instead of Postgres enums to keep iteration easy in the first implementation.

Submission statuses:

- `pending_review_check`
- `matched_positive`
- `matched_low_rating`
- `not_found`
- `coupon_sent`
- `followup_sent`

Run statuses:

- `running`
- `completed`
- `failed`

Coupon statuses:

- `generated`
- `sent`
- `redeemed`
- `void`

Email event statuses:

- `queued`
- `sent`
- `failed`

## Security Model

### Public Landing Access

The frontend should use the publishable/anon Supabase key.

Public access should be limited to:

- insert into `review_submissions`

The public landing should not be able to:

- read the full submissions table
- read coupons
- read match results
- update statuses
- access run logs

### RLS Direction

- Enable RLS on every exposed table
- Grant only the minimum role access needed
- For `review_submissions`, allow `anon` insert through a dedicated insert policy
- Avoid public select access to the submission table in this phase

## Landing Changes

### New Form Structure

The landing form should collect:

1. `Nombre visible en tu resena de Google Maps`
2. `Mail`

### Submit Behavior

On valid submit:

- write to Supabase
- if insert succeeds:
  - store a local browser lock marker
  - open Google Maps in a new tab
  - show the thank-you state
- if Supabase rejects due to duplicate email:
  - do not reopen the flow as a new submission
  - show an already-submitted message

### Local Browser Lock

Use `localStorage` as a convenience-only UI signal for repeat visits on the same device/browser.

The true anti-duplicate enforcement is the unique constraint on `email`.

## Matching Design

### Exact Normalized Match

The future nightly process should compare:

- submitted `google_maps_name`
- scraped Apify `user` field or equivalent

Matching must be exact after normalization:

- trim leading/trailing whitespace
- collapse repeated inner whitespace
- lowercase
- strip accents/diacritics

No fuzzy or approximate matching should be used in this project phase.

## Automation Design

### Future Nightly Flow

1. Supabase Cron starts a nightly job
2. Cron invokes a Supabase Edge Function
3. The function creates a `review_check_runs` row
4. The function runs the Apify actor or reads the configured task output
5. The function gets review items from Apify dataset output
6. The function checks pending submissions against normalized review names
7. The function records match evidence in `matched_reviews`
8. The function updates `review_submissions.status`
9. If needed later:
   - generate coupon codes
   - create email events
   - invoke downstream mail sender logic

### Outcome Rules

- If there is a match and `rating >= 4`:
  - mark as positive
  - generate/send coupon in the future mail step
- If there is no match:
  - send the future "no encontramos tu resena" mail
- If there is a match and `rating <= 3`:
  - send the future low-rating private follow-up mail

### Apify Integration Direction

Use Apify API from a server-side function, not from the browser.

Recommended future pattern:

- configure an Apify task for the target Google Maps source
- invoke the task or actor from the Supabase Edge Function
- fetch dataset items using Apify API
- normalize the scraped `user` field
- process results in code

This is preferred over relying on CSV files as the primary machine interface, though CSV export can still remain an optional audit artifact later.

## Deliverables For This Phase

1. Supabase SQL file that creates the schema, constraints, helper trigger(s), grants, and RLS policies
2. Landing page updated to:
   - use `google_maps_name`
   - save to Supabase
   - handle duplicate email errors
   - keep current Google Maps opening behavior
3. Environment/config placeholders for Supabase frontend connection
4. A starter automation scaffold for the future nightly Apify process
5. Tests covering the frontend submission states as far as practical

## Verification

- SQL file is syntactically valid and organized for Supabase SQL editor usage
- Landing build passes
- Frontend tests pass
- Form validates both required fields
- Successful submission path writes through the Supabase client integration layer
- Duplicate email handling produces the intended UI state
- The codebase contains a clear starter for the future Apify automation path

## Risks And Notes

- Direct frontend insert is viable only if RLS and grants are kept minimal
- Matching only by visible review name is inherently imperfect if names collide
- CSV should not be the primary machine interface if direct dataset API access is available
- Final mail/coupon logic should be implemented only after the submission and matching pipeline is stable

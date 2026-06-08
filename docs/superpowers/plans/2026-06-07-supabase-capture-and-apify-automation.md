# Supabase Capture And Apify Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Supabase-backed submission flow to the landing page, ship the SQL schema and security model, and create a starter server-side automation scaffold for future Apify-based nightly review checks.

**Architecture:** Keep the current React/Vite frontend small and client-only, add a thin Supabase client module for inserts, and move all privileged future automation to a server-side scaffold. Use one SQL file for schema, constraints, grants, RLS, and helper triggers so the database setup is reproducible in the Supabase SQL editor.

**Tech Stack:** React, Vite, Vitest, supabase-js, PostgreSQL SQL for Supabase, Node/TypeScript starter automation scaffold

---

## File Structure

- `supabase/schema.sql`
  - Full schema, grants, RLS, and helper trigger/function definitions.
- `src/lib/supabase.js`
  - Frontend Supabase client bootstrap from environment variables.
- `src/lib/submissions.js`
  - Submission insert helper and duplicate-email error normalization.
- `src/App.jsx`
  - New three-field form, duplicate state, local lock, and Supabase submit flow.
- `src/App.test.jsx`
  - Frontend tests for validation, success submit path, and duplicate-email UI state.
- `src/index.css`
  - Small layout updates for the extra field and new duplicate state.
- `.env.example`
  - Required frontend environment variables for Supabase.
- `automation/apify-review-checker/README.md`
  - How the future nightly automation is intended to run.
- `automation/apify-review-checker/index.mjs`
  - Starter server-side script for invoking Apify and documenting the next processing step.

### Task 1: Add The Database Schema File

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write the schema and helper SQL**

Create `supabase/schema.sql` containing:

- extensions such as `pgcrypto` if needed for UUID generation
- `review_submissions`
- `review_check_runs`
- `matched_reviews`
- `coupons`
- `email_events`
- `updated_at` helper trigger function
- status check constraints
- unique constraints on `review_submissions.email` and `coupons.code`

- [ ] **Step 2: Add grants and RLS**

Include:

- explicit `grant insert on public.review_submissions to anon`
- no public select grants for the submissions table
- RLS enabled on every exposed table
- insert policy for `anon` on `review_submissions`
- no public read/update/delete policies on internal tables

- [ ] **Step 3: Sanity-check the SQL file for syntax/structure**

Run:

```bash
Get-Content supabase\schema.sql
```

Expected:
- file includes tables, triggers, grants, and policies in one coherent order

### Task 2: Add Frontend Supabase Integration Tests First

**Files:**
- Modify: `src/App.test.jsx`
- Create: `src/lib/submissions.js`

- [ ] **Step 1: Rewrite tests around the new three-field form**

Update tests so they cover:

- initial render with `review_name`, `gmail_account`, and `email`
- validation errors when any required field is missing
- successful submission calling the submission helper and switching to thank-you UI
- duplicate-email rejection showing an already-submitted message

- [ ] **Step 2: Mock the submission helper in the tests**

Use a module mock so frontend tests do not need a real Supabase project.

- [ ] **Step 3: Run tests and verify they fail before implementation**

Run:

```bash
npm test
```

Expected:
- tests fail because the current form only has two fields and no Supabase flow

### Task 3: Implement Frontend Submission Flow

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/lib/submissions.js`
- Create: `.env.example`
- Modify: `src/App.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add the Supabase client bootstrap**

Create `src/lib/supabase.js` with:

- `createClient`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- lazy failure if env vars are missing

- [ ] **Step 2: Add a single-purpose submission helper**

Create `src/lib/submissions.js` with:

- a `createReviewSubmission(payload)` function
- insert into `review_submissions`
- normalized return shape for:
  - success
  - duplicate email
  - generic failure

- [ ] **Step 3: Update the landing page**

Modify `src/App.jsx` to:

- add `reviewName`
- submit through `createReviewSubmission`
- store local lock in `localStorage`
- show duplicate-email state
- keep the Google Maps new-tab behavior only after a successful insert

- [ ] **Step 4: Adjust styles for the extra field and duplicate state**

Modify `src/index.css` to:

- fit the third field naturally
- style the duplicate/already-submitted state
- preserve current desktop/mobile balance

- [ ] **Step 5: Add `.env.example`**

Include:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Run tests and verify they pass**

Run:

```bash
npm test
```

Expected:
- all frontend tests pass

### Task 4: Add The Automation Starter Scaffold

**Files:**
- Create: `automation/apify-review-checker/index.mjs`
- Create: `automation/apify-review-checker/README.md`

- [ ] **Step 1: Create the starter script**

The script should:

- read `APIFY_TOKEN`
- read actor/task identifiers from environment variables
- document the intended server-side flow
- include a starter function for invoking Apify and retrieving dataset items
- stop before any real database write if required env is missing

- [ ] **Step 2: Document the intended nightly flow**

The README should explain:

- what the script is for
- what env vars it expects
- how it would later map into Supabase Cron + Edge Function execution
- that matching and outbound mail are future steps

### Task 5: Verify Build And Manual UX

**Files:**
- Verify only

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected:
- Vite build passes

- [ ] **Step 2: Run the app locally**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 4173
```

Expected:
- app starts successfully

- [ ] **Step 3: Manually verify the key paths**

Check:

- all three fields render
- required validation works
- duplicate state is reachable through a mocked or simulated rejection path
- success state still opens Google Maps and swaps the landing UI

## Self-Review

- Spec coverage:
  - SQL schema and security: Task 1
  - landing persistence: Tasks 2 and 3
  - environment placeholders: Task 3
  - automation starter: Task 4
  - verification: Task 5
- Placeholder scan:
  - no unresolved placeholders remain in the implementation steps
- Type consistency:
  - `reviewName`, `gmailAccount`, and `email` map directly to `review_name`, `gmail_account`, and `email` through the submission helper

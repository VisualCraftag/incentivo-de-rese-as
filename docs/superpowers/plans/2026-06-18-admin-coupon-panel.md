# Admin Coupon Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected `/admin` panel that logs in with a fixed admin user, looks up coupon codes, and marks them as redeemed through a Supabase Edge Function.

**Architecture:** Keep the Vite app as a two-screen SPA selected by `window.location.pathname`, and move all sensitive admin operations to a new Supabase Edge Function that validates fixed credentials and issues a short-lived signed session token. Persist coupon redemption in Postgres with a new `redeemed_at` column.

**Tech Stack:** React 19, Vite 7, Vitest, Supabase Edge Functions, Supabase Postgres, fetch-based frontend helpers.

---

### Task 1: Add regression tests for the admin UI flow

**Files:**
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\src\App.test.jsx`
- Create: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\src\lib\admin.test.js`
- Test: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\src\App.test.jsx`

- [ ] **Step 1: Write the failing tests for `/admin` rendering and login**
- [ ] **Step 2: Run `npm test -- src/App.test.jsx src/lib/admin.test.js` and verify the new tests fail for the expected missing admin behavior**
- [ ] **Step 3: Add minimal admin client helper scaffolding to support the new tests**
- [ ] **Step 4: Re-run `npm test -- src/App.test.jsx src/lib/admin.test.js` and confirm the helper-level tests pass while UI tests still drive the remaining work**

### Task 2: Implement the admin client and `/admin` UI

**Files:**
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\src\App.jsx`
- Create: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\src\lib\admin.js`
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\src\index.css`

- [ ] **Step 1: Implement the minimal route switch and admin login screen**
- [ ] **Step 2: Run `npm test -- src/App.test.jsx` and verify the new admin rendering test passes**
- [ ] **Step 3: Implement coupon lookup and redeem states in the admin screen**
- [ ] **Step 4: Re-run `npm test -- src/App.test.jsx src/lib/admin.test.js` and confirm the admin UI tests pass**

### Task 3: Extend Supabase schema and Edge Function

**Files:**
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\supabase\schema.sql`
- Create: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\supabase\functions\admin-coupons\index.ts`
- Create: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\supabase\functions\admin-coupons\README.md`

- [ ] **Step 1: Add `redeemed_at` to `public.coupons` in a backward-safe way**
- [ ] **Step 2: Implement login, lookup, and redeem actions in the new Edge Function**
- [ ] **Step 3: Verify local logic by running focused tests and static inspection of the request/response contracts**

### Task 4: Update deployment assets and replication kit

**Files:**
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\.env.server.example`
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\DEPLOY.md`
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\OUTPUT GENERADO\review-incentive-codex-kit.zip`
- Modify: `C:\Users\lucia\OneDrive\Documentos\Incentivo de reseñas\OUTPUT GENERADO\Kit Incentivo Resenas.docx`

- [ ] **Step 1: Add the new admin env vars and deployment notes**
- [ ] **Step 2: Refresh the generated kit so it includes the `/admin` capability and docs**
- [ ] **Step 3: Rebuild the landing inside the kit if needed and verify the packaged source stays deployable**

### Task 5: Full verification

**Files:**
- Verify only

- [ ] **Step 1: Run `npm test` and confirm all tests pass**
- [ ] **Step 2: Run `npm run build` and confirm the app builds successfully**
- [ ] **Step 3: Summarize any manual Supabase dashboard steps still required for production rollout**

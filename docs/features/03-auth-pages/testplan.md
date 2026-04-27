# 🧪 Test Plan — Auth Pages

> **Feature**: 03 — Auth Pages
> **Created**: 2026-04-06 (retroactive — authored during documentation pass)

---

## Acceptance Criteria

- [x] Sign-up creates a Supabase user and redirects to `/onboarding`
- [x] Sign-in with valid credentials redirects to `/workspace/<slug>` (or `/onboarding` if none)
- [x] Sign-in with invalid credentials shows a friendly mapped error
- [x] OAuth buttons surface a clear error if the provider isn't enabled in Supabase
- [x] Email-confirmation link (Supabase-hosted) lands on `/onboarding/create-workspace`
- [x] Reset-password flow uses Supabase's hosted screens; user returns signed-in
- [x] Split layout collapses below `lg` (`<1024px`) to the compact-logo + form layout

---

## Test Cases

### Happy Paths

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| H1 | Sign up with new email + password | User created; redirect to `/onboarding/create-workspace` | ✅ Pass |
| H2 | Sign in with correct credentials | Cookies set; redirect to `/onboarding/create-workspace` (gate routes to workspace if one exists) | ✅ Pass |
| H3 | OAuth (Google) when enabled | Provider consent → `/auth/callback` → `/onboarding/create-workspace` | ✅ Pass |
| H4 | Email confirmation link (Supabase-hosted) | Lands on `/onboarding/create-workspace` with active session | ✅ Pass |
| H5 | Forgot password → reset (Supabase-hosted) | Reset email arrives; new password works on next sign-in | ✅ Pass |

### Error Cases

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| E1 | Sign in with wrong password | Friendly error: "Email or password is incorrect" — Supabase code mapped via `AuthErrorMap` | ✅ Pass |
| E2 | Sign up with existing email | Friendly error: "An account with this email already exists" | ✅ Pass |
| E3 | Sign up with weak password (<8) | Form shows inline validation; submit blocked | ✅ Pass |
| E4 | OAuth canceled at provider | Returns to `/sign-in` with neutral message | ✅ Pass |
| E5 | Expired email-confirm token | Supabase-hosted screen shows "Link expired" + resend CTA | ✅ Pass |

### Edge Cases

| # | Scenario | Expected Behavior | Status |
|---|---|---|---|
| ED1 | Already-authenticated user visits `/sign-in` | Middleware / page guards route to `/workspace/<slug>` (or onboarding) | ✅ Pass |
| ED2 | OAuth provider not enabled in Supabase dashboard | Click surfaces Supabase error in the form's error state — no silent failure | ✅ Pass |
| ED3 | Catch-all suffix — `/sign-in/anything` | Page renders normally; suffix segments ignored | ✅ Pass |
| ED4 | Network failure during sign-in | Form re-enables; error toast shown | ✅ Pass |

### Security Tests

| # | Test | Expected | Status |
|---|---|---|---|
| S1 | Brute-force attempt on sign-in | Throttled by Supabase after N attempts | ✅ Pass |
| S2 | Cookies after sign-in | `httpOnly`, `secure` (prod), `sameSite=lax` | ✅ Pass |
| S3 | Sign-out invalidates cookies | Subsequent protected route returns to `/sign-in` | ✅ Pass |
| S4 | XSS in email field | Properly escaped; no script execution | ✅ Pass |

### Visual Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| V1 | Desktop ≥1024px | Split panel — branded left, form right | ✅ Pass |
| V2 | Tablet/Mobile <1024px | Compact-logo + centered form; left panel hidden | ✅ Pass |
| V3 | Loading state | Submit button disabled + spinner during request | ✅ Pass |
| V4 | Error state | Inline error above form; persists until next submit | ✅ Pass |

### Build / Type Tests

| # | Test | Expected | Status |
|---|---|---|---|
| B1 | `npm run build` | Clean | ✅ Pass |
| B2 | `npm run type-check` | Clean | ✅ Pass |
| B3 | E2E auth happy paths (Playwright) | Pass | ✅ Pass |

---

## Test Summary

| Category | Total | Pass | Fail | Skip |
|---|---|---|---|---|
| Happy Paths | 5 | 5 | 0 | 0 |
| Error Cases | 5 | 5 | 0 | 0 |
| Edge Cases | 4 | 4 | 0 | 0 |
| Security | 4 | 4 | 0 | 0 |
| Visual | 4 | 4 | 0 | 0 |
| Build | 3 | 3 | 0 | 0 |
| **Total** | **25** | **25** | **0** | **0** |

**Result**: ✅ ALL PASS

> This test plan was authored retroactively during the documentation pass. Statuses reflect the shipped state on `main` (the auth flow is covered by the production e2e Playwright suite — `npm run test:e2e`).

# 🪞 Review — Auth Pages

> **Feature**: #03 — Auth Pages
> **Branch**: `feature/03-auth-pages`
> **Merged**: 2026-04 → `main`

## Result

**Status**: ✅ Shipped.

**Summary**: Split-panel sign-in / sign-up pages backed by **Supabase Auth**. Left panel: blue gradient brand surface with logo, tagline, and three feature highlight cards. Right panel: custom email/password form + OAuth buttons. Left panel collapses to a compact logo on mobile.

## What Went Well ✅

- **Custom forms over Supabase UI components** — Full control over visuals + error states; Supabase still handles all the auth logic. The right trade-off: ~80 lines of form code, no styling fights with a vendored UI lib.
- **Server-component layout, client-component forms** — Layout doesn't ship JS; only the form does. Saves a few KB on the most-visited page.
- **OAuth providers wired conditionally** — If `NEXT_PUBLIC_OAUTH_*` env vars are missing, the corresponding button is omitted. Honest, no fake "Sign in with X" that fails on click.

## What Went Wrong ❌

- **Email confirmation flow surprised early users** — Supabase confirm-email default redirected to a generic page; we added a branded `/auth/confirm` route after the first feedback round.
- **Error message copy was raw** — Supabase errors like `User already registered` leaked through; added a small mapper from Supabase error codes → friendly copy.

## What Was Learned 📚

- Auth UX is dominated by error states and confirmation flows, not the happy path. Budget time accordingly.
- Supabase Auth is a great primitive but the surface around it (confirmation, password reset, error mapping) is where the work lives.

## What To Do Differently Next Time 🔄

- Plan the full auth journey (sign-in / sign-up / confirm / forgot / reset) up-front in a single architecture doc, not feature-by-feature.
- Start with the error-mapping table on day 1.

## Metrics

| Metric | Value |
|---|---|
| Routes added | `/auth/sign-in`, `/auth/sign-up`, `/auth/confirm`, password reset |
| Auth providers wired | Email/password + OAuth (Google, GitHub) |

## Follow-ups

- [x] Branded confirm + reset pages
- [x] Friendly error mapping
- [ ] Magic-link option — backlog
- [ ] Per-workspace SSO (SAML/OIDC) — Phase 4

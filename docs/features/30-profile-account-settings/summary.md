# 📋 Summary — Profile & Account Settings

> **Feature**: #30 — Profile & Account Settings
> **Status**: ✅ Complete (Retroactive — partial; per-device sessions still pending)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A user-level (not workspace-level) settings page with 4 tabs: **Profile** (name / email / role / timezone, list of workspaces with switch action), **Security** (password via Supabase Auth, 2FA toggle, **Connected Accounts** reading real Supabase identity providers, Delete Account in red), **Preferences** (theme, compact mode, minimap, LazyMind auto-score, weekly digest), and **Active Sessions** (current session labeled with device — wired in v1.3.25.0; per-device list pending the Supabase admin API).

## Key Decisions

- **User scope, not workspace scope** — Profile lives outside any workspace path (`/account`) so it's stable across workspace switches. Workspace settings (#12) and team-member management (#34) are workspace-scoped.
- **Connected Accounts reads real identity providers** — No fake "Google connected, GitHub not" UI; we render whatever `auth.identities` contains. Part of demo-data eradication (v1.3.25.0).
- **Sessions tab labels current device honestly** — Until Supabase exposes a list-sessions admin API, we show only the current device; "Revoke all other sessions" calls the existing endpoint. Better than fabricating session rows.
- **2FA is delegated to Supabase Auth, not implemented in-app** — The Security tab shows a "Two-Factor Authentication" card with a "Managed externally" badge. There is no in-app TOTP enrollment, no QR-code render, no `qrcode` package usage. If/when we ship in-app MFA enrollment, it will be a future feature with its own discussion.
- **Delete Account is async** — Soft-deletes the user row, schedules a background job to anonymize content, then hard-deletes. GDPR-friendly.

## Files & Components Affected

- `app/(app)/account/page.tsx` — Profile page with tabs
- `components/account/Profile.tsx`, `Security.tsx`, `Preferences.tsx`, `Sessions.tsx`
- `lib/db/schema/profiles.ts` — Per-user prefs
- `app/api/v1/account/route.ts` — PATCH for prefs / profile fields
- `app/api/v1/account/delete/route.ts`

## Dependencies

- **Depends on**: #03 Auth Pages (Supabase Auth), #12 Workspace Settings (workspace switcher)
- **Enables**: Per-user customization across the app

## Notes

- See project-roadmap.md "Remaining work" — per-device session listing is the open gap; requires Supabase service-role admin API integration.
- 2FA is **not** implemented in-app — the Security tab renders a "Managed externally" badge so users know to configure MFA via Supabase Auth directly. Earlier revisions of this doc claimed in-app TOTP enrollment with a `qrcode` package; that was inaccurate and has been corrected (see `feature/39-doc-cleanup-and-tests`).

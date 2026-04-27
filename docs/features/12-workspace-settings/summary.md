# 📋 Summary — Workspace Settings

> **Feature**: #12 — Workspace Settings
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A full-page workspace settings surface with 5 tabs: **General** (workspace name/slug/logo + per-event notification preferences), **Members** (team table, invite modal, pending invites — see #34), **Billing** (links to #13), **Data Export** (links to #21), and **Danger Zone** (delete workspace with slug-typing confirmation, transfer ownership). Notification preferences are wired to the real `notification_preferences` table (v1.3.5.0) so every toggle reflects and updates real state.

## Key Decisions

- **Settings is a full page, not a modal** — Settings has too many sub-surfaces (5 tabs, two destructive flows) to fit a modal. A page also gives URL-shareable deep links.
- **Slug-to-confirm for destructive ops** — Both Delete Workspace and Transfer Ownership require typing the workspace slug. Stops accidental clicks even by power users.
- **Notification toggles are per-event, not global** — Email notifications, weekly digest, task assignments, decision logged, thread mentions are independent rows, not a single "email me everything" switch. Persisted to `notification_preferences`.
- **Billing/Data Export tabs deep-link instead of duplicating** — Avoids two sources of truth; settings provides discovery, the dedicated pages own the surface.

## Files & Components Affected

- `app/(app)/workspace/[slug]/settings/page.tsx` — Settings page with tab routing
- `components/layout/SettingsTabs.tsx` — Pill-style tab navigation
- `components/settings/General.tsx`, `Members.tsx`, `DangerZone.tsx`, etc.
- `lib/db/schema/notification_preferences.ts` — Per-user, per-workspace, per-event preference rows
- `app/api/v1/workspaces/[slug]/route.ts` — PATCH (rename, slug change, logo) + DELETE
- `app/api/v1/workspaces/[slug]/transfer-ownership/route.ts`

## Dependencies

- **Depends on**: #03 Auth Pages (membership), #34 Team Member Management (Members tab)
- **Enables**: #13 Billing & Subscription, #21 Data Export, #23 Notification Center (preferences drive bell + email behavior)

## Notes

- Logo upload uses Supabase Storage; the rendered avatar is a CDN URL stored on the workspace row.
- Slug change cascades to all workspace URLs — the API uses a transaction to update the slug and create a redirect row to avoid breaking links.

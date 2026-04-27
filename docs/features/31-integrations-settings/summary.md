# 📋 Summary — Integrations Settings

> **Feature**: #31 — Integrations Settings
> **Status**: 🟡 Partial (Retroactive — UI rewired to registry v1.3.27.0; per-provider adapters pending OAuth credentials)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A workspace-level integrations management page with three sections: **Connected** (rows for any provider that has live tokens, with `Disconnect` button shipped in v1.3.28.0), **Available** (grid of Slack, Notion, Linear, Trello, Asana, GitHub, Google Calendar, Figma — each rendering `Available` or `Not configured` based on env vars in the OAuth registry, v1.3.27.0), and **API Access** (masked API key, copy, regenerate, Business Plan badge, link to API docs).

## Key Decisions

- **Single OAuth registry shared with #15 Import Modal** — `lib/oauth/registry.ts` is the one place that defines providers; both surfaces consume it.
- **Honest empty states** — Tiles show `Not configured` when env vars are missing rather than fake `Connect` buttons. v1.3.27.0 was a deliberate rewire away from the previous fabricated UI.
- **Per-row disconnect, not just bulk revoke** — Each connected integration has its own disconnect action so users don't have to "all or nothing" their workspace.
- **API keys are workspace-scoped** — Generated via `lib/sdk/api-key.ts`; format `lnx_sk_…`; stored hashed in the DB with first/last 4 chars retained for masking.

## Files & Components Affected

- `app/(app)/workspace/[slug]/settings/integrations/page.tsx`
- `components/settings/IntegrationCard.tsx`, `ApiKeyCard.tsx`
- `lib/oauth/registry.ts`, `lib/oauth/providers/*.ts`
- `lib/sdk/api-key.ts` — Key generation + hashing
- `app/api/v1/workspaces/[slug]/api-keys/route.ts`

## Dependencies

- **Depends on**: #12 Workspace Settings (entry), #13 Billing & Subscription (API access plan gate), #15 Import Modal (shared registry)
- **Enables**: External-tool integration story; a foundation for the eventual per-provider adapters

## Notes

- Per-provider adapter PRs are pending OAuth app registration with each vendor — see project-roadmap.md "Remaining work."
- Slack adapter is the priority (most-requested) — it would also light up `notification.send` to a Slack channel inside #17 Automations.

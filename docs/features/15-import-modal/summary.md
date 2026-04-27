# 📋 Summary — Import Modal

> **Feature**: #15 — Import Modal
> **Status**: 🟡 Partial (Retroactive — CSV real, OAuth connectors pending)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A 3-step wizard modal for migrating data into a Lazynext workspace. **Step 1**: select source (Notion API, Notion ZIP, Linear, Trello, Asana, CSV). **Step 2**: configure connection — file upload for CSV/ZIP, OAuth-connect tile for API sources. **Step 3**: real-time progress with a streaming log of created nodes. CSV import is fully wired and end-to-end real. OAuth tiles are wired to a registry (`lib/oauth/`) that renders `Available` or `Not configured` per env vars (v1.3.28.0); per-provider adapters for token exchange + import are scoped as follow-up PRs pending OAuth app credentials.

## Key Decisions

- **Wizard modal, not full page** — Import is a one-time-per-source flow; embedding it in a modal preserves canvas/onboarding context.
- **Honest empty states for unconfigured providers** — Rather than fake "Connect" buttons that fail, tiles show `Not configured` when env vars are missing. Part of the v1.3.2.0 → v1.3.3.6 demo-data eradication push.
- **CSV first** — CSV is universal, doesn't need OAuth, and unblocks every team that exports from anywhere. Shipping CSV alone delivers ~80% of the migration value.
- **Per-provider thin adapter pattern** — `lib/oauth/providers/` registers each provider with the same shape (auth URL builder, token exchange, import function). Adding a provider is a single-file change.

## Files & Components Affected

- `components/onboarding/ImportModal.tsx` — 3-step wizard
- `lib/oauth/registry.ts` — Provider registry + env-var detection
- `lib/oauth/providers/csv.ts` — CSV parser → node creator (real)
- `lib/oauth/providers/{notion,linear,trello,asana}.ts` — Adapter stubs (auth URL + token exchange)
- `app/api/v1/import/csv/route.ts` — CSV upload + import endpoint (real)
- `app/api/v1/import/[provider]/start/route.ts` — OAuth start (wired)
- `app/api/v1/import/[provider]/callback/route.ts` — Token exchange (wired, import per-provider)

## Dependencies

- **Depends on**: #04 Onboarding Flow (entry point), #05 Workflow Canvas (target)
- **Enables**: #31 Integrations Settings (shares the same provider registry)

## Notes

- See project-roadmap.md "Remaining work" — full OAuth import is the priority gap for #15.
- The progress log streams via SSE in CSV mode; OAuth providers will reuse the same stream.

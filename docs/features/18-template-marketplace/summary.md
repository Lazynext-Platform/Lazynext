# 📋 Summary — Template Marketplace

> **Feature**: #18 — Template Marketplace
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A browsable gallery of pre-built workflow templates accessible from the sidebar `Templates` link. Includes category filter pills (Product / Agency / Engineering / Startup / Operations / Marketing), keyword search, a featured section with mini node previews, an All Templates grid, and an install modal that lets users target a workspace and shows the breakdown by node type before committing. v1.3.8.0 shipped a 6-template curated catalog whose installs clone real nodes + edges into the target workspace.

## Key Decisions

- **Curated catalog over UGC for v1.0** — Six hand-built templates, not a community submission flow. Avoids moderation overhead and ensures every template demonstrates the platform's primitives well.
- **Templates ship as JSON node-graph fixtures** — Each template is `{ nodes: [...], edges: [...] }` in `lib/data/templates/`; install does a transactional bulk insert. No template-specific runtime.
- **"Publish Template" button is wired but inert** — Surfaces UGC intent for future Phase 4 work without committing to it now.
- **Mini node-graph preview in cards** — Shows the actual primitive types used; reinforces the 7-primitive model and helps users self-select.

## Files & Components Affected

- `app/(app)/workspace/[slug]/templates/page.tsx`
- `components/templates/TemplateCard.tsx`, `InstallModal.tsx`, `MiniGraphPreview.tsx`
- `lib/data/templates/` — JSON fixtures + index
- `app/api/v1/templates/[id]/install/route.ts` — Transactional clone into target workspace

## Dependencies

- **Depends on**: #05 Workflow Canvas (target), #13 Billing & Subscription (some templates may be Pro-tier)
- **Enables**: Onboarding success — new workspaces have a one-click path to a populated canvas

## Notes

- The catalog count (6) is hard-coded into copy in a couple of places — see the README "template count" note for sync.
- Re-running install on a workspace with the template already cloned creates a second copy; dedup is intentional (templates are starting points, not singletons).

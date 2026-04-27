# 📋 Summary — Public Shared Canvas

> **Feature**: #35 — Public Shared Canvas
> **Status**: ✅ Complete (Retroactive — shipped v1.3.9.0)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A read-only public viewer at `/shared/[token]` that renders any workflow canvas without requiring authentication. Top bar shows the Lazynext logo, the workflow + workspace name, an amber `Read-only` badge, node count + last-updated, and a `Sign up free` CTA. The full canvas renders with all node types and edges; zoom controls are simplified (+/percentage/-). A footer watermark — `Built with Lazynext` + `Try it free` — drives viral conversion. Share-link management lives in a modal accessible from the workspace canvas: public URL, copy button, on/off toggle, view count + creation date.

## Key Decisions

- **`share_token` per workflow, not per session** — A token is generated once and toggled on/off; revoking generates a new token (old URL becomes 404). Simple model, no expiring share state to track.
- **Read-only viewer reuses the canvas component** — Same ReactFlow render, with editing affordances suppressed via a `viewer` mode prop. Avoids a parallel viewer codebase.
- **No auth required for public view** — The token in the URL is the auth. Lookups go through a service-role function that scopes to the linked workflow only.
- **Watermark is non-removable on Free** — Removable watermark is a future Pro/Business feature; v1.0 keeps the viral surface mandatory.
- **View count is privacy-respectful** — Increments only on first view per IP per day; not a per-impression analytics stream.

## Files & Components Affected

- `app/(marketing)/shared/[token]/page.tsx` — Public viewer page
- `components/canvas/CanvasViewer.tsx` — Read-only canvas wrapper
- `components/canvas/ShareLinkModal.tsx` — Token toggle UI
- `lib/db/schema/workflows.ts` — `share_token`, `share_enabled`, `share_view_count` columns
- `app/api/v1/workflows/[id]/share/route.ts` — Toggle + regenerate
- `lib/data/shared-view.ts` — Public read query (no RLS bypass — uses the `share_token` predicate)

## Dependencies

- **Depends on**: #05 Workflow Canvas, #34 Team Member Management (workspace ownership), #01 Landing Page (CTA target)
- **Enables**: Viral distribution — every shared canvas is a marketing surface

## Notes

- Open Graph + Twitter Card metadata is generated per-share so links unfurl with the workflow name and a generated preview.
- Search engine indexing is opt-out (default `noindex` on shared pages); a future toggle could allow public indexing for marketing canvases.

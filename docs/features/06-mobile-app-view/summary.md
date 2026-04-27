# 📋 Summary — Mobile App View

> **Feature**: #06 — Mobile App View
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A mobile-optimized `NodeListView` that replaces the spatial ReactFlow canvas on viewports under 640px. Renders a vertically scrollable, type-colored card list with sticky filter pills, hamburger sidebar overlay, and a fixed bottom tab bar — keeping the same information architecture as the desktop canvas while remaining touch-friendly.

## Key Decisions

- **Replace canvas, don't shrink it** — ReactFlow is impractical below 640px, so mobile gets a fundamentally different view rather than a zoomed-out canvas. Documented as a v1.0 architectural constraint in `project-context.md`.
- **Left-border color coding** — Cards use `border-l-4` in the node-type color (blue/emerald/orange/purple/cyan/amber/teal) instead of full-background tint, keeping titles legible while remaining type-scannable at a glance.
- **Hamburger over persistent sidebar** — Maximizes content area on small screens; sidebar slides in as an overlay with a fading backdrop.
- **Bottom tab bar for primary nav** — Follows native mobile conventions (Home, Decisions, Threads, Pulse) rather than tucking nav into a top tab strip.
- **Filter pills are horizontally scrollable** — Avoids wrapping when more node types are added; `no-scrollbar` utility hides the scroll affordance.

## Files & Components Affected

- `components/canvas/NodeListView.tsx` — Mobile list view rendered in place of `ReactFlow` below the 640px breakpoint
- `app/(app)/workspace/[slug]/canvas/` — Canvas page that conditionally swaps renderers based on viewport
- `components/layout/MobileSidebar.tsx` — Slide-in workspace sidebar overlay
- `tailwind.config.ts` — `no-scrollbar` utility, mobile breakpoint tokens
- `docs/features/06-mobile-app-view/mockups/mobile-app-view.html` — Reference mockup

## Dependencies

- **Depends on**: #05 Workflow Canvas (shares the underlying `canvas.store` and node data model)
- **Enables**: Mobile coverage of the entire app — every subsequent feature must consider both the canvas (desktop) and the list view (mobile) representation

## Notes

- Card tap navigates to a placeholder detail route — full mobile node detail editing was deferred and is satisfied by reusing the desktop side-panel components in a full-screen sheet.
- Bottom-nav `Decisions`, `Threads`, `Pulse` tabs route to the same desktop pages (responsive). No mobile-specific page builds were created.
- Swipe-to-action on cards is explicitly out of scope for v1.0.

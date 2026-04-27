# 📋 Summary — Marketing Pages

> **Feature**: #32 — Marketing Pages
> **Status**: ✅ Complete (Retroactive — Blog backlog grows organically)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The five public marketing pages beyond Landing (#01) and Pricing (#02): **About** (mission pillars — Decision-First / 7 Primitives / Built for India — and the solo-founder team section), **Features** (3 deep-dive sections with alternating layouts — Decision DNA score preview, Canvas node diagram, LazyMind chat preview), **Changelog** (public version timeline with colored category dots — replicates `docs/project-changelog.md` for users), **Comparison vs Notion** (9-row feature table), and **Blog** (3 real launch posts; backlog grows). All on light theme with the shared marketing nav.

## Key Decisions

- **Light theme for marketing, dark for app** — Hard split documented in `design-system.md`. Marketing pages share `app/(marketing)/layout.tsx`.
- **Comparison page targets Notion specifically** — Single competitor, single page, deeply argued. Future Linear / ClickUp pages can copy the template.
- **Public changelog mirrors project-changelog.md** — Keeps marketing claims and engineering reality aligned. Auto-rendered from a curated subset of project-changelog.md.
- **Blog is MDX-ready but currently file-listed** — Three real posts (Launch / Engineering / Product) — see roadmap "Remaining work" entry; converting to MDX-driven listing is on the backlog.

## Files & Components Affected

- `app/(marketing)/about/page.tsx`
- `app/(marketing)/features/page.tsx`
- `app/(marketing)/changelog/page.tsx`
- `app/(marketing)/comparison/page.tsx`
- `app/(marketing)/blog/page.tsx`, `app/(marketing)/blog/[slug]/page.tsx`
- `components/marketing/` — Shared nav, footer, section primitives

## Dependencies

- **Depends on**: #01 Landing Page (shared marketing chrome), #19 Email Templates (brand consistency)
- **Enables**: SEO + content marketing surface; conversion funnel beyond the landing page

## Notes

- Sitemap (`app/sitemap.ts`) and robots (`app/robots.ts`) include all five pages.
- Blog posts are currently inline JSX in `blog/[slug]/page.tsx`; MDX migration is intentionally deferred until post count justifies the tooling.

# 💬 Feature Discussion — Landing Page

> **Feature**: 01 — Landing Page
> **Status**: 🟢 COMPLETE
> **Date Started**: 2026-04-06
> **Date Completed**: 2026-04-06

---

## What Are We Building?

A full-length, high-conversion marketing landing page for Lazynext — the first page any visitor sees. It introduces the platform's value proposition through 12 distinct sections: hero, social proof, problem statement, seven primitives, Decision DNA deep-dive, LazyMind AI showcase, consolidation map, pricing, testimonials, CTA banner, and footer.

## Why?

This is the front door of Lazynext. Every visitor's first impression starts here. Without a compelling landing page, no one reaches the product. The page must communicate that Lazynext replaces fragmented SaaS stacks with a single unified workspace, and that Decision DNA is the hero differentiator.

## Requirements

### Functional Requirements (from design-brief.md)
- Fixed header with navigation and CTA
- Hero section with animated canvas mockup showing node types
- Social proof bar with team count and logo placeholders
- Problem section ("The graveyard of half-used tools")
- Seven primitives grid with DECISION highlighted
- Decision DNA hero feature section with mockup card
- LazyMind AI section with chat mockup
- Consolidation map SVG (6 tools → Lazynext)
- Pricing section with monthly/annual toggle (INR)
- Testimonials section (3 cards)
- CTA banner with gradient background
- Footer with 5-column layout

### Non-Functional Requirements
- Light theme (marketing pages use white bg per design system)
- Mobile-first responsive (375px, 768px, 1280px)
- WCAG 2.1 AA compliance
- Inter font loaded via Google Fonts
- Smooth scroll for anchor links
- Card hover effects with translateY + shadow
- Floating animation on hero canvas nodes
- Mobile hamburger menu

## Dependencies

- **Upstream**: None — landing page has no dependencies
- **Downstream**: Feature #32 (Marketing Pages) depends on #01

## Edge Cases

- No dynamic data — fully static page
- Pricing toggle is client-side only (monthly/annual)
- Mobile menu toggle is client-side only
- SVG consolidation map may need special handling for very small screens

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Client components vs Server | Use 'use client' only for interactive sections (pricing toggle, mobile menu) | Maximize SSR performance |
| Component extraction | Break into ~12 components (one per section) | Maintainability, reusability |
| Existing page approach | Replace the basic existing page entirely | Current page is too simple vs the full Blueprint design |
| Layout approach | Keep existing marketing layout (header/footer) and enhance it | DRY — layout already has header/footer structure |

## Discussion Complete ✅

All requirements are clear from the Blueprint design docs. No open questions. Ready for architecture.

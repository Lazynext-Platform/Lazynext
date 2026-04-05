# Design Brief — Marketing Pages

> **Feature**: 32 — Marketing Pages
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: 5 marketing pages on light theme — About (mission, team), Features (3 deep-dives with previews), Changelog (version timeline), Comparison vs Notion (feature table), and Blog (featured + grid). All accessible via a floating tab switcher.
**Why**: The platform needs marketing pages beyond landing/pricing to communicate the company story, feature depth, product evolution, competitive positioning, and content marketing.
**Where**: Public-facing marketing site — linked from main nav (About, Blog, Features, Changelog).

---

## Target Users
- **Prospective users**: Evaluating Lazynext before signing up
- **Existing users**: Checking changelog for updates, reading blog for tips
- **Competitors' users**: Comparing Lazynext vs Notion/Linear/Trello

---

## Requirements

### Must Have
- [x] About page: hero ("better than tool soup"), 3 mission pillars (Decision-First, 7 Primitives, Built for India), solo founder team section
- [x] Features page: "Platform Features" header, 3 deep-dive sections (Decision DNA with score preview, Canvas with node diagram, LazyMind with chat preview) — alternating layout
- [x] Changelog page: version timeline (v0.5 → v0.1) with colored category dots, release dates, bullet-point descriptions
- [x] Comparison page: "Lazynext vs Notion" header, 9-row feature table (Canvas, Decision DNA, Threads, Automation, AI, Pricing, Real-time, Import, Mobile), checkmarks/x-marks/text comparison
- [x] Blog page: featured post (full-width card with gradient), 4-card grid with category badges and read times
- [x] Shared nav: Lazynext logo, Product/Pricing/About/Blog links, "Get Started Free" CTA
- [x] Light theme throughout (bg-white, text-slate-900)

### Nice to Have
- [x] Floating page switcher (pill tabs) for mockup navigation
- [x] Dark preview cards on features page to show app UI
- [x] Color-coded category badges on changelog and blog
- [x] Fade-in page transition animation

### Out of Scope
- Individual blog post pages
- Full changelog filtering/search
- Interactive comparison tool
- SEO metadata implementation

---

## Layout

**Page type**: Marketing pages (public, light theme)
**Primary layout**: Max-w-5xl/6xl centered content with shared nav
**Key sections per page**:
- **About**: Hero → 3-col mission pillars → Team section (bg-slate-50)
- **Features**: Header → 3 alternating 2-col feature sections with dark preview cards
- **Changelog**: Header → vertical timeline with version cards
- **Comparison**: Header → comparison table (alternating row bg)
- **Blog**: Header → featured post card → 4-col article grid

---

## States & Interactions

| State | Description |
|---|---|
| **Page active** | Selected page visible, tab highlighted in switcher |
| **Page hidden** | Other pages hidden via display:none |
| **Tab hover** | bg-slate-800 on inactive tabs |
| **Page transition** | fadeIn animation (0.3s) on page switch |

**Key interactions**: Tab switching between 5 pages, nav link clicks, CTA buttons ("Get Started Free", "Start Free Trial"), blog article clicks

---

## Responsive Behavior
- **Mobile**: Single column, nav collapses, feature grids stack, comparison table scrolls horizontally
- **Tablet**: 2-column grids, full nav
- **Desktop**: Full multi-column layouts

---

## Constraints
- Light theme only (marketing pages use bg-white, unlike dark app theme)
- Must use brand primary #4F6EF7 for CTAs and accents
- INR pricing referenced where applicable
- Solo founder context in team section (hiring link for future)

---

## References
- Feature 01 (Landing Page) — primary marketing page, shares nav pattern
- Feature 02 (Pricing Page) — referenced from marketing nav
- Brand guidelines for color, typography (Inter), logo usage

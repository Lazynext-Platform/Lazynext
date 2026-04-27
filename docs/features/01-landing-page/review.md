# 🪞 Review — Landing Page

> **Feature**: #01 — Landing Page
> **Branch**: `feature/01-landing-page`
> **Merged**: 2026-04-06 → `main`
> **Time Spent**: ~15 min planning + build session (single-session feature)

## Result

**Status**: ✅ Shipped — all 12 sections live on https://lazynext.com.

**Summary**: A high-conversion marketing landing page composed of 12 modular section components (Hero, Social Proof, Problem, 7 Primitives, Decision DNA, LazyMind, Consolidation Map, Pricing, Testimonials, CTA Banner, Footer). Light-theme marketing build, mobile-first responsive, INR pricing toggle, animated canvas mockup, smooth scroll, and accessibility-checked.

## What Went Well ✅

- **Component-per-section pattern paid off** — Each section is independent and reusable; the Decision DNA, LazyMind, and Pricing sections were later lifted into `app/(marketing)/features/page.tsx` (#32) without modification.
- **Marketing CSS isolated to `globals.css`** — A small, named set of utilities (`.gradient-hero`, `.card-hover`, `.float-anim`, `.consolidation-line`) kept Tailwind ergonomic without bloating the config.
- **Single-session execution** — Discussion → architecture → tasks → build → ship in one session demonstrated that Mastery scales down to small features without overhead.

## What Went Wrong ❌

- **Hardcoded testimonials** — Three named testimonials shipped without real customer attribution; later cleaned up in the v1.3.2.0 → v1.3.3.6 demo-data eradication push.
- **Pricing copy drift** — INR amounts on the landing page were initially hardcoded and drifted from `lib/billing/plans.ts` once #02 / #13 shipped. Resolved by sourcing both from the same module.
- **Floating canvas mockup heavy on mobile** — The hero animation initially ran on iOS Safari at noticeable cost; throttled with `prefers-reduced-motion`.

## What Was Learned 📚

- Marketing sections are platform components — design them as such from the start, not as one-off page slices.
- "Demo data on a marketing page" is still demo data; ship marketing pages with claims you can verify.
- The 12-section structure mirrors the standard SaaS landing-page anatomy; keeping the order canonical helps future writers extend it.

## What To Do Differently Next Time 🔄

- Source pricing, copy stats, and testimonial content from real modules (`lib/billing/plans.ts`, CMS, customer DB) from session 1, not as a follow-up cleanup.
- Add a `data-section="hero"` attribute to every section for analytics segmentation — would have avoided post-hoc DOM-querying for funnel tracking.

## Metrics

| Metric | Value |
|---|---|
| Sections shipped | 12 |
| Component files added | 11 (one per section + minor primitives) |
| CSS utilities added | 4 |
| Sessions to ship | 1 |

## Follow-ups

- [x] Replace fabricated testimonials with real attribution (done in v1.3.2.0+)
- [x] Pricing copy sourced from `lib/billing/plans.ts` (done)
- [ ] Add marketing analytics events (`data-section` instrumentation) — backlog

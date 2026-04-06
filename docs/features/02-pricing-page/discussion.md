# 💬 Feature Discussion — Pricing Page

> **Feature**: 02 — Pricing Page
> **Status**: 🟢 COMPLETE
> **Date**: 2026-04-06

---

## What Are We Building?

A dedicated `/pricing` page with 4-tier pricing cards (Free, Starter, Pro, Business), monthly/annual billing toggle, a 16-row feature comparison table, 6-item FAQ accordion, and a "Still have questions?" CTA section.

## Why?

This is the revenue conversion page. Visitors from the landing page or header nav come here to evaluate and choose a plan. The page must make the value progression crystal clear and guide users toward the Starter tier (highlighted as "Most Popular").

## Requirements

- 4-tier pricing cards in a responsive grid (1→2→4 columns)
- Monthly/annual billing toggle with animated knob and "Save 17%" badge
- INR pricing with USD equivalents shown below
- "billed annually" note appears when annual toggle is active
- Starter card highlighted with primary border, shadow, and "Most Popular" badge
- Progressive "Everything in X, plus:" feature inheritance pattern
- 16-row feature comparison table with Starter column tinted
- 6-item FAQ accordion with chevron rotation and smooth expand/collapse
- "Still have questions?" CTA section
- Reuses marketing layout (header + footer from Feature #01)

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Component approach | Single page component with inline data | All content is static; no need for separate section components |
| Client vs server | Client component ('use client') | Needs useState for billing toggle and FAQ accordion |
| 4 tiers vs 3 | 4 tiers (adding Starter) | Pricing page is comprehensive view; landing page shows simplified 3-tier |

## Discussion Complete ✅

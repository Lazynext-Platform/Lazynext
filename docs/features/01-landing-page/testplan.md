# 🧪 Test Plan — Landing Page

> **Feature**: 01 — Landing Page
> **Created**: 2026-04-06

---

## Test Cases

### Visual Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| V1 | Page renders at 1280px desktop | All 12 sections visible, proper spacing, multi-column layouts | ⬜ |
| V2 | Page renders at 768px tablet | 2-column grids, responsive text sizes | ⬜ |
| V3 | Page renders at 375px mobile | Single column, stacked elements, hamburger menu | ⬜ |
| V4 | Hero canvas nodes animate | 4 node cards float with 3s ease-in-out infinite | ⬜ |
| V5 | Card hover effects | Cards lift 4px with enhanced shadow on hover | ⬜ |
| V6 | SVG consolidation lines animate | Dashed lines animate with dash offset | ⬜ |

### Interaction Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| I1 | Click Monthly/Annual toggle | Prices update: Free ₹0, Pro ₹499/₹415, Business ₹999/₹832 | ⬜ |
| I2 | Click hamburger menu (mobile) | Dropdown nav appears with all links | ⬜ |
| I3 | Click "Features" nav link | Smooth scroll to primitives section | ⬜ |
| I4 | Click "Pricing" nav link | Smooth scroll to pricing section | ⬜ |
| I5 | Click "Start Free" CTA | Navigates to /sign-up | ⬜ |
| I6 | Click "Sign In" link | Navigates to /sign-in | ⬜ |

### Accessibility Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| A1 | Heading hierarchy | h1 (hero) → h2 (sections) → h3 (cards), no skips | ⬜ |
| A2 | Keyboard navigation | All links/buttons focusable, visual focus states | ⬜ |
| A3 | Touch targets | All interactive elements ≥44×44px on mobile | ⬜ |
| A4 | Color contrast | Text meets 4.5:1 ratio on all backgrounds | ⬜ |

### Build Tests

| # | Test Case | Expected Result | Status |
|---|---|---|---|
| B1 | `npm run build` succeeds | No build errors | ⬜ |
| B2 | No TypeScript errors | Clean tsc check | ⬜ |
| B3 | No console errors | Page loads without JS errors | ⬜ |

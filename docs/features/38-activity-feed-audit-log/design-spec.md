# Design Spec — Activity Feed & Audit Log

> **Feature**: 38 — Activity Feed & Audit Log
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A dual-view activity page with a social-style feed (7 activity items grouped by Today/Yesterday, with typed action icons, entity links, and quoted thread previews) and a tabular audit log (7 rows with timestamps, users, color-coded actions, targets, details, and masked IPs) with pagination and CSV export.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Feed uses social-media-inspired timeline for approachability; audit log uses formal table for compliance needs; action-type mini icons overlaid on avatars provide instant activity categorization; thread reply includes inline quote for context without navigation; IP addresses partially masked for privacy-by-default.

---

## Section Breakdown

### Activity Feed
**Purpose**: Casual, chronological view of team activity
**Layout**: max-w-3xl, grouped by day with date headers + divider lines
**Key elements**: User avatar (w-8 gradient) with action-type mini icon overlay (w-4 colored circle with icon), descriptive text ("Avas Patel created task Set up monitoring alerts"), clickable entity names (type-colored), primitive type badge (text-[10px] colored bg), relative timestamp. Thread items include bg-slate-800/50 quoted message with border-l-2 accent.
**Rationale**: Social timeline format is intuitive and encouraging — seeing team activity builds engagement.

### Audit Log
**Purpose**: Formal, compliance-grade activity record
**Layout**: max-w-4xl, bg-slate-900 rounded-xl table with grid-cols-12
**Key elements**: Timestamp (font-mono), user avatar+name, action badge (color-coded: created blue, decided orange, replied purple, updated emerald, moved amber, joined emerald), target description, details column, masked IP (last octet as x.x). Business Plan badge, Export CSV button, pagination (1-7 of 156).
**Rationale**: Table format supports scanning, filtering, and export for security review. Timestamps and IPs provide forensic value.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Feed active** | Timeline visible, chronological | Default view |
| **Audit active** | Table visible with pagination | Business plan gated |
| **Filter applied** | Both views filter by selected type | Dropdown selection |
| **Empty feed** | "No activity yet" empty state | New workspace |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Sidebar hidden, feed single column, audit table scrolls horizontally |
| **Tablet (640–1024px)** | Sidebar visible, full layouts |
| **Desktop (> 1024px)** | Full layout as designed |

---

## Cognitive Load Assessment

- **Information density**: Moderate — feed items are scannable with clear visual hierarchy
- **Visual hierarchy**: Avatar → action text → entity link → type badge → timestamp
- **Progressive disclosure**: Feed/Audit toggle separates casual from formal; day grouping chunks content
- **Interaction complexity**: Low — scroll, click entity links, switch tabs, filter

---

## Accessibility Notes

- **Contrast**: Action text on dark backgrounds meets AA. Color-coded badges supplemented with text labels.
- **Focus order**: Tab toggle → filter → feed items / audit rows → pagination
- **Screen reader**: Feed items need descriptive text combining user + action + target. Audit table needs proper th headers. Pagination needs aria-labels.
- **Keyboard**: Tab through interactive elements. Enter on entity links. Arrow keys for pagination.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Activity timeline pattern | New component for feed items | Consider adding to design system |

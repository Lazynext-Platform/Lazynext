# Design Brief — Decision DNA View

> **Feature**: 07 — Decision DNA View
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A global decision log view where users can search, filter, and browse all recorded decisions across their workspace, log new decisions via a modal, and view decision health analytics.
**Why**: Decision DNA is Lazynext's core differentiator — this view makes organizational decisions searchable, trackable, and measurable with quality scores.
**Where**: Main app navigation under "Decisions" tab, accessible from the top nav and left sidebar.

---

## Target Users
- **Team leads / managers**: Need to review and track team decision quality over time
- **Individual contributors**: Need to log decisions and reference past ones for context
- **Workspace admins**: Need visibility into decision patterns and outcomes across the org

---

## Requirements

### Must Have
- [x] Full-text search across decision titles and resolutions
- [x] Filter by outcome (Good, Bad, Neutral, Pending)
- [x] Filter by quality score range (High 70-100, Mid 40-69, Low 0-39)
- [x] Filter by date range (All Time, Last 7/30/90 days)
- [x] Filter by tags (infrastructure, pricing, hiring, tooling, product)
- [x] Sort options (Newest, Oldest, Highest quality, Lowest quality)
- [x] Decision rows showing title, resolution preview, author, date, workflow badge, quality score circle, outcome badge
- [x] Status icons differentiating "Decided" (green checkmark) vs "Open" (amber clock)
- [x] Pagination with page numbers and prev/next navigation
- [x] "Log Decision" modal with fields: Question, Resolution, Rationale, Options Considered (tag input), Decision Type (Reversible/Irreversible/Experimental), Tags (multi-select)
- [x] Quality score auto-calculation displayed in modal footer with pulse animation
- [x] Decision health overview card (Business plan gated) with stat cards and quality distribution bar chart

### Nice to Have
- [x] Business plan lock overlay with blur effect for health analytics
- [x] Animated fade-in for decision rows with staggered delay
- [x] Score pulse animation on decision submission
- [x] Empty state with icon and helpful message when no results match

### Out of Scope
- Decision detail panel (covered in Feature 09)
- Thread/comments on decisions (covered in Feature 11)
- Decision health dashboard full page (covered in Feature 08)

---

## Layout

**Page type**: Full-page list view with sidebar
**Primary layout**: Fixed top bar + fixed left sidebar (60rem) + scrollable main content (max-w-5xl centered)
**Key sections** (in order):
1. **Header row**: "DECISION DNA" title with star icon + "Log Decision" CTA button
2. **Search bar**: Full-width search input with magnifying glass icon
3. **Filter row**: Outcome select, Quality select, Date range select, Tags select, Sort select (right-aligned)
4. **Health overview card**: 4 stat cards (Decisions This Month, Avg Quality Score with progress bar, Outcomes Tagged %, Top Decision Maker) + quality distribution bar chart — gated behind Business plan with blur overlay
5. **Decision list**: Vertically stacked decision row cards with orange left border accent
6. **Pagination**: "Showing X-Y of Z" label + numbered page buttons

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | 8 decision rows loaded, page 1 active, no filters applied |
| **Empty** | Centered icon + "No decisions match your search" + "Try different keywords or clear filters" |
| **Loading** | Not explicitly mocked — rows appear with staggered fade-in animation |
| **Error** | Not explicitly mocked |
| **Success** | Modal closes after 1.5s delay showing quality score pulse animation |

**Key interactions**:
- **Search**: Real-time filtering as user types in search input
- **Filter dropdowns**: Outcome, quality, date range, tags — each triggers re-render of decision list
- **Decision row click**: Clickable rows (cursor pointer, hover bg change) — opens detail view
- **Log Decision button**: Opens centered modal with backdrop blur
- **Modal submit**: Validates question field required, shows animated quality score, auto-closes
- **Modal close**: X button, Cancel button, backdrop click, or Escape key
- **Options tag input**: Type + Enter to add option tags with X to remove
- **Focus trap**: Tab cycling trapped within modal when open

---

## Responsive Behavior
- **Mobile**: Search and filters stack vertically, decision rows simplify (no workflow badge), sidebar hidden
- **Tablet**: Filters wrap to two rows, sidebar hidden, main content uses sm breakpoint padding
- **Desktop**: Full sidebar (w-60) fixed left, main content offset with lg:ml-60, all filters in single row

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Decision title** | User-generated text | "Use Supabase for Auth + DB?" |
| **Resolution** | User-generated text, truncated | "Chose Supabase for unified Auth + PostgreSQL with RLS..." |
| **Quality score** | Computed 0-100 | Displayed in colored circle (green 70+, amber 40-69, red 0-39) |
| **Outcome badge** | Enum pill | Good (green), Bad (red), Neutral (gray), Pending (amber) |
| **Author** | Avatar + name | Pravatar image + "Priya S." |
| **Workflow badge** | Colored pill with dot | "Q2 Sprint" (emerald), "Product Roadmap" (sky), "Infrastructure" (violet) |
| **Date** | Formatted date | "Apr 2, 2026" |
| **Pagination label** | Dynamic text | "Showing 1-8 of 47 decisions" |

---

## Constraints
- Health overview card is gated behind Business plan (blurred with lock badge for free users)
- Quality score is auto-calculated — not manually editable in the log modal
- Decision list is paginated at 8 per page (47 total shown in mockup)
- Modal form requires the Question field; all other fields are optional
- Focus-visible outlines use primary blue (#4F6EF7) for WCAG compliance

---

## References
- Feature 08 (Decision Health Dashboard) for expanded analytics
- Feature 09 (Node Detail Panels) for decision detail editing
- Feature 11 (Thread Comments Panel) for decision-attached threads
- Lazynext design system: Inter font, dark theme (#020617 bg equivalent to slate-950), primary #4F6EF7, orange accent for Decision DNA

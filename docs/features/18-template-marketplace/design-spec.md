# Design Spec — Template Marketplace

> Feature: 18 / Date: 2026-04-05 / Fidelity: Mockup / Status: Draft / Iterations: 1

## Overview

**What was designed:** A full-page template gallery with category filtering, featured/all templates grids, an install modal with node breakdown, and a success confirmation state. The gallery lives within the standard app shell (sidebar + header + scrollable main).

**Design brief link:** `design-brief.md`

**Key decisions:**
- Used card-based layout with mini node previews in each card header to give users a visual sense of template structure before clicking
- Featured section uses taller cards (h-36 preview) vs All Templates (h-28 preview) to create visual hierarchy
- Install flow is a single modal with workflow selector and detailed node breakdown, avoiding a multi-step wizard
- Success state replaces modal content inline rather than navigating away, letting users choose when to go to the workflow

## Section Breakdown

### 1. Sidebar Navigation
- **Purpose:** Persistent workspace navigation with Templates as the active item
- **Layout:** 240px fixed-width column, bg-slate-900, border-r border-slate-700
- **Key elements:** Workspace logo/name header (Acme Corp), nav links (Canvas, Decisions, Templates, Settings), Templates shown as active with bg-slate-800 and font-medium
- **Rationale:** Consistent app shell pattern; Templates sits alongside Canvas and Decisions as a top-level destination

### 2. Header Bar
- **Purpose:** Page title, search, and publish action
- **Layout:** Sticky 48px bar, bg-slate-900, flex row with items centered
- **Key elements:** "Template Gallery" title (text-sm font-semibold), search input (bg-slate-800, w-56, placeholder "Search templates..."), "+ Publish Template" secondary button (bg-slate-800, border)
- **Rationale:** Search is prominently placed for quick filtering; Publish button is secondary since most users consume rather than create templates

### 3. Category Filters
- **Purpose:** Quick filtering by industry/team type
- **Layout:** Horizontal row of pill buttons with flex-wrap, gap-2
- **Key elements:** 7 pills — All (active: bg-[#4F6EF7] text-white), Product, Agency, Engineering, Startup, Operations, Marketing (inactive: bg-slate-800 text-slate-400 border border-slate-700)
- **Rationale:** Pill-style filters are scannable and familiar; "All" is active by default to show full catalog

### 4. Featured Templates Grid
- **Purpose:** Highlight the best/most popular templates to drive installs
- **Layout:** 3-column responsive grid (1/2/3 cols at mobile/tablet/desktop), gap-4
- **Key elements per card:**
  - Preview header (h-36) with gradient background (unique per category) and mini node tiles (w-16 h-10) showing primitive type labels (TASK, DOC, DECISION) at 6px/5px text
  - Featured badge (amber star, absolute top-right, bg-amber-500/20 text-amber-400)
  - Card body: icon + title, 1-line description, category badge (color-coded), node/edge count, install count
- **Rationale:** Taller preview area and Featured badge create visual distinction from the All Templates section. Mini node previews communicate template complexity at a glance.

### 5. All Templates Grid
- **Purpose:** Browse the full template catalog
- **Layout:** Same 3-column responsive grid, gap-4
- **Key elements per card:**
  - Shorter preview header (h-28) with gradient background and minimal node placeholders (w-12 h-8, no text labels)
  - Card body: title, description, category badge, install count
  - 6 templates shown: Weekly Standup, Bug Triage, Content Calendar, Hiring Pipeline, OKR Tracker, Design Sprint
- **Rationale:** Compact cards maximize browsing density; simpler previews reduce visual noise in the larger grid

### 6. Install Modal
- **Purpose:** Confirm installation with full transparency about what will be added
- **Layout:** Centered overlay (max-w-md), bg-slate-900, rounded-xl, backdrop black/60 with blur
- **Key elements:**
  - Template icon (48px gradient box) + name + node/edge summary
  - "Install into workflow" dropdown selector (existing workflows + "Create new workflow")
  - "Includes" breakdown panel (bg-slate-800/50): colored dots per type (blue=Task, green=Doc, orange=Decision) with named nodes and connection count
  - Cancel (secondary) + Install Template (primary blue) buttons in flex row
- **Rationale:** Showing the exact node breakdown builds trust and helps users understand what they are getting. Workflow selector prevents accidental installation into the wrong workspace.

### 7. Success State
- **Purpose:** Confirm successful installation and provide next step
- **Layout:** Replaces modal inner content, centered text layout
- **Key elements:** Green checkmark in circle (bg-green-500/20), "Template Installed!" heading (text-green-400), summary text, "Go to Workflow" primary button
- **Rationale:** Inline replacement avoids page navigation; single CTA reduces decision fatigue post-install

## States

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Default gallery | All category active, both grids visible | Page load |
| Category filtered | Selected pill turns blue, grid filters | Click category pill |
| Card hover | translateY(-3px), box-shadow 0 8px 25px rgba(0,0,0,0.3) | Mouse enter card |
| Modal open | Backdrop black/60 blur, modal scaleIn 0.2s | Click template card |
| Modal — selecting workflow | Dropdown expanded with workflow options | Click workflow select |
| Success | Green confirmation with checkmark, "Go to Workflow" | Click "Install Template" |
| Modal closed | Modal hidden, gallery visible | Click Cancel/backdrop/Go to Workflow |

## Responsive Behavior

| Breakpoint | Layout | Key Changes |
|-----------|--------|-------------|
| < 768px (Mobile) | Single column | Cards stack vertically; search stacks below title; category pills wrap; modal goes near-fullscreen with p-4 inset |
| 768px–1023px (Tablet) | 2 columns | Template grids use md:grid-cols-2; sidebar hidden or collapsed; header search stays inline |
| 1024px+ (Desktop) | 3 columns | Full lg:grid-cols-3 grids; 240px sidebar visible; max-w-7xl content container |

## Cognitive Load Assessment

- **Information density:** Moderate — cards show 5-6 data points each (title, description, category, node count, edge count, installs) but are visually organized with clear hierarchy
- **Visual hierarchy:** Strong — Featured section with taller cards and badges draws attention first; category pills provide easy filtering to reduce visible options
- **Progressive disclosure:** Good — card shows summary, modal reveals full node breakdown; success state is minimal and focused
- **Interaction complexity:** Low — browse, click to install, choose workflow, confirm. Three clicks from gallery to installed template.

## Accessibility Notes

- **Contrast:** Card text (slate-200 on slate-900) meets WCAG AA; category badges use colored text on tinted backgrounds that may need verification for small text sizes (9px)
- **Focus management:** Modal should trap focus when open and return focus to triggering card on close; search input should be reachable via Tab
- **Screen reader:** Template cards need descriptive aria-labels combining name, category, and node count; modal needs role="dialog" with aria-labelledby; success state should announce via aria-live="polite"
- **Keyboard:** Cards must be focusable and activatable via Enter; modal Cancel/Install buttons reachable via Tab; Escape closes modal

## Design System Deviations

| Element | Deviation | Reason |
|---------|-----------|--------|
| Mini node previews | 5px–6px text, smaller than system minimum | Decorative thumbnails, not meant to be read; convey node type through color and position |
| Card hover transform | translateY(-3px) with enhanced shadow | Gallery-specific interaction to indicate clickability; not used in standard list items |
| Gradient card headers | Category-specific gradients (blue-purple, green-emerald, orange-red, etc.) | Visual differentiation between template categories; standard cards use flat slate backgrounds |

# Design Spec — Data Export

> Feature: 21 / Date: 2026-04-05 / Fidelity: Mockup / Status: Draft / Iterations: 1

## Overview

**What was designed:** A settings sub-page with two export cards (Full Workspace and Decisions Only), a data portability banner, an export history table, an API reference note, and an animated export progress/success flow. The page lives under Settings > Data Export in the standard app shell.

**Design brief link:** `design-brief.md`

**Key decisions:**
- Separated full workspace export from decisions-only export because decisions have unique export needs (PDF report format, date range filtering) and are the most commonly exported data type
- Progress bar uses random increments (not linear) to feel responsive rather than mechanical
- Success state appears inline below the export card rather than in a modal, keeping the user in context
- API reference is a low-key note at the bottom rather than a prominent section, since most users will use the UI

## Section Breakdown

### 1. Header & Breadcrumb
- **Purpose:** Orient the user within the settings hierarchy
- **Layout:** Sticky 48px header bar (bg-slate-900, border-b), breadcrumb "Settings / Data Export"
- **Key elements:** "Settings" in text-sm font-semibold, "/" separator in text-slate-600, "Data Export" in text-sm text-slate-400
- **Rationale:** Breadcrumb pattern consistent with other settings sub-pages

### 2. Page Title Section
- **Purpose:** Establish the page purpose and set a trust-building tone
- **Layout:** Left-aligned, p-6 within max-w-3xl container
- **Key elements:** "Export Your Data" (text-lg font-bold), description line (text-sm text-slate-400): "Download a complete copy of your workspace data. Your data is always yours."
- **Rationale:** "Your data is always yours" sets the trust tone immediately

### 3. Data Portability Banner
- **Purpose:** Reinforce the no-vendor-lock-in value proposition
- **Layout:** Full-width banner within container, bg-[#4F6EF7]/5 border border-[#4F6EF7]/20 rounded-lg p-4, flex row
- **Key elements:**
  - Lock icon in circle (w-8 h-8 bg-[#4F6EF7]/10, lock emoji in blue)
  - Title: "Your data, your rules" (text-sm font-medium text-[#4F6EF7])
  - Description (text-xs text-slate-400) about full data portability and standard formats
- **Rationale:** Blue tint ties to brand; lock icon conveys data ownership; positioned before export options to establish trust context

### 4. Full Workspace Export Card
- **Purpose:** Primary export action for complete workspace data
- **Layout:** bg-slate-900 border rounded-lg p-5, stacked sections
- **Key elements:**
  - Title "Full Workspace Export" with "Recommended" badge (bg-green-500/15 text-green-400 text-[9px])
  - Description (text-xs text-slate-400): all data types listed
  - 2-column grid (gap-3): Format dropdown (JSON recommended / CSV) + Scope dropdown (All workflows / specific workflows)
  - "Export includes" panel (bg-slate-800/50 rounded-md p-3): 2-column grid of checkmarked items — 3 workflows, 84 nodes, 56 edges, 47 decisions, 23 threads (128 messages), 12 docs, quality scores & outcomes, all metadata & timestamps
  - "Export Full Workspace" button (w-full py-2.5 bg-[#4F6EF7])
  - **Progress state** (hidden initially): flex row with "Preparing export..." label + percentage, progress bar (w-full h-2 bg-slate-800 rounded-full with bg-[#4F6EF7] fill, CSS animation 3s ease-out)
  - **Success state** (hidden initially): bg-green-500/5 border border-green-500/20 rounded-lg p-4, green checkmark, "Export Ready!" heading, filename with size, "Download File" green button (bg-green-500)
- **Rationale:** Recommended badge guides new users to the best option. Includes panel builds confidence by showing exactly what will be exported. Progress and success states keep the user informed without navigating away.

### 5. Decisions Only Export Card
- **Purpose:** Targeted export for decision logs, supporting audit/reporting workflows
- **Layout:** bg-slate-900 border rounded-lg p-5
- **Key elements:**
  - Title "Decisions Only Export" (text-sm font-semibold)
  - Description (text-xs text-slate-400) listing what is included: questions, resolutions, rationale, quality scores, outcomes
  - 2-column grid: Format dropdown (JSON / CSV / PDF Report) + Date Range dropdown (All time / Last 30 days / Last 90 days / This year)
  - "Export 47 Decisions" CTA button (secondary style: bg-slate-800 border, w-full)
- **Rationale:** PDF Report option serves stakeholder reporting needs. Date range filter supports quarterly reviews and compliance windows. Secondary button style indicates this is an alternative to the primary full export.

### 6. Export History
- **Purpose:** Access previously generated exports for re-download
- **Layout:** bg-slate-900 border rounded-lg p-5, stacked rows
- **Key elements:**
  - Title "Export History" (text-sm font-semibold, mb-3)
  - 3 history rows (bg-slate-800/50 rounded-md px-3 py-2), each with: export name + format (text-xs text-slate-300), date + file size (text-[10px] text-slate-500), "Re-download" link (text-xs text-[#4F6EF7])
  - Example entries: "Full workspace export (JSON) / Apr 1, 2026 / 2.1 MB", "Decisions export (CSV) / Mar 15, 2026 / 48 KB", "Decisions report (PDF) / Mar 1, 2026 / 320 KB"
  - Retention notice (text-[10px] text-slate-600 mt-3): "Exports are available for 30 days after creation."
- **Rationale:** Re-download eliminates re-processing for recent exports. Retention notice sets expectations for file availability.

### 7. API Access Note
- **Purpose:** Surface programmatic export option for developers
- **Layout:** bg-slate-800/30 border border-slate-700/50 rounded-lg p-4, flex row with plug icon
- **Key elements:**
  - Plug icon (text-slate-500)
  - "API access:" bold label + description (text-xs text-slate-400) noting Pro and Business plan requirement
  - Endpoint paths (text-[10px] text-slate-500): GET /api/v1/export/workspace, GET /api/v1/export/decisions
- **Rationale:** Subtle presentation suits the developer audience who will seek this out. Plan gating is mentioned inline to set expectations.

## States

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Default | All cards visible, export button enabled, progress/success hidden | Page load |
| Format changed | Dropdown reflects new selection | User changes format dropdown |
| Scope changed | Dropdown reflects workflow selection; includes counts may update | User changes scope dropdown |
| Exporting | Button disabled + opacity-50 + "Preparing..." text; progress bar visible with animated fill + percentage counter | Click "Export Full Workspace" |
| Export complete | Progress hidden; success panel visible with green checkmark, filename, size, Download button; export button hidden | Progress reaches 100% |
| Re-download | File download initiated | Click "Re-download" in history |

## Responsive Behavior

| Breakpoint | Layout | Key Changes |
|-----------|--------|-------------|
| < 768px (Mobile) | Single column | Sidebar collapses; format/scope grids stack to single column; "Export includes" grid stacks; history rows stack label + action; API note wraps |
| 768px–1023px (Tablet) | 2-column grids | Sidebar collapsed; content centered; all selector grids maintain 2 columns |
| 1024px+ (Desktop) | Full layout | 240px sidebar visible; max-w-3xl content; all grids at 2 columns |

## Cognitive Load Assessment

- **Information density:** Moderate — the page has multiple cards but each is self-contained with clear boundaries; the "Export includes" panel is the densest section but uses a clean 2-column checklist
- **Visual hierarchy:** Strong — data portability banner at top, Full Workspace (recommended) is the largest and most prominent card, Decisions Only is secondary, History and API are tertiary
- **Progressive disclosure:** Good — progress bar and success state appear only after action; export includes are shown upfront to build confidence before committing; API details are minimal
- **Interaction complexity:** Low — select format, select scope, click export, wait, download. Two-step flow for the primary action.

## Accessibility Notes

- **Contrast:** Card text (slate-200/300 on slate-900) meets AA; "Recommended" badge (green-400 on green-500/15) should be verified at 9px; progress bar provides both visual fill and text percentage for dual encoding
- **Focus management:** After export completes, focus should move to the "Download File" button in the success panel; dropdown selects are native elements with built-in accessibility
- **Screen reader:** Progress state should use aria-live="polite" with aria-valuenow for percentage; success state should announce via aria-live="assertive"; export history items need descriptive labels combining name, date, and size
- **Keyboard:** All dropdowns and buttons are standard form elements; Tab order follows visual flow (portability banner > full export > decisions export > history > API)

## Design System Deviations

| Element | Deviation | Reason |
|---------|-----------|--------|
| Green Download button | bg-green-500 instead of primary blue | Differentiates the download action from the initial export trigger; green signals "ready/success" |
| Progress bar animation | CSS @keyframes progress 3s ease-out | Export-specific animation; JS overrides the CSS animation with real progress percentages |
| Data portability banner | bg-[#4F6EF7]/5 with blue-tinted icon | Unique informational banner style; blends brand color at low opacity for emphasis without overwhelming |

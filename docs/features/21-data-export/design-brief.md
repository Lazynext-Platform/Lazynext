# Design Brief — Data Export

> Feature: 21 — Data Export
> Date: 2026-04-05
> Target Fidelity: Mockup

## Overview

**What:** A settings sub-page for exporting workspace data in standard formats. Includes a full workspace export (JSON/CSV with workflow scope selector), a decisions-only export (JSON/CSV/PDF with date range filter), an export history table with re-download links, an API access reference, and an animated progress/success flow for the export operation.

**Why:** Data portability is a core trust signal, especially for teams evaluating Lazynext against incumbent tools. The "no vendor lock-in" promise must be backed by a real, accessible export capability. Decision-specific export also supports compliance, auditing, and stakeholder reporting use cases.

**Where:** Accessed from Settings > Data Export in the app sidebar. Renders within the standard app shell (sidebar + header + scrollable main content area) with a max-width 3xl container.

## Target Users

- Workspace admins who need to back up or migrate data
- Compliance officers requiring decision audit trails
- Team leads generating decision reports for stakeholders
- Developers integrating Lazynext data into other systems via API

## Requirements

**Must Have**
- [x] Data portability notice banner ("Your data, your rules") with lock icon and no-vendor-lock-in messaging
- [x] Full Workspace Export card: format selector (JSON recommended, CSV), scope selector (All workflows or specific workflow), "Export includes" summary showing counts (3 workflows, 84 nodes, 56 edges, 47 decisions, 23 threads/128 messages, 12 docs, quality scores, metadata), "Export Full Workspace" primary CTA
- [x] Export progress animation: progress bar with percentage counter, "Preparing export..." label
- [x] Export success state: green checkmark, "Export Ready!" heading, filename with size (acme-corp-export-2026-04-04.json, 2.4 MB), "Download File" green CTA
- [x] Decisions Only Export card: format selector (JSON/CSV/PDF Report), date range selector (All time/Last 30 days/Last 90 days/This year), "Export 47 Decisions" CTA
- [x] Export History section: 3 past exports with name, format, date, file size, and "Re-download" link
- [x] 30-day retention notice for export files
- [x] API access reference: endpoint paths (GET /api/v1/export/workspace, GET /api/v1/export/decisions), Pro/Business plan note

**Nice to Have**
- [x] "Recommended" badge on Full Workspace Export and JSON format
- [x] Animated progress bar (CSS keyframe animation, 3s ease-out)
- [x] Plug icon for API section

**Out of Scope**
- Scheduled/automatic exports
- Export to third-party integrations (Google Drive, S3, etc.)
- Import from exported files (covered by Feature 15)
- Granular field selection for exports

## Layout

- **Page type:** Settings sub-page within app shell
- **Primary layout:** Sidebar (240px) + header (48px, breadcrumb: Settings / Data Export) + scrollable main content (max-w-3xl centered, p-6)
- **Key sections:**
  1. Page header: title "Export Your Data" + description
  2. Data portability notice: blue-tinted banner with lock icon
  3. Full Workspace Export card: format/scope selectors (2-col grid), includes summary (2-col grid), CTA button, progress bar (hidden), success panel (hidden)
  4. Decisions Only Export card: format/date range selectors (2-col grid), CTA button
  5. Export History card: stacked rows of past exports
  6. API access note: subtle card with plug icon and endpoint paths

## States & Interactions

| State | Description |
|-------|-------------|
| Default | All cards visible, no export in progress |
| Format/scope selected | Dropdown values change; includes summary may update based on scope |
| Exporting | "Export Full Workspace" button disabled + grayed, progress bar visible with incrementing percentage |
| Export complete | Progress bar hidden, success panel visible with green checkmark, filename, size, and Download button |
| Decisions exporting | Same progress pattern for decisions-only export |
| Re-download | Clicking re-download on a history item initiates file download |

**Key interactions:**
- Selecting a specific workflow in scope dropdown updates the "Export includes" counts
- "Export Full Workspace" triggers: button disables, progress bar appears with animated fill and percentage
- On completion: progress hides, success panel slides in with Download button
- "Download File" initiates browser file download
- "Re-download" on history items re-initiates download of cached export
- Format selector for Decisions supports PDF Report option (generates formatted report)

## Responsive Behavior

- **Mobile (< 768px):** 2-column selector grids stack to single column; sidebar collapses; "Export includes" grid stacks to single column; export history rows stack label and action vertically
- **Tablet (768px–1023px):** 2-column grids maintained; sidebar collapsed; content centered at comfortable width
- **Desktop (1024px+):** Full layout with 240px sidebar, max-w-3xl content, all grids at 2 columns

## Content

| Element | Content Type | Example |
|---------|-------------|---------|
| Page title | Static | "Export Your Data" |
| Page description | Static | "Download a complete copy of your workspace data. Your data is always yours." |
| Portability banner title | Static | "Your data, your rules" |
| Portability banner text | Static | "Lazynext supports full data portability. Export everything at any time, in standard formats. No vendor lock-in." |
| Export includes items | Dynamic counts | "3 workflows", "47 decisions", "84 nodes", "56 edges", "23 threads (128 messages)", "12 docs" |
| Progress label | Dynamic | "Preparing export..." |
| Success filename | Dynamic | "acme-corp-export-2026-04-04.json (2.4 MB)" |
| History entry | Dynamic | "Full workspace export (JSON) / Apr 1, 2026 / 2.1 MB" |
| Retention notice | Static | "Exports are available for 30 days after creation." |
| API endpoints | Static | "GET /api/v1/export/workspace", "GET /api/v1/export/decisions" |
| API plan note | Static | "Available on Pro and Business plans." |

## Constraints

- Exports must include all associated metadata (timestamps, quality scores, outcomes) not just content
- JSON format must be the recommended default (preserves relationships and nesting)
- CSV format flattens data into tables (lossy for nested structures like threads)
- Export files must have a 30-day retention window
- API export requires Pro or Business plan
- Progress animation should feel responsive (random increments, not linear)
- File naming convention: {workspace-slug}-export-{date}.{format}

## References

- Mockup: `mockups/data-export.html`
- Related features: Feature 12 (Workspace Settings), Feature 13 (Billing & Subscription), Feature 15 (Import Modal)
- Design system: Dark theme, primary blue #4F6EF7, green #22C55E for success states, Inter font

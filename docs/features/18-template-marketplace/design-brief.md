# Design Brief — Template Marketplace

> Feature: 18 — Template Marketplace
> Date: 2026-04-05
> Target Fidelity: Mockup

## Overview

**What:** A browsable gallery of pre-built workflow templates that users can preview and install into their workspaces. Each template is a packaged set of nodes (TASK, DOC, DECISION, etc.) and edges that form a complete workflow pattern.

**Why:** New users face a cold-start problem when confronted with an empty canvas. Templates reduce time-to-value by offering proven workflow structures for common team scenarios, while also surfacing the platform's 7-primitive model through real-world examples.

**Where:** Accessed from the main sidebar under "Templates". Renders as a full-page gallery within the app shell, with a modal overlay for template detail/install flow.

## Target Users

- New workspace admins who need structure quickly
- Team leads evaluating Lazynext for specific use cases (sprints, client onboarding, hiring)
- Existing users looking to adopt new workflow patterns without building from scratch

## Requirements

**Must Have**
- [x] Category filter pills (All, Product, Agency, Engineering, Startup, Operations, Marketing)
- [x] Search bar in the top header for filtering templates by keyword
- [x] Featured section with 3 highlighted template cards including mini node previews
- [x] All Templates grid with 6 additional template cards
- [x] Template cards showing name, description, category badge, node/edge count, and install count
- [x] Install modal with workflow selector, node breakdown by type, and Install/Cancel actions
- [x] Success state after install showing node/edge count added and "Go to Workflow" CTA
- [x] "Publish Template" button in the header for community contribution

**Nice to Have**
- [x] Mini node preview thumbnails in card headers showing actual primitive types (TASK, DOC, DECISION)
- [x] Gradient color-coding per category in card header backgrounds
- [x] Hover lift effect on template cards (translateY -3px with shadow)

**Out of Scope**
- Template versioning and update mechanism
- Template ratings/reviews system
- Revenue sharing for template publishers
- Template editing/customization before install

## Layout

- **Page type:** Full-page gallery within app shell (sidebar + main content)
- **Primary layout:** Sidebar (240px) + scrollable main area with max-width 7xl container
- **Key sections:**
  1. Sticky header bar with title, search input (w-56), and Publish Template button
  2. Category filter row (horizontal pill buttons, wrapping)
  3. Featured section (3-column responsive grid of tall cards with 144px preview area)
  4. All Templates section (3-column responsive grid of shorter cards with 112px preview area)
  5. Install modal (centered overlay, max-w-md, with backdrop blur)
  6. Success state (replaces modal content inline)

## States & Interactions

| State | Description |
|-------|-------------|
| Default | Gallery loaded with "All" category active, Featured + All Templates visible |
| Category filtered | One category pill active (blue bg), grid filtered to matching templates |
| Search active | Typing in search input filters templates by keyword |
| Card hover | Card lifts 3px with enhanced box-shadow (0 8px 25px rgba black 30%) |
| Install modal open | Backdrop overlay (black/60 + blur), modal scales in with 0.2s ease-out |
| Install modal — workflow select | Dropdown with existing workflows + "Create new workflow" option |
| Installing | Button state change during install operation |
| Success | Green checkmark, "Template Installed!" heading, node/edge summary, "Go to Workflow" CTA |

**Key interactions:**
- Clicking a template card opens the install modal
- Clicking backdrop or Cancel closes the modal
- "Install Template" button triggers install and transitions to success state
- "Go to Workflow" navigates to the target workflow canvas

## Responsive Behavior

- **Mobile (< 768px):** Single-column grid for both Featured and All Templates; search input stacks below title; category pills wrap to multiple rows
- **Tablet (768px–1023px):** 2-column grid for template cards; sidebar collapses to hamburger menu
- **Desktop (1024px+):** Full 3-column grid; 240px sidebar visible; search input inline in header

## Content

| Element | Content Type | Example |
|---------|-------------|---------|
| Template name | Short label (2-3 words) | "Product Sprint" |
| Template description | 1-sentence summary | "Two-week sprint workflow with tasks, specs, and decision log." |
| Category badge | Single keyword | "Product", "Agency", "Engineering" |
| Node count | Numeric with label | "8 nodes" |
| Edge count | Numeric with label | "5 edges" |
| Install count | Numeric with suffix | "1.2k installs" |
| Node breakdown | Typed list with counts | "4 Task nodes (Backlog, Sprint Planning, Review, Retro)" |
| Featured badge | Label | "Featured" (amber star) |
| Success message | Confirmation text | '8 nodes and 5 edges added to "Q2 Product Sprint"' |

## Constraints

- Cards must render node previews at very small size (6px–5px text) to show primitive types without overwhelming
- Install modal must allow choosing an existing workflow or creating a new one
- Template data (node/edge counts, descriptions) must be accurate to what will be installed
- Featured badge appears only on Featured section cards
- Export format follows the platform's node/edge schema for full compatibility

## References

- Mockup: `mockups/template-marketplace.html`
- Related features: Feature 05 (Workflow Canvas), Feature 15 (Import Modal)
- Design system: Dark theme (#020617 bg), primary blue #4F6EF7, Inter font family

# Design Spec — Integrations Settings

> **Feature**: 31 — Integrations Settings
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A workspace integrations page with connected integrations list (Slack, Notion), available integrations 2-column grid (Linear, Trello, Asana, GitHub, Google Calendar, Figma), and an API Access section with masked key management.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Connected integrations shown as full-width cards with rich metadata; available integrations in a compact grid for scannability; API access separated at bottom with Business Plan gating; brand colors used for all integration icons.

---

## Section Breakdown

### Settings Sidebar
**Purpose**: Navigate between workspace settings sections
**Layout**: w-60 bg-slate-900 border-r border-slate-700
**Key elements**: Workspace logo + name, nav links (General, Members, Billing, Integrations active, Data Export)
**Rationale**: Consistent with workspace settings shell (Feature 12).

### Connected Integrations
**Purpose**: Manage active integrations
**Layout**: Stacked cards (bg-slate-900 border border-slate-700 rounded-xl p-5), flex row with justify-between
**Key elements**: Brand icon (w-12 h-12 rounded-xl), name + "Connected" badge (emerald), description, metadata (channel/import stats + date), Configure button (bg-slate-800), Disconnect link (text-red-400)
**Rationale**: Full-width cards give connected integrations prominence since they're actively in use. Metadata shows connection health at a glance.

### Available Integrations Grid
**Purpose**: Discover and connect new integrations
**Layout**: grid grid-cols-2 gap-4, each card bg-slate-900 border border-slate-700 rounded-xl p-5
**Key elements**: Brand icon (w-10 h-10 rounded-lg with brand-color/20 bg), name (text-sm font-semibold), description (text-[10px] text-slate-500), full-width Connect button (bg-slate-800 border border-slate-700 rounded-lg)
**Rationale**: 2-column grid balances density with readability. Smaller icons than connected section to create visual hierarchy.

### API Access
**Purpose**: Manage API key for custom integrations
**Layout**: bg-slate-900 border border-slate-700 rounded-xl p-6
**Key elements**: Title + description, "Business Plan" badge (amber), API key in code block (bg-slate-800 rounded-lg p-4), masked key (font-mono), Copy button (bg-slate-700), Regenerate link (text-[#4F6EF7]), security warning (text-[10px] text-slate-500), API docs link
**Rationale**: API access is a premium feature — amber badge makes plan requirement clear. Key is masked for security with explicit copy/regenerate actions.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Connected** | Full card with metadata, configure + disconnect actions | Emerald badge |
| **Available** | Compact card with Connect button | Hover: border-slate-600 |
| **API key masked** | Key shown as lnx_sk_•••• | Default state |
| **Business Plan required** | Amber badge on API section | Gating indicator |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Sidebar hidden, single column layout, grid stacks to 1-col |
| **Tablet (640–1024px)** | Sidebar visible, 2-column grid maintained |
| **Desktop (> 1024px)** | Full layout — sidebar w-60, content max-w-4xl |

---

## Cognitive Load Assessment

- **Information density**: Low — clear section separation between connected, available, and API
- **Visual hierarchy**: Connected integrations are prominent (larger icons, more info); available are compact; API is distinct
- **Progressive disclosure**: Three logical sections; connected shown first since they're most relevant
- **Interaction complexity**: Low — connect/disconnect buttons, copy key, standard actions

---

## Accessibility Notes

- **Contrast**: White text on slate-900/800 backgrounds meets AA. Brand-colored icons on tinted backgrounds.
- **Focus order**: Sidebar nav → connected integration actions → available grid left-to-right → API section
- **Screen reader**: Integration cards need descriptive labels. "Connected" badge needs context. Masked key needs accessible label.
- **Keyboard**: Tab through sidebar links, integration actions, grid buttons, API controls.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| None | Uses existing card patterns and color tokens | No |

# Design Brief — Automation Builder

> Feature: 17 — Automation Builder
> Date: 2026-04-05
> Target Fidelity: Mockup

---

## Overview

**What:** Two connected views for workspace automation — an automation list showing all configured automations with active/paused toggles, and a builder interface for creating and editing automations using a WHEN (trigger) + THEN (actions) structure, including a run history table.

**Why:** Repetitive tasks (sending notifications, updating fields, escalating overdue items) waste time and introduce human error. Automations let teams codify their workflows once and run them forever. The WHEN/THEN builder makes automation creation accessible to non-technical users, while the run history provides transparency and debuggability.

**Where:** Full-page view accessible from the sidebar ("Automations" nav item). The list view is the default; clicking an automation or "+ New Automation" transitions to the builder view.

---

## Target Users

| Persona | Goal |
|---|---|
| Team Lead / PM | Set up automations for task notifications, overdue escalation, and weekly digests |
| Workspace Admin | Configure quality alerts and decision-triggered workflows |
| IC / Developer | Review run history to debug automation failures |

---

## Requirements

### Must Have
- [x] Automation list view showing all automations as cards with name, status badge (Active/Paused), trigger-action summary, trigger count, last triggered timestamp, and toggle switch
- [x] Filter buttons: All, Active, Paused
- [x] "+ New Automation" button in the top bar
- [x] "Pro" badge on Automations (feature gating indicator)
- [x] Builder view with editable automation name, status badge, and Save button
- [x] WHEN section: trigger type selector (Node status changes, Node created, Due date passes, Decision logged, Quality score below threshold, Schedule/cron) with conditional fields (Node Type, Status Changes To)
- [x] THEN section: multiple action blocks, each with action type selector and action-specific fields
- [x] Action types: Send email notification, Create a new node, Update a node field, Create an edge, Send Slack message
- [x] Message template field with variable placeholders ({{task.title}}, {{task.assignee}}, {{task.workflow}})
- [x] "+ Add another action" button (dashed border)
- [x] Remove action button per action block
- [x] Run History table: Triggered At, Trigger Event, Status (Success/Failed), Details
- [x] Visual connector arrow between WHEN and THEN sections

### Nice to Have
- [x] Paused automation card shown at reduced opacity (70%)
- [x] Back navigation from builder to list
- [x] Inline-editable automation name in builder header

### Out of Scope
- Conditional logic (if/else branches) within actions
- Multi-trigger automations (multiple WHEN clauses)
- Automation versioning / rollback
- Drag-and-drop action reordering
- Webhook triggers

---

## Layout

| Attribute | Value |
|---|---|
| Page type | Full-page with two views (list + builder) |
| Primary layout | Single-column, max-w-5xl |
| Sidebar | Standard app sidebar with Automations highlighted |
| Top bar | Sticky, "Automations" title + "Pro" badge, "+ New Automation" button right-aligned |

### List View Sections
1. **Header row** — "Active Automations (N)" title + filter buttons (All, Active, Paused)
2. **Automation cards** — vertical stack of cards, each showing icon, name, status badge, description, stats, and toggle

### Builder View Sections
1. **Back link** — "Back to automations"
2. **Builder card** — rounded-xl container with:
   - Header: editable name input + status badge + Save button
   - WHEN section: trigger configuration form
   - Connector arrow (vertical line + downward triangle)
   - THEN section: 1+ action configuration blocks + "Add another action" button
   - Run History: table with execution logs

---

## States & Interactions

| Element | State | Behavior |
|---|---|---|
| Automation card | Default | bg-slate-900, border slate-700 |
| Automation card | Hover | border-slate-600 |
| Automation card (Paused) | Paused | opacity-70 applied to entire card |
| Automation card | Click | Navigates to builder view for that automation |
| Toggle switch | On (Active) | bg-green-500, thumb translated right |
| Toggle switch | Off (Paused) | bg-slate-700, thumb at left |
| Toggle switch | Click | Toggles active/paused state |
| Status badge (Active) | Static | bg-green-500/15, text-green-400 |
| Status badge (Paused) | Static | bg-slate-700, text-slate-400 |
| "+ New Automation" | Click | Shows builder with empty form |
| Builder name input | Default | bg-transparent, lg semibold text |
| Builder name input | Focus | Bottom border in primary |
| Save button | Click | Saves automation configuration |
| WHEN selectors | Change | Updates conditional fields (Node Type, Status) |
| THEN action block | Default | bg-slate-800, border slate-700 |
| "Remove" button | Click | Removes the action block |
| "+ Add another action" | Click | Appends a new empty action block |
| Run History (Success) | Static | Green checkmark + "Success" text |
| Run History (Failed) | Static | Red X + "Failed" text, red detail text |
| Back link | Click | Returns to list view, fade-in animation on list |
| Filter buttons | Click | Filters the automation list (All/Active/Paused) |

---

## Responsive Behavior

| Breakpoint | Adaptation |
|---|---|
| Desktop (lg+) | Full-width list and builder at max-w-5xl, comfortable padding |
| Tablet (md) | Same layout, slightly reduced padding |
| Mobile (<md) | Cards stack vertically, builder form fields stack to single column, run history table scrolls horizontally, toggle switches remain inline |

---

## Content

| Element | Copy / Data |
|---|---|
| Page title | Automations |
| Pro badge | "Pro" (feature gating) |
| Automation 1 | "Auto-notify on task completion" — Active, 23 triggers, last 2h ago |
| Automation 2 | "Decision quality alert" — Active, 3 triggers, last 5d ago |
| Automation 3 | "Overdue task escalation" — Active, 8 triggers, last 1d ago |
| Automation 4 | "Weekly digest email" — Paused, 12 triggers, last 2 weeks ago |
| Trigger types | Node status changes, Node is created, Due date passes, Decision is logged, Quality score below threshold, Schedule (cron) |
| Node types | Task, Doc, Decision, Any |
| Status options | Todo, In Progress, In Review, Done, Blocked |
| Action types | Send email notification, Create a new node, Update a node field, Create an edge, Send Slack message |
| Email recipients | Task assignee, Workspace admin, All members, Specific member |
| Template variables | {{task.title}}, {{task.assignee}}, {{task.workflow}} |
| Example message | 'Task "{{task.title}}" has been marked as Done in {{task.workflow}}.' |
| Run history entries | Apr 4 2:15 PM (Success, email to raj@acme.com), Apr 3 11:30 AM (Success, email to avas@acme.com), Apr 2 4:45 PM (Success, email to raj@acme.com), Apr 1 9:00 AM (Failed, invalid email) |

---

## Constraints

- Automations are a Pro-tier feature — Free and Starter users see a paywall
- Maximum 10 automations per workspace on Pro tier
- Maximum 5 actions per automation
- Trigger evaluation happens server-side; latency should be under 30 seconds from event to action execution
- Template variables must be validated at save time (unknown variables show a warning)
- Run history retains the last 100 executions per automation
- Toggle switch state change must persist immediately (optimistic UI with rollback on failure)

---

## References

- Mockup: `docs/features/17-automation-builder/mockups/automation-builder.html`
- Design system: Inter font, dark theme (slate-950 bg), primary #4F6EF7
- Inspiration: Zapier trigger/action model, Linear automations, Notion database automations
- Lazynext primitives: TASK, DOC, DECISION, EDGE (all can be trigger sources and action targets)

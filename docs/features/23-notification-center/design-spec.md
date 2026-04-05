# Design Spec — Notification Center

> **Feature**: 23 — Notification Center
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: An in-app notification dropdown (w-96) with 8 notifications across 2 time groups, All/Unread filtering, mark-all-read, type-specific badges, and unread dot indicators.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Dropdown over full-page inbox for minimal context switching; time-grouped sections (Today/Yesterday) over flat list for temporal orientation; type badges using node colors for consistency with canvas.

---

## Section Breakdown

### Bell Icon & Badge
**Purpose**: Signal unread notifications and provide dropdown trigger
**Layout**: w-8 h-8 rounded-lg button in top bar, badge absolute-positioned top-right
**Key elements**: Bell SVG icon (slate-400), red badge (w-4 h-4, bg-red-500, text-[9px]), pulse animation
**Rationale**: Red badge with count is a universal notification pattern. Pulse animation draws eye without being obnoxious.

### Dropdown Header
**Purpose**: Provide filtering and bulk actions
**Layout**: px-4 py-3 border-b with title left, tabs + action right
**Key elements**: "Notifications" title (text-sm font-semibold), All/Unread tab pills (bg-slate-700 active), "Mark all read" link (text-[#4F6EF7])
**Rationale**: Tab filtering is faster than a separate page. Mark-all-read reduces notification fatigue.

### Notification Items
**Purpose**: Display individual notification events with context
**Layout**: px-4 py-3 flex row with avatar, content, and optional unread dot
**Key elements**: User avatar (w-8 h-8 gradient), action text with bold names and colored entity links, type badge (text-[10px] color-coded), timestamp, unread dot (w-2 h-2 bg-[#4F6EF7])
**Rationale**: Avatar provides quick recognition; type badge connects to canvas node types; blue dot is subtle but clear unread signal.

### Time Section Headers
**Purpose**: Group notifications chronologically
**Layout**: px-4 py-2 bg-slate-800/50 with uppercase label
**Key elements**: "Today" / "Yesterday" labels (text-[10px] text-slate-500 uppercase tracking-wider)
**Rationale**: Time grouping helps users understand recency at a glance.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Closed** | Only bell icon visible with badge | Badge pulse draws attention |
| **Open - All tab** | All 8 notifications, both sections | Default state |
| **Open - Unread tab** | Only 5 unread items, Yesterday hidden | JS filters by data-read attribute |
| **All marked read** | Badge hidden, items lose blue tint/dot | Unread count shows (0) |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Dropdown becomes bottom sheet or full page |
| **Tablet (640–1024px)** | Standard dropdown, may need scroll |
| **Desktop (> 1024px)** | w-96 dropdown anchored to bell icon |

---

## Cognitive Load Assessment

- **Information density**: Medium — each notification has 3-4 data points (who, what, type, when)
- **Visual hierarchy**: Clear — unread items stand out with blue tint; avatars provide quick identification
- **Progressive disclosure**: Dropdown is first level; clicking would navigate to the relevant item
- **Interaction complexity**: Low — open/close, tab switch, mark read

---

## Accessibility Notes

- **Contrast**: White text on slate-900 meets AA. Type badges use saturated colors on dark backgrounds.
- **Focus order**: Bell button → tab buttons → mark all read → notification items → footer link
- **Screen reader**: Bell needs aria-label with unread count. Notifications need role="listitem".
- **Keyboard**: Escape closes dropdown. Arrow keys navigate items.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| None | Uses existing patterns | No |

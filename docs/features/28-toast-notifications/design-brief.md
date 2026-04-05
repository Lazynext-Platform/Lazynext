# Design Brief — Toast Notifications

> **Feature**: 28 — Toast Notifications
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: An ephemeral toast notification system with 6 variants — Success, Error, Warning, Info, Decision, and Undo — displayed as stacked cards in the bottom-right with auto-dismiss, progress bars, and action buttons.
**Why**: Users need immediate feedback for actions (saves, errors, limits) and events (automations, decisions) without modal interruptions.
**Where**: Fixed bottom-right corner (bottom-6 right-6), visible across all app views.

---

## Target Users
- **All users**: Receive feedback for their actions and system events

---

## Requirements

### Must Have
- [x] 6 toast variants: Success (green), Error (red border + retry), Warning (amber + upgrade), Info (blue), Decision (orange + view link), Undo (slate + undo button + timer)
- [x] Each toast: icon (w-8 h-8 rounded-lg), title, description, close button
- [x] Auto-dismiss progress bar (5s default, 8s for undo)
- [x] slideInRight/slideOutRight animations
- [x] Stackable (multiple toasts with space-y-3)
- [x] Interactive trigger buttons for demo

### Nice to Have
- [x] Action buttons: "Retry now" (error), "Upgrade plan" (warning), "View decision" (decision), "Undo" (undo)
- [x] Color-coded borders for error (red-500/30) and warning (amber-500/20) toasts
- [x] Progress bar color matches toast type

### Out of Scope
- Toast position configuration (always bottom-right)
- Toast queue management (max simultaneous)
- Persistent/non-dismissible toasts

---

## Layout

**Page type**: Fixed overlay system
**Primary layout**: Vertical stack (space-y-3) in bottom-right corner (w-96)
**Key sections per toast**:
1. Icon (type-specific color/bg)
2. Content (title + description)
3. Close button (or Undo button)
4. Optional action link
5. Progress bar (bottom edge)

---

## States & Interactions

| State | Description |
|---|---|
| **Entering** | slideInRight animation (0.3s) |
| **Visible** | Static with progress bar counting down |
| **Dismissing** | slideOutRight animation (0.3s) then removed |
| **Action clicked** | Toast dismissed, action executed |

**Key interactions**:
- Click X to manually dismiss any toast
- Click action button (Retry, Upgrade, View, Undo) for type-specific action
- Auto-dismiss after 5s (or 8s for undo toasts)

---

## Responsive Behavior

- **Mobile**: Toasts go full-width at bottom of screen
- **Tablet/Desktop**: w-96 fixed in bottom-right corner

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Success** | Dynamic | "Task completed — 'Fix auth redirect bug' marked as Done" |
| **Error** | Dynamic | "Failed to save changes — Network error..." with Retry |
| **Warning** | Dynamic | "Approaching node limit — 45 of 50 nodes" with Upgrade |
| **Info** | Dynamic | "Raj Kumar joined the canvas" |
| **Decision** | Dynamic | "Decision logged — Quality score: 84" with View link |
| **Undo** | Dynamic | "Node deleted — 'Old API spec' removed" with Undo button |

---

## Constraints

- Max width w-96 to avoid blocking too much content
- Progress bars use type-matching colors
- Undo toasts get longer timeout (8s) to allow user reaction
- Error toasts may not auto-dismiss (user needs to acknowledge)

---

## References

- Sonner (shadcn toast library) for animation and stacking patterns
- Feature 23 (Notification Center) — persistent notifications vs ephemeral toasts

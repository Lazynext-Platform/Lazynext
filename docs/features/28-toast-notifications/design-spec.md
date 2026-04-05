# Design Spec — Toast Notifications

> **Feature**: 28 — Toast Notifications
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: 6 toast notification variants with type-specific icons, colors, action buttons, progress bar auto-dismiss, and slide animations — displayed statically for reference plus interactive trigger buttons.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Bottom-right stacking over centered; progress bar as visual countdown; action buttons inline (not separate) to keep toasts compact; Undo toast gets blue primary button treatment to draw attention.

---

## Section Breakdown

### Success Toast
**Purpose**: Confirm completed actions
**Elements**: Green checkmark icon (bg-emerald-500/15), title, description, green progress bar (5s)
**Rationale**: Minimal — just confirms and disappears. No action needed.

### Error Toast
**Purpose**: Alert to failures with recovery option
**Elements**: Red circle-exclamation icon (bg-red-500/15), red border accent, title, description, "Retry now" link (text-red-400)
**Rationale**: Red border distinguishes errors from other types at a glance. Retry action reduces friction.

### Warning Toast
**Purpose**: Proactive alerts about approaching limits
**Elements**: Amber triangle icon (bg-amber-500/15), amber border accent, title, description, "Upgrade plan" link (text-[#4F6EF7])
**Rationale**: Warning pairs with upgrade CTA for monetization touch-point.

### Info Toast
**Purpose**: Neutral informational events
**Elements**: Blue info icon (bg-blue-500/15), title, description, blue progress bar (4s)
**Rationale**: Lightest toast — just informs and dismisses quickly.

### Decision Toast
**Purpose**: Confirm decision logging with quality score
**Elements**: Orange question icon (bg-orange-500/15), orange border, quality score highlight (text-emerald-400), "View decision" link
**Rationale**: Decision-specific toast reinforces Decision DNA as a first-class feature. Score shown inline.

### Undo Toast
**Purpose**: Allow recovery from destructive actions
**Elements**: Slate trash icon (bg-slate-700), "Undo" primary button (bg-[#4F6EF7]), progress bar (8s)
**Rationale**: Undo button is a primary blue button to ensure visibility. Longer timeout (8s) gives users more time to react.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Entering** | Slides in from right (0.3s ease-out) | translateX(120%) → 0 |
| **Visible** | Static with progress bar animating | 5s default, 8s for undo |
| **Exiting** | Slides out right (0.3s ease-in) | 0 → translateX(120%) |
| **Stacked** | Multiple toasts with space-y-3 gap | Most recent at bottom |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Full-width at bottom of screen, no right offset |
| **Tablet (640–1024px)** | w-96 bottom-right |
| **Desktop (> 1024px)** | w-96 bottom-right (bottom-6 right-6) |

---

## Cognitive Load Assessment

- **Information density**: Low per toast — title + one line description
- **Visual hierarchy**: Type icon and color provide instant categorization
- **Progressive disclosure**: Toast is summary; action buttons lead to detail
- **Interaction complexity**: Minimal — dismiss or click one action

---

## Accessibility Notes

- **Contrast**: Icon colors on tinted backgrounds meet AA. White text on slate-900 meets AA.
- **Focus order**: Close button should be focusable. Action buttons should be tabbable.
- **Screen reader**: Toasts should use role="alert" or aria-live="polite". Undo toast needs "assertive".
- **Keyboard**: Esc to dismiss focused toast. Tab to action/close buttons.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| None | Uses existing color tokens and card patterns | No |

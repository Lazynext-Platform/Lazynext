# Design Spec — Real-time Collaboration

> **Feature**: 27 — Real-time Collaboration
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: Real-time collaboration indicators including animated cursors, node selection rings, presence counter, thread typing indicators, and join notifications — all layered on the canvas.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: User-specific colors consistent across cursor/ring/avatar; name labels attached to cursors (not floating separately); selection rings use border + pulsing opacity background for visibility without obscuring content.

---

## Section Breakdown

### Presence Counter
**Purpose**: Show how many collaborators are active
**Layout**: Inline in top bar, px-3 py-1.5 bg-slate-800 rounded-lg
**Key elements**: Green pulse dot (w-2 h-2 animate-pulse), "3 online" text, stacked avatars (w-6 h-6) with green ring (ring-2 ring-green-400/40)
**Rationale**: Top bar placement is always visible. Green dot universally signals "online."

### Live Cursors
**Purpose**: Show other users' pointer positions in real time
**Layout**: Absolute positioned on canvas (z-50), animated via CSS keyframes
**Key elements**: Colored arrow SVG (16x20), name label pill (px-2 py-0.5 rounded, text-[9px]) with user's color as background
**Rationale**: Arrow cursor is the universal pointer symbol. Name pill directly on cursor eliminates ambiguity about who it belongs to.

### Node Selection Rings
**Purpose**: Show which node a user is focused on
**Layout**: Absolute positioned -inset-2 around target node
**Key elements**: border-2 with user's color, background with 15% opacity pulsing (selectionPulse animation), label above node (avatar + "is editing"/"is viewing" text)
**Rationale**: Ring + label distinguishes passive viewing from active editing. Pulse animation draws attention without being distracting.

### Thread Typing Indicator
**Purpose**: Show someone is composing a message
**Layout**: Inline in thread message list, flex row with avatar and animated dots
**Key elements**: User avatar (w-6 h-6), name, 3 dots (w-1.5 h-1.5 bg-slate-500) with staggered blink animation, "typing..." text
**Rationale**: Standard messaging pattern. Staggered animation (0.2s delays) creates natural rhythm.

### Join Toast
**Purpose**: Announce user arrivals on the canvas
**Layout**: Fixed bottom-6 left-6, bg-slate-800 rounded-lg
**Key elements**: User avatar (w-5 h-5), "[Name] joined the canvas", "just now" timestamp
**Rationale**: Ephemeral notification — informational, not actionable. Bottom-left avoids conflict with other toasts (bottom-right).

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Solo user** | No indicators visible, presence shows "1 online" | Simplest state |
| **Multi-user** | Cursors, rings, presence counter active | 2-50 users |
| **User editing node** | Rose/amber ring with "is editing" label | Indicates active editing |
| **User viewing node** | Ring with "is viewing" label, less prominent | Passive focus |
| **Typing in thread** | Animated 3-dot indicator below messages | Disappears when message sent |
| **User joins** | Toast appears bottom-left | Auto-dismisses |
| **User leaves** | Their cursor and rings disappear | Presence count decrements |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | No cursors or selection rings (no canvas). Presence counter only. |
| **Tablet (640–1024px)** | Cursors visible, may hide name labels at small sizes |
| **Desktop (> 1024px)** | Full experience — cursors, name labels, rings, typing indicators |

---

## Cognitive Load Assessment

- **Information density**: Low — indicators are sparse overlays on existing content
- **Visual hierarchy**: Secondary — collaboration indicators are less prominent than actual content
- **Progressive disclosure**: Indicators only appear when other users are present
- **Interaction complexity**: None — these are passive, non-interactive indicators

---

## Accessibility Notes

- **Contrast**: Cursor name labels use white text on saturated color backgrounds (rose-500, amber-500) — meets AA.
- **Focus order**: Not applicable — indicators are non-interactive.
- **Screen reader**: Presence counter should announce "3 users online". Join toasts should be aria-live regions.
- **Keyboard**: Not applicable — no keyboard interaction with these indicators.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| User-specific colors (rose, amber) | Collaboration cursors need distinct per-user colors | No — handled by Liveblocks color assignment |

# Design Brief — Real-time Collaboration

> **Feature**: 27 — Real-time Collaboration
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: Real-time collaboration indicators on the canvas — live user cursors with name labels, node selection rings showing who's editing/viewing, presence avatars in the top bar, typing indicators in threads, and join/leave toasts.
**Why**: Teams collaborating on the same canvas need awareness of who's present and what they're doing to avoid conflicts and enable fluid teamwork.
**Where**: Workflow canvas view and thread panels — powered by Liveblocks.

---

## Target Users

- **All workspace members**: Need awareness of co-editors on the canvas
- **Collaborating pairs**: Need to see who's editing which node to avoid conflicts

---

## Requirements

### Must Have
- [x] Top bar presence indicator: green dot + "3 online" + stacked avatars with green rings
- [x] Live cursors: colored arrow cursors with name label pills (animated movement)
- [x] Node selection rings: colored borders with pulsing opacity + "is editing"/"is viewing" labels
- [x] Thread typing indicator: 3 animated dots with "typing..." text
- [x] "Joined the canvas" toast notification at bottom-left
- [x] Active users in thread footer ("Priya and Raj are in this thread")

### Nice to Have
- [x] Cursor movement animation (CSS keyframes, 8-10s loops)
- [x] Selection ring pulse animation
- [x] User-specific colors (rose for Priya, amber for Raj)

### Out of Scope
- Conflict resolution UI
- Cursor following/teleporting to another user
- User-to-user messaging/nudging

---

## Layout

**Page type**: Canvas overlay indicators (not a standalone page)
**Primary layout**: Indicators layered on existing canvas view
**Key sections**:
1. **Top bar**: Online presence counter + avatar stack
2. **Canvas**: Live cursors (z-50) + node selection rings
3. **Thread panel**: Typing indicator + active users footer
4. **Toast area**: Bottom-left join/leave notifications

---

## States & Interactions

| State | Description |
|---|---|
| **Solo** | No other users online, no cursors/rings visible |
| **Multi-user** | Cursors visible, selection rings on focused nodes |
| **User editing** | "is editing" label on their selected node, cursor near node |
| **User viewing** | "is viewing" label, less prominent ring |
| **Typing** | Animated dots in thread next to user's avatar |
| **Join/Leave** | Toast appears at bottom-left, fades after a few seconds |

**Key interactions**: These are passive indicators — no user interaction required. They appear/disappear based on other users' actions via Liveblocks real-time sync.

---

## Responsive Behavior

- **Mobile**: No cursors (mobile uses NodeListView, not canvas). Presence shown in top bar only.
- **Tablet**: Simplified cursors, may omit name labels
- **Desktop**: Full cursor + selection ring + typing indicators

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Online count** | Dynamic | "3 online" |
| **Cursor labels** | Dynamic | "Priya Sharma", "Raj Kumar" |
| **Selection labels** | Dynamic | "Priya is editing", "Raj is viewing" |
| **Typing indicator** | Dynamic | Animated dots + "typing..." |
| **Join toast** | Dynamic | "Raj Kumar joined the canvas — just now" |

---

## Constraints

- Cursor colors must be distinct per user (rose, amber, violet, etc.) — no two users same color
- Selection rings use user's cursor color for consistency
- Animations must be lightweight — CSS-only, no JS requestAnimationFrame
- Liveblocks handles state sync; UI only renders received presence data

---

## References

- Figma's collaborative cursors for the cursor + name label pattern
- Liveblocks documentation for presence and cursor APIs
- Feature 05 (Workflow Canvas) — base canvas this overlays
- Feature 11 (Thread Panel) — where typing indicators appear

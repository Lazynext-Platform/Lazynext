# Design Brief — Notification Center

> **Feature**: 23 — Notification Center
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: An in-app notification dropdown triggered from the bell icon in the top bar, showing categorized notifications with unread indicators, type badges, and mark-all-read functionality.
**Why**: Users need a centralized place to see task assignments, decision updates, @mentions, AI insights, and automation events without leaving their current view.
**Where**: Top bar bell icon dropdown, accessible from any page in the app.

---

## Target Users

- **All workspace members**: Need to stay informed about assignments, mentions, and updates
- **Decision makers**: Need alerts about new decisions, outcome tagging, and AI insights
- **Admins**: Need automation trigger notifications and system events

---

## Requirements

### Must Have
- [x] Bell icon with pulsing badge showing unread count (5)
- [x] Dropdown (w-96) with header: title, All/Unread tabs, "Mark all read" button
- [x] 8 notifications: 5 unread (blue bg tint + dot), 3 read (no tint)
- [x] Time-grouped sections: Today, Yesterday
- [x] Notification types: task assigned, decision logged, @mention, LazyMind insight, automation triggered, task completed, outcome tagged, weekly digest
- [x] Each notification: user avatar, action text with highlighted entity names, type badge (color-coded), timestamp
- [x] Click outside to close dropdown

### Nice to Have
- [x] Badge pulse animation on bell icon
- [x] Slide-down entrance animation on dropdown
- [x] Unread filter tab hides read notifications and Yesterday section
- [x] "View all notifications" footer link

### Out of Scope
- Full notifications page/inbox view
- Notification preferences (handled in Feature 12)
- Push notifications / browser notifications
- Notification grouping/threading

---

## Layout

**Page type**: Dropdown overlay anchored to bell icon
**Primary layout**: Vertical list with section headers
**Key sections** (in order):
1. **Header**: Title + All/Unread tabs + Mark all read link
2. **Today section**: 5 unread notifications
3. **Yesterday section**: 3 read notifications
4. **Footer**: "View all notifications" link

---

## States & Interactions

| State | Description |
|---|---|
| **Closed** | Bell icon with red badge (count 5) and pulse animation |
| **Open - All** | All 8 notifications visible, grouped by day |
| **Open - Unread** | Only 5 unread notifications, Yesterday section hidden |
| **All read** | Badge hidden, all items lose blue tint and blue dot |

**Key interactions**:
- Click bell icon to toggle dropdown open/close
- Click All/Unread tabs to filter
- Click "Mark all read" to clear all unread indicators and hide badge
- Click outside dropdown to close

---

## Responsive Behavior

- **Mobile**: Dropdown becomes full-width sheet from bottom or dedicated page
- **Tablet**: Dropdown at comfortable width, may anchor differently
- **Desktop**: w-96 dropdown anchored right-aligned to bell icon

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Badge count** | Dynamic | "5" (unread count) |
| **Task assigned** | Dynamic | "Priya Sharma assigned you to Ship onboarding v2" |
| **Decision logged** | Dynamic | "Raj Kumar logged a decision: Use Neon vs Supabase?" with quality score |
| **@mention** | Dynamic | "Meera Joshi mentioned you in Database migration thread" with preview |
| **AI insight** | Dynamic | "LazyMind detected a pattern: 3 decisions this week lack rationale" |
| **Automation** | Dynamic | "Automation Overdue task escalation triggered" |
| **Type badges** | Static | TASK (blue), DECISION (orange), THREAD (purple), AI INSIGHT (blue), AUTOMATION (green), PULSE (cyan) |

---

## Constraints

- Dropdown max-height 420px with scroll for notification list
- Unread notifications have subtle blue background tint (bg-[#4F6EF7]/5) and blue dot indicator
- Type badges use node-type color coding consistent with the design system
- Bell badge uses red-500 with pulse animation to draw attention

---

## References

- Feature 12 (Workspace Settings) — notification preferences
- Feature 28 (Toast Notifications) — ephemeral notifications vs persistent inbox
- Design system: node type colors, badge pattern, dropdown pattern

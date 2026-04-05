# Design Brief — Activity Feed & Audit Log

> **Feature**: 38 — Activity Feed & Audit Log
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A workspace activity page with two views — a social-style Activity Feed (chronological timeline of team actions with avatars, action descriptions, and type badges) and a detailed Audit Log table (timestamps, users, actions, targets, details, IP addresses) with CSV export.
**Why**: Teams need visibility into workspace activity for coordination (feed) and compliance/security (audit log).
**Where**: Sidebar → Activity (workspace-level page). Audit log gated to Business plan.

---

## Target Users
- **All team members**: Checking recent workspace activity for situational awareness
- **Team leads**: Reviewing team activity patterns
- **Admins (Business plan)**: Audit log for compliance, security review, and incident investigation

---

## Requirements

### Must Have
- [x] Feed/Audit Log toggle in header
- [x] Activity type filter (All/Tasks/Decisions/Docs/Threads/Members)
- [x] Feed view: chronological timeline grouped by day (Today/Yesterday), user avatars with action-type icons, descriptive text with linked entity names, type badges (color-coded by primitive)
- [x] Audit log: table with Timestamp, User, Action, Target, Details, IP columns
- [x] Thread replies show quoted message preview
- [x] Member joins show role assignment

### Nice to Have
- [x] Action-type mini icons overlaid on avatars (create, edit, reply, move, etc.)
- [x] Audit log "Business Plan" badge
- [x] Export CSV button on audit log
- [x] Pagination on audit log (showing 1-7 of 156)
- [x] Color-coded action badges in audit log (created blue, decided orange, replied purple, etc.)

### Out of Scope
- Real-time live updates (feed refreshes on page load)
- Activity notifications (covered in Feature 23)
- Per-node activity history
- Webhook triggers from activity events

---

## Layout

**Page type**: Full-page app view
**Primary layout**: Sidebar w-60 + header h-12 + content (max-w-3xl for feed, max-w-4xl for audit)
**Key sections**:
- **Feed**: Day-grouped timeline with avatar + description items
- **Audit Log**: Sortable table with pagination

---

## Responsive Behavior
- **Mobile**: Sidebar hidden, feed in single column, audit table scrolls horizontally
- **Tablet**: Sidebar visible, full layouts
- **Desktop**: Full layout as designed

---

## Constraints
- Audit log requires Business plan (amber badge indicator)
- IP addresses partially masked for privacy (last octet hidden)
- Feed shows last 50 items by default with infinite scroll
- Audit log uses pagination (not infinite scroll) for performance

---

## References
- Feature 23 (Notification Center) — notification delivery of activity events
- Feature 12 (Workspace Settings) — workspace-level settings context
- Blueprint Section 34 (JSONB Index Strategy) — activity data storage

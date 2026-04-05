# Design Spec — Team Member Management

> **Feature**: 34 — Team Member Management
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A full members management page with 3-stat header, searchable member table (5 active + 2 pending), role-based badges, last active timestamps, edit/remove/resend/revoke actions, and an invite modal with email chips, role selection, and seat usage indicator.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Table layout over card grid for density; pending invitations visually separated with section header and reduced opacity; invite modal includes seat count to prevent over-inviting; Owner row has no remove action to prevent accidental self-removal.

---

## Section Breakdown

### Stats Bar
**Purpose**: Quick overview of team composition
**Layout**: grid grid-cols-3 gap-4, bg-slate-900 border rounded-xl cards
**Key elements**: Total members (8), Pending invites (2), Seat limit (10, Pro plan badge)
**Rationale**: Seat awareness prevents surprises at billing time.

### Member Table
**Purpose**: View and manage all workspace members
**Layout**: bg-slate-900 rounded-xl, grid-cols-12 rows
**Key elements**: Avatar (w-9 gradient), name + email, role badge (color-coded: Owner amber, Admin purple, Member emerald, Guest slate), last active + online dot, Edit/Remove actions
**Rationale**: Table format allows efficient scanning of many members. Color-coded roles provide instant hierarchy recognition.

### Pending Invitations
**Purpose**: Track and manage outstanding invitations
**Layout**: Section header (bg-slate-800/30) + invitation rows at opacity-60
**Key elements**: Dashed-border email icon avatar, email address, invited date, assigned role, Pending badge (amber), Resend/Revoke actions
**Rationale**: Visual distinction (opacity, dashed border) clearly separates pending from active members.

### Invite Modal
**Purpose**: Send email invitations to new team members
**Layout**: w-[480px] bg-slate-900 rounded-2xl, centered overlay with backdrop blur
**Key elements**: Email chip input with removal, role select dropdown (Member/Admin/Guest), optional message textarea, seat usage info bar, Copy invite link, Cancel/Send buttons
**Rationale**: Chip input handles multiple emails naturally. Seat info prevents accidental over-provisioning.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | Member list with search/filter | All members visible |
| **Search active** | Filtered results | Real-time filtering |
| **Invite modal open** | Backdrop blur, modal centered | Triggered by "Invite members" button |
| **Pending invitation** | Reduced opacity, dashed avatar | Resend/Revoke actions |
| **At seat limit** | Warning in invite modal | Prevents over-inviting |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Sidebar hidden, member cards instead of table, modal full-width |
| **Tablet (640–1024px)** | Sidebar visible, full table layout |
| **Desktop (> 1024px)** | Full layout — sidebar w-60, content max-w-4xl |

---

## Accessibility Notes

- **Contrast**: Role badges on dark backgrounds meet AA. White text on slate-900 meets AA.
- **Focus order**: Search → filter → table rows → actions → invite button
- **Screen reader**: Table needs proper headers. Role badges need text labels. Modal needs focus trap.
- **Keyboard**: Tab through table actions. Enter to open invite modal. Esc to close modal.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| None | Uses existing table, badge, and modal patterns | No |

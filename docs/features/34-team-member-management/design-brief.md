# Design Brief — Team Member Management

> **Feature**: 34 — Team Member Management
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A workspace members management page with member list (roles, last active, actions), pending invitations section, invite modal (email input with chips, role select, optional message, seat count), and member stats.
**Why**: Workspace admins need to invite, manage, and remove team members with clear role-based access control.
**Where**: Settings → Members (workspace settings sidebar).

---

## Target Users
- **Workspace owners**: Full member management including invitations
- **Admins**: Can manage members and edit roles
- **Members**: Can view team roster (read-only)

---

## Requirements

### Must Have
- [x] Stats bar: total members, pending invites, seat limit with plan indicator
- [x] Search + role filter for member list
- [x] Member table: avatar, name, email, role badge (Owner/Admin/Member/Guest), last active with online indicator, Edit/Remove actions
- [x] Current user marked with "You" badge and no remove action
- [x] Pending invitations section with Resend/Revoke actions
- [x] Invite modal: email chip input, role select, optional message, seat usage info, Send button

### Nice to Have
- [x] Copy invite link in modal footer
- [x] Gradient avatars matching user identity
- [x] Dashed-border placeholder avatars for pending invites
- [x] Online status indicator (green dot)

### Out of Scope
- Role permissions configuration
- SAML SSO setup (Business plan)
- Bulk invite via CSV

---

## Layout

**Page type**: Full-page settings
**Primary layout**: Sidebar w-60 + main content max-w-4xl
**Key sections**: Stats grid → Search/filter → Member table → Pending section → Invite modal (overlay)

---

## Responsive Behavior
- **Mobile**: Sidebar hidden, single column, simplified member cards
- **Tablet**: Sidebar visible, full table
- **Desktop**: Full layout as designed

---

## Constraints
- Seat limits vary by plan (Free: 3, Starter: 10, Pro: 25, Business: unlimited)
- Owner cannot be removed
- Guest role is read-only access
- Supabase Auth manages authentication — member management is workspace-level

---

## References
- Feature 12 (Workspace Settings) — parent settings context
- Feature 30 (Profile & Account Settings) — user-level counterpart
- Supabase Auth documentation for auth/role management

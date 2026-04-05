# Design Brief — Profile & Account Settings

> **Feature**: 30 — Profile & Account Settings
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A user-level profile and account settings page with 4 tabs — Profile (personal info, workspaces), Security (password, 2FA, connected accounts, delete account), Preferences (appearance, AI settings), and Active Sessions (session management with revoke).
**Why**: Users need to manage their personal information, security, preferences, and session access separately from workspace-level settings.
**Where**: Accessible from sidebar "My Profile" link or user avatar dropdown.

---

## Target Users
- **All users**: Managing personal info, preferences, and security
- **Security-conscious users**: Managing 2FA, connected accounts, and sessions
- **Multi-workspace users**: Switching between workspaces

---

## Requirements

### Must Have
- [x] Profile header: large avatar (w-20 h-20), name, email, Admin/Owner role badges
- [x] 4 tab pills: Profile, Security, Preferences, Active Sessions
- [x] Profile tab: name/email/role/timezone inputs, workspaces list with active/switch
- [x] Security tab: password (Clerk-managed), 2FA toggle (enabled via authenticator), connected accounts (Google connected, GitHub not), delete account (red border)
- [x] Preferences tab: theme (dark only), compact mode toggle, minimap toggle, LazyMind auto-score toggle, weekly digest toggle
- [x] Sessions tab: current session (green "Current" badge), other sessions with revoke, "Revoke all other sessions" link

### Nice to Have
- [x] Avatar change button overlay
- [x] "Managed by Clerk" note on email
- [x] Google/GitHub brand icons for connected accounts
- [x] Session device info (OS, browser, location, IP)

### Out of Scope
- Email change flow (managed by Clerk)
- Avatar upload/crop modal
- Notification preferences (handled in Feature 12)

---

## Layout

**Page type**: Full-page settings
**Primary layout**: App shell (sidebar w-60 + top bar) + main content (max-w-3xl)
**Key sections per tab**:
- **Profile**: Personal info form (2-col grid) + Workspaces list
- **Security**: Password card + 2FA card + Connected accounts + Delete account (red)
- **Preferences**: Appearance section + LazyMind AI section
- **Sessions**: Active sessions list with device info

---

## States & Interactions

| State | Description |
|---|---|
| **Profile tab** | Form fields populated, workspaces shown |
| **Security tab** | 2FA toggle on, Google connected, GitHub disconnected |
| **Preferences tab** | Dark theme selected (light disabled), toggles shown |
| **Sessions tab** | Current session highlighted, other sessions listed |

**Key interactions**: Tab switching, form editing, toggle switches, workspace switching, session revocation, account deletion

---

## Responsive Behavior
- **Mobile**: Single column, sidebar hidden
- **Tablet**: Sidebar visible, form stacks to single column
- **Desktop**: Full layout with 2-column form grids

---

## Constraints
- Email managed by Clerk — shown as info, not directly editable
- Dark theme is the only option (light disabled with cursor-not-allowed)
- Delete account is in a red-bordered danger zone section

---

## References
- Feature 12 (Workspace Settings) — workspace-level settings
- Clerk documentation for auth/profile management

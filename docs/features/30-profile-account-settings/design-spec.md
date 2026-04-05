# Design Spec — Profile & Account Settings

> **Feature**: 30 — Profile & Account Settings
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A 4-tabbed user account page covering personal info, security (2FA, connected accounts), preferences (theme, AI settings), and active session management.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: User-level settings separate from workspace settings; Clerk integration noted where applicable; dark theme locked (light shown as disabled); LazyMind preferences in user settings since they're per-user, not per-workspace.

---

## Section Breakdown

### Profile Tab — Personal Info
**Purpose**: Edit basic user information
**Layout**: bg-slate-900 rounded-xl p-6 with 2-column grid
**Key elements**: First name, last name, email (with Clerk note), role/title, timezone select, Save button
**Rationale**: Standard profile form. Timezone is important for IST-first platform.

### Profile Tab — Workspaces
**Purpose**: Show and switch between user's workspaces
**Layout**: Card list with workspace logo, name, plan, member count
**Key elements**: Active workspace (emerald badge), other workspaces (Switch button, opacity-60)
**Rationale**: Multi-workspace support is important for users on multiple teams.

### Security Tab
**Purpose**: Account security management
**Layout**: 4 stacked cards: Password, 2FA, Connected Accounts, Delete Account
**Key elements**: Clerk-managed password with "Change Password" button, 2FA toggle (enabled, green checkmark), Google (connected), GitHub (not connected, "Connect" button), Delete account danger zone (red border, bg-red-600 button)
**Rationale**: Progressive severity — password at top, deletion at bottom with visual escalation (red border).

### Preferences Tab
**Purpose**: Customize app behavior
**Layout**: 2 cards: Appearance and LazyMind AI
**Key elements**: Theme (dark-only, light disabled), compact mode toggle, minimap toggle, auto-score toggle, weekly digest toggle — all using w-11 h-6 toggle switches with peer-checked:bg-[#4F6EF7]
**Rationale**: LazyMind preferences are user-level since different team members may want different AI behavior.

### Sessions Tab
**Purpose**: View and manage active login sessions
**Layout**: Single card with session list
**Key elements**: Current session (green border, "Current" badge), device info (OS, browser, location), revoke buttons, "Revoke all other sessions" header action
**Rationale**: Session management is a security feature — current session clearly marked to prevent accidental self-revocation.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Profile tab active** | Form fields and workspaces visible | Default tab |
| **Security tab active** | Security cards visible | 2FA enabled state shown |
| **Preferences tab active** | Toggle cards visible | Dark theme locked |
| **Sessions tab active** | Session list visible | Current highlighted |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Sidebar hidden, single column form, tabs scroll horizontally |
| **Tablet (640–1024px)** | Sidebar visible, 2-column form maintained |
| **Desktop (> 1024px)** | Full layout — sidebar w-60, content max-w-3xl |

---

## Cognitive Load Assessment

- **Information density**: Low per tab — each tab focuses on one concern
- **Visual hierarchy**: Clear — tabs organize; danger zone uses red for severity
- **Progressive disclosure**: Tab pattern hides complexity; security escalates from mild to destructive
- **Interaction complexity**: Low — form inputs, toggles, button clicks

---

## Accessibility Notes

- **Contrast**: White text on dark backgrounds meets AA. Green/red status indicators paired with text.
- **Focus order**: Tabs → active tab content → form fields → buttons
- **Screen reader**: Tabs need aria-selected. Toggles need aria-checked. Delete button needs confirmation.
- **Keyboard**: Arrow keys for tabs, Space/Enter for toggles, Tab for form navigation.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| None | Uses existing patterns | No |

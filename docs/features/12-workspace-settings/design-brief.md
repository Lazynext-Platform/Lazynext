# Design Brief — Workspace Settings

> **Feature**: 12 — Workspace Settings
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A full-page workspace settings view with tabbed navigation for General settings, Members management, Billing, Data Export, and Danger Zone actions.
**Why**: Workspace admins need a centralized location to manage workspace identity, team members, notification preferences, and destructive operations like deletion and ownership transfer.
**Where**: Accessible from the sidebar "Settings" link, renders as a full-page view with sidebar navigation.

---

## Target Users
- **Workspace admins/owners**: Need to manage workspace name, logo, members, roles, and dangerous operations
- **Team members**: Need to manage their own notification preferences
- **Billing managers**: Need quick access to billing (links to dedicated billing page)

---

## Requirements

### Must Have
- [x] Tab navigation: General, Members, Billing, Data Export, Danger Zone (pill-style tabs in bg-slate-900 container)
- [x] **General tab**: Workspace Info section (name input, slug input with prefix, logo upload placeholder) + Notification Preferences section (5 toggle switches: email notifications, weekly digest, task assignments, decision logged, thread mentions)
- [x] **Members tab**: Team Members table (4 members with avatar, name, email, role badges, actions dropdown) + Invite Member button and modal + Pending Invites section with resend/revoke actions
- [x] **Billing tab**: Redirect message linking to dedicated Billing & Subscription page
- [x] **Data Export tab**: Export description + "Request Data Export" button
- [x] **Danger Zone tab**: Delete Workspace section (red border, description, delete button, confirmation modal with slug typing) + Transfer Ownership section (red border, member select, transfer button)
- [x] Invite Member modal with email input, role select (Member/Admin/Guest), Send Invite button
- [x] Delete Workspace confirmation modal with slug-to-confirm pattern

### Nice to Have
- [x] Toggle switches with smooth transition animation
- [x] Breadcrumb navigation in top bar (Acme Corp > Settings)
- [x] Owner badge alongside Admin badge for workspace owner
- [x] Pending invite with "Invited 2 days ago" timestamp
- [x] Actions dropdown (three-dot menu) with Change Role and Remove options

### Out of Scope
- Role permission configuration details
- Audit log of settings changes
- SSO/SAML configuration
- Custom domain settings
- API key management

---

## Layout

**Page type**: Full-page settings
**Primary layout**: App shell (sidebar w-64 + top bar h-14) + scrollable main content (max-w-5xl centered)
**Key sections** (in order):

**General Tab:**
1. **Workspace Info**: Name input, slug input (with lazynext.app/ prefix), logo upload circle
2. **Notification Preferences**: 5 rows with label/description + toggle switch, Save Preferences button

**Members Tab:**
1. **Team Members**: Header with count + Invite Member button, 4-column table (Member, Email, Role, Actions)
2. **Pending Invites**: Header with count, invite row with email, timestamp, role, resend/revoke buttons

**Danger Zone Tab:**
1. **Delete Workspace**: Red-bordered card with warning text + delete button
2. **Transfer Ownership**: Red-bordered card with member select dropdown + transfer button

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | General tab active, all fields populated with workspace data |
| **Empty** | Members tab with no members besides owner (not mocked) |
| **Loading** | Not explicitly mocked |
| **Error** | Not explicitly mocked |
| **Success** | Not explicitly mocked — save buttons provide action points |

**Key interactions**:
- **Tab switching**: Click tab pill buttons to switch content panels
- **Toggle switches**: Click to toggle on/off with smooth transition (track color changes, thumb slides)
- **Actions dropdown**: Three-dot button opens dropdown with "Change Role" and "Remove" options; outside click closes
- **Invite modal**: Opens from "Invite Member" button, email + role inputs, Send Invite / Cancel
- **Delete modal**: Opens from "Delete Workspace" button, requires typing workspace slug to confirm
- **Save buttons**: "Save Changes" and "Save Preferences" buttons in General tab sections

---

## Responsive Behavior
- **Mobile**: Sidebar hidden, tabs may need horizontal scroll, table stacks or scrolls horizontally
- **Tablet**: Sidebar visible, workspace info grid stacks (logo below form fields)
- **Desktop**: Full layout with sidebar (w-64), content centered (max-w-5xl), workspace info side-by-side with logo

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Workspace name** | Text input | "Acme Corp" |
| **Workspace slug** | Text input with prefix | "lazynext.app/acme-corp" |
| **Logo** | Image upload placeholder | Dashed circle with image icon |
| **Notification toggles** | Boolean switches | Email notifications (on), Weekly digest (on), Task assignments (on), Decision logged (off), Thread mentions (on) |
| **Team members** | Table rows | Avas Patel (Admin/Owner), Priya Sharma (Admin), Raj Kumar (Member), Guest User (Guest) |
| **Pending invite** | Email + metadata | "dev@newjoinee.com", invited 2 days ago, role: Member |
| **Delete confirmation** | Slug to type | "Type acme-corp to confirm" |
| **Transfer ownership** | Member select | Dropdown of admin members |

---

## Constraints
- Only workspace owners can access Danger Zone actions (delete, transfer)
- Workspace slug change warning: "Changing this will break existing links"
- Delete workspace requires typing the workspace slug for confirmation
- Owner cannot be removed from the members table (actions column shows dash)
- Roles: Admin (blue badge), Owner (amber badge, only one), Member (slate badge), Guest (orange badge)
- Billing tab redirects to dedicated billing page rather than duplicating UI

---

## References
- Feature 13 (Billing & Subscription) for the dedicated billing page linked from Billing tab
- Feature 21 (Data Export) for expanded data export functionality
- Lazynext design system: form inputs, toggle switches, table pattern, modal pattern

# Design Spec — Workspace Settings

> **Feature**: 12 — Workspace Settings
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview
**What was designed**: A full-page workspace settings view with 5 tabbed sections (General, Members, Billing, Data Export, Danger Zone), including workspace info editing, notification toggles, members table with role management, invite modal, and destructive actions with confirmation modals.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Tab-based layout keeps settings organized without overwhelming users. Danger Zone is isolated in its own tab with red-bordered cards to signal risk. Delete workspace uses slug-typing confirmation pattern for safety. Billing tab is a stub linking to a dedicated billing page to avoid feature duplication.

---

## Section Breakdown

### Sidebar Navigation
**Purpose**: App-level navigation with Settings highlighted
**Layout**: Fixed left column (w-64), full height, bg-slate-900
**Key elements**:
- Logo: "L" badge (primary blue) + "Lazynext" text
- Nav items: Dashboard, Projects, Threads, LazyMind AI
- Settings link: active state (bg-slate-800, white text, gear icon)
- User footer: AP avatar + "Avas Patel" + "Admin" role
**Rationale**: Settings is part of a secondary nav section (separated by border-top) to distinguish configuration from primary workflows

### Top Bar
**Purpose**: Breadcrumb context
**Layout**: Fixed height (h-14), bg-slate-900, border-bottom
**Key elements**:
- Breadcrumb: "Acme Corp > Settings" with chevron separator
- Notification bell icon (right-aligned)
**Rationale**: Breadcrumb confirms workspace context; minimal top bar for settings pages

### Tab Navigation
**Purpose**: Switch between settings sections
**Layout**: Pill-style button group in bg-slate-900 container (rounded-xl, p-1)
**Key elements**:
- 5 tabs: General (active, primary blue bg), Members, Billing, Data Export, Danger Zone
- Active state: bg-primary text-white
- Inactive state: text-slate-400, hover text-slate-200
**Rationale**: Pill tabs in a container provide clear grouping; active state is highly visible

### General Tab — Workspace Info
**Purpose**: Edit workspace identity
**Layout**: Card (bg-slate-900, rounded-xl, border) with 2-column grid (form fields + logo)
**Key elements**:
- Workspace Name input: pre-filled "Acme Corp"
- Workspace Slug input: "lazynext.app/" prefix (bg-slate-800/50 with border-r) + editable "acme-corp" + warning text about breaking links
- Logo upload: 96px dashed circle with image icon + "Upload Logo" link below
- "Save Changes" button (primary blue, right-aligned)
**Rationale**: Slug prefix is non-editable to prevent URL format errors; logo is optional and secondary (right column)

### General Tab — Notification Preferences
**Purpose**: Control workspace notifications
**Layout**: Card with list of toggle rows, each with label/description + switch
**Key elements**:
- 5 notification toggles:
  - Email notifications (ON): "Receive email for important updates"
  - Weekly digest (ON): "Summary of workspace activity each week"
  - Task assignments (ON): "Notified when a task is assigned to you"
  - Decision logged (OFF): "Notified when a decision is recorded"
  - Thread mentions (ON): "Notified when someone mentions you in a thread"
- Toggle switch: w-11 h-6, bg-primary when on (thumb right), bg-slate-700 when off (thumb left)
- "Save Preferences" button (primary blue, right-aligned)
**Rationale**: Toggle switches provide clear on/off state; decision notifications default to off to avoid noise (users can opt in)

### Members Tab — Team Members
**Purpose**: View and manage workspace members
**Layout**: Card with header (count + invite button) + 4-column table
**Key elements**:
- Header: "Team Members (4)" + "Invite Member" button (primary blue)
- Table columns: Member (avatar + name), Email, Role (colored badges), Actions
- Members:
  - Avas Patel: Admin + Owner badges, no actions (owner is immutable)
  - Priya Sharma: Admin badge, three-dot menu (Change Role, Remove)
  - Raj Kumar: Member badge, three-dot menu
  - Guest User: Guest badge (orange), three-dot menu
- Role badges: Admin (primary/20 bg, primary text), Owner (amber), Member (slate-700 bg), Guest (orange)
**Rationale**: Table format enables quick scanning; owner has no actions to prevent accidental self-removal; role badges use consistent color coding

### Members Tab — Pending Invites
**Purpose**: Manage outstanding invitations
**Layout**: Card with header (count) + invite row
**Key elements**:
- "Pending Invites (1)" header
- Invite row: mail icon + email (dev@newjoinee.com) + "Invited 2 days ago / Role: Member" + Resend button (primary text) + Revoke button (red text)
**Rationale**: Pending invites separated from active members for clarity; resend and revoke provide immediate actions

### Billing Tab
**Purpose**: Direct users to dedicated billing page
**Layout**: Single card with paragraph and link
**Key elements**:
- Text: "Billing settings are available on the dedicated Billing & Subscription page"
- Link to billing page (primary blue, underline on hover)
**Rationale**: Avoids duplicating billing UI that exists in Feature 13

### Data Export Tab
**Purpose**: Allow workspace data export
**Layout**: Single card with description and action button
**Key elements**:
- Description: "Export all your workspace data as a ZIP archive. This includes projects, threads, decisions, and files."
- "Request Data Export" button (primary blue)
**Rationale**: Simple CTA — export is an async operation; no configuration needed

### Danger Zone Tab — Delete Workspace
**Purpose**: Permanently delete workspace
**Layout**: Card with red border-2 (border-red-500/30)
**Key elements**:
- "Delete Workspace" heading (red-400)
- Warning text about permanent deletion
- "Delete Workspace" button (bg-red-600)
- Confirmation modal: warning icon, description with workspace name bold, slug-typing input (type "acme-corp" to confirm), Cancel + Delete buttons
**Rationale**: Red borders and text signal danger; slug-typing confirmation prevents accidental deletion

### Danger Zone Tab — Transfer Ownership
**Purpose**: Transfer workspace ownership to another admin
**Layout**: Card with red border-2
**Key elements**:
- "Transfer Ownership" heading (red-400)
- Description about being downgraded to regular admin
- Member select dropdown (filtered to admins): Priya Sharma, Raj Kumar
- "Transfer" button (bg-red-600)
**Rationale**: Ownership transfer is a high-impact action warranting Danger Zone placement

### Invite Member Modal
**Purpose**: Send invitation to join workspace
**Layout**: Centered modal (max-w-md), backdrop blur
**Key elements**:
- Title: "Invite Member" + close button
- Email input with placeholder "teammate@company.com"
- Role select: Member (default), Admin, Guest
- Cancel + "Send Invite" buttons
**Rationale**: Simple 2-field form minimizes friction for inviting; role defaults to Member for safety

---

## States

| State | Behavior | Notes |
|---|---|---|
| **General tab active** | Workspace info + notification sections visible | Default state |
| **Members tab active** | Team table + pending invites visible | Switch via tab |
| **Danger Zone tab active** | Delete + Transfer cards visible | Red-bordered cards |
| **Toggle on** | Track bg-primary, thumb translated right | Smooth 0.2s transition |
| **Toggle off** | Track bg-slate-700, thumb at left | Smooth 0.2s transition |
| **Dropdown open** | Change Role / Remove options visible | Outside click closes |
| **Invite modal open** | Backdrop blur, modal centered | Close via X, Cancel, or backdrop |
| **Delete modal open** | Backdrop blur, red-bordered modal | Requires slug typing to enable delete |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Sidebar hidden; tabs may horizontally scroll; workspace info stacks vertically (logo below fields); members table scrolls horizontally |
| **Tablet** (640-1024px) | Sidebar visible; workspace info grid stacks (md breakpoint); table fits within card |
| **Desktop** (> 1024px) | Full layout: sidebar (w-64) + content (max-w-5xl); workspace info side-by-side with logo; full table layout |

---

## Cognitive Load Assessment
- **Information density**: Low-medium — each tab shows only its relevant settings, preventing information overload
- **Visual hierarchy**: Strong — tab navigation clearly segments content; section headers (h2) break up each tab; red danger zone is unmistakable
- **Progressive disclosure**: Excellent — tabs split settings into logical groups; modals only appear on action; danger zone is its own tab rather than mixed with general settings
- **Interaction complexity**: Low — standard form inputs, toggle switches, and buttons; confirmation modal adds appropriate friction for destructive actions

---

## Accessibility Notes
- **Contrast**: Toggle switches have high contrast between on (primary blue) and off (slate-700) states; red danger zone text meets contrast on dark backgrounds
- **Focus order**: Tab navigation > form fields in order > save buttons > (Members tab) table rows > invite button > (Danger Zone) delete/transfer buttons
- **Screen reader**: Toggle switches should announce their state (on/off); role badges should be announced; delete modal should announce the confirmation requirement
- **Keyboard**: Tab to navigate between form fields; Space/Enter to toggle switches and press buttons; Escape to close modals; Tab cycling within modals

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Pill-style tab container (bg-slate-900, rounded-xl, p-1) | Settings-specific tab pattern | Yes — add pill tab group component |
| Toggle switch with slide animation | Custom toggle not using a library | Yes — add toggle switch component |
| Red border-2 danger cards | Danger Zone visual pattern | Yes — add danger card variant |
| Slug-typing confirmation modal | Delete safety pattern | Yes — add destructive confirmation modal pattern |

# Design Brief — Integrations Settings

> **Feature**: 31 — Integrations Settings
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A workspace-level integrations management page with three sections — Connected integrations (Slack, Notion with configure/disconnect), Available integrations grid (Linear, Trello, Asana, GitHub, Google Calendar, Figma with Connect buttons), and API Access (masked key, copy, regenerate, Business Plan badge).
**Why**: Teams need to connect third-party tools (Slack, Notion, etc.) and access APIs to integrate Lazynext into their existing workflow.
**Where**: Settings sidebar → Integrations (within workspace settings, alongside General, Members, Billing, Data Export).

---

## Target Users
- **Workspace admins**: Managing connected integrations and API keys
- **Team leads**: Connecting project management tools (Linear, Trello, Asana)
- **Developers**: Using the API for custom integrations

---

## Requirements

### Must Have
- [x] Settings sidebar (w-60) with Integrations active state
- [x] Breadcrumb: Settings → Integrations
- [x] Connected section: Slack (connected to #product-team, configure/disconnect), Notion (last import stats, re-import/disconnect)
- [x] Available section: 2-column grid with Linear, Trello, Asana, GitHub, Google Calendar, Figma — each with brand-colored icon, name, description, Connect button
- [x] API Access card: masked API key (lnx_sk_••••), Copy button, Regenerate link, Business Plan badge, API docs link

### Nice to Have
- [x] Brand-colored icons for all integrations (Slack purple, Trello blue, Asana coral, GitHub white, etc.)
- [x] Connected date and channel info for active integrations
- [x] "Connected" badge with emerald color
- [x] Security warning text under API key

### Out of Scope
- OAuth flow screens for connecting integrations
- Webhook configuration UI
- Integration-specific settings modals
- API key creation flow

---

## Layout

**Page type**: Full-page settings
**Primary layout**: App shell (sidebar w-60 + top bar h-12) + main content (max-w-4xl)
**Key sections**:
1. **Header**: Title + description
2. **Connected**: Stacked cards for active integrations with actions
3. **Available**: 2-column grid of connectable integrations
4. **API Access**: Single card with key management

---

## States & Interactions

| State | Description |
|---|---|
| **Connected integration** | Shows brand icon, connected badge, channel/import info, configure + disconnect |
| **Available integration** | Shows brand icon, name, short description, Connect button |
| **API key visible** | Masked key with Copy and Regenerate actions |

**Key interactions**: Connect/disconnect integrations, configure connected integrations, re-import from Notion, copy API key, regenerate API key, navigate to API docs

---

## Responsive Behavior
- **Mobile**: Single column, sidebar hidden, integration grid stacks to 1-col
- **Tablet**: Sidebar visible, 2-column grid maintained
- **Desktop**: Full layout with sidebar w-60 and max-w-4xl content

---

## Constraints
- API Access requires Business Plan (amber badge indicator)
- API key must be masked by default for security
- Integration brand colors must match official brand guidelines
- Connected integrations show actionable metadata (channel, import count, date)

---

## References
- Feature 12 (Workspace Settings) — parent settings context
- Feature 15 (Import Modal) — import flow from connected sources
- Feature 21 (Data Export) — complementary data management

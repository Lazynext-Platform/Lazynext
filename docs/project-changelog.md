# 📋 Project Changelog

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-04-06

---

## [Unreleased]

<!-- Features merged to main but not yet released/deployed -->

### Added

- **Mastery Framework Adoption** — Adopted the Mastery development process framework (v3.4) alongside the existing Blueprint design framework. Created all required project-level docs: project-discussion.md, project-context.md, project-roadmap.md, mastery-compact.md, project-changelog.md, process-overrides.md. Updated AGENTS.md to reference both frameworks.

- **Phase 1 Feature Build — Session 2** — Built all 7 remaining Phase 1 features:
  - **#06 Mobile App View** — NodeListView with filter pills, type-colored left-border cards, sort button, responsive for <640px
  - **#09 Node Detail Panels** — Separate Task/Doc/Decision panels with full field sets, subtasks, priority segmented control, quality score card, rich text toolbar
  - **#10 LazyMind AI Panel** — Enhanced with structured messages (status summary, observations, actions, digest), quick actions, typing indicator, ⌘L shortcut
  - **#11 Thread Comments Panel** — Full thread with @mentions, emoji reactions, comparison tables, resolve toggle, mention popover
  - **#20 Empty & Error States** — 12 states across empty (canvas, decisions, search, tasks, thread, pulse), error (general, 404, maintenance, rate limit), AI unavailable, loading skeletons
  - **#23 Notification Center** — Bell dropdown with all/unread tabs, mark-all-read, type badges, grouped by Today/Yesterday
  - **#24 Keyboard Shortcuts** — ? key modal with 23 shortcuts across 4 categories, node-type colored keys

- **Phase 2-4 Feature Build — Session 3** — Built all 21 remaining features (Phases 2, 3, 4):
  - **#07 Decision DNA View** — Enhanced decisions page with Log Decision Modal, quality distribution bars, health overview card, sort/filter, orange accent cards
  - **#08 Decision Health Dashboard** — Full analytics: quality trends SVG, outcome donut chart, top decision makers, type breakdown, tag cloud, LazyMind insight
  - **#13 Billing & Subscription** — 4-plan comparison grid, annual/monthly toggle, payment method, billing history, usage metrics with progress bars
  - **#15 Import Modal** — 3-step wizard (source select → preview/connect → progress/success), 6 sources (Notion, Linear, Trello, Asana, CSV)
  - **#16 Pulse Dashboard** — Enhanced with team workload bars (overload alerts), sprint burndown SVG, activity timeline, week-over-week comparison, LazyMind weekly summary
  - **#17 Automation Builder** — List view with toggles, builder with WHEN trigger → THEN actions visual connector, run history table
  - **#18 Template Marketplace** — Enhanced with featured templates, gradient previews, install modal with "Includes" breakdown, category color-coded pills, success state
  - **#19 Email Templates** — 4 email templates (workspace invite, task assignment, weekly digest, decision digest) with shared layout, light theme
  - **#21 Data Export** — Workspace/decisions export with format/scope selection, 12-item includes grid, progress bar, export history, API endpoint reference
  - **#22 Upgrade & Paywall Modal** — 4 variants (node-limit, ai-limit, health-gate, full-upgrade), 3 plan cards, billing toggle, TrialBanner component
  - **#25 Table Primitive** — TablePanel with toolbar (Filter/Sort/Group/Hide/Export), inline contentEditable cells, status/priority pills, summary footer
  - **#27 Real-time Collaboration** — CollaborationOverlay with animated cursors, name pills, pulsing selection rings, typing indicator dots, presence counter
  - **#30 Profile & Account Settings** — 4 tabs (Profile/Security/Preferences/Sessions), 2FA, connected accounts, dark mode/AI toggles, session manager
  - **#31 Integrations Settings** — Connected/available integrations grid, API key with copy/regenerate, Business plan gating
  - **#32 Marketing Pages** — 5 new pages (About, Features, Changelog, Comparison, Blog) with light theme, consistent CTA banners
  - **#34 Team Member Management** — Enhanced with role-colored badges (Owner/Admin/Member/Guest), 3-stat header, email chip input in invite modal, seat usage bar
  - **#35 Public Shared Canvas** — Read-only public view at /shared/[id], share modal with analytics, watermark footer, dot-grid background
  - **#36 Decision Outcome Review** — OutcomeReviewModal with emoji buttons (Good/Neutral/Bad), notes/learning textareas, queue dots, LazyMind suggestion
  - **#37 Task Views (Kanban + List)** — Board/List toggle, 4-column Kanban (todo/in-progress/review/done), List with checkboxes, priority/assignee/due
  - **#38 Activity Feed & Audit Log** — Feed tab with grouped timeline, avatar+type overlays, quoted replies. Audit tab with formal table, CSV export, pagination

- **Navigation Updates — Session 4** — Added sidebar navigation links for all new routes (Tasks, Automations, Activity, Billing, Integrations, Members, Settings). Updated marketing header/footer links to point to new pages (Features, Compare, Blog, About).

### Changed
### Fixed
### Removed

---

## [0.0.1] — 2026-04-05 (Pre-Mastery)

### Added

- **Project Scaffolding** — Next.js 14 App Router setup with TypeScript, Tailwind CSS 3, ESLint
- **Auth Integration (Supabase Auth)** — Sign-in, sign-up, middleware protection, workspace-based routing
- **Database Schema (Supabase PostgreSQL)** — Full schema with workspaces, members, workflows, nodes, edges, threads, messages, decisions, automation runs, and RLS policies
- **Canvas State (Zustand)** — Canvas store with nodes, edges, selection, history (undo/redo), LazyMind toggle
- **Design System** — Complete design token system in docs/design-system.md and tailwind.config.ts
- **Blueprint Design Docs** — 38 features fully designed with mockups, briefs, specs, reviews, and handoffs
- **Marketing Landing Page** — Basic marketing layout and landing page
- **App Shell** — Protected workspace routes with dynamic slug-based routing

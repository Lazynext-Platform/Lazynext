# 🗺️ Project Roadmap

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Current Milestone**: v1.0 MVP
> **Last Updated**: 2026-04-13

---

## Progress Overview

| Metric | Count |
|---|---|
| Total Features | 38 |
| 🟢 Complete (Design) | 38 (all features fully designed via Blueprint) |
| 🟢 Complete (Development) | 38 |
| 🟢 Complete | 38 (all merged to `main`) |
| 🔴 Not Started | 0 |
| ⏸️ On Hold | 0 |

**Design Progress**: ██████████ 100%
**Development Progress**: ██████████ 100%

---

## Feature List

### Phase 1 — Core (MVP)

> Foundation features needed for a functional product.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 01 | Landing Page | ✅ Complete | 🟢 Merged | — | `main` | Built — all 12 sections, verified |
| 02 | Pricing Page | ✅ Complete | 🟢 Merged | — | `main` | Built — 4-tier cards, toggle, comparison, FAQ |
| 03 | Auth Pages | ✅ Complete | 🟢 Merged | — | `main` | Built — split-panel layout + Supabase Auth |
| 04 | Onboarding Flow | ✅ Complete | 🟢 Merged | #03 | `main` | Built — 3-step wizard, confetti, score reveal |
| 05 | Workflow Canvas | ✅ Complete | 🟢 Merged | #03, #04 | `main` | Built — 5 nodes, Decision DNA panel, enhanced TopBar/Sidebar |
| 06 | Mobile App View | ✅ Complete | 🟢 Merged | #05 | `main` | Built — NodeListView with filter pills, type-colored cards |
| 09 | Node Detail Panels | ✅ Complete | 🟢 Merged | #05 | `main` | Built — Task/Doc/Decision panels with full fields |
| 10 | LazyMind AI Panel | ✅ Complete | 🟢 Merged | #05, #09 | `main` | Built — structured messages, quick actions, typing indicator |
| 11 | Thread Comments Panel | ✅ Complete | 🟢 Merged | #05, #09 | `main` | Built — messages, @mentions, reactions, comparison tables |
| 14 | Command Palette & Search | ✅ Complete | 🟢 Merged | #05 | `main` | Built — ⌘K palette with search, Quick Actions, Recent, Navigation |
| 20 | Empty & Error States | ✅ Complete | 🟢 Merged | #05 | `main` | Built — 12 states (empty/error/loading/maintenance/rate-limit) |
| 23 | Notification Center | ✅ Complete | 🟢 Merged | #05 | `main` | Built — bell dropdown, all/unread tabs, mark-all-read, type badges |
| 24 | Keyboard Shortcuts | ✅ Complete | 🟢 Merged | #05 | `main` | Built — ? key modal, 23 shortcuts in 4 categories |
| 26 | Workspace Home | ✅ Complete | 🟢 Merged | #05 | `main` | Built — greeting, stats, workflows, activity, due soon, LazyMind |
| 28 | Toast Notifications | ✅ Complete | 🟢 Merged | #05 | `main` | Built — 6 variants with progress bars, action buttons |
| 29 | Node Creation Menu | ✅ Complete | 🟢 Merged | #05 | `main` | Built — 2-col grid, kbd shortcuts (N/T/D/Q/H/P/A) |
| 33 | Canvas Context Controls | ✅ Complete | 🟢 Merged | #05 | `main` | Built — right-click context menus, create submenu |

**Phase 1 Total**: 17 features

---

### Phase 2 — Growth

> Features for team growth, monetization, and advanced capabilities.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 07 | Decision DNA View | ✅ Complete | 🟢 Merged | #05, #09 | `main` | Built — Log Decision Modal, quality bars, health overview |
| 08 | Decision Health Dashboard | ✅ Complete | 🟢 Merged | #07 | `main` | Built — quality trends, outcome donut, burndown, makers table |
| 12 | Workspace Settings | ✅ Complete | 🟢 Merged | #05 | `main` | Built — 5-tab settings (general/members/billing/notifications/security) |
| 13 | Billing & Subscription | ✅ Complete | 🟢 Merged | #12 | `main` | Built — plan comparison, payment method, usage metrics |
| 15 | Import Modal | ✅ Complete | 🟢 Merged | #05 | `main` | Built — 3-step wizard (Notion, Linear, Trello, CSV) |
| 16 | Pulse Dashboard | ✅ Complete | 🟢 Merged | #05 | `main` | Built — workload bars, burndown SVG, LazyMind summary |
| 17 | Automation Builder | ✅ Complete | 🟢 Merged | #05 | `main` | Built — WHEN/THEN rules, run history |
| 18 | Template Marketplace | ✅ Complete | 🟢 Merged | #05 | `main` | Built — featured, install modal, gradient previews, categories |
| 19 | Email Templates | ✅ Complete | 🟢 Merged | — | `main` | Built — invite, task assignment, weekly digest, decision digest |
| 21 | Data Export | ✅ Complete | 🟢 Merged | #05 | `main` | Built — workspace/decisions export, history, API access |
| 22 | Upgrade & Paywall Modal | ✅ Complete | 🟢 Merged | #13 | `main` | Built — 4 variants (node/ai/health/full), plan cards |
| 27 | Real-time Collaboration | ✅ Complete | 🟢 Merged | #05, #11 | `main` | Built — cursor overlays, presence, typing indicators |
| 30 | Profile & Account Settings | ✅ Complete | 🟢 Merged | #03 | `main` | Built — 4 tabs (profile/security/preferences/sessions) |
| 31 | Integrations Settings | ✅ Complete | 🟢 Merged | #12 | `main` | Built — connected/available, API key, Business gating |
| 32 | Marketing Pages | ✅ Complete | 🟢 Merged | #01 | `main` | Built — About, Features, Changelog, Comparison, Blog |
| 34 | Team Member Management | ✅ Complete | 🟢 Merged | #12 | `main` | Built — role badges, stat bar, email chip invites |
| 37 | Task Views (Kanban + List) | ✅ Complete | 🟢 Merged | #05 | `main` | Built — Kanban board + List table with filters |
| 38 | Activity Feed & Audit Log | ✅ Complete | 🟢 Merged | #05 | `main` | Built — Feed timeline + Audit table with pagination |

**Phase 2 Total**: 18 features

---

### Phase 3 — Scale

> Advanced features for larger teams and deeper analytics.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 25 | Table Primitive | ✅ Complete | 🟢 Merged | #05, #09 | `main` | Built — TablePanel with toolbar, inline editing, summary footer |
| 36 | Decision Outcome Review | ✅ Complete | 🟢 Merged | #07, #08 | `main` | Built — emoji outcomes, queue navigation, LazyMind suggestions |

**Phase 3 Total**: 2 features

---

### Phase 4 — Expand

> Growth and network effects.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 35 | Public Shared Canvas | ✅ Complete | 🟢 Merged | #05, #34 | `main` | Built — read-only view, share modal, watermark, analytics |

**Phase 4 Total**: 1 feature

---

## Dependency Map

```
01 [Landing Page]     02 [Pricing]       19 [Email Templates]
                            
03 [Auth Pages] ──────────────────────── 30 [Profile Settings]
 └── 04 [Onboarding]
      └── 05 [Workflow Canvas] ─────────────────────────────────
           ├── 06 [Mobile View]
           ├── 09 [Node Panels] ─── 10 [LazyMind AI]
           │                    └── 11 [Thread Comments] ── 27 [Real-time Collab]
           ├── 14 [Command Palette]
           ├── 20 [Empty/Error States]
           ├── 23 [Notification Center]
           ├── 24 [Keyboard Shortcuts]
           ├── 26 [Workspace Home]
           ├── 28 [Toast Notifications]
           ├── 29 [Node Creation Menu]
           ├── 33 [Canvas Context]
           ├── 07 [Decision DNA] ── 08 [Decision Health]
           │                    └── 36 [Outcome Review]
           ├── 12 [Workspace Settings] ── 13 [Billing] ── 22 [Paywall]
           │                          ├── 31 [Integrations]
           │                          └── 34 [Team Mgmt] ── 35 [Public Share]
           ├── 15 [Import Modal]
           ├── 16 [Pulse Dashboard]
           ├── 17 [Automation Builder]
           ├── 18 [Template Marketplace]
           ├── 21 [Data Export]
           ├── 25 [Table Primitive]
           ├── 37 [Task Views]
           └── 38 [Activity Feed]
                            
01 [Landing Page] ── 32 [Marketing Pages]
```

---

## Milestones

### MVP / v1.0

**Target**: When Phase 1 features (01-06, 09-11, 14, 20, 23-24, 26, 28-29, 33) are complete
**Features Included**: 17 features (Phase 1)

| Criterion | Status |
|---|---|
| All Phase 1 features merged | ✅ All merged to main |
| All test plans passing | ✅ 78 E2E + 53 unit tests passing |
| Documentation complete | ✅ |
| Deployment ready | ⬜ |

### Growth / v2.0

**Target**: When Phase 2-4 features are complete
**Features Included**: All 38 features

| Criterion | Status |
|---|---|
| All 38 features built | ✅ Complete |
| All features on feature branch | ✅ `main` |
| Merge to main | ✅ All merged |
| Test coverage | ✅ 78 E2E + 53 unit |
| Deployment | ⬜ |

---

## Backlog

| Feature Idea | Priority | Notes |
|---|---|---|
| API for external integrations | Medium | Enable third-party tools to connect |
| Mobile native app (React Native) | Low | Future consideration |
| AI workflow generation from prompt | Medium | "Create a hiring workflow" → auto-generate canvas |
| Decision DNA reporting / PDF export | Medium | Executive-friendly decision reports |
| Workspace templates gallery | Low | Pre-built workspace types |
| OAuth app marketplace | Low | Third-party app ecosystem |

---

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-04-05 | Initial roadmap created from 38 Blueprint features | Mastery framework adoption — mid-project |
| 2026-04-05 | Phasing follows Blueprint FEATURE-INDEX.md phases | Existing phase groupings are logical and dependency-ordered |

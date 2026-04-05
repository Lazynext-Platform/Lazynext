# 🗺️ Project Roadmap

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Current Milestone**: v1.0 MVP
> **Last Updated**: 2026-04-05

---

## Progress Overview

| Metric | Count |
|---|---|
| Total Features | 38 |
| 🟢 Complete (Design) | 38 (all features fully designed via Blueprint) |
| 🟢 Complete (Development) | 0 |
| 🟡 In Progress (awaiting merge) | 1 |
| 🔴 Not Started | 37 |
| ⏸️ On Hold | 0 |

**Design Progress**: ██████████ 100%
**Development Progress**: ▓░░░░░░░░░ ~3%

---

## Feature List

### Phase 1 — Core (MVP)

> Foundation features needed for a functional product.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 01 | Landing Page | ✅ Complete | 🟡 Awaiting Merge | — | `feature/01-landing-page` | Built — all 12 sections, verified |
| 02 | Pricing Page | ✅ Complete | 🟡 Awaiting Merge | — | `feature/01-landing-page` | Built — 4-tier cards, toggle, comparison, FAQ |
| 03 | Auth Pages | ✅ Complete | 🟡 Awaiting Merge | — | `feature/01-landing-page` | Built — split-panel layout + Clerk customization |
| 04 | Onboarding Flow | ✅ Complete | 🟡 Awaiting Merge | #03 | `feature/01-landing-page` | Built — 3-step wizard, confetti, score reveal |
| 05 | Workflow Canvas | ✅ Complete | 🟡 Awaiting Merge | #03, #04 | `feature/01-landing-page` | Built — 5 nodes, Decision DNA panel, enhanced TopBar/Sidebar |
| 06 | Mobile App View | ✅ Complete | 🔴 Not Started | #05 | — | NodeListView for <640px |
| 09 | Node Detail Panels | ✅ Complete | 🔴 Not Started | #05 | — | Side panel for node editing |
| 10 | LazyMind AI Panel | ✅ Complete | 🔴 Not Started | #05, #09 | — | Context-aware AI sidebar |
| 11 | Thread Comments Panel | ✅ Complete | 🔴 Not Started | #05, #09 | — | Conversations on any node |
| 14 | Command Palette & Search | ✅ Complete | 🔴 Not Started | #05 | — | ⌘K power navigation |
| 20 | Empty & Error States | ✅ Complete | 🔴 Not Started | #05 | — | UX polish for all empty views |
| 23 | Notification Center | ✅ Complete | 🔴 Not Started | #05 | — | Activity notifications |
| 24 | Keyboard Shortcuts | ✅ Complete | 🔴 Not Started | #05 | — | Power user efficiency |
| 26 | Workspace Home | ✅ Complete | 🔴 Not Started | #05 | — | Dashboard landing page |
| 28 | Toast Notifications | ✅ Complete | 🔴 Not Started | #05 | — | Sonner-powered feedback |
| 29 | Node Creation Menu | ✅ Complete | 🔴 Not Started | #05 | — | Add nodes to canvas |
| 33 | Canvas Context Controls | ✅ Complete | 🔴 Not Started | #05 | — | Right-click menu, zoom controls |

**Phase 1 Total**: 17 features

---

### Phase 2 — Growth

> Features for team growth, monetization, and advanced capabilities.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 07 | Decision DNA View | ✅ Complete | 🔴 Not Started | #05, #09 | — | Log + view structured decisions |
| 08 | Decision Health Dashboard | ✅ Complete | 🔴 Not Started | #07 | — | Analytics for decision quality |
| 12 | Workspace Settings | ✅ Complete | 🔴 Not Started | #05 | — | Workspace config |
| 13 | Billing & Subscription | ✅ Complete | 🔴 Not Started | #12 | — | Stripe + Razorpay |
| 15 | Import Modal | ✅ Complete | 🔴 Not Started | #05 | — | CSV, JSON, Notion import |
| 16 | Pulse Dashboard | ✅ Complete | 🔴 Not Started | #05 | — | Team activity metrics |
| 17 | Automation Builder | ✅ Complete | 🔴 Not Started | #05 | — | Trigger-action workflows |
| 18 | Template Marketplace | ✅ Complete | 🔴 Not Started | #05 | — | Share and reuse canvases |
| 19 | Email Templates | ✅ Complete | 🔴 Not Started | — | — | Transactional emails (Resend) |
| 21 | Data Export | ✅ Complete | 🔴 Not Started | #05 | — | PDF, CSV, JSON export |
| 22 | Upgrade & Paywall Modal | ✅ Complete | 🔴 Not Started | #13 | — | Free-to-paid conversion |
| 27 | Real-time Collaboration | ✅ Complete | 🔴 Not Started | #05, #11 | — | Multi-cursor, presence |
| 30 | Profile & Account Settings | ✅ Complete | 🔴 Not Started | #03 | — | User profile management |
| 31 | Integrations Settings | ✅ Complete | 🔴 Not Started | #12 | — | Third-party connections |
| 32 | Marketing Pages | ✅ Complete | 🔴 Not Started | #01 | — | About, blog, legal, etc. |
| 34 | Team Member Management | ✅ Complete | 🔴 Not Started | #12 | — | Invite, roles, permissions |
| 37 | Task Views (Kanban + List) | ✅ Complete | 🔴 Not Started | #05 | — | Alternative task views |
| 38 | Activity Feed & Audit Log | ✅ Complete | 🔴 Not Started | #05 | — | Compliance / history |

**Phase 2 Total**: 18 features

---

### Phase 3 — Scale

> Advanced features for larger teams and deeper analytics.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 25 | Table Primitive | ✅ Complete | 🔴 Not Started | #05, #09 | — | Spreadsheet-like node type |
| 36 | Decision Outcome Review | ✅ Complete | 🔴 Not Started | #07, #08 | — | Outcome tagging at scale |

**Phase 3 Total**: 2 features

---

### Phase 4 — Expand

> Growth and network effects.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 35 | Public Shared Canvas | ✅ Complete | 🔴 Not Started | #05, #34 | — | Public/embed canvas sharing |

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
| All Phase 1 features merged | ⬜ |
| All test plans passing | ⬜ |
| Documentation complete | ⬜ |
| Deployment ready | ⬜ |

### Growth / v2.0

**Target**: When Phase 2 features are complete
**Features Included**: Phase 1 + Phase 2 (35 features)

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

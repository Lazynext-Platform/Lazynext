# 🗺️ Project Roadmap

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Current Milestone**: v1.3.42.4 — shipped + deployed
> **Last Updated**: 2026-04-28

---

## Progress Overview

| Metric | Count |
|---|---|
| Total Features | 40 |
| 🟢 Complete (Design) | 39 |
| 🟢 Complete (UI shell) | 39 |
| 🟢 Fully wired to real backend | 35 |
| 🟡 Partial / honest empty state | 1 — see *Remaining work* below |
| 🔴 Not Started | 0 |
| ⏸️ On Hold | 0 |
| ✅ Cleanup/Polish + Demo-data eradication rounds | 89 commits |

**Design Progress**: ██████████ 100%
**UI Build**: ██████████ 100%
**Backend wired**: █████████░ ~89%

> **v1.3.3.6 Status**: Live on https://lazynext.com. All 38 feature UIs built. 17 rounds of demo-data eradication (v1.3.2.0 → v1.3.3.6) replaced every fabricated fixture (Avas/Priya/Rahul fake teammates, fake Acme Corp workspace, fake testimonials, fake 84/100 onboarding score, fake Notion import, fake LazyMind chat with `setTimeout`, fake notification dropdowns, fake billing/integrations/sessions, fake template marketplace) with real Supabase data or honest empty states. Tests: **143/143** Vitest + Playwright passing, type-check clean, build clean.

### Remaining work — features that ship as honest empty states

These features show real, truthful UI but lack the backend that would make them functional. Listed in priority order:

| # | Feature | Gap | Path to real |
|---|---|---|---|
| 32 | Marketing → Blog | 4 real posts (Launch, Engineering, Product, Maturity); registry refactor on `feature/80-…` | Convert to MDX-driven listing or grow backlog organically |

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
| 23 | Notification Center | ✅ Complete | 🟢 Wired | #05 | `main` | Real `notifications` table + bell wired (v1.3.4.0); per-event preferences (v1.3.5.0) |
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
| 12 | Workspace Settings | ✅ Complete | 🟢 Merged | #05 | `main` | Built — 5-tab settings; Notifications tab now wired to real `notification_preferences` (v1.3.5.0) |
| 13 | Billing & Subscription | ✅ Complete | 🟢 Merged | #12 | `main` | Built — plan comparison, payment method, usage metrics |
| 15 | Import Modal | ✅ Complete | � Code complete | #05 | `feature/80-oauth-adapters-sessions-blog` | CSV import + all OAuth adapters shipped (GitHub, Notion, Linear, Slack on `main`; Asana, Jira, Trello on branch). Production activation blocked only on provider OAuth app registrations + env-var rollout. |
| 16 | Pulse Dashboard | ✅ Complete | 🟢 Merged | #05 | `main` | Built — workload bars, burndown SVG, LazyMind summary |
| 17 | Automation Builder | ✅ Complete | 🟢 Merged | #05 | `main` | Real WHEN/THEN engine (v1.3.7.0) — `decision.logged` + `task.created` triggers, `notification.send` + `webhook.post` actions, run history |
| 18 | Template Marketplace | ✅ Complete | 🟢 Merged | #05 | `main` | 6-template curated catalog (v1.3.8.0) — install clones nodes + edges into workspace |
| 19 | Email Templates | ✅ Complete | 🟢 Merged | — | `main` | Built — invite, task assignment, weekly digest, decision digest |
| 21 | Data Export | ✅ Complete | 🟢 Merged | #05 | `main` | Built — workspace/decisions export, history, API access |
| 22 | Upgrade & Paywall Modal | ✅ Complete | 🟢 Merged | #13 | `main` | Built — 4 variants (node/ai/health/full), plan cards |
| 27 | Real-time Collaboration | ✅ Complete | 🟢 Merged | #05, #11 | `main` | Supabase Realtime presence wired (v1.3.6.0) — live cursors + selection rings on the canvas |
| 30 | Profile & Account Settings | ✅ Complete | 🟢 Merged | #03 | `main` | Built — 4 tabs (profile/security/preferences/sessions) |
| 31 | Integrations Settings | ✅ Complete | � Code complete | #12 | `feature/80-oauth-adapters-sessions-blog` | All 7 OAuth adapters (GitHub/Notion/Linear/Slack/Asana/Jira/Trello) implemented; UI + status banner live. Provider OAuth app registration + env vars are the only remaining ops step. |
| 32 | Marketing Pages | ✅ Complete | 🟢 Merged | #01 | `main` | Built — About, Features, Changelog, Comparison, Blog |
| 34 | Team Member Management | ✅ Complete | 🟢 Merged | #12 | `main` | Built — role badges, stat bar, email chip invites |
| 37 | Task Views (Kanban + List) | ✅ Complete | 🟢 Merged | #05 | `main` | Built — Kanban board + List table with filters |
| 38 | Activity Feed & Audit Log | ✅ Complete | 🟢 Wired | #05 | `main` | Feed is real; Audit log table + write hooks shipped v1.3.5.0 (Business+ plan gate) |

**Phase 2 Total**: 18 features

---

### Phase 3 — Scale

> Advanced features for larger teams and deeper analytics.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 25 | Table Primitive | ✅ Complete | 🟢 Merged | #05, #09 | `main` | Built — TablePanel with toolbar, inline editing, summary footer |
| 36 | Decision Outcome Review | ✅ Complete | 🟢 Merged | #07, #08 | `main` | Built — emoji outcomes, queue navigation, LazyMind suggestions |
| 40 | Public REST API & SDK (formalization) | ✅ Discuss/Design/Plan | 🟢 Merged | #03, #13, #31 | `main` (PR #11, 2026-04-28) | Header contract on every `/api/v1/*` response (X-Request-Id, X-API-Version, X-RateLimit triplet, Retry-After). Plan-aware two-tier rate limiting. 6 customer docs pages at `/docs/api/*`. SDK packaged at `packages/sdk/` (`@lazynext/sdk@0.1.0`, `private: true` until npm org reserved). Reference docs at [`docs/references/api-versioning.md`](references/api-versioning.md) + [`docs/references/api-changelog.md`](references/api-changelog.md). 350/350 tests pass. |
| 41 | AI Workflow Generation from Prompt | ✅ Complete | 🟢 Merged | #05, #10, #18 | `main` | LazyMind drafts a typed node graph from a freeform prompt. Strict-JSON LLM output, zod-parsed, retried once. 12-node / 20-edge cap. Hand-rolled top-down auto-layout. Preview-then-commit modal. Reuses `/api/v1/ai/generate` plan-gate + quota + rate-limit scaffolding. v1.5.0.0. 470/470 tests. |
| 42 | Decision DNA PDF Export | ✅ Complete | � Merged | #07, #08 | `main` | Print-ready HTML report of every logged decision (cover, summary cards, TOC, score bars). Auto-fires `window.print()` so user lands in save-as-PDF dialog. Zero new dependencies — server-rendered HTML + `@page` print stylesheet. Cookie-only `GET /api/v1/decisions/report`, plan-gated to Team+. 500-decision cap with truncation banner. v1.5.1.0. 488/488 tests. |
| 43 | Audit Log Viewer | ✅ Complete | � Merged | #38 | `main` | Read-only paginated viewer at `/workspace/[slug]/audit-log` for the audit-log table that's been writing since v1.3.5.0. Server-rendered first page, client load-more cursor pagination, single-dropdown action filter, color-coded action chips, collapsible `metadata` JSON. Plan-gated to Business+ with new `audit-log-gate` upgrade variant. v1.5.2.0. 507/507 tests. |
| 44 | Audit Log CSV Export | ✅ Complete | � Merged | #43 | `main` | `GET /api/v1/audit-log/export-csv` + Download CSV button on the audit log page. RFC 4180 escaping mirrors `decisions-csv.ts`. 5000-row cap, action filter respected. Cookie + bearer auth, plan-gated to Business+, shares the `export` rate-limit bucket. v1.5.3.0. 515/515 tests. |
| 45 | Audit Log Date-Range Filter | ✅ Complete | � Merged | #43, #44 | `main` | Shared `parseAuditRange` + `rangeCutoffIso` plumbed through loader, JSON list, CSV endpoint, and page UI. Buckets: 7 / 30 / 90 / 365 / all. Default `'all'` preserves prior behaviour. CSV filename includes range so SOC-2 evidence packs are self-describing. v1.5.4.0. 522/522 tests. |
| 46 | OpenAPI Spec Sync | ✅ Complete | � Merged | #43, #44, #45 | `main` | `lib/utils/openapi.ts` now lists `/audit-log/export-csv` and documents `?action` + `?range` on `/audit-log`. The `action` enum mirrors `AuditAction` (17 values); the `range` enum mirrors `AuditRange`. New structural test prevents the spec from drifting again. v1.5.5.0. 523/523 tests. |
| 47 | Audit Log Metadata Summary | ✅ Complete | � Merged | #43 | `main` | `summarizeAuditMetadata` reads each action's known metadata shape and emits a one-line summary (rename pairs, edited fields, ai.workflow prompt+nodeCount, etc.). Renders inline above a renamed `raw metadata` collapsible; unknown shapes fall through to the JSON view unchanged. v1.5.6.0. 536/536 tests. |
| 48 | Audit Log POST endpoint | ✅ Complete | � Merged | #41, #43 | `main` | New `POST /api/v1/audit-log` with a tight client-writable allowlist (`ai.workflow.accepted` + `ai.workflow.refined` only). Sanitised metadata (prompt 500-char cap, integer counts), `viaApiKey` server-derived. `WorkflowGeneratorModal` now fires both events fire-and-forget. GET-side action allowlist aligned with export-csv. v1.5.7.0. 548/548 tests. |
| 49 | Decision Report bearer auth | ✅ Complete | � Merged | #42 | `main` | `/api/v1/decisions/report` switched from cookie-only to `requireWorkspaceAuth`. Bearer responses skip the inline auto-print `<script>`; cookie sessions keep it. Plan gate stays workspace-scoped. Rate-limit bucket keyed by `rateLimitId`. OpenAPI entry added. v1.5.8.0. 556/556 tests. |
| 50 | Audit Log Diff Viewer | ✅ Complete | � Merged | #43, #47 | `main` | Producer (`node.update`) emits `previous` + `next` snapshots of changed fields. Reader (`summarizeAuditMetadata`) renders `title: "Old" → "New"` per field, with `(+N more)` overflow, 40-char truncation, em-dash for nulls, placeholders for non-primitives. Backwards compatible. v1.5.8.0. 556/556 tests. |
| 51 | Decision audit producers | ✅ Complete | � Merged | #50 | `main` | Decision PATCH and DELETE now emit audit rows. PATCH snapshots `previous` + `next` for resolution/rationale/status/outcome/outcomeNotes/outcomeConfidence/tags. DELETE snapshots `question`. Reader for `*.delete` learns to read the snapshotted question/title. v1.5.9.0. 561/561 tests. |
| 52 | Resource-scoped audit timeline | ✅ Complete | 🟢 Merged | #43 | `main` | `?resourceType=&resourceId=` parameter pair on GET `/audit-log` scopes the response to a single resource's history. Both keys required (either alone is dropped). resourceType allowlisted to node/decision/workspace/api_key/member. OpenAPI documents the pair. v1.5.9.0. 561/561 tests. |
| 53 | Resource filter UI | ✅ Complete | 🟡 In review | #52 | `feature/53-54-edge-audits-and-resource-filter-ui` | Audit-log page surfaces the resource filter as a pill with Clear button; row resource ids are click-to-filter. Composes with action + range + load-more. `edge` added to allowlist. v1.5.10.0. 562/562 tests. |
| 54 | Edge audit producers | ✅ Complete | 🟡 In review | #43 | `feature/53-54-edge-audits-and-resource-filter-ui` | `POST/DELETE /api/v1/edges` now emit `edge.create` and `edge.delete` audit rows snapshotting workflow/source/target ids. New `AuditAction` members threaded through formatter, OpenAPI, page allowlist, and client dropdown. v1.5.10.0. 562/562 tests. |

**Phase 3 Total**: 17 features

---

### Phase 4 — Expand

> Growth and network effects.

| # | Feature | Design | Dev Status | Depends On | Branch | Notes |
|---|---|---|---|---|---|---|
| 35 | Public Shared Canvas | ✅ Complete | 🟢 Merged | #05, #34 | `main` | `share_token` + read-only viewer at `/shared/[token]` (v1.3.9.0) |

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
| Deployment ready | ✅ Live on Vercel → https://lazynext.com (v1.3.1.1) |

### Growth / v2.0

**Target**: When Phase 2-4 features are complete
**Features Included**: All 38 features

| Criterion | Status |
|---|---|
| All 38 features built | ✅ Complete |
| All features on feature branch | ✅ `main` |
| Merge to main | ✅ All merged |
| Test coverage | ✅ 78 E2E + 53 unit |
| Deployment | ✅ Live on Vercel → https://lazynext.com (v1.3.1.1) |

---

## Backlog

| Feature Idea | Priority | Notes |
|---|---|---|
| ~~API for external integrations~~ | ~~Medium~~ | **Promoted to feature #40 on 2026-04-28** |
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
| 2026-04-26 | Header milestone synced v1.1.0.1 → v1.3.0.5 | Roadmap had drifted behind v1.2 + v1.3 ships (pricing, billing fixes) |
| 2026-04-27 | Header synced to v1.3.5.0 + dropped Notification Center, Settings→Notifications tab, and Audit Log from *Remaining work* | Three more features moved from honest empty state to fully wired |
| 2026-04-28 | Header synced to v1.3.28.1; Import modal + Integrations Disconnect noted as shipped; pricing/comparison pages corrected to list Automation engine + Templates as live | Three ships landed back-to-back without doc updates |
| 2026-04-28 | Promoted backlog item **Public REST API for external integrations** to numbered feature **#40 — Public REST API & SDK (formalization)** in Phase 3 | Strategic enabler for OAuth adapters (#15/#31), AI workflow generation, and PDF export. Engineering already exists; work is product packaging. Discussion doc drafted at `docs/features/40-public-rest-api/discussion.md`. |

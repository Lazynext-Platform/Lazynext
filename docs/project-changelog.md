# 📋 Project Changelog

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-04-26

---

## [1.3.0.6] — CSP unblocks Sentry replay's blob: worker on every page (2026-04-26)

Live `/qa` dogfood across 17 public routes (`/`, `/pricing`, `/sign-in`, `/sign-up`, `/about`, `/features`, `/blog`, `/changelog`, `/comparison`, `/contact`, `/privacy`, `/terms`, `/docs`, `/careers`, `/sitemap.xml`, `/robots.txt`, `/d/[slug]`) found the same console error firing on every page: `Refused to create a worker from 'blob:...' because it violates the following Content Security Policy directive: script-src 'self' 'unsafe-inline'. Note that 'worker-src' was not explicitly set, so 'script-src' is used as a fallback.` Sentry session replay (`replayIntegration` in `sentry.client.config.ts`, `replaysOnErrorSampleRate: 1.0`) bundles its compression as a `blob:` Web Worker. Without an explicit `worker-src`, browsers fall back to `script-src` — which had no `blob:` — and refuse to spawn the worker, so every error replay capture silently failed. Added explicit `worker-src 'self' blob:` and `blob:` to `script-src`. New regression test `tests/unit/csp.regression-001.test.ts` (4 assertions) locks in the directive. Type-check clean, build clean, **143/143** tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1306---2026-04-26).

---

## [1.3.0.5] — Surface real workspace-resolve failure reason (2026-04-24)

v1.3.0.4 added a self-healing inline fetch but production still showed the generic “No workspace selected” toast — meaning the API was actually returning non-200 and we couldn’t tell why. `resolveWorkspaceId()` now returns `{ok, reason, status}` and `UpgradeModal`’s click handler maps each reason to a specific toast (403 → “not a member”, 404 → “workspace not found”, 401 → “session expired”). 139/139 tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1305---2026-04-24).

---

## [1.3.0.4] — Self-heal workspace ID on click (2026-04-24)

Killed the race where an impatient click could beat the v1.3.0.3 layout-mount hydrator and still fire “No workspace selected.” `handleChoose()` now calls `resolveWorkspaceId()` which prefers the Zustand store but falls back to `useParams().slug` + an inline `GET /api/v1/workspace/[slug]`, then primes the store on success. Error toast only fires when both paths legitimately fail. 139/139 tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1304---2026-04-24).

---

## [1.3.0.3] — Hydrate workspace store at layout mount (2026-04-24)

Fixed the production bug where `UpgradeModal` guarded on `workspace?.id` from an empty Zustand store — `setWorkspace` was only called in tests, never in production. Clicking *Choose Team* fired four “No workspace selected” toasts and blocked checkout entirely. Added `GET /api/v1/workspace/[slug]` (auth + membership-scoped, dev-fallback) and a `WorkspaceHydrator` client component mounted in the workspace layout alongside `WmsHydrator`. Also silently fixes `WorkspaceSelector` showing a literal “Workspace” fallback. Realigned `VERSION` (was drifting at 1.1.0.0). 139/139 tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1303---2026-04-24).

---

## [1.3.0.2] — Align deploy docs to v1.3’s 4-product Gumroad setup (2026-04-23)

v1.3 only shows two paid tiers (Team + Business). `DEPLOY.md` and `README.md` still told founders to create six Gumroad products across three tiers, which would over-provision two dead `BUSINESS_*` URLs. Realigned both docs (`FOUNDER-SETUP-WALKTHROUGH.md` already had it right) and dropped the stale “v1.0.0.1” preamble stamp from `DEPLOY.md`. Docs + version bump only — no code changes.

See [CHANGELOG.md](../CHANGELOG.md#1302---2026-04-23).

---

## [1.3.0.1] — Align internal trial duration 14 → 30 days (2026-04-23)

Gumroad’s membership trial selector only offers “one week” or “one month” — no 14-day preset. Picking “one month” means subscribers see 30 days at checkout, which conflicted with the internal `TRIAL_DAYS = 14` driving the Inngest downgrade cron. Aligned to **30 days everywhere**: `lib/utils/constants.ts`, all customer-facing copy (pricing CTAs, FAQ, hero subhead, `FeatureGate` paywall, platform-walkthrough), test expectations, Inngest cron comments, billing-architecture doc, founder walkthrough, Feature 22 design artifacts, Feature 02 mockup FAQ (also fixed stale “Pro trial” → “Business trial”), Business Model Canvas (4 mentions), and Blueprint V9 §71. Untouched: blueprint inactivity-timer / onboarding-mode lines (different concept), historical v1.1/v1.2 changelog entries (audit trail), existing `workspace.trial_ends_at` timestamps (forward-only). Lint clean, type-check clean, 139/139 tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1301---2026-04-23).

---

## [1.3.0.0] — Pricing to blueprint sweet spot + Enterprise unblocked (2026-04-22)

Team $15 → **$19/seat/mo** monthly, $12 → **$15/seat/mo** annual ($180/yr). Business holds at $30 (blueprint Section 41 flags $39 as losing the Founder ICP; $30 is the overlap where Drowning-Founder ceiling meets Ops-PM floor). Enterprise anchor changes from "From $49/seat · 15-seat minimum" to **"Custom pricing — contact sales"** — the 15-seat floor was turning away real 10-14 seat prospects. v1.2 subscribers grandfathered at $15/$30 for life at the Gumroad subscription layer.

Explicitly deferred to separate ships: Solo tier (needs `plan_enum` migration + 2 Gumroad products + checkout schema), India PPP (needs Razorpay or dual-provider mess).

See [CHANGELOG.md](../CHANGELOG.md#1300---2026-04-22).

---

## [1.2.0.0] — Decision Health to Team + parity pricing + Founding Member lock-in (2026-04-20)

Moved Decision Health Dashboard (hero feature) down from Business to Team so the entry tier isn't gutted. Team pricing $12 → **$15/seat/mo** monthly, $10 → **$12** annual; Business $24 → **$30** / $20 → **$24**. Added Founding Member promotion: first 100 paying workspaces grandfather-lock whatever list price is live when they subscribe. `/api/v1/billing/founding-member` returns live remaining count; `<FoundingMemberBanner />` on the pricing page surfaces it.

See [CHANGELOG.md](../CHANGELOG.md#1200---2026-04-20).

---

## [1.1.0.0] — Gumroad billing migration + per-seat pricing (2026-04-20)

Shipped on `feature/billing-gumroad-migration` — 9 commits, 48+ files, +~1,900/−2,690.

**Billing provider swap.** Full Lemon Squeezy → Gumroad rip-and-replace. New `/api/v1/webhooks/gumroad/[secret]` route with URL-secret auth (timing-safe), handles every Gumroad resource (sale, subscription_updated/_ended/_cancelled/_restarted, refunded, dispute). Schema migration `20260420000001_gumroad_migration.sql` renames `ls_* → gr_*` on `workspaces`. Portal URL derived as `app.gumroad.com/subscriptions/<id>/manage`. `@lemonsqueezy/lemonsqueezy.js` removed (−57 transitive packages). CSP updated. All marketing copy swapped.

**Per-seat pricing (v1.1 launch prices, since superseded).** Launched as display names Team ($12/$10 per seat), Business ($24/$20 per seat), Enterprise (custom/sales-led). Paid tiers all unlimited members/nodes/workflows; AI queries soft-cap (10 → 100 → 500 → unlimited per seat/day). Slug → display mapping preserved — no enum migration required. These prices were bumped in v1.2 and again in v1.3 — see entries above.

**14-day Business trial + auto-downgrade.** `handleTrialExpiryScan` Inngest cron (02:00 UTC daily) downgrades unpaid expired trials to free.

**Founding Member promotion.** First 100 paying workspaces get 30% off for life. Live counter API (`/api/v1/billing/founding-member`, 5-min cache) + `<FoundingMemberBanner />` on the pricing page showing remaining spots.

**End-to-end upgrade funnel.** Rewritten `UpgradeModal` posts to `/api/v1/billing/checkout` and redirects to Gumroad. Seven variants with contextual copy. Enterprise routes to `/contact?topic=enterprise`. New global trigger store — `useUpgradeModal.getState().show('health-gate')` works from anywhere.

**Paywall on gated pages.** New `<FeatureGate>` wrapper applied to Decision Health, Automations, and PULSE — renders children when plan unlocks, else a lock card with "Upgrade to <Tier>" CTA.

**Test coverage.** +14 integration tests (`tests/integration/gumroad-webhook.test.ts`) covering every webhook code path. Suite 119 → 133.

**Docs.** New `docs/references/billing-architecture.md` (311 lines) — single source of truth. `docs/releases/PR-gumroad-migration.md` has the merge checklist.

See [CHANGELOG.md](../CHANGELOG.md#unreleased) for the full file-by-file breakdown.

---

## [1.0.0.1] — 2026-04-18

Hardening follow-up. Structured observability on `scoreDecision` + Playwright E2E suite for `/d/[slug]`. See [CHANGELOG.md](../CHANGELOG.md#1001---2026-04-18) for full details.

## [1.0.0.0] — 2026-04-18

**Decision Intelligence Platform** launch. 4-dimension AI decision scorer, public `/d/[slug]` pages with OG + ISR, Workspace Maturity Score progressive exposure (L1–L4), outcome reminder Inngest loop, schema migration `00002_decision_intelligence_spine.sql`, global `Cmd+Shift+D`. Fixes ISSUE-001 (`/signup` → `/sign-up` link audit), ISSUE-002 (scorer silently fell back on fenced JSON), ISSUE-003 (placeholder env DNS hang). See [CHANGELOG.md](../CHANGELOG.md#1000---2026-04-18) and [docs/releases/v1.0.0.0.md](releases/v1.0.0.0.md).

---

## [Unreleased]

<!-- Features merged to main but not yet released/deployed. All v1.0–v1.3 work has shipped; the items below are kept as the historical pre-v1.0 build log. -->

### Added (pre-v1.0 build log — archival)

- **Page-Specific Skeleton Screens (2026-04-15)** — Created `components/ui/Skeleton.tsx` with 12 reusable skeleton primitives (Skeleton, SkeletonCircle, SkeletonText, SkeletonCard, SkeletonStat, SkeletonTableRow, SkeletonButton, SkeletonTabs, SkeletonHeader, SkeletonSearch, SkeletonLight, SkeletonLightCard). Added shimmer animation keyframe to tailwind.config.ts. Replaced all 22 loading.tsx files with page-specific responsive layouts matching each page's actual structure. All skeletons are mobile-first (sm/md/lg/xl breakpoints) and use `motion-safe:animate-shimmer` for prefers-reduced-motion compliance.

- **ARIA Landmarks & Skip Navigation (2026-04-15)** — Added "Skip to main content" links to app, marketing, and auth layouts. Added `id="main-content"` to all `<main>` elements (8 pages). Added `aria-label` to nav, aside, and footer landmarks. Fixed heading hierarchy on auth pages (h2→h1 for primary headings, h1→h2 for decorative brand panel). Added `autoComplete` attributes to all auth form inputs (`email`, `current-password`, `new-password`, `name`). Added `<noscript>` fallback message to root layout.

- **Form Accessibility Hardening (2026-04-15)** — Added `htmlFor`/`id` pairs to all labeled form inputs (settings, profile, export, members, templates), `aria-label` to standalone inputs (search bars, sort selects, toggle checkboxes, automation builder fields, task list checkboxes), and `aria-label` to icon-only buttons (close dialogs, pagination, delete actions, dismiss banners) across 8 page files.

- **Modal Focus Trap & Scroll Lock (2026-04-15)** — Created `useModalA11y` hook providing focus trap (Tab/Shift+Tab cycling within modal) and body scroll lock. Applied to all 6 modals: OutcomeReviewModal, UpgradeModal, ImportModal, KeyboardShortcutsModal, CommandPalette, GuidedTour. Added missing `role="dialog"` and `aria-modal="true"` to OutcomeReviewModal and GuidedTour. Hook accepts `enabled` flag for conditionally-rendered modals.

- **Page Title Metadata (2026-04-15)** — Added server-component `layout.tsx` with metadata exports for all 17 protected pages under `(app)/`. Each page now has a browser tab title via the `%s | Lazynext` template (e.g., "Decisions | Lazynext", "Tasks | Lazynext").

- **Navigation aria-current (2026-04-15)** — Added `aria-current="page"` to active navigation links in Sidebar (main + workspace sections), MobileBottomNav, and MarketingHeader (desktop + mobile). Imported `usePathname` in MarketingHeader for active state detection.

- **Semantic Time Elements (2026-04-15)** — Wrapped all date/time displays in semantic `<time>` elements with ISO 8601 `datetime` attributes across 6 files: DecisionDNASection, ThreadPanel, blog page, changelog page, billing history, activity audit log.

- **OG Image & Print Styles (2026-04-15)** — Added `og:image` and `twitter:images` to root layout metadata for social sharing previews. Added print-friendly `@media print` styles to globals.css (hide nav/sidebar/fixed elements, white background, show link hrefs).

- **Table Accessibility (2026-04-15)** — Added `scope="col"` to all `<th>` elements and `aria-label` to all `<table>` elements across 8 files (comparison, pricing, billing, automations, activity audit, decisions health, ThreadPanel, TablePanel). Wrapped Sidebar and MobileBottomNav links in `<ul>`/`<li>` for proper list semantics. Added `aria-live="polite"` to toast container and notification content area.

- **Motion-Safe Animations & Form A11y (2026-04-15)** — Replaced `animate-pulse` with `motion-safe:animate-pulse` in CollaborationOverlay, NotificationCenter badge, GuidedTour spotlight, and EmptyStates skeleton (4 components). Added `aria-describedby` linking auth form inputs to error messages in sign-in and sign-up. Added `aria-label` to DecisionQualityBadge (score + rating text) and automation cards (name + status). Added `aria-hidden="true"` to decorative hero SVG.

- **Zustand Selector Optimization & Final Motion-Safe (2026-04-15)** — Converted all Zustand store destructuring to individual selectors across all 3 stores (useCanvasStore in 8 files, useUIStore in 9 files) to prevent unnecessary re-renders. Fixed last 2 `animate-pulse` instances missing `motion-safe:` prefix (EmptyStates DecisionListSkeleton, decisions page success animation). Added `noValidate` to sign-in and sign-up forms for consistent custom validation UX.

- **Deep Polish Pass (2026-04-15)** — 8 commits (63-70) covering:
  - **Timer safety**: Fixed setTimeout leaks in shared canvas, integrations, and decisions modal (useRef + useEffect cleanup). Fixed export page setInterval leak.
  - **Accessibility**: `aria-invalid` on auth form inputs, `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on all 18 progress bars (14 files), `title` attributes on 4 truncated text elements, RTL `dir` attribute for Arabic locale, `enterKeyHint="search"` on 5 search inputs and `enterKeyHint="send"` on chat input.
  - **Performance**: GuidedTour keyboard useEffect dependency array + `useCallback` on `next`/`prev` handlers, `motion-safe:` prefix on all 15 remaining Tailwind animation utility usages (slide-in-right, slide-in-up, scaleIn, fadeIn).
  - **Standards**: Replaced all 14 arbitrary `max-w-[1280px]` with standard Tailwind `max-w-7xl`. Upgraded footer `text-slate-400` → `text-slate-300` for better WCAG AA contrast. Added `maxLength` to all 13 remaining inputs/textareas. Guide page padding consistency (`md:px-8`).

- **Final Polish (2026-04-15)** — 2 commits (71-72) covering:
  - **Performance**: Removed duplicate Inter font import from globals.css (was loaded both via next/font/google in layout.tsx AND via CSS @import — eliminated redundant CDN request and double font download).
  - **Accessibility**: Added `aria-label` on SocialProofBar `<section>` for WCAG landmark naming.
  - **Verification**: Multiple consecutive audits across focus order, link purpose, button/link semantics, referrer policy, empty interactive elements, focus-visible usage, iframe loading, preconnect crossorigin, and Lighthouse-style meta checks — all returned ALL CLEAN.

- **Production Quality Pass (2026-04-13 → 2026-04-14)** — 48 cleanup commits covering:
  - **Security**: Fixed 15 IDOR vulnerabilities, hardened CSP (removed unsafe-eval, added media/object/base-uri/form-action directives), rate limiting on all 19 API routes, webhook HMAC idempotency, open redirect protection, template install access control, export UUID validation, `hasValidDatabaseUrl` guard on billing checkout, shared canvas UUID validation, `poweredByHeader: false`
  - **Accessibility**: WCAG 2.1 AA — heading hierarchy, form labels (htmlFor/id), aria-labels on OAuth/workspace/icon-only buttons, role="alert" on errors, keyboard handlers, password constraints, prefers-reduced-motion for all CSS animations
  - **i18n**: next-intl with 40 locales, 57 currencies, locale-aware pricing, LocaleSwitcher with SSR guard, native guide translations for 8 languages (es/fr/de/ja/ko/zh/hi/ar)
  - **SEO**: sitemap.ts, robots.ts, manifest.json, viewport metadata, OpenGraph/Twitter cards, apple-icon.tsx
  - **Testing**: 95 Vitest unit/integration tests (12 files), 92 Playwright E2E tests (4 files) — all passing
  - **Billing Migration**: Stripe+Razorpay → Lemon Squeezy (global MoR), updated all docs/schema refs
  - **Performance**: Canvas undo history capped at 50, decision search server-side ilike, lazy loading marketing sections via next/dynamic, crypto.randomUUID for toast IDs
  - **Reliability**: Timer cleanup in LazyMindPanel/ImportModal (useRef + cleanup on unmount), SSR guards on Zustand store methods (setCurrency/completeTour), favicon moved from app/ to public/ (was 500-ing)
  - **Feature Completion**: Weekly digest Inngest function now sends emails to workspace members, export handler generates JSON/CSV and stores in DB, AI fallback JSON parsing error handling
  - **Error Handling**: 23 error boundaries (all routes), onboarding workspace creation, Inngest retries (all 6 functions), workspace name maxLength validation
  - **Platform Guide**: Interactive tour (GuidedTour spotlight overlay, 10-step WorkspaceTour), PlatformGuide page with 6 sections, onboarding redirect, sidebar link, cookie-persisted tour state
  - **DX**: Added type-check, test:e2e npm scripts, hardened Playwright config (retries, trace, video)

- **Supabase Auth Migration** — Migrated from Clerk to Supabase Auth (SSR). Added Supabase server/client/middleware helpers, OAuth callback route, updated all API routes and middleware for Supabase session management, replaced `@clerk/nextjs` with `@supabase/ssr`, updated Drizzle config and schema for Supabase PostgreSQL. 81 files changed, all tests passing.

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

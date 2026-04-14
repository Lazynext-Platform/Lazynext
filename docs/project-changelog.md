# 📋 Project Changelog

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-04-15

---

## [Unreleased]

<!-- Features merged to main but not yet released/deployed -->

### Added

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

# Changelog

All notable changes to Lazynext will be documented in this file.

## [Unreleased]

## [1.3.3.0] - 2026-04-26

**Theme:** Demo-data eradication, round 11 — public-marketing surfaces. Two of the three pages a prospect visits before signing up were lying to them. The Comparison page (`/comparison`) claimed Lazynext shipped four features it doesn't: **Real-time collaboration** (`CollaborationOverlay` is rendered today with a hardcoded `collaborators={[]}` — there is no presence channel, no cursor sync, no broadcast layer), **Template marketplace** (the templates page is an honest empty state, no `templates` table exists), **Automation builder** (the automations page is also an empty state), and **Global pricing** (a marketing claim, not a comparable feature). Every row showed a green check for Lazynext regardless of reality. The Marketing Changelog page (`/changelog`) was even more directly stale: a hardcoded `entries` array pinned **v1.0.0.0** with the **"Latest"** ribbon while the actual production version was **v1.3.2.9** — every prospect visiting the page saw a release from over twenty rounds ago marketed as the newest thing. Both fixed honestly.

### Changed

- `app/(marketing)/comparison/page.tsx` — rewrote the comparison table to reflect what actually ships in v1.3.2.9. Added a fourth cell state, `'soon'` (clock icon), distinct from `false` (X) and `'partial'` (dash). Lazynext is marked `'soon'` on Automation builder and Templates (schema/node-types exist, UI/engine ship later) and the Real-time collaboration / Template marketplace / Global pricing rows were removed entirely. Three new rows added that highlight what Lazynext actually does that competitors don't: AI quality scoring, outcome reminder loop, public decision pages (`/d/[slug]`). Each row now carries a one-line "why this matters" caption under the feature name. Footer legend explains the four cell states. Honest-startup note explains what "in development" means and links to the live changelog. Switched indigo → brand lime per `docs/design-system.md`. Converted from a `'use client'` component to a server component (no client interactivity).
- `app/(marketing)/changelog/page.tsx` — converted from a hardcoded `entries` array to a server component that reads the repo's `CHANGELOG.md` at request time (cached for 5 minutes via `export const revalidate = 300`). Includes a small inline-markdown parser for the segments that appear in our entries (`` `code` ``, `**bold**`, `*em*`) — no full markdown library pulled in for a single page. Versions are extracted from `## [version] - date` headings, the `**Theme:**` line is shown as the entry summary, and the first 8 list items per release are shown with type-coded badges (`feat` emerald, `fix` amber, `perf` blue, `note` slate). The `Latest` ribbon now sits on whatever version is genuinely latest in the file. Caps display at the 12 most recent releases with a "view full history" link to GitHub. Switched indigo → brand lime to match the rest of the marketing site. Empty-state fallback if `CHANGELOG.md` is missing.

### Verification

- Type-check clean.
- Lint clean (only pre-existing `@/global-error.tsx` `<img>` warning).
- 143/143 tests passing.
- Production build clean. Both pages now appear in the route map as static (changelog uses ISR via `revalidate`).

## [1.3.2.9] - 2026-04-26

**Theme:** Demo-data eradication, round 10 — Workspace Settings page wired to real backend. Three more dead UI shells caught: (1) the General tab pre-filled `defaultValue="My Workspace"` and `defaultValue="my-workspace"` regardless of the actual workspace, with a "Save changes" button that had no `onClick`; (2) a "Delete workspace" button that also had no `onClick`; (3) a Notifications tab with four toggles (Task assigned / Decision review / Weekly digest / Thread mentions) all rendered in the brand "on" state with `<button>` elements that had no handlers and no persistence layer (no `notification_preferences` table exists). Three more "looks like a real settings page, does nothing" surfaces. All wired up.

### Added
- `app/api/v1/workspace/[slug]/route.ts` — added `PATCH` and `DELETE` handlers. PATCH validates `name` (1–80 chars) and `slug` (lowercase letters/digits/dashes, 1–50 chars), checks owner-or-admin role, ensures the new slug isn't taken by another workspace (returns `SLUG_TAKEN` 409 on collision), and returns the updated workspace. DELETE checks owner-only and cascades through the schema's foreign keys (workspace_members, workflows, nodes, edges, decisions). New shared `resolveWorkspaceForCaller` helper used by both handlers.

### Changed
- `app/(app)/workspace/[slug]/settings/page.tsx` — General tab: name and slug inputs now controlled, hydrated from `useWorkspaceStore` on mount, with auto-slugify on name blur (only if user hasn't customized the slug). "Save changes" button calls the new `PATCH /api/v1/workspace/[slug]`, updates the store on success, redirects to the new URL when the slug changes, surfaces the four expected error codes (`SLUG_TAKEN`, `VALIDATION_ERROR`, `FORBIDDEN`, generic) with human-readable copy, and shows a transient "Saved" confirmation. Slug input has live validation (red helper text below the field). Logo upload area replaced with an honest "Logo uploads ship with the next storage migration" hint instead of a clickable-but-non-functional dashed box. Danger zone: Delete button now opens an inline confirm step ("Yes, delete \"Acme Corp\"" / "Cancel") before calling `DELETE /api/v1/workspace/[slug]`; on success redirects to `/onboarding`. Notifications tab: removed the four fake toggle buttons, replaced with an honest explainer that per-event prefs ship once the `notification_preferences` table lands, plus a list of the four event types showing "on by default" and a `mailto` opt-out for the interim.

### Removed
- The `Palette` lucide-react import (was only used as the dead logo placeholder icon).

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- Manual verification of the new API route: schema validates name/slug, slug-taken collision returns 409, role gate returns 403 for non-owner DELETE.

## [1.3.2.8] - 2026-04-26

**Theme:** Demo-data eradication, round 9 — partial walk-back of round 6's overcorrection. Round 6 (v1.3.2.5) replaced the entire ImportModal with an honest "Import flows are in development" empty state because every connector in the wizard simulated work that wasn't real. After shipping that, a closer audit of `app/api/v1/import/route.ts` revealed that the **CSV path was actually live** — when the API receives `source: 'csv'` with an inline `data` array of `{ title, type, status?, data? }` items, it creates a `workflows` row and inserts each item as a `nodes` row in the workspace. The OAuth-based connectors (Notion API, Linear, Trello, Asana, Notion ZIP) only return a fake `jobId` with `status: 'queued'` and never run, but CSV ingestion is fully functional. Round 6 threw both away. This round restores CSV upload as a real working flow while keeping OAuth connectors honestly tagged `Soon`.

### Changed
- `components/ui/ImportModal.tsx` — added a real CSV upload path. Single-step UI with a brand-prominent "Choose CSV file" button at the top. Selected file is read in the browser, parsed with a minimal RFC 4180-ish parser (handles quoted fields, embedded commas, double-quote escapes, multi-line cells), mapped to the API's expected shape (auto-detects `title`/`name`/`task`/`subject` for the title column, optional `type` column normalized against the 7 valid node types `task / doc / decision / thread / pulse / automation / table`, optional `status` column, all other columns rolled into the per-node `data` field), and POSTed to `/api/v1/import` with `source: 'csv'`. On success, shows the real imported count returned by the API ("Imported 47 nodes"). On error, surfaces the API error message in a red banner. The 5 OAuth connectors (Notion / Notion ZIP / Linear / Trello / Asana) remain visible but visually disabled with `Soon` tags and an amber explainer plus a `mailto` "Vote on which connector ships next" link, so visitors understand the roadmap without being lied to.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- Manual confirmation: a CSV with `title,type,status` columns uploads, hits the API, creates real rows in `workflows` and `nodes`, and the success screen reflects the API's actual returned `imported` count.

## [1.3.2.7] - 2026-04-26

**Theme:** Demo-data eradication, round 8 — the onboarding-flow lie. Every new user signing up for Lazynext landed on a 3-step "Create Workspace" flow whose final step asked them to log their first decision (Question / Resolution / Rationale fields). On submit, the page showed confetti, animated a green circular score badge with a hardcoded **`84`** above `/100`, and declared "Your workspace is ready! Great first decision. Your team is going to love this." Except — the decision was never saved. `handleLogDecision` did exactly four things: `setShowSuccess(true)`, `setShowConfetti(true)`, two `setTimeout` calls for animation. No fetch. No POST. No score calculation. The 84 was a constant. Then "Go to Workspace" finally created the workspace via the real `/api/v1/onboarding/workspace` endpoint and navigated, leaving the user with an empty workspace and a memory of a decision that was never logged. This was the **first impression** of the entire product — the moment a new user formed their belief about what "Decision DNA" actually is. It promised AI scoring of every decision and demonstrated that promise with a literal hardcoded `84`. The default Question field was also pre-filled with "Which database should we use?" — a sample question masquerading as the user's own. All gone. Onboarding now does the real flow end-to-end.

### Changed
- `app/(app)/onboarding/create-workspace/page.tsx` — `handleLogDecision` rewritten to do the actual work in the right order: (1) POST `/api/v1/onboarding/workspace` to create the workspace, capture the returned `id` and `slug`; (2) POST `/api/v1/decisions` with the user's question + resolution + rationale against that real workspace ID, capture the real `quality_score` from the AI scorer in the response; (3) only then transition to the success screen. Score badge now displays the real returned score (rounded), or — if the decision API call failed (e.g., AI keys missing in dev environment) — falls back to a green checkmark with copy "Decision logged. (Quality scoring kicks in once the AI keys are configured.)" instead of fabricating a number. Pre-filled sample question (`'Which database should we use?'`) cleared so the input starts empty. `handleGoToWorkspace` simplified — workspace is already created, it just navigates. Loading spinner now sits on the "Log Decision" button (where the real work happens) instead of on "Go to Workspace" (which is now instantaneous). Error surfacing moved into the form step where the user can correct it.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- The fake `84` constant is gone from `app/(app)/onboarding/create-workspace/page.tsx` (verified by grep).

## [1.3.2.6] - 2026-04-26

**Theme:** Demo-data eradication, round 7 — Export page wired up to do real work. The Export page had a particularly subtle deception: a real, working `GET /api/v1/export?workspaceId=<uuid>` endpoint exists and returns a complete JSON snapshot of the workspace (workflows, nodes, edges, decisions with scores). But the UI never called it. Instead the "Export Full Workspace" button kicked off a `setInterval` that filled a fake progress bar with `Math.random() * 8` increments, transitioned to an "Export Ready!" success card showing a `workspace-export-2026-04-26.json` filename — and then the "Download File" button did nothing. The "Export Decisions" button had no `onClick` handler at all. The API note at the bottom claimed two endpoints existed (`GET /api/v1/export/workspace`, `GET /api/v1/export/decisions`) when in reality only one existed and it had a different path. Worst kind of fake: real backend already shipped, but the UI pretended to fake it.

### Changed
- `app/(app)/workspace/[slug]/export/page.tsx` — full rewrite of the export logic. Both buttons now call `fetch('/api/v1/export?workspaceId=' + workspace.id)`, parse the JSON, build a `Blob`, and trigger a real browser download via a programmatic `<a download>` click. Workspace ID resolved from `useWorkspaceStore` (populated by the layout). Decisions-only export filters the same payload client-side by date range (since no separate `/api/v1/export/decisions` endpoint exists, the UI is honest about that — the API note now reflects reality with one endpoint and a footnote explaining the decisions button is a client-side filter). Removed: fake `setInterval` progress, `Math.random() * 8` increments, the no-op "Download File" success button, the empty-onClick "Export Decisions" button, the misleading CSV/PDF format options the API can&apos;t produce, and the false claim that two distinct API paths exist. Added: real error surfacing (red banner with the API error message), disabled state when workspace hasn&apos;t loaded yet, "Re-export" CTA on success, `lazynext-export-YYYY-MM-DD.json` and `lazynext-decisions-YYYY-MM-DD.json` filenames.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.
- Manual confirmation: clicking "Export Full Workspace" with a real workspace ID hits `/api/v1/export`, downloads a JSON file containing `version`, `exportedAt`, `workspaceId`, `workflows`, `nodes`, `edges`, `decisions`. Decisions filter respects date-range selector.

## [1.3.2.5] - 2026-04-26

**Theme:** Demo-data eradication, round 6 — the most directly misleading flow in the app. The Import Data modal at `/workspace/[slug]/import` opened a 3-step wizard that simulated a complete Notion import end-to-end: a fake "Connect & Start Import" button kicked off a `setInterval` that filled three fake progress bars (Docs / Tasks / Connections) with random math until they all hit 100%, then showed a green checkmark success screen claiming "12 docs, 24 tasks, and 18 connections imported" alongside a fake terminal log: `✓ Connected to Notion workspace · ✓ Importing pages as DOC nodes... · ✓ Importing databases as TASK nodes... · ⚠ Skipped 2 embedded images (not supported) · ✓ Building edge connections...` None of it was real. There is no OAuth handshake, no ingestion endpoint, no schema mapper — clicking "Go to Workflow" in the success screen just closed the modal and the workspace stayed empty. Users who tried to import their data and watched the fake terminal log scroll by were the most directly deceived audience the app had. Replaced with an honest version: the planned connectors are listed (each tagged `Soon`), an amber "Import flows are in development" notice explains the OAuth + mapper + pipeline ship together, and the CTA is now a `mailto:hello@lazynext.com?subject=Import connector priority` link instead of a fake "Connect" button. The fake Step indicator, fake progress bars, fake terminal log, and fake "12 docs, 24 tasks" success screen are all gone.

### Changed
- `components/ui/ImportModal.tsx` — full rewrite. Removed the 3-step wizard with simulated `setInterval` progress, the random-number progress math (`Math.random() * 15`), the fake terminal log with checkmarks, the fake `Q2 Product Sprint` / `Client Onboarding` workflow scope dropdown, and the `12 docs, 24 tasks, 18 connections imported` success copy. New version is a single-step honest preview: roadmap connector list with `Soon` tags + amber "in development" notice + email-us-priorities CTA. ~120 lines of fake-flow code removed.

### Verification
- Type-check clean.
- 143/143 tests passing.
- Production build clean.

## [1.3.2.4] - 2026-04-26

**Theme:** Demo-data eradication, round 5 — landing page social proof. The two highest-conversion sections of the public landing page were both fabricated. **`SocialProofBar`** (mounted directly under the hero) claimed "Trusted by 1,200+ teams across 40+ countries" with six skeleton logo bars meant to imply real customer logos that don't exist. **`TestimonialsSection`** (the "Loved by teams who ship" grid above the CTA) quoted three fictional people — Priya Raghavan (Head of Product, FlowStack), Arjun Krishnamurthy (CTO, NexaBuild), Sara Mehta (Engineering Manager, DevCraft) — with detailed quotes ("we killed 5 subscriptions in one week", "LazyMind is scary good", "Monday planning went from 45 minutes to 12 minutes — we timed it") at companies that don't exist. These weren&apos;t styled as placeholders; they rendered with 5 amber stars and looked indistinguishable from real testimonials. Both gone.

### Removed
- `components/marketing/SocialProofBar.tsx` — deleted. The "1,200+ teams across 40+ countries" claim is not true and never was. When real customer logos exist, a different component (with permission and real attribution) will replace it.
- `components/marketing/TestimonialsSection.tsx` — deleted. Lazynext is early; pretending three named strangers said specific things is the most direct kind of conversion deception. Real customer quotes go here when real customers say them.

### Changed
- `app/(marketing)/page.tsx` — removed the static `SocialProofBar` import + JSX usage and the dynamic `TestimonialsSection` import + JSX usage. Landing flow is now: Hero → Problem → Primitives → DecisionDNA → LazyMind → ConsolidationMap → Pricing → CTA. The product story stands on its own.

### Verification
- Type-check clean.
- Lint clean.
- 143/143 tests passing.
- Production build clean.
- Manual grep across `components/`, `app/`: zero remaining references to `SocialProofBar`, `TestimonialsSection`, or any of the three fictional names.

## [1.3.2.3] - 2026-04-26

**Theme:** Demo-data eradication, round 4. After three rounds clearing 17 surfaces, a fourth sweep caught **the Templates page** (a fully-fake "marketplace" with six made-up templates carrying invented popularity stats — 128 / 89 / 64 / 45 / 32 / 156 stars, 342 / 215 / 156 / 98 / 74 / 489 installs — and an "Install Template" button that flipped a state flag and showed a fake success modal without actually installing anything; there is no `templates` table, no install endpoint, no ratings system), **the public Shared Canvas page at `/shared/[id]`** (every UUID-shaped path rendered the same fake 5-node graph — "Product Roadmap → Choose Database → Implement Auth, Design Review, Build API" — with fake share-modal analytics: "24 total views / 8 unique visitors / 2m avg time"), and **the Blog listing** (linked to four posts but only `launching-lazynext` had a real body in `[slug]/page.tsx`; the other three — `decision-dna`, `graph-native`, `global-first` — 404'd when clicked). All gone.

### Changed
- `app/(app)/workspace/[slug]/templates/page.tsx` — full rewrite as honest "Templates are in development" empty state. Removed all six fake templates, fake star/install counts, fake categories grid, and the entire fake install modal that simulated a success without doing anything. Replaces the page with: a sparkles-icon explainer, a CTA back to the canvas, and a list of planned categories (Engineering / Product / Agency / Operations / Startup) with example template names so visitors understand what&apos;s coming.
- `app/shared/[id]/page.tsx` — full rewrite. Was a client component that ran the UUID regex then unconditionally rendered five hardcoded sample nodes, five hardcoded sample edges, and a Share modal showing `24 / 8 / 2m` fake analytics. Now a server component that renders an honest "Shared canvas not found" page (or "Invalid share link" for non-UUID input) and points users to the working `/d/[slug]` public-decision route. Public *canvas* sharing isn&apos;t a shipped feature — only public decisions are.
- `app/(marketing)/blog/page.tsx` — listing now reflects reality: only `launching-lazynext` is shown (the only post with a real body). When the featured-only branch is the only post, an honest "More posts on the way" placeholder fills the grid slot instead of an empty grid.

### Verification
- Type-check clean.
- Lint clean (only pre-existing `<img>` warnings).
- 143/143 tests passing.
- Production build clean.
- Manual grep: every fake popularity number and the `sampleNodes` / `sampleEdges` constants no longer appear anywhere in `app/`.

## [1.3.2.2] - 2026-04-26

**Theme:** Demo-data eradication, round 3. v1.3.2.0 cleared the five workspace pages and v1.3.2.1 cleared the canvas, notifications, decision-health dashboard, and detail panels. A third sweep found that **the entire Account → Profile page** was hardcoded with "Avas Patel / avas@lazynext.com / Founder & Developer" as the user identity (every user saw Avas's profile regardless of who they were), with three fake browser sessions (`MacBook Air — Chrome — 104.xx.xx.42`, `iPhone 15 — Safari`, `Windows PC — Firefox — 82.xx.xx.88 — London, UK`) and a fake "Side Project" workspace in the workspace switcher. **The Billing page** invented four invoices (`Apr 1 / Mar 1 / Feb 1 / Jan 15`) and four hardcoded usage counts (342 nodes / 47 decisions / 23 LazyMind / 1.2 GB) plus a fake `•••• 4242` Visa card and a fake "Next billing: May 1, 2026" date. **The Integrations page** showed Slack and Notion as connected to every user with active "Disconnect" buttons, plus a fake masked API key (`lnx_sk_••••...`) with copy/regenerate controls behind a non-functional flow. **The Export page** invented three past exports and a hardcoded "Export 47 Decisions" button. All gone. Added `NodeDetailPanelLegacy.tsx` (orphaned dead file with a fake "Priya / Avas / PlanetScale" thread) deleted entirely; replaced with an inline `FallbackPanel` for node types without a dedicated panel.

### Changed
- `app/(app)/workspace/[slug]/profile/page.tsx` + new `app/(app)/workspace/[slug]/profile/ProfileClient.tsx` — full rewrite as a server component. Reads the real Supabase auth user via the new `safeAuthUser()` helper, deriving first/last name from `user_metadata.full_name`, avatar from `user_metadata.avatar_url`, role from `user_metadata.role`, and identity providers from `app_metadata.providers`. Email field is now read-only with "Managed by Supabase Auth" hint. Avatar pulls from real `avatar_url` when present (falls back to derived initials). Workspaces section calls the new `getUserWorkspaces(userId)` helper — clicking a workspace navigates to it. Connected Accounts derives from real Supabase identity providers. Sessions tab honestly states "Per-device session list isn't available — Supabase Auth doesn't expose this; sign out and rotate your password to invalidate every refresh token" instead of fabricating IPs.
- `app/(app)/workspace/[slug]/billing/page.tsx` + new `app/(app)/workspace/[slug]/billing/BillingClient.tsx` — split into server + client. Server fetches real `getBillingUsage` (live counts of nodes/decisions/members from Supabase) and the workspace's actual plan. Plan comparison cards now derive from `PLAN_LIMITS` constants instead of duplicated copy. Current Plan card shows real seat count. Removed entire "Payment Method" card with fake `•••• 4242 Visa` — replaced with a "Payment Method & Invoices" card linking to the Gumroad customer portal (which is where Lazynext billing actually lives). Removed entire "Billing History" table with four fake invoices. Usage card shows three real metrics (nodes, members, decisions) with `∞` rendered for unlimited limits.
- `app/(app)/workspace/[slug]/integrations/page.tsx` — `connectedIntegrations` array emptied (Slack, Notion no longer falsely shown as connected); empty state explains OAuth connectors haven't shipped. "Available" section renamed to "Coming soon" with disabled "Notify me" buttons (was non-functional "Connect" buttons that did nothing). API Access card no longer fabricates a masked key with copy/regenerate; instead an honest "API key issuance ships with the Business plan" message and disabled CTA.
- `app/(app)/workspace/[slug]/export/page.tsx` — `exportHistory` emptied (no exports table in schema); empty state explains server-side persistence is the follow-up. Removed fake "Q2 Product Sprint" + "Client Onboarding" workflow scope options. "Export 47 Decisions" generalized to "Export Decisions". Hardcoded `workspace-export-2026-04-06.json · 2.4 MB` filename now generated dynamically from current date and selected format.
- `components/canvas/panels/NodeDetailPanel.tsx` — removed import of deleted `NodeDetailPanelLegacy`. Inlined a minimal `FallbackPanel` component for node types without a dedicated panel (pulse, automation). Renders the real `node.data.title` instead of fake "Priya / Avas" sample threads.

### Added
- `safeAuthUser()` in `lib/utils/auth.ts` — returns the full Supabase `User` (email, `user_metadata`, `app_metadata`) instead of just the user id. Backs the new server-rendered Profile page.
- `getUserWorkspaces(userId)` in `lib/data/workspace.ts` — joins `workspace_members` with `workspaces` and derives the `isOwner` flag from `workspace.created_by === userId`. Powers the Profile → "Your workspaces" list.
- `getBillingUsage(workspaceId)` in `lib/data/workspace.ts` — three parallel `head:true` COUNT queries against `nodes`, `decisions`, and `workspace_members` for the Billing usage card.

### Removed
- `components/canvas/panels/NodeDetailPanelLegacy.tsx` — orphaned dead file carrying fake "Priya — Why not PlanetScale? / Avas — MySQL syntax + no RLS" sample thread. Confirmed via grep no consumers besides the now-updated `NodeDetailPanel.tsx`.

### Verification
- Type-check clean.
- Lint clean (only pre-existing `<img>` warnings).
- 143/143 tests passing.
- Production build clean.

## [1.3.2.1] - 2026-04-26

**Theme:** Demo-data eradication, round 2. v1.3.2.0 cleared the five workspace pages but a follow-up sweep found seven more surfaces with hardcoded "Avas Patel / Priya Sharma / Raj Kumar / Fix auth redirect bug" fixtures: every empty canvas auto-injected 5 demo nodes, the global notification bell rendered 8 fabricated alerts, the Decisions Health dashboard was 100% fixture-driven with fake leaderboards and fake quality trends, the workspace Settings → Members tab hardcoded "Avas Patel · avas@lazynext.com · Owner", and the canvas detail panels (thread, decision, task) shipped fake conversations, fake comparison tables, fake assignees, and fake subtasks. All gone.

### Changed
- `components/canvas/WorkflowCanvas.tsx` — removed 5 hardcoded `defaultNodes` (Ship onboarding v2, Fix auth redirect bug, Product Requirements Doc, Use Supabase for Auth + DB?, Pricing freemium vs trial?) and 4 demo edges. Empty canvas no longer fabricates work that doesn't exist. Server-side node persistence (`/api/v1/nodes` round-trip) is the follow-up.
- `components/ui/NotificationCenter.tsx` — replaced 8 hardcoded notifications with empty array + "You're all caught up" empty state. The schema has no `notifications` table; building one is a separate feature.
- `app/(app)/workspace/[slug]/decisions/health/page.tsx` — full rewrite as server component that calls the new `getDecisionHealthStats(workspaceId, period)` helper. The dashboard now computes from the real `decisions` table: total/avg quality/outcome-tagged/velocity stat cards with real week-over-week deltas, real quality distribution buckets (high/medium/low/unscored), real outcome donut, real 7-week quality trend (always a stable 7-week window regardless of the selected period filter), real top decision makers grouped by `made_by` with name resolution via `getWorkspaceUsers`, real type breakdown (reversible/irreversible/experimental/unspecified), real tag counts, real stale-untagged list (pending outcome + 30+ days old, links to the actual decision). LazyMind insight is now generated from real signal — surfaces low-quality %, untagged %, or strong-outcome praise based on which threshold trips.
- `app/(app)/workspace/[slug]/settings/page.tsx` — Members tab no longer hardcodes "Avas Patel · avas@lazynext.com · Owner". Replaced with a redirect card to the dedicated `/members` page (which shipped real data in v1.3.2.0).
- `components/canvas/panels/ThreadPanel.tsx` — gutted 5 hardcoded fake messages (including the "Supabase vs PlanetScale vs Firebase" comparison table) and 4 hardcoded mention options. Honest empty state. Made-by date no longer hardcoded "Apr 2, 2026" — only renders when the node carries a real `createdAt`.
- `components/canvas/panels/DecisionDetailPanel.tsx` — gutted 2 hardcoded thread replies and the always-shown "Avas Patel · Apr 2, 2026" Made-by row. Made-by now reads from `node.data.madeByName / madeByInitials / createdAt` and only renders when present.
- `components/canvas/panels/TaskDetailPanel.tsx` — gutted 3 hardcoded assignee options and 3 hardcoded subtasks (Wireframe review / API integration / QA testing). Subtasks now read from `node.data.subtasks` if present.

### Added
- `getDecisionHealthStats(workspaceId, period)` in `lib/data/workspace.ts` — period-aware aggregate over the `decisions` table returning quality buckets, outcome counts, 7-week stable trend window (refetched independently so a `period=7d` filter doesn't truncate the trend), top decision makers, type breakdown, tag counts, and stale-untagged list. Independent previous-period query produces real WoW deltas for the stat cards.

### Verification
- Type-check clean.
- Lint clean (only the 2 pre-existing `<img>` warnings).
- 143/143 tests passing.
- Production build clean.
- Manual grep: every fake fixture name (Avas Patel, Priya Sharma, Priya Shah, Raj Kumar, Rahul Dev, Sana Malik, Meera Joshi, Neha Kapoor, "Fix auth redirect bug") removed from `app/` and `components/canvas/`. The marketing About page retains its founder team listing — that is intentional product copy, not demo data.

## [1.3.2.0] - 2026-04-26

**Theme:** Demo-data eradication. Five core workspace pages — Tasks, Members, Activity, Pulse, Automations — were rendering hardcoded "Avas/Priya/Rahul/Sana" fixtures regardless of who was logged in or which workspace they were viewing. New users saw a populated-looking team that didn't exist. This release rips out every fake array and wires four of the five surfaces directly to live Supabase data with proper empty states. Automations gets an honest "engine in development" placeholder rather than a fake-but-non-functional UI — the build engine itself is a multi-week project that will land in a future release.

### Added
- `lib/data/workspace.ts` — four new server-side data helpers used across the converted pages:
  - `getOrCreateDefaultWorkflow(workspaceId, userId)` — returns a workspace's first workflow, creating a "Main" one if none exists. Required because tasks/docs/decisions live as nodes under a workflow.
  - `getWorkspaceUsers(workspaceId)` — joins `workspace_members` with `auth.users` (via service-role admin client) to return real members with email, name, avatar URL, and computed initials. Replaces every hardcoded member array in the app.
  - `getMemberStats(workspaceId)` — per-member counts of open tasks (`assigned_to`) and decisions logged (`made_by`). Powers the Members directory.
  - `getWorkspaceActivity(workspaceId, limit)` — composes a real activity feed from `decisions`, `nodes`, and `messages` tables (no dedicated `activity_events` table needed). Returns a unified `ActivityEvent[]` sorted by `created_at`.
  - `getPulseStats(workspaceId)` — runs 12 parallel aggregate queries to compute tasks-done-this-week vs last-week, overdue count, decisions per week, avg decision quality per week, active threads per week, daily completion histogram for the last 7 days, and per-member open-task workload.

### Changed
- `app/(app)/workspace/[slug]/tasks/page.tsx` — converted from a `'use client'` component with a hardcoded 10-item fake task array (`"Fix auth redirect bug"`, fake `AP/PS/RD/SM` initials, fake priorities) to a server component that fetches real `nodes` of `type=task` via `getWorkspaceTasks`. Real CRUD: the new `tasks/TasksClient.tsx` provides board + list views, an "Add Task" modal that POSTs to `/api/v1/nodes` (status, assignee from real members, real workflow_id), inline status changes that PATCH the same endpoint with optimistic updates, and a real empty state ("No tasks yet — Add your first task"). Cards now show real assignee initials with email tooltips.
- `app/(app)/workspace/[slug]/members/page.tsx` — converted from `'use client'` with a hardcoded 4-member fake team (`Avas Patel`, `Priya Shah`, `Rahul Dev`, `Sana Malik`) plus 2 fake pending invites to a server component that reads real `workspace_members` joined with `auth.users` via `getWorkspaceUsers` + per-member counts via `getMemberStats`. Owner is correctly identified by `workspace.created_by`. Members are sorted Owner → Admin → Member → Guest, then alpha. Plan/seat-limit logic preserved with the same paywall hook for member-limit gating. The fake-pending-invites section is removed; the invite modal now offers an honest "Email invitations are coming soon" copy + a copy-to-clipboard workspace URL share flow.
- `app/(app)/workspace/[slug]/activity/page.tsx` — converted from a fully fake feed (`feedItems` with `Avas/Rahul/Priya` actors and made-up actions) plus fake audit-log table (`auditRows` with fake IPs `192.168.1.42`, etc.) to a server component that reads `getWorkspaceActivity` and groups events into Today / Yesterday / older buckets. Each event shows the real actor (resolved from workspace members), real resource type (decision, task, doc, thread, message) with the correct node-type color, and real `created_at` timestamps formatted relatively. The Audit Log tab now shows an honest "Detailed audit logs are an Enterprise feature" empty state instead of fake IP-address rows.
- `app/(app)/workspace/[slug]/pulse/page.tsx` — converted from a `'use client'` page with hardcoded `metrics` (`Tasks Done 18/34`, `Overdue 3`, `+12%`), hardcoded `workload` array, hardcoded `burndownData`, hardcoded `activityTimeline`, hardcoded `weekComparison`, and a hardcoded "Rahul is overloaded — redistribute 4 tasks to Sana" LazyMind summary. Now: every metric card pulls from `getPulseStats`. Workload is real per-member open-task counts joined with member names from `getWorkspaceUsers`. The fake sprint burndown chart was replaced with a real "Tasks completed — last 7 days" bar chart (one bar per day, real counts from `nodes.updated_at` where `status=done`). Recent activity uses the same `getWorkspaceActivity` feed. Week-over-Week is a real diff. The LazyMind summary is now generated from the real numbers via a `buildSummary()` function that picks meaningful sentences (e.g. only mentions overload if someone has ≥10 open tasks, only mentions quality delta if it shifted ≥3 points) — no more fixed copy.
- `app/(app)/workspace/[slug]/automations/page.tsx` — converted from a `'use client'` page with hardcoded `sampleAutomations` rules and a fake run-history visualization to a server component that renders an honest empty state. Headline: *"The automations engine is in development."* The rule library below ("Auto-assign new tasks", "Decision reminder", "Weekly digest", "Blocked task alert") is shown as a preview at 80% opacity with a clearly-disabled "Create automation (coming soon)" button. Footer note explicitly states no fake automations or run history are shown. The `FeatureGate` for Pro tier remains in place for when the engine ships.

### Why automations got an empty state instead of full wiring
The schema has no `automations` table — only `automation_runs` which is keyed on `node_id` (treating each automation as a node). Building a real engine requires: a triggers table (event/cron/threshold), an actions table (notify/assign/email/webhook), an executor (probably Inngest, which is already a dep), test coverage for the rule evaluator, and a UI that round-trips state through all of it. That's multi-week work and shipping a fake-but-non-functional UI in the meantime would actively mislead users. The honest empty state is the correct trade.

### Verification
- `npm run type-check` — clean
- `npm run lint` — clean (same 2 pre-existing `<img>` warnings in `app/global-error.tsx` and `app/shared/[id]/page.tsx`)
- `npm test` — **143/143** passing
- `npm run build` — clean
- Manual: every fake hardcoded fixture name (`Avas Patel`, `Priya Shah`, `Rahul Dev`, `Sana Malik`, `Fix auth redirect bug`, `Use Supabase for DB`, `Canvas zoom`, `API Spec v3`) grep'd to zero in `app/`.

## [1.3.1.1] - 2026-04-26

**Theme:** Boomerang QA fix on the v1.3.1.0 rebrand. With the brand color flipped from cobalt to lime, every surface that paired `bg-brand` with `text-white` (which passed AA on cobalt) suddenly failed AA on lime — white on `#BEFF66` doesn't reach 4.5:1 contrast. Found ~60 component-level instances across the codebase plus the entire auth left panel and CTA banner. All swapped to `text-brand-foreground` (`#0A0A0A`, near-black, the WCAG-safe pairing baked into the logo). Two `bg-white text-brand` CTAs (lime-text on white, also fails) were upgraded to `bg-slate-950 text-brand` — black-pill-with-lime-text — mirroring the logo's exact color pair for max recognition. Final logo PNGs were also dropped in at `Lazynext_Logo.png`, `public/logo.png`, `public/logo-dark.png`, `public/logo-transparent.png`, and the sidebar/topbar 24×24 slots were switched from the (now wordmark) PNG to the mark-only `/icon.svg` so they don't render as illegible blobs at icon sizes.

### Fixed
- **WCAG AA contrast on lime surfaces** — 65 files updated. Mechanically swapped `text-white` → `text-brand-foreground` whenever it appeared in the same className as `bg-brand` or `bg-brand-hover`. Touches every primary CTA across marketing, auth, app shell, canvas panels, lazymind chat, billing, settings, profile, decisions, tasks, automations, activity, integrations, templates, members, export, import, guide, pulse, onboarding, and error pages. Functional Tailwind colors (`bg-emerald-500 text-white`, `bg-red-500 text-white`, etc.) intentionally untouched — they're not on lime.
- `components/marketing/PricingSection.tsx` — entire featured tier card (full body bg-brand). Headline + price + period + description + feature list items + Check icon all switched to dark contrast colors. Replaced cobalt `bg-[#3B5AE0]` "Most Popular" pill with `bg-slate-950 text-brand` (black pill, lime text). Featured CTA upgraded from `bg-white text-brand` → `bg-slate-950 text-brand` for max brand pop.
- `components/marketing/CTABanner.tsx` — entire section bg-brand. Headline, body, and CTA all switched to dark-on-lime + black-pill CTA.
- `app/(auth)/layout.tsx` — auth left brand panel (full `bg-gradient-to-br from-brand to-brand-hover` lime gradient). Swapped headline, subheading, feature card titles + descriptions, footer, and feature icon container to dark-on-lime. Replaced legacy `text-blue-100`/`text-blue-200` (cobalt-era secondary text) with `text-brand-foreground/75` and `/60` opacity variants.
- `app/(marketing)/pricing/page.tsx` — standalone /pricing page filled-tier CTA, "Most Popular" pill, and featured tier styling.

### Logo assets
- `Lazynext_Logo.png` (root), `public/logo.png`, `public/logo-dark.png`, `public/logo-transparent.png` — all replaced with the new black-on-lime PNG (236K each).
- `components/layout/Sidebar.tsx`, `components/layout/TopBar.tsx` — at 24×24 px, switched the logo source from `/logo-dark.png` (full wordmark, illegible at icon size) to `/icon.svg` (mark-only — lime square + black geometric mark — designed for icon sizes).

### Verification
- `npm run type-check` clean
- `npm run lint` clean (same 2 pre-existing `<img>` warnings in `app/global-error.tsx` and `app/shared/[id]/page.tsx`)
- `npm test` — **143/143** passing
- `npm run build` — clean, 60+ routes
- 0 instances of `bg-brand text-white` remain in source

## [1.3.1.0] - 2026-04-26

**Theme:** Rebrand to the new black-on-lime logo. Lime (`#BEFF66`) replaces cobalt (`#4F6EF7`) as the primary brand color across the entire platform — Tailwind tokens, CSS custom properties, marketing site, app shell, canvas selection, Decision DNA charts, email templates, PWA manifest, OG image, and apple-icon. Lime is treated as an **accent only** (CTAs, focus rings, link underlines, active states, hero logo card). Full-page lime backgrounds were rejected as unprofessional. Text on lime is always near-black `#0A0A0A` to satisfy WCAG AA contrast — same pairing as the logo mark.

### Changed
- `tailwind.config.ts` `brand` palette → lime (`DEFAULT: #BEFF66`, `hover: #A6E64D`, `light: #E8FFC9`, `lighter: #F4FFE3`) + new `brand.foreground: #0A0A0A` token for text-on-lime.
- `app/globals.css` — CSS custom props (`--color-primary`, `--color-primary-hover`, new `--color-primary-foreground`) and `.gradient-hero`/`.gradient-decision` recipes switched from blue-tinted to lime-tinted.
- `components/marketing/HeroSection.tsx` and `components/marketing/ConsolidationMap.tsx` — connector strokes lime, central "Lazynext" card switched from cobalt-with-white-text to lime-with-near-black-text (mirrors the new logo at the most brand-recognizable spot on the landing page).
- `components/canvas/edges/WorkflowEdge.tsx` — selected edge stroke now lime.
- `app/(app)/onboarding/create-workspace/page.tsx` — confetti palette starts with lime.
- `app/(app)/workspace/[slug]/decisions/health/page.tsx` — Decision DNA quality-trend gradient, line, and current-point all now lime.
- `lib/email/templates/index.tsx` — `BRAND_COLOR` now lime, `BRAND_FOREGROUND` (`#0A0A0A`) added; header/button/footer link colors recalibrated for AA contrast on lime.
- `public/icon.svg` and `app/apple-icon.tsx` — replaced the legacy red "L" mark with the new black geometric mark (quarter-circle + small filled square) on a lime square.
- `app/opengraph-image.tsx` — kept the dark social-preview background but introduced a lime card holding the black mark + "Lazynext" wordmark, so the brand color pops against dark in Twitter/LinkedIn previews.
- `public/manifest.json` `theme_color` → lime so Android Chrome's address bar and task switcher show brand color.
- `tests/e2e/seo-a11y-api.spec.ts` — updated `theme_color` assertion to `#BEFF66`.

### Documentation
- `docs/design-system.md` — palette tables updated; added explicit "Brand lime is an ACCENT, not a background" rule and the WCAG-mandatory `'#0A0A0A` on lime' pairing rule.
- `AGENTS.md` and `README.md` — brand summaries updated to lime + the foreground-pair rule.
- Historical `docs/features/*/design-spec.md` design specs (50 files) intentionally left unchanged. They document v1's visual decisions for posterity per the Mastery framework convention; future re-design work would create new design briefs.

### Logo asset (action item — not blocking deploy)
- `Lazynext_Logo.png` and `public/logo*.png` are still the previous PNGs. User will drop new versions into the repo; no code change needed since the file paths are unchanged.

### Verification
- `npm run type-check` clean
- `npm run lint` clean (same 2 pre-existing `<img>` warnings, no new)
- `npm test` — **143/143** passing
- `npm run build` — clean, all 60+ routes compile

## [1.3.0.6] - 2026-04-26

**Theme:** Stop the CSP from blocking Sentry session replay's blob: Web Worker on every page. Live dogfood (`/qa` → 17 routes) found the same console error fired on every public page: `Refused to create a worker from 'blob:...' because it violates the following Content Security Policy directive: script-src 'self' 'unsafe-inline'. Note that 'worker-src' was not explicitly set, so 'script-src' is used as a fallback.` Sentry replay (`replayIntegration` in `sentry.client.config.ts`) bundles its compression logic as a `blob:` Worker. With `replaysOnErrorSampleRate: 1.0`, every error session was supposed to capture a replay — none of them could.

### Fixed
- `next.config.js` CSP — added explicit `worker-src 'self' blob:` directive (was implicitly falling back to `script-src` which had no `blob:`). Also added `blob:` to `script-src` so libraries that ship code as blob URLs (some xyflow/ReactFlow worker patterns) keep working. Verified across all 17 public routes (`/`, `/pricing`, `/sign-in`, `/sign-up`, `/about`, `/features`, `/blog`, `/changelog`, `/comparison`, `/contact`, `/privacy`, `/terms`, `/docs`, `/careers`, `/sitemap.xml`, `/robots.txt`, `/d/[slug]`).

### Tests
- `tests/unit/csp.regression-001.test.ts` — 4 assertions: `worker-src` directive present, allows `'self'` + `blob:`, `script-src` still allows `blob:`, baseline (default-src/object-src/frame-ancestors/base-uri/form-action) unchanged.

### Verification
- `npm run type-check` clean
- `npm run lint` clean
- `npm test` — **143/143** passing (139 + 4 new regression assertions)
- `npm run build` clean

## [1.3.0.5] - 2026-04-24

**Theme:** Turn the opaque "No workspace selected" toast into a specific, actionable error so we can tell what is actually blocking the Upgrade flow. v1.3.0.4's race-fix didn't resolve the production bug, which means the lookup is legitimately failing — this release tells the user (and us) why.

### Changed
- `components/ui/UpgradeModal.tsx` — `resolveWorkspaceId()` now returns a tagged result (`{ok: true, ...}` or `{ok: false, reason}`). The click handler maps each failure mode to a human-readable toast:
  - `NO_SLUG` → "Open a workspace page first"
  - `UNAUTHORIZED` (401) → "Session expired, refresh and sign in"
  - `FORBIDDEN` (403) → "Not a workspace member — ask an owner to add you"
  - `NOT_FOUND` (404) → "Workspace '{slug}' not found in the database"
  - `NETWORK` → "Could not reach billing service"
  - Fallback → "Workspace lookup failed (REASON · HTTP STATUS)"

Why: the founder tested v1.3.0.4 in prod and still saw the old generic toast. That means the store is cold AND the inline resolve is failing. Without knowing which HTTP status, we can't tell whether the user isn't a member, the slug doesn't exist, or there's an auth issue. Exposing the real reason is the fastest path to the fix.

### Pre-merge checks
- `npm run lint` clean (2 pre-existing warnings untouched)
- `npm run type-check` clean
- `npm test` — 139/139 passing

## [1.3.0.4] - 2026-04-24

**Theme:** Kill the race condition behind "No workspace selected" error toasts in the Upgrade modal. v1.3.0.3 added a layout-mount hydrator, but an impatient click could beat the fetch and still fire the toast. Make the click handler self-healing instead.

Why this mattered: the founder tested v1.3.0.3 in production and still got four stacked error toasts after clicking Choose Team, because the hydrator's `fetch` hadn't resolved yet when the click fired. A layout-mount hydrator is inherently racy for sub-second clicks. The fix moves the resilience into the click handler itself.

### Fixed
- `components/ui/UpgradeModal.tsx` — `handleChoose()` no longer bails on an empty Zustand store. If `workspace?.id` is missing, it falls back to `useParams().slug` from the URL, calls `GET /api/v1/workspace/[slug]` inline to resolve the ID, and primes the store while at it so subsequent clicks are instant. Only returns the "No workspace selected" toast if BOTH the store is empty AND the inline resolve fails (e.g. user is not a member or the slug is gone).

### Added
- Inline `resolveWorkspaceId()` helper in `UpgradeModal.tsx` — store-first, URL-slug-fallback pattern. Also hydrates the store on success so the WorkspaceSelector nameplate and other consumers benefit from the fetch.

### Pre-merge checks
- `npm run lint` clean (2 pre-existing warnings untouched)
- `npm run type-check` clean
- `npm test` — 139/139 passing

## [1.3.0.3] - 2026-04-24

**Theme:** Fix workspace store never hydrating at runtime. Unblocks the Upgrade modal checkout flow so founders (and their customers) can actually click "Choose Team" and reach Gumroad.

Why this mattered: a user clicking Choose Team in the Upgrade modal was hit with four "No workspace selected" error toasts and a dead button. The workspace Zustand store was populated by tests but never by production code, so `UpgradeModal.tsx` bailed on its `workspace?.id` guard every time. This blocked the entire billing test flow on production.

### Fixed
- `components/ui/UpgradeModal.tsx` no longer bails with "No workspace selected" on every click. The workspace store is now hydrated at the layout level on every workspace page.
- Silent pre-existing bug where `WorkspaceSelector.tsx` rendered the string "Workspace" as a fallback instead of the actual workspace name (same root cause: empty store).

### Added
- `app/api/v1/workspace/[slug]/route.ts` — `GET` endpoint that returns `{id, name, slug, plan, logo}` after Clerk auth + `workspace_members` membership check. Dev-mode fallback returns a synthetic workspace when `DATABASE_URL` is a placeholder so local dev still renders end-to-end.
- `components/layout/WorkspaceHydrator.tsx` — client component that fetches the endpoint once on slug change and calls `setWorkspace()` on the Zustand store. Silent fallback on error so downstream surfaces still render their empty-store UI.
- Wired `<WorkspaceHydrator slug={slug} />` into `app/(app)/workspace/[slug]/layout.tsx` alongside the existing `<WmsHydrator>`.

### Pre-merge checks
- `npm run lint` clean (2 pre-existing warnings untouched)
- `npm run type-check` clean
- `npm test` — 139/139 passing

## [1.3.0.2] - 2026-04-23

**Theme:** Clean up stale setup-doc references that still told founders to create 6 Gumroad products across 3 tiers (starter/pro/business). v1.3 only shows 2 tiers on the pricing page — Team and Business — which map to the `STARTER` and `PRO` env-var keys (legacy naming from when the tiers were named that way). Deploy docs are now aligned to the 4-product reality.

Why: a careful founder reading `DEPLOY.md` or `README.md` before the walkthrough would over-provision 2 extra Gumroad products (`BUSINESS_*` env vars) that the v1.3 pricing page never links to. The walkthrough itself (`docs/FOUNDER-SETUP-WALKTHROUGH.md`) was already correct. Aligning the deploy refs to match.

### Changed
- `DEPLOY.md`: prerequisites line now says `4 recurring (subscription) products: team/business × monthly/yearly` instead of 6-across-3-tiers; env var table entry shows `{STARTER,PRO}` not `{STARTER,PRO,BUSINESS}` with a note that `STARTER`=Team, `PRO`=Business (legacy naming). Removed stale `v1.0.0.1` version stamp from the doc preamble.
- `README.md`: env var table entry for Gumroad URL permalinks now says 4, not 6.
- `docs/project-context.md`: same correction in the project reference env-var table.

### Not changed (intentional)
- `lib/billing/plans.ts`: still defines a `business` plan entry with `NEXT_PUBLIC_GUMROAD_BUSINESS_*` fallbacks. That code path is dead in v1.3 messaging (pricing page never links Business to the `business` key — it uses `pro`). Leaving the code shape alone so a future Solo/Enterprise tier can slot in without touching billing plumbing. Dead env vars are harmless if unset.
- `.env.example`: still lists all 6 URL placeholders. It's a template of what can be set, not what must be set.
- `docs/FOUNDER-SETUP-WALKTHROUGH.md`: already correctly lists 4 env vars. No change needed.

### Pre-merge checks
- `npm run lint` clean
- `npm run type-check` clean
- `npm test` all passing

## [1.3.0.1] - 2026-04-23

**Theme:** Align internal 14-day Business trial with the 30-day trial offered on Gumroad-hosted checkout so users see one consistent number everywhere.

Why the change: Gumroad's membership trial selector only offers `one week` or `one month` as presets — no 14-day option. Picking `one month` at the Gumroad level means Gumroad-purchased subscriptions get a 30-day grace period before first charge. The internal `TRIAL_DAYS = 14` that drove the Inngest downgrade cron was now out of sync with what customers saw on the Gumroad checkout page. Keeping two different trial durations created an obvious support-load trap ("your site says 14 days but Gumroad said 30"). Aligning to 30 everywhere is the only sane fix.

Only new workspaces get the longer trial. Existing workspaces keep whatever `trial_ends_at` they were stamped with at creation time, so no retroactive extension or contraction.

### Changed
- `lib/utils/constants.ts`: `TRIAL_DAYS = 14` → `30`. Single source of truth; flows through `UpgradeModal`, `TrialBanner`, workspace-creation stamp of `trial_ends_at`, and the Inngest `handleTrialExpiryScan` cron via its shared constant import.
- `app/(marketing)/pricing/page.tsx`: Team and Business CTA text `Start 14-Day Trial` → `Start 30-Day Trial`; FAQ "Do I need a credit card?" answer now says 30 days; pricing hero subhead now says 30 days.
- `components/marketing/PricingSection.tsx`: both tier CTAs (`Team`, `Business`) updated to `Start 30-Day Trial`.
- `components/ui/FeatureGate.tsx`: paywall footer "14-day Business trial on every paid plan" → "30-day Business trial on every paid plan".
- `docs/platform-walkthrough.html`: Upgrade-Paywall preview "14-day free trial included" → "30-day free trial included".
- `lib/inngest/functions/index.ts`: comment on `handleTrialExpiryScan` updated to say 30-day trial.
- `tests/e2e/interactions.spec.ts`: FAQ assertion regex `/14-day.*trial/i` → `/30-day.*trial/i`.
- `docs/references/billing-architecture.md`: constants snippet and prose reference updated.
- `docs/FOUNDER-SETUP-WALKTHROUGH.md`: Inngest sync section now says 30-day trial expiry cron.
- `docs/features/22-upgrade-paywall-modal/*` (design-spec.md, design-brief.md, mockups/upgrade-paywall-modal.html): all 8 mentions of "14-day" updated to "30-day" across design spec, brief, and HTML mockup.
- `docs/features/02-pricing-page/mockups/pricing-page.html`: FAQ answer now says "30-day Business trial" (also fixed stale "Pro trial" wording to "Business trial" for v1.3 alignment).
- `docs/BUSINESS-MODEL-CANVAS.md`: 4 mentions updated across Customer Relationships, Revenue Streams, Revenue Scenarios ASCII box, and Product-led growth engine summary. Also promoted "Pro trial" naming to "Business trial" to match v1.3 plan naming.
- `LAZYNEXT_COMPLETE_BLUEPRINT_V9.md`: Section 71 row 48 (trial logic build task) updated to "30-day Business trial on workspace creation".

### Not changed (intentional)
- `LAZYNEXT_COMPLETE_BLUEPRINT_V9.md` lines 4461, 6757, 6764: these are about a 14-day **inactivity** timer and a 14-day **onboarding mode** window, not the trial. Different concepts, left alone.
- `CHANGELOG.md` and `docs/project-changelog.md` historical entries for v1.1 (which shipped the original 14-day trial) and v1.2 retained as the historical record. Only forward entries reflect 30.
- Existing workspace `trial_ends_at` timestamps. The change is forward-only; workspaces created before this ship keep their original 14-day window.
- SQL migration files. No schema change, just a constant.

### Pre-merge checks
- `npm run lint` clean
- `npm run type-check` clean
- `npm test` all passing (includes updated `interactions.spec.ts` regex)

### Founder action required
When creating the Gumroad products per `docs/FOUNDER-SETUP-WALKTHROUGH.md`, pick `one month` for the **Offer a free trial** setting on every subscription product. Do NOT pick `one week` — that creates a 7-day trial that won't match the 30-day messaging on lazynext.com.

## [1.3.0.0] - 2026-04-21

**Theme:** Lock in the final pricing strategy. Team moves to the blueprint Section 41 sensitivity-analysis sweet spot. Enterprise drops the seat minimum. Business stays put — the data says $30 is right for both personas.

Version bump is MINOR because list pricing changes user-visible but the data model is untouched. No DB migration, no new Gumroad products required on the Business side.

### Why this, not $9/$19/$39 + Solo + India PPP

The earlier pass recommended $19 Team / $39 Business with a Solo tier and India PPP override. Deep re-read of blueprint V9 Section 41 (pricing sensitivity) surfaced two facts that override that recommendation:

1. **$39 Business loses the Founder ICP.** Section 41 calls this out explicitly. Drowning Founder WTP is $15-25/seat; $39 is too far outside it. The Founder persona then stays on Team forever and never reaches Business even when they need Automation. Holding Business at $30 keeps it inside Ops PM WTP ($30-50) AND within reach of a bigger Founder-led team that has real Automation need.
2. **$15 and $19 produce nearly identical MRR at 500 workspaces** (Section 41 table: $18K vs $19K — 5% delta). The economic case for $19 is weak on MRR and strong on LTV. That makes Team a safe bump. It's not an earth-mover — it's a correction to the blueprint target.

Solo tier and India PPP are both real unlocks, but they need infrastructure we don't want to rush:
- Solo: DB enum migration (`ALTER TYPE plan_enum ADD VALUE 'solo'`), new Gumroad products, checkout schema, upgrade-modal layout for a 4th card
- India PPP: per-seat INR-priced Gumroad products OR Razorpay integration (blueprint Section 51 specifies Razorpay + per-workspace INR — a substantial rework)

Both get their own projects. Shipping them inside this v1.3 bump would destabilize a release whose whole point is "this is the final pricing call."

### Changed
- **Team pricing: $15/seat → $19/seat monthly, $12 → $15/seat annual.** Source: `lib/utils/constants.ts` (`PLAN_PRICING_USD.starter`, `PLAN_PRICING_USD_ANNUAL.starter`). Annual save is now 21% ($19 monthly → $15 annual per-mo = $180/yr, so 21.05% off). New Gumroad product prices: Team Monthly $19, Team Yearly $180. Existing $15/$144 Gumroad products should be deactivated after the switchover; current subscribers at $15 stay at $15 for the life of their subscription via Gumroad-level grandfathering.
- **Business pricing unchanged at $30/seat monthly, $24/seat annual.** Deliberate hold — see reasoning above.
- **Enterprise anchor: "From $49/seat/month · 15-seat minimum" → "Custom pricing — contact sales".** `/pricing` page Enterprise card copy updated. Blueprint has no 15-seat floor anywhere; it was a conservative add during v1.2 pricing that turned away 10-14 seat prospects who'd otherwise be perfect Enterprise fits. `components/ui/UpgradeModal.tsx` and comparison table remain unchanged — they already route Enterprise to `/contact`.
- **Pricing-page metadata description** updated from "Plans from $0 to $49/month" to "Paid plans from $19/seat/month — Enterprise custom." `app/(marketing)/pricing/layout.tsx`.
- **LazyMind marketing demo decision** now shows `D-134: Price point for Team tier → $19/seat · Score 82/100`. Keeps the demo consistent with live pricing (visitors who read the demo and then scroll to the pricing section see matching numbers).
- **Founding Member API route comment** (`app/api/v1/billing/founding-member/route.ts`) clarified: grandfathering happens at the Gumroad subscription layer, not in our DB. Existing v1.2 subscribers at $15/$30 stay there; new v1.3 Founding Members lock at $19/$30. Banner copy ("lock in today's prices for life") needed no change — it works at any list price because "today's prices" = whatever the user sees right now.
- **E2E test** `tests/e2e/interactions.spec.ts` updated to expect $19 (Team) and $30 (Business) on default monthly load, instead of $12/$24 (which were annual prices and weren't visible by default anyway — the old test was passing by coincidence).
- **Docs synced:** `docs/FOUNDER-SETUP-WALKTHROUGH.md` Gumroad product creation table now shows Team $19/$180; `docs/references/billing-architecture.md` plan-model table, constants snippet, and Gumroad setup checklist all reflect $19/$180 for Team and "Custom, no seat minimum" for Enterprise.

### Explicitly deferred (tracked for follow-up PRs)
- **Solo tier ($9/seat/mo, 1 seat).** Needs DB enum migration, 2 new Gumroad products, checkout route update, webhook plan mapping, `UpgradeModal` layout for 4 cards. Decision gate: wait for 90-day conversion data on Free → Team to see if a sub-Team price point is actually needed.
- **India PPP override.** Blueprint Section 51 specifies per-workspace INR pricing via Razorpay (₹499/₹999/₹2,999 tiers). That's a billing-provider integration, not a config flag. Per-seat INR products on Gumroad would work as an interim step but create a messy dual-provider ops story. Scope this as its own v2.0 project paired with the per-workspace pricing rework.
- **Removing the old Gumroad $15/$144 Team products.** Don't delete — they need to stay live for existing $15-subscribed Founding Members. Just unlist them from the public catalog so new buyers only see the $19 version. Non-code task; goes in the Gumroad dashboard.

## [1.2.0.0] - 2026-04-21

**Theme:** Pricing strategy correction before creating Gumroad products. Fix the structural bug where Decision Health (the hero feature) was locked behind the Business tier, bump Team/Business prices to Notion/Linear parity, reframe Founding Member around price-lock-for-life, and anchor Enterprise with a from-price.

Version bump is MINOR because this changes user-visible pricing and feature availability, not the data model. No DB migration.

### Changed
- **Decision Health Dashboard unlocks at Team tier (not Business).** `lib/utils/plan-gates.ts` now lists `'decision-health': ['starter', 'pro', 'business', 'enterprise']`. Locking the hero feature behind Business starved the entry tier of the thing users sign up for. `FeatureGate` on `/workspace/[slug]/decisions/health` now shows "Upgrade to Team" instead of "Upgrade to Business". Upgrade modal's `health-gate` variant copy updated accordingly. Unit test `tests/unit/plan-gates.test.ts` extended with explicit assertions across all four paid tiers.
- **Team pricing: $12/seat → $15/seat monthly, $10 → $12 annual.** Business: $24 → $30 monthly, $20 → $24 annual. Source of truth: `lib/utils/constants.ts` (`PLAN_PRICING_USD`, `PLAN_PRICING_USD_ANNUAL`). Matches Notion ($10) / Linear ($10) entry, charges a premium for the Decision DNA feature set. Gumroad product prices follow: Team Monthly $15, Team Yearly $144 (= $12/mo × 12), Business Monthly $30, Business Yearly $288 (= $24/mo × 12).
- **Annual discount: 17% → 20%.** Math is clean and matches the per-seat-per-month display in the pricing page. Badges and copy updated on `/pricing`, landing `PricingSection`, and `UpgradeModal` toggle.
- **Founding Member reframe: "30% off for life" → "Lock in today's prices for life".** Conceptually stronger: Founding Members aren't buying a discount, they're hedging against future price increases. `components/marketing/FoundingMemberBanner.tsx` + pricing page FAQ rewritten. `FOUNDING_MEMBER_DISCOUNT_PCT` constant removed (no instant percentage to apply). API route comments updated to reflect new semantics.
- **Enterprise tier shows an anchor price.** `/pricing` now displays "From $49/seat/month · 15-seat minimum" under the Custom label. Keeps the tier sales-led but stops Enterprise from looking like a black box. Business ($30) feels cheaper by comparison without needing a price reduction.
- **Landing page `PricingSection.tsx` synced with real tier model.** Previously stuck on the old Free/Pro $9/Business $19 preview. Now imports `PLAN_PRICING_USD` constants so both surfaces always agree.
- **Team tier marketing copy** promotes Decision Health as a Team feature across `/pricing`, landing `PricingSection`, and `UpgradeModal`. Business tier copy re-centered on what it actually uniquely unlocks: Automation, PULSE, Outcome Tracking, Semantic Search, Weekly Digest.
- **LazyMind demo decision updated for consistency:** the marketing-page demo answer now shows "D-134: Price point for Team tier → $15/seat" and "D-141: Annual discount percentage → 20%" to match the live pricing.
- **Founder walkthrough (`docs/FOUNDER-SETUP-WALKTHROUGH.md`) updated** with new Gumroad product prices so the non-technical setup flow produces products at correct final prices on first attempt.
- **Billing architecture reference (`docs/references/billing-architecture.md`)** tables rewritten: plan model prices, feature-gate matrix (Decision Health ticked at Team column), constants snippet, Gumroad setup checklist product prices.

### Explicitly deferred (for a separate PR)
- Solo tier ($8/mo, 1 seat) — expands TAM but requires DB enum migration (`ALTER TYPE plan_enum ADD VALUE 'solo'`), two new Gumroad products, checkout schema addition, and modal layout changes to fit a fourth card. Post-launch decision gated on signup data.
- Trial-card-required — moving from no-card trial to card-required is a conversion/churn tradeoff that needs real trial-conversion data before we change it.

## [1.1.0.1] - 2026-04-20

**Theme:** Deploy configuration + production domain fix.

### Added
- **Deploy Configuration block in `CLAUDE.md`** — captures platform (Vercel), production URL (`https://lazynext.com`), auto-deploy workflow (GitHub integration), merge method, pre-merge hooks, and health-check endpoint. Future `/land-and-deploy` and `/ship` runs read this instead of re-asking.

### Fixed
- **`DEPLOY.md` env var table** — `NEXT_PUBLIC_APP_URL` example corrected from `lazynext.app` to `lazynext.com` (the canonical production domain).

## [1.1.0.0] - 2026-04-20

**Theme:** Gumroad billing migration + per-seat pricing + 14-day trial + end-to-end upgrade funnel.

### Added
- **Per-seat pricing tiers** — Team ($12/$10 per seat), Business ($24/$20 per seat), Enterprise (custom/sales-led). Paid tiers are all unlimited members/nodes/workflows; AI queries remain the soft cap (100 → 500 → unlimited per seat/day). Slug→display mapping: `starter`→Team, `pro`→Business, `business`→Enterprise (DB enum unchanged — no data migration required).
- **14-day Business trial** — `TRIAL_DAYS` constant, `handleTrialExpiryScan` Inngest cron at 02:00 UTC scans for `trial_ends_at < now AND plan != 'free' AND gr_subscription_id IS NULL` and auto-downgrades to free.
- **Founding Member promotion** — first 100 paying workspaces get 30% off for life. New `FOUNDING_MEMBER_CAP` + `FOUNDING_MEMBER_DISCOUNT_PCT` constants, `/api/v1/billing/founding-member` endpoint (5-min ISR cache), live `<FoundingMemberBanner />` on the pricing page that shows remaining spots and auto-hides when closed.
- **End-to-end upgrade funnel** — `components/ui/UpgradeModal.tsx` rewritten to POST `/api/v1/billing/checkout` and redirect to the returned Gumroad URL. Seven modal variants (`node-limit`, `ai-limit`, `member-limit`, `health-gate`, `automation-gate`, `sso-gate`, `full-upgrade`) each render contextual banner copy. Enterprise tier routes to `/contact?topic=enterprise` (no Gumroad product).
- **Global upgrade trigger** — `stores/upgrade-modal.store.ts` + `components/ui/UpgradeModalHost.tsx`. Any gated surface can call `useUpgradeModal.getState().show('health-gate')` without prop-drilling. Host mounted once in the workspace layout.
- **FeatureGate paywall wrapper** (`components/ui/FeatureGate.tsx`) — renders children when `hasFeature(plan, feature)` is true; otherwise a lock card with "Upgrade to <Tier>" CTA wired to the upgrade modal.
- **Three gated pages:** Decision Health Dashboard, Automations, and PULSE now render a paywall card for Free/Team plans. New `pulse` feature key in `plan-gates.ts`.
- **Comprehensive webhook integration tests** (`tests/integration/gumroad-webhook.test.ts`) — 14 tests covering auth (wrong secret/length mismatch/missing env), sale-ping upgrades, all 6 lifecycle events, idempotency (23505 dedupe), and unknown-resource handling. Test count: 119 → 133.
- **Billing architecture reference** (`docs/references/billing-architecture.md`) — 311-line single source of truth: plan model, runtime flow diagrams, webhook resource table, schema, env vars, 10-step Gumroad setup checklist, file map, v1 non-goals.
- **Funnel telemetry** (`lib/utils/telemetry.ts`) — `trackBillingEvent(event, props)` emits structured single-line JSON logs prefixed `BILLING_EVENT`. 13 event names cover the full funnel: `paywall.gate.shown`, `paywall.modal.opened`, `paywall.checkout.clicked|succeeded|errored`, `paywall.contact.clicked`, `webhook.ping.received|duplicate|unauthorized`, `webhook.sale.applied`, `webhook.subscription.cancelled|refunded|disputed|updated`, `cron.trial.expired`. Wired into FeatureGate, UpgradeModal, all five gate triggers, Gumroad webhook, and trial-expiry cron. Dedupe window (10s) prevents click-spam from flooding logs; webhook events bypass dedupe. 6 telemetry tests lock in the JSON shape.
- **Post-purchase welcome email** — `BillingWelcomeEmail` template + `EVENTS.BILLING_WELCOME` + `handleBillingWelcome` Inngest function. Webhook sale handler fires `inngest.send(BILLING_WELCOME)` after the workspace update; handler maps plan slug → display name, looks up workspace slug for deep link, derives Gumroad manage URL from subscription id, sends via Resend. Best-effort (returns `{skipped:true}` silently when Resend isn't configured).
- **All seven upgrade-modal variants live** — every trigger now reachable from real UI:
  - `node-limit` fires from `CanvasToolbar.handleAddNode` + `WorkflowCanvas` right-click when Free hits 100 nodes
  - `ai-limit` fires from `LazyMindPanel.sendMessage` when daily cap reached; LazyMind header pill replaced the hardcoded `34/100 today` with a live session counter that turns amber at the cap
  - `member-limit` fires from the Members-page Invite button when Free hits 3 members
  - `sso-gate` fires from the Settings → Security SSO row (clickable "Unlock" button, replaces the dead grey pill)
  - `health-gate` / `automation-gate` / `full-upgrade` already live via FeatureGate and Sidebar
- **Settings → Billing tab** — real plan display (Team/Business/Enterprise) with tier-specific limits summary, "Upgrade" / "Change plan" CTAs wired to the modal, and (paid plans) an external link to `https://app.gumroad.com/subscriptions` for invoices, payment method, and cancellation.

### Changed
- `lib/utils/plan-gates.ts` — Decision Health, Semantic Search, Weekly Digest, Automation, and Pulse now unlock at `pro` (Business tier) instead of only `business`+. SSO remains `business`+ / `enterprise`.
- `lib/utils/constants.ts` — `PLAN_LIMITS` paid tiers set to unlimited for members/workflows/nodes. New `PLAN_PRICING_USD_ANNUAL` for per-seat annual pricing. `PLAN_PRICING_USD.business` is now `null` (Enterprise is sales-led).
- Pricing page (`app/(marketing)/pricing/page.tsx`) — rewritten tiers/comparison/FAQ for the new model. Enterprise column shows "Custom" + `/contact` CTA. Business column is "Most Popular". Hero copy mentions the 14-day Business trial.
- Sidebar upgrade CTA copy: "Upgrade to Pro" → "Upgrade" (tier-agnostic).
- **Billing provider migrated from Lemon Squeezy to Gumroad.** Full rip-and-replace across every touchpoint:
  - New `/api/v1/webhooks/gumroad/[secret]` route replaces `/api/v1/webhooks/lemonsqueezy`. URL-path-secret authentication (timing-safe compare); Gumroad does not sign pings.
  - Handles `sale`, `subscription_updated`, `subscription_ended`, `subscription_cancelled`, `subscription_restarted`, `refunded`, `dispute` resources.
  - `lib/billing/plans.ts` now stores Gumroad product permalinks (`GUMROAD_*_URL` / `NEXT_PUBLIC_GUMROAD_*_URL`) instead of Lemon Squeezy variant IDs. New `buildCheckoutUrl()` appends `workspace_id`/`user_id`/`plan`/`interval` as URL params so Gumroad echoes them as `url_params[...]` on the ping.
  - `/api/v1/billing/checkout` returns the env-configured Gumroad product URL (no SDK call); `/api/v1/billing/portal` returns `https://app.gumroad.com/subscriptions/<id>/manage`.
  - Schema migration `supabase/migrations/20260420000001_gumroad_migration.sql` renames `workspaces.ls_customer_id → gr_customer_email`, `ls_subscription_id → gr_subscription_id`, `ls_customer_portal_url → gr_subscription_manage_url`. Init SQL updated to emit the new columns on fresh deploys.
  - Removed `@lemonsqueezy/lemonsqueezy.js` dependency (−57 transitive packages after lockfile regen).
  - CSP `connect-src` swapped from `api.lemonsqueezy.com` to `app.gumroad.com` + `api.gumroad.com`.
  - `.env.example`, `DEPLOY.md`, `README.md`, `AGENTS.md`, `docs/project-context.md`, `docs/BUSINESS-MODEL-CANVAS.md`, and marketing copy (`about`, `terms`, `privacy`, `blog`, `HeroSection`, `DecisionDNASection`, `tasks` demo) all updated to say Gumroad.

## [1.0.0.1] - 2026-04-18

Hardening follow-up to 1.0.0.0. Closes QA-flagged gaps without changing product surface.

### Added
- **E2E test suite for `/d/[slug]`** (`tests/e2e/public-decision.spec.ts`) — 4 active tests covering 404 path, response time ceiling (ISSUE-003 regression guard), console-error cleanliness, and navigable 404 pages. 1 skipped test shows the shape to unskip once test Supabase creds are wired up in CI.
- **Structured observability logs** on `scoreDecision` — every call emits a single-line JSON log with `source`, `provider`, `model_version`, `duration_ms`. On fallback, `fallback_cause` distinguishes `no_ai_keys` / `llm_call_failed` / `json_parse_failed` so log aggregators can alert on the exact shape of a regression (ISSUE-002 class).
- 3 new unit tests locking in the log shape so alerting rules stay valid.

### Changed
- `scoreDecision` internals: split the monolithic `try/catch` into distinct AI-call and JSON-parse blocks. Previously both failure modes landed in the same bare `catch {}` with no way to tell them apart in prod.

### Operator note
Pipe `decision_scorer` log lines to your aggregator (Axiom / Datadog / Vercel / etc.) and graph `source:heuristic` by `fallback_cause`. A spike in `json_parse_failed` means Llama is returning unparseable output again — tune the prompt or extend `extractJson()`.

## [1.0.0.0] - 2026-04-18

### Added — Decision Intelligence Platform
- **4-dimension AI decision scorer** (`lib/ai/decision-scorer.ts`) — scores every decision on clarity, data quality, risk awareness, and alternatives considered (0–100 each, equal-weighted). Primary LLM is Groq (llama-3.3-70b-versatile) with Together AI fallback. Falls back to a deterministic heuristic when AI is unavailable or returns unparseable output.
- **Public decision pages** at `/d/[slug]` — opt-in shareable pages with OG metadata, dimension breakdown bars, and 5-minute ISR revalidation. Only decisions with `is_public = true` are exposed.
- **Workspace Maturity Score (WMS)** progressive exposure (`lib/wms.ts`) — sidebar features unlock as workspaces mature: L1 (0 pts) decisions + outcomes only, L2 (15 pts) unlocks tasks + threads, L3 (35 pts) unlocks docs + tables, L4 (60 pts) unlocks canvas + automations + integrations. Power users can override via `power_user_override` flag.
- **WMS API endpoint** (`/api/v1/workspace/[slug]/wms`) with GET (read score + layer) and PATCH (toggle power user override).
- **Outcome reminder loop** — `handleOutcomeReminderScan` Inngest job scans daily for decisions past their `expected_by` date and emails the author. `outcome_reminder_sent_at` stamp prevents daily re-notification storms.
- **Weekly digest rewrite** — `handleWeeklyDigest` now summarizes decisions logged, outcomes recorded, and WMS progression per workspace.
- **Decision logged hook** — `handleDecisionLogged` fires AI scoring on create, stamps `score_breakdown`, `score_rationale`, `score_model_version`, and increments workspace WMS.
- **Schema migration** `00002_decision_intelligence_spine.sql`:
  - `decisions`: `expected_by`, `score_breakdown` (jsonb), `is_public`, `public_slug`, `score_model_version`, `score_rationale`, `outcome_reminder_sent_at`
  - `workspaces`: `wms_score`, `wms_updated_at`, `power_user_override`
  - `nodes`: `decision_id`, `operational_reason` + `nodes_decision_spine_check` constraint
- **`WmsHydrator` component** — hydrates WMS state into the workspace store on app boot without blocking layout.
- **Global `Cmd+Shift+D` shortcut** to log a decision from anywhere (`GlobalLogDecisionShortcut`).
- **20 new unit tests** covering WMS gating thresholds, feature unlocks, power user override, and decision scorer JSON parsing robustness (plain JSON, ```json fences, bare ``` fences, prose-wrapped responses, out-of-range clamping, AI failure fallback, weighted aggregate math).

### Changed
- **Marketing stubs** (`/careers`, `/contact`, `/docs`) now exist as public pages with CTAs pointing at the real `/sign-up` route.
- **Sidebar** filters visible nav items by WMS layer; "Show all N sections" button optimistically flips `power_user_override` without blocking on the network.
- **Placeholder env detection** (`lib/db/client.ts`, `lib/ai/lazymind.ts`) — pattern-matches common placeholder tokens (`your-project`, `your-service-role`, `example.supabase.co`, literal `placeholder`, `your-api-key`). Stock `.env.local` values no longer waste 7+ seconds on doomed DNS lookups; DB-touching routes now return fallbacks in under 250ms.
- **Decision creation API** (`app/api/v1/decisions/route.ts`) stamps AI score on create and increments workspace WMS in the same transaction.
- **Decision quality badge** displays the 4-dim breakdown inline.

### Fixed
- **ISSUE-001**: `/careers`, `/contact`, `/docs`, and `/d/[slug]` all linked to `/signup` (404). Updated 4 link sites to the real `/sign-up` route.
- **ISSUE-002**: Decision scorer silently fell back to heuristic every time Llama wrapped JSON in ```` ```json ... ``` ```` fences. Added `extractJson()` that strips fences and isolates the outermost `{…}` from prose. The "AI scores on 4 dimensions" headline now actually runs on AI.
- **ISSUE-003**: First-run UX hung for ~7.6 seconds on every DB-touching page when `.env.local` held stock placeholder values. Now returns safe fallbacks immediately.

### Migration notes
- Run `supabase db push` (or your equivalent) to apply `00002_decision_intelligence_spine.sql`.
- Existing decisions without `score_breakdown` will still render (badge gracefully degrades to the legacy single-score display).
- New workspaces start at `wms_score = 0` (L1).
- Set `GROQ_API_KEY` in `.env.local` to enable AI scoring; without it, scoring falls back to the heuristic path automatically.

## [0.1.0.0] - 2026-04-16

### Added
- Marketing pages: Privacy Policy, Terms of Service, Contact, Careers, and Documentation
- Official Lazynext logo across all app layouts, sidebar, top bar, error pages, and marketing site
- Development mode auth bypass when Supabase is not configured, so you can explore the UI without a database
- New public routes in middleware for all marketing pages
- Business model canvas documentation

### Changed
- Replaced placeholder logo references with official brand assets (logo-dark.png, logo-transparent.png)
- Relaxed Content Security Policy in development mode to support HMR websocket connections
- Currency formatting now uses narrow currency symbols for cleaner display

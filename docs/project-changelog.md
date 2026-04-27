# 📋 Project Changelog

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-04-27

---

## [1.3.4.0] — First feature off the *Remaining work* list: the bell is real (2026-04-27)

After 17 rounds of demo-data eradication replaced fabricated fixtures with honest empty states, the *Remaining work* table in the roadmap listed 13 features still shipping as UI shells with no backend. This release ships the first one: **Notification Center**. New `notifications` table (Postgres enum, RLS, three policies). New `lib/data/notifications.ts` with `createNotification` / `notifyWorkspaceMembers` / `listNotifications` / `markNotificationRead` / `markAllNotificationsRead` — actor projection hydrated via the admin API so the bell can render real initials, names, and avatars. New API: `GET /api/v1/notifications?workspaceId=…`, `PATCH /api/v1/notifications` for mark-all-read, `PATCH /api/v1/notifications/[id]` for single mark-read. Two real event hooks wired: `POST /api/v1/decisions` fans out a `decision_logged` notification to every workspace member except the actor (with a deep link); `POST /api/v1/nodes` and `PATCH /api/v1/nodes/[id]` insert `task_assigned` when assignedTo parses as a UUID matching a workspace member (the column is free-form `VARCHAR(255)`, so assignment-by-email/name is silently skipped — honest). `NotificationCenter` rewired: fetches real data, polls every 60s, optimistic mark-read, click-through follows the stored deep link, real relative timestamps, Today / Yesterday / Earlier grouping. Self-actions suppressed (no self-notify). Notification failures never block the underlying mutation. Roadmap header synced to v1.3.4.0 with a new *Remaining work* table that drops Notification Center from the list. Type-check clean, **147/147** tests passing (143 existing + 4 new), build clean.

See [CHANGELOG.md](../CHANGELOG.md#1340---2026-04-27).

---

## [1.3.3.6] — Demo-data eradication round 17: two leftover lies (2026-04-26)

Two surfaces still leaked. (1) Pulse Dashboard's bottom card was titled "LazyMind Weekly Summary" with a `Sparkles` brand-icon and cyan gradient — framing it as AI-generated. The text was actually `buildSummary()`, a deterministic helper that concatenates pre-formatted sentences from real stats. Useful, honest data; misleading framing. Renamed to "This week, in one paragraph", swapped icon to `Activity`, dropped the gradient, added a "Computed deterministically … not AI-generated" footnote. (2) `WorkspaceTour` step 3 targeted `[aria-label="Switch workspace"]` — an element that no longer exists since round 15 made `WorkspaceSelector` display-only. The step description also promised a multi-workspace switcher dropdown that doesn't ship. New users got a missing spotlight + a description for a feature they couldn't find. Removed the step. Tour is now 9 steps. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1336---2026-04-26).

---

## [1.3.3.5] — Demo-data eradication round 16: LazyMind AI panel was a setTimeout mock (2026-04-26)

The biggest fake yet. The LazyMind AI panel advertised "Powered by Llama 3.3 70B via Groq" and rendered a staged 4-message conversation with fabricated Q2 Sprint analysis (12 tasks, 5 in progress, 4 decisions, 78/100 health) and a fake Weekly Digest. When users typed real questions, `sendMessage` ran a 1500ms `setTimeout` and returned a hardcoded canned response — the AI was never called. The infrastructure (`lib/ai/lazymind.ts`) was already wired with real Groq+Together fallback for `/api/v1/ai/analyze` and `/api/v1/ai/generate`, but the chat panel had no endpoint to call. Built `app/api/v1/ai/chat/route.ts` (auth, rate limit, zod validation, 503 AI_NOT_CONFIGURED when keys missing), wired the panel to it, dropped the staged demo conversation and structured-response render branches, replaced the dead "Send as email digest" button, and rewrote quick actions to ask real questions about Lazynext rather than promising fake workspace analysis. AI errors now render as amber `role: 'system'` notes instead of masquerading as AI responses. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1335---2026-04-26).

---

## [1.3.3.4] — Demo-data eradication round 15: app-shell sidebar (2026-04-26)

The persistent app shell, continued. Round 14 caught the TopBar; the Sidebar had an identical pattern. A "Workflows" section with three hardcoded entries (**Q2 Product Sprint** marked active, **Client Onboarding**, **Bug Triage**) rendered in every workspace's sidebar regardless of contents — there is no "workflow" primitive in the schema. Below them, a "+ New Workflow" dead button (no `onClick`). In the bottom action stack, the "LazyMind AI" button itself had no `onClick` (the actual toggle only fired from `TopBar`'s `lg:flex` button — so on tablet widths the only LazyMind entry point in the chrome was a dead button). Finally, `WorkspaceSelector` rendered as a `<button>` with a `ChevronDown`, hinting at a multi-workspace switcher dropdown that doesn't exist anywhere in the codebase. Removed the fake workflows section + dead button, wired LazyMind to `toggleLazyMind`, and converted `WorkspaceSelector` to a display-only div. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1334---2026-04-26).

---

## [1.3.3.3] — Demo-data eradication round 14: app-shell topbar (2026-04-26)

The persistent app shell. Every signed-in user, regardless of which workspace they were viewing, saw a `TopBar` with hardcoded text: workspace breadcrumb pinned to **"Acme Corp"** and a workflow sub-segment pinned to **"Q2 Product Sprint"** — there is no "named workflow" primitive in the schema. To the right, three avatar circles labeled **AP / PK / JR** rendered as a "Team members online" presence cluster, identical in spirit to the fake-team fixtures caught on the landing page (round 5) and the about page (round 12) — except this one rendered constantly, on every page, in the chrome that frames the entire authenticated product. Two more shell buttons did nothing: **"New Workflow"** (no `onClick`) and **"Share"** (no `onClick`, no `ShareModal` defined anywhere — verified via grep). Anyone evaluating the product saw a fully-staffed Acme Corp workspace with a working share button — none of which existed. Fixed by reading the real workspace name from `useWorkspaceStore` (already hydrated by `WorkspaceHydrator` at the `(app)` shell layer) and removing the fake presence cluster + dead buttons entirely. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1333---2026-04-26).

---

## [1.3.3.2] — Demo-data eradication round 13: in-app guide + notification center (2026-04-26)

The `/workspace/[slug]/guide` page advertised a six-section walkthrough with two sections that didn't reflect what ships. **Collaboration** listed real-time presence, in-context thread conversations, and @mentions — none of which work today (canvas renders `CollaborationOverlay collaborators={[]}` with no presence channel; the @mentions dropdown was a hardcoded fixture removed in round 2; the thread-node "in-context conversation" panel was replaced with an honest empty state in round 2 because the conversations were fabricated). **Productivity** listed Automations alongside the (real) command palette and (real) keyboard shortcuts — the rule builder/runtime ships in a future release; the page is currently an empty state. Meanwhile `NotificationCenter` rendered a "View all notifications" footer link with no `onClick` and no `/notifications` route to navigate to (verified absent), and a "Mark all read" button that was always visible even when the list was empty (the array is hardcoded `[]` until a `notifications` table ships). Fixed without touching the 40 i18n locale files — orphaned translation keys are harmless. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1332---2026-04-26).

---

## [1.3.3.1] — Demo-data eradication round 12: about / features / pricing honesty pass (2026-04-26)

Three more public-marketing pages telling stories that didn't match the product. **About** rendered a fabricated three-person team — "Avas Patel · Founder & CEO", "Priya Shah · Head of Design", "Rahul Dev · Lead Engineer" — with colored avatars and titles, when Lazynext is currently a one-founder operation. Same fake-social-proof pattern caught on the landing page in round 5 — the invented teammates render alongside the real founder so a prospect can't tell which is real. **Features** described Pulse as "Real-time health metrics" with "burndown charts" (refreshes on page load, no streaming; the burndown chart was replaced with an honest empty state in round 2's pulse refactor) and described Automations with two concrete WHEN/THEN examples even though the page is currently an empty state with no rule builder. **Pricing** sold four features that don't ship: Team plan promised "Import from Notion / Linear / Trello" (only the CSV path is wired); Business plan listed "Automation engine" (empty-state page), "Custom templates" (no `templates` table), and "Data export (JSON / CSV / PDF)" (only JSON works). The comparison table at the bottom repeated the same lies in matrix form. All three pages corrected to match what actually ships in v1.3.3.1. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1331---2026-04-26).

---

## [1.3.3.0] — Demo-data eradication round 11: marketing comparison + changelog (2026-04-26)

The two highest-stakes pages a prospect visits before signing up were both lying. The Comparison page (`/comparison`) showed a green checkmark for Lazynext on **every** row, including features that aren't built: Real-time collaboration (`CollaborationOverlay` is rendered with a hardcoded empty `collaborators={[]}` prop — no presence channel, no cursor sync), Template marketplace (templates page is an empty state, no `templates` table), Automation builder (also an empty state), Global pricing (a marketing claim, not a comparable feature). The Marketing Changelog page (`/changelog`) was even more directly stale: a hardcoded `entries` array pinned **v1.0.0.0** with the **"Latest"** ribbon while the actual production version was **v1.3.2.9** — every prospect saw a release from over twenty rounds ago marketed as the newest thing. Both fixed honestly: comparison page rebuilt with a 4-state cell legend (`shipped` / `partial` / `in development` / `not supported`), three new differentiator rows added (AI quality scoring, outcome reminder loop, public decision pages) with one-line "why this matters" captions, indigo→brand lime per the design system. Marketing changelog converted to a server component that reads the repo's `CHANGELOG.md` at request time (5min ISR), parses the version headings + Theme line + section list items, and renders type-coded badges. The Latest ribbon now sits on whatever version is genuinely latest. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1330---2026-04-26).

---

## [1.3.2.9] — Demo-data eradication round 10: Settings page wired to real workspace API (2026-04-26)

Three more dead UI shells caught on the Settings page. (1) The General tab pre-filled `defaultValue="My Workspace"` and `defaultValue="my-workspace"` regardless of the actual workspace, with a "Save changes" button that had no `onClick`. (2) A "Delete workspace" button that also had no `onClick`. (3) A Notifications tab with four toggles (Task assigned / Decision review / Weekly digest / Thread mentions) all rendered in the brand "on" state with `<button>` elements that had no handlers and no persistence layer (no `notification_preferences` table exists in the schema). All three: the textbook "looks like a real settings page, does nothing" pattern. New `PATCH` and `DELETE` handlers added to `app/api/v1/workspace/[slug]/route.ts` with proper schema validation, role gates, and slug-collision detection. The Settings General tab now hydrates from `useWorkspaceStore`, saves through the real PATCH (with redirect on slug change and human-readable error mapping), and the Danger Zone has a real two-step confirm before calling DELETE. Notifications tab replaced with an honest "per-event toggles ship once the `notification_preferences` table lands" empty state. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1329---2026-04-26).

---

## [1.3.2.8] — Demo-data eradication round 9: ImportModal — restore real CSV (2026-04-26)

A partial walk-back of round 6's overcorrection. Round 6 (v1.3.2.5) replaced the entire ImportModal with an honest "Import flows are in development" empty state because every connector in the wizard simulated work that wasn&apos;t real. After shipping, a closer audit of `app/api/v1/import/route.ts` revealed the **CSV path was actually live** — the API receives `source: 'csv'` with an inline `data` array of `{ title, type, status?, data? }` items, creates a `workflows` row, and inserts each item as a `nodes` row in the workspace. The OAuth-based connectors only return a fake `jobId` with `status: 'queued'` and never run, but CSV ingestion is fully functional. Round 6 threw both away. This round restores CSV upload as a real working flow: file is parsed in the browser with a minimal RFC 4180-ish parser (handles quoted fields, embedded commas, double-quote escapes), mapped to the API&apos;s expected shape (auto-detects `title`/`name`/`task`/`subject` for the title column, optional `type` column normalized against the 7 valid node types, optional `status` column, all other columns rolled into the per-node `data` field), and POSTed to `/api/v1/import` with `source: 'csv'`. On success, shows the real imported count returned by the API. The 5 OAuth connectors remain visible but visually disabled with `Soon` tags — honest about the roadmap. The lesson: round 6&apos;s "delete everything fake" instinct was right, but verify the API surface first; sometimes the backend already works and the frontend was just disconnected. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1328---2026-04-26).

---

## [1.3.2.7] — Demo-data eradication round 8: onboarding fake "84/100" score (2026-04-26)

The onboarding-flow lie. Every new user signing up for Lazynext landed on a 3-step "Create Workspace" flow whose final step asked them to log their first decision (Question / Resolution / Rationale fields). On submit, the page showed confetti, animated a green circular score badge with a hardcoded **`84`** above `/100`, and declared "Your workspace is ready! Great first decision. Your team is going to love this." Except — the decision was never saved. `handleLogDecision` did exactly four things: `setShowSuccess(true)`, `setShowConfetti(true)`, two `setTimeout` calls for animation. No fetch. No POST. No score calculation. The 84 was a constant. Then "Go to Workspace" finally created the workspace via the real `/api/v1/onboarding/workspace` endpoint and navigated, leaving the user with an empty workspace and a memory of a decision that was never logged. The default Question field was also pre-filled with "Which database should we use?" — a sample question masquerading as the user&apos;s own. This was the **first impression** of the entire product — the moment a new user formed their belief about what "Decision DNA" actually is. It promised AI scoring of every decision and demonstrated that promise with a literal hardcoded `84`. Fixed end-to-end: `handleLogDecision` now creates the workspace, then POSTs the decision to `/api/v1/decisions`, then displays the real `quality_score` returned by the AI scorer. If scoring fails (e.g. AI keys missing in dev), a checkmark + honest copy ("Quality scoring kicks in once the AI keys are configured") replaces the score badge instead of fabricating a number. Pre-filled sample question cleared. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1327---2026-04-26).

---

## [1.3.2.6] — Demo-data eradication round 7: Export page wired to real endpoint (2026-04-26)

A subtle deception. A real, working `GET /api/v1/export?workspaceId=<uuid>` endpoint exists and returns a complete JSON snapshot of the workspace (workflows, nodes, edges, decisions with scores, schema version, timestamp). But the UI never called it. The "Export Full Workspace" button kicked off a `setInterval` that filled a fake progress bar with `Math.random() * 8` increments, transitioned to an "Export Ready!" success card showing a `workspace-export-2026-04-26.json` filename — and then the "Download File" button did nothing. The "Export Decisions" button had no `onClick` handler at all. The API note at the bottom claimed two endpoints existed (`GET /api/v1/export/workspace`, `GET /api/v1/export/decisions`) when in reality only one existed at a different path. Fixed end-to-end: both buttons now call the real endpoint, parse the JSON response, build a `Blob`, and trigger an actual browser download via a programmatic `<a download>` click. Workspace ID resolved from `useWorkspaceStore`. Decisions-only export filters the same payload client-side by date range (since no separate decisions endpoint exists, the UI is honest about that). Real error surfacing via red banner. Fake CSV/PDF format options removed (the API only emits JSON). The most satisfying fix in the eradication series — backend was already there, the frontend just had to use it. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1326---2026-04-26).

---

## [1.3.2.5] — Demo-data eradication round 6: ImportModal — the fake Notion import (2026-04-26)

The most directly misleading flow in the entire app. The Import Data modal at `/workspace/[slug]/import` opened a 3-step wizard that simulated a complete Notion import end-to-end. Step 1: choose source. Step 2: review preview mapping (Pages → DOC nodes, etc.). Step 3: a fake "Connect & Start Import" button kicked off `setInterval(..., 200)` that filled three fake progress bars (Docs / Tasks / Connections) using `Math.random() * 15` increments until they all hit 100%, then transitioned to a green checkmark success screen claiming "12 docs, 24 tasks, and 18 connections imported" alongside a fake terminal log: `✓ Connected to Notion workspace · ✓ Importing pages as DOC nodes... · ✓ Importing databases as TASK nodes... · ⚠ Skipped 2 embedded images (not supported) · ✓ Building edge connections...`. None of it was real. There is no OAuth handshake, no ingestion endpoint, no schema mapper. Clicking "Go to Workflow" in the success screen just closed the modal and the workspace stayed empty. Users who tried to import their data and watched the fake terminal log scroll by were the most directly deceived audience the app had. Replaced with an honest version: planned connector list with `Soon` tags, an amber "Import flows are in development" notice explaining the OAuth + mapper + pipeline ship together, and a `mailto:hello@lazynext.com` CTA in place of the fake "Connect" button. Type-check clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1325---2026-04-26).

---

## [1.3.2.4] — Demo-data eradication round 5: landing-page social proof (2026-04-26)

The two highest-conversion sections of the public landing page were both fabricated, and they were rendering to every prospect visiting lazynext.com. **`SocialProofBar`** sat directly under the hero and claimed "Trusted by 1,200+ teams across 40+ countries" with six skeleton logo bars meant to imply real customer logos. **`TestimonialsSection`** rendered the "Loved by teams who ship" grid with three fabricated testimonials — "Priya Raghavan, Head of Product at FlowStack", "Arjun Krishnamurthy, CTO at NexaBuild", "Sara Mehta, Engineering Manager at DevCraft" — quoting them on specific outcomes ("we killed 5 subscriptions in one week", "Monday planning went from 45 minutes to 12 minutes — we timed it") at companies that don&apos;t exist. These weren&apos;t styled as placeholders; they rendered with five amber stars and looked indistinguishable from real testimonials. The most direct kind of conversion deception. Both component files deleted; both removed from `app/(marketing)/page.tsx`. Landing flow is now Hero → Problem → Primitives → DecisionDNA → LazyMind → ConsolidationMap → Pricing → CTA. The product story stands on its own. Real social proof goes back when real customers exist. Type-check clean, lint clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1324---2026-04-26).

---

## [1.3.2.3] — Demo-data eradication round 4: templates, shared canvas, blog (2026-04-26)

After three rounds clearing 17 surfaces (workspace pages, canvas + panels, account-scoped pages), a fourth sweep caught three more demo-data hot spots. **The Templates page** was a fully-fake "marketplace" — six made-up templates with invented popularity stats (128 / 89 / 64 / 45 / 32 / 156 stars; 342 / 215 / 156 / 98 / 74 / 489 installs), categories, search, and a fake "Install Template" button that flipped a state flag and showed a fake success modal without actually creating any nodes. There is no `templates` table, no install endpoint, and no ratings system. **The public `/shared/[id]` page** was a particularly nasty fake: every UUID-shaped path rendered the same hardcoded 5-node graph ("Product Roadmap → Choose Database → Implement Auth, Design Review, Build API") with fake share-modal analytics ("24 total views / 8 unique visitors / 2m avg time"). Anyone hitting the URL — including search engines and link-checkers — got fabricated content. **The marketing Blog listing** linked to four posts but only `launching-lazynext` had a real article body in `[slug]/page.tsx`; the other three (`decision-dna`, `graph-native`, `global-first`) 404'd when clicked. All three surfaces gone: Templates rewritten as an honest "Templates are in development" page with planned categories. `/shared/[id]` is now a server-rendered "Shared canvas not found" page that points users to the working `/d/[slug]` public-decision route. Blog listing now reflects reality with the single real post + an "More posts on the way" placeholder. Type-check clean, lint clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1323---2026-04-26).

---

## [1.3.2.2] — Demo-data eradication round 3: profile, billing, integrations, export, dead legacy panel (2026-04-26)

Round-1 (v1.3.2.0) cleared the five workspace pages, round-2 (v1.3.2.1) cleared the canvas + notifications + decision-health + detail panels. A third sweep found that **the entire Account → Profile page** was hardcoded — every user opened "Account Settings" and saw "Avas Patel · avas@lazynext.com · Founder & Developer", a fake "Side Project" workspace alongside the real one in the workspace switcher, three fake browser sessions with fake IPs (`MacBook Air · 104.xx.xx.42 · San Francisco`, `iPhone 15 · Safari`, `Windows PC · Firefox · 82.xx.xx.88 · London, UK`), and three hardcoded "Connected Accounts" toggles (Google/GitHub/Slack with fake states). **The Billing page** invented four invoices, a `•••• 4242` Visa card, a "Next billing: May 1, 2026" date, and four hardcoded usage counts (342 nodes, 47 decisions, 23 LazyMind queries, 1.2 GB storage) bearing no relationship to the actual workspace. **The Integrations page** showed Slack and Notion as already connected with active "Disconnect" buttons, plus a fake masked API key (`lnx_sk_••••...`) with copy/regenerate controls behind a flow that did nothing. **The Export page** invented three past exports with fake sizes/dates and an "Export 47 Decisions" button hardcoded regardless of the real count. All gone. Profile is now a server component reading the real Supabase user (email, `user_metadata.full_name`, `avatar_url`, `app_metadata.providers`) and a real workspace list via `getUserWorkspaces`. Billing is split into server + client — real plan, real seat count, real `getBillingUsage` counts, and the entire Payment Method + Billing History sections replaced by an honest "Open Gumroad portal" link (since payments actually live there). Integrations shows an honest empty state with disabled "Notify me" buttons on the Coming-soon row. Export gets an empty state and a dynamically-generated filename. Also deleted the orphaned `NodeDetailPanelLegacy.tsx` (carrying yet another fake "Priya / Avas / PlanetScale" thread) and inlined a minimal `FallbackPanel` for node types without a dedicated panel. Three new helpers: `safeAuthUser`, `getUserWorkspaces`, `getBillingUsage`. Type-check clean, lint clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1322---2026-04-26).

---

## [1.3.2.1] — Demo-data eradication round 2: canvas, notifications, decision health, settings, panels (2026-04-26)

Round-1 (v1.3.2.0) cleared the five workspace pages. A follow-up sweep found seven more surfaces with hardcoded "Avas Patel / Priya Sharma / Raj Kumar / Fix auth redirect bug" fixtures that every user saw regardless of which workspace they opened. **The empty canvas auto-injected 5 demo nodes** ("Ship onboarding v2", "Fix auth redirect bug", "Use Supabase for Auth + DB?", etc.) into every fresh session — so new users opened their workspace and instantly saw fabricated work assigned to people who don't exist. **The global notification bell** (visible on every page in the topbar) rendered 8 fake alerts attributed to teammates the user had never invited. **The Decisions Health dashboard** was 100% fixture-driven — fake leaderboards, fake quality trends, fake tag clouds, fake "3 untagged decisions need attention" alerts. **The Settings → Members tab** hardcoded a single "Avas Patel · avas@lazynext.com · Owner" row that displayed even to users who weren't Avas. **The three canvas detail panels** (thread, decision detail, task detail) shipped fake conversations including a full Supabase-vs-PlanetScale-vs-Firebase comparison table, fake "Avas Patel · Apr 2, 2026" Made-by rows on every decision, fake @mention dropdowns, and three fake hardcoded subtasks ("Wireframe review / API integration / QA testing") on every task. All gone. The Decisions Health page is now a server component computing real WoW deltas, real quality buckets, real outcome donut, real 7-week trend (refetched independently so a `period=7d` filter doesn't truncate the trend window), real top decision makers grouped by `made_by` with name resolution via `getWorkspaceUsers`, real type breakdown, real tag counts, and a real stale-untagged list that links to the actual decisions. LazyMind insight is now generated from real signal — surfacing low-quality %, untagged %, or strong-outcome praise based on which threshold trips. The other surfaces show honest empty states until their data hooks land. Type-check clean, lint clean, **143/143** tests passing, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1321---2026-04-26).

---

## [1.3.2.0] — Demo-data eradication: Tasks, Members, Activity, Pulse, Automations on real Supabase (2026-04-26)

Five core workspace pages — Tasks, Members, Activity, Pulse, Automations — were rendering hardcoded "Avas/Priya/Rahul/Sana" fixtures regardless of who was logged in or which workspace they were viewing. Every user saw the same four fake teammates and the same fake "Fix auth redirect bug" task. New users saw a populated-looking team that didn't exist. This release ripped out every fake array and wired four of the five surfaces to live Supabase. Tasks: full CRUD against the `nodes` table with board/list views, an Add Task modal that POSTs to `/api/v1/nodes`, and optimistic status changes via PATCH. Members: real `workspace_members` joined with `auth.users` via service-role admin client, real owner detection via `workspace.created_by`, real per-member task/decision counts, honest invite modal with copy-link share. Activity: real timeline composed from `decisions` + `nodes` + `messages` tables, grouped Today/Yesterday/older; audit log tab honestly shows Enterprise-only empty state instead of fake IP-address rows. Pulse: 12-query parallel aggregate computing tasks-done-this-week vs last-week, overdue, decisions/week, avg quality/week, threads/week, real 7-day completion histogram, and per-member workload — the fake sprint burndown is replaced with a real bar chart of daily completions. Automations gets an honest "engine in development" empty state — building a real engine requires triggers, actions, executor (Inngest), tests, and full UI round-trip; shipping fake-but-non-functional UI in the meantime would mislead users. Five new helpers in `lib/data/workspace.ts`. **143/143** tests passing, type-check clean, lint clean, build clean.

See [CHANGELOG.md](../CHANGELOG.md#1320---2026-04-26).

---

## [1.3.1.1] — WCAG contrast sweep + final logo drop-in (2026-04-26)

Boomerang fix on the v1.3.1.0 rebrand. With brand flipped to lime `#BEFF66`, every surface that paired `bg-brand` with `text-white` (passed AA on cobalt) now failed AA on lime. Found ~60 instances and swept them with a regex transform: `text-white` → `text-brand-foreground` (`#0A0A0A` near-black) wherever it sits in the same className as `bg-brand` / `bg-brand-hover`. Two `bg-white text-brand` CTAs (lime-text on white, also fails AA) upgraded to `bg-slate-950 text-brand` — black-pill-with-lime-text, mirroring the logo's color pair for max brand recognition. Manually rebuilt the entire auth left brand panel (gradient `from-brand to-brand-hover`) replacing legacy cobalt-era `text-blue-100`/`200` with `text-brand-foreground/75` opacity variants. Pricing featured tier (entire card body bg-brand) and CTA banner (entire section bg-brand) fully recolored. Final logo PNGs dropped into `Lazynext_Logo.png` + the three `public/logo*.png` paths; sidebar/topbar 24×24 slots switched from `/logo-dark.png` (full wordmark, illegible at that size) to `/icon.svg` (mark-only). 65 files touched, type-check clean, build clean, **143/143** tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1311---2026-04-26).

---

## [1.3.1.0] — Rebrand to black-on-lime logo identity (2026-04-26)

Cobalt `#4F6EF7` retired. Lime `#BEFF66` is now the primary brand accent across the platform — Tailwind tokens, CSS variables, marketing connectors, the central landing-page "Lazynext" card (now mirrors the logo's lime + black pairing), canvas edge selection, Decision DNA quality-trend chart, email templates, OG image card, apple-icon, favicon SVG, and PWA `theme_color`. Lime is enforced as an **accent only**; full-page lime backgrounds were rejected as unprofessional for a SaaS surface. Text on lime is always near-black `#0A0A0A` (WCAG AA pairing, matches the logo mark). Brand voice and the 7 functional node-type colors are unchanged. New `brand.foreground` Tailwind token added to lock in the contrast pair. Type-check clean, build clean, **143/143** tests passing.

See [CHANGELOG.md](../CHANGELOG.md#1310---2026-04-26).

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

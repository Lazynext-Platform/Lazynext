# LAZYNEXT — Complete Platform Blueprint V9
## The Anti-Software Workflow Platform
### Master Build Document for AI-Assisted Autonomous Development & Deployment

> **INSTRUCTION TO ANY AI READING THIS DOCUMENT:**
> This is a complete, self-contained specification. Every section is mandatory. Read this entire document before writing a single line of code. Every architectural decision, every file path, every schema field, every API endpoint, every environment variable, every deployment step is specified here. You must implement everything exactly as described. Do not improvise. Do not skip sections. Do not use any tool, library, or service not listed here unless explicitly permitted. When this document says "must", it is non-negotiable. When this document says "should", it is strongly preferred. Your goal is to produce a fully working, fully deployed platform at lazynext.com that any human team can immediately use without any further configuration.

> **AI QUICK-START SUMMARY (read this first, then read the full document):**
> This document is ~7,900 lines. The highest-priority sections by role are:
> - **Architecture decisions:** Sections 2, 3, 4, 52 (LLM), 6
> - **Database & API:** Sections 9, 10
> - **Build order (solo):** Section 49 (authoritative solo sprint) → Section 33 (post-MVP expansion)
> - **Pricing & costs:** Section 51 (INR model, break-even) — **all USD figures in Sections 1–46 are superseded by Section 51**
> - **What NOT to build in solo MVP:** Section 54.5 (scope-lock list: THREAD, PULSE, AUTOMATION, TABLE, mobile app)
> - **LLM policy:** Section 52 is authoritative. Section 4's original "no proprietary API" rule was updated in V7.
>
> **V9 CRITICAL NOTES FOR AI BUILDERS:**
> - **Clerk middleware:** Uses `clerkMiddleware()` (NOT the deprecated `authMiddleware`). See Section 8.
> - **React Flow:** Package is `@xyflow/react` v12+ (NOT the old `reactflow` package). See Section 7.
> - **Drizzle Kit:** Uses `dialect: 'postgresql'` (NOT `driver: 'pg'`). Commands are `drizzle-kit generate` and `drizzle-kit push` (no `:pg` suffix). See Section 8.
> - **Next.js version:** 14.x App Router. Stable and tested. Do NOT upgrade to 15.x without full regression testing.
> - **Decisions data model:** The `decisions` table (Section 9) is the canonical store. DECISION nodes in the `nodes` table are canvas representations that reference `decisions.id` via `nodeId`. Do NOT store decision-specific fields in the nodes `data` JSONB — always use the dedicated `decisions` table columns.
> - **Position storage:** Node positions use `positionX` (integer) and `positionY` (integer) columns on the `nodes` table. Never store position as a JSON object.
> - **Section 51 is the single authoritative pricing model.** All USD figures in Sections 1–46 are legacy and superseded.

---

## TABLE OF CONTENTS

1. [Platform Identity & Vision](#1-platform-identity--vision)
2. [Core Concept & Philosophy](#2-core-concept--philosophy)
3. [The Seven Primitives](#3-the-seven-primitives)
4. [Complete Tech Stack](#4-complete-tech-stack)
5. [Open-Source LLM Integration — LazyMind AI](#5-open-source-llm-integration--lazymind-ai)
6. [System Architecture](#6-system-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Backend Architecture](#8-backend-architecture)
9. [Database Schema — Complete Drizzle ORM](#9-database-schema--complete-drizzle-orm)
10. [API Design — All Endpoints](#10-api-design--all-endpoints)
11. [Real-Time & Multiplayer Sync](#11-real-time--multiplayer-sync)
12. [Automations Engine](#12-automations-engine)
13. [Multi-Tenancy Model](#13-multi-tenancy-model)
14. [Security Model](#14-security-model)
15. [Responsive Design System](#15-responsive-design-system)
16. [Deployment & CI/CD](#16-deployment--cicd)
17. [Environment Variables — Complete List](#17-environment-variables--complete-list)
18. [Cost Architecture](#18-cost-architecture)
19. [Monetization & Pricing](#19-monetization--pricing)
20. [Phased Build Roadmap — Realistic MVP-First Approach](#20-phased-build-roadmap--realistic-mvp-first-approach)
21. [Directory & File Structure — Complete Tree](#21-directory--file-structure--complete-tree)
22. [Key Code Implementations](#22-key-code-implementations)
23. [SEO, Accessibility & Performance](#23-seo-accessibility--performance)
24. [Go-to-Market Strategy & Growth Flywheels](#24-go-to-market-strategy--growth-flywheels)
25. [Unit Economics & Financial Model](#25-unit-economics--financial-model)
26. [Post-Launch Checklist](#26-post-launch-checklist)
27. [Testing Strategy — Complete](#27-testing-strategy--complete)
28. [Real-Time Infrastructure — Liveblocks Migration Plan](#28-real-time-infrastructure--liveblocks-migration-plan)
29. [Build Feasibility & Team Sizing](#29-build-feasibility--team-sizing)
30. [API Versioning, Data Export & Compliance](#30-api-versioning-data-export--compliance)
31. [Decision DNA — Full Specification](#31-decision-dna--full-specification)
32. [Competitive Positioning](#32-competitive-positioning)
33. [Week-by-Week Sprint Plan — First 12 Weeks](#33-week-by-week-sprint-plan--first-12-weeks)  ← **NEW in V4**
34. [JSONB Index Strategy & Cross-Primitive Queries](#34-jsonb-index-strategy--cross-primitive-queries)  ← **NEW in V4**
35. [Search Architecture](#35-search-architecture)  ← **NEW in V4**
36. [Churn Model & ARR Scenarios](#36-churn-model--arr-scenarios)  ← **NEW in V4**
37. [Scale Migration Plan](#37-scale-migration-plan)  ← **NEW in V4**
38. [Why Now — The Moment for Lazynext](#38-why-now--the-moment-for-lazynext)  ← **NEW in V5**
39. [Decision DNA Pre-MVP — 3-Week Validation Sprint](#39-decision-dna-pre-mvp--3-week-validation-sprint)  ← **NEW in V5**
40. [Failure Modes & Resilience Patterns](#40-failure-modes--resilience-patterns)  ← **NEW in V5**
41. [WCAG 2.1 AA Accessibility Specification](#41-wcag-21-aa-accessibility-specification)  ← **NEW in V5**
42. [Competitive Feature Parity Matrix](#42-competitive-feature-parity-matrix)  ← **NEW in V5**
43. [Paywall Placement & Expansion Revenue Model](#43-paywall-placement--expansion-revenue-model)  ← **NEW in V5**
44. [Onboarding & Migration Strategy](#44-onboarding--migration-strategy)  ← **NEW in V6**
45. [UX Design Specification](#45-ux-design-specification)  ← **NEW in V6**
46. [Prototype Feedback Loop & Live Validation Data](#46-prototype-feedback-loop--live-validation-data)  ← **NEW in V6**
47. [India-First GTM Strategy — Channel-Level Distribution Plan](#47-india-first-gtm-strategy--channel-level-distribution-plan)  ← **NEW in V7**
48. [Distribution Moat Answer — How LazyNext Wins Without $400M](#48-distribution-moat-answer--how-lazynext-wins-without-400m)  ← **NEW in V7**
49. [Solo Founder Sprint Plan — 10-Week Scope-Locked MVP](#49-solo-founder-sprint-plan--10-week-scope-locked-mvp)  ← **NEW in V7**
50. [Decision DNA Standalone — Single-Primitive Launch Option](#50-decision-dna-standalone--single-primitive-launch-option)  ← **NEW in V7**
51. [INR Pricing Model & Solo Break-Even Analysis](#51-inr-pricing-model--solo-break-even-analysis)  ← **NEW in V7**
52. [LazyMind AI Quality Decision — Final Architecture](#52-lazymind-ai-quality-decision--final-architecture)  ← **NEW in V7**
53. [Data Portability, Rate Limiting & Abuse Prevention](#53-data-portability-rate-limiting--abuse-prevention)  ← **NEW in V7**
54. [Real Validation Data — Minimum Viable Evidence](#54-real-validation-data--minimum-viable-evidence)  ← **NEW in V7**

---

---

## VERSION HISTORY

| Version | Date | Key Changes |
|---|---|---|
| V1 | 2025-Q3 | Initial concept — platform identity, 7 primitives concept, basic tech stack |
| V2 | 2025-Q4 | Added complete database schema, API endpoint reference, Drizzle ORM implementation |
| V3 | 2026-Q1 (Jan) | Added deployment/CI-CD pipeline, environment variables, cost architecture, monetization |
| V4 | 2026-Q1 (Mar) | Added Week-by-Week Sprint Plan (12 weeks), JSONB index strategy, search architecture, churn model, scale migration plan |
| V5 | 2026-04-03 | Added: Why Now analysis, Decision DNA pre-MVP validation sprint, failure modes & resilience patterns, WCAG 2.1 AA spec, competitive feature parity matrix, paywall placement model, user research framework (Appendix C) |
| **V6** | **2026-04-03** | **Added: Onboarding & Migration Strategy (Section 44), UX Design Specification (Section 45), Prototype Feedback Loop (Section 46), Live Validation Data (Appendix D), Competitive Intelligence (Appendix E), Founder Risk & Solo Strategy (Appendix F). Fixed: THREAD primitive priority contradiction. Blueprint score rubric: 950+ = document has real validation data in Appendix D, all contradictions resolved, and all pricing in INR (see Section 46 & 51).** |
| **V7** | **2026-04-03** | **Added: India-First GTM (Section 47), Distribution Moat Answer (Section 48), 10-Week Solo Sprint Plan (Section 49), Decision DNA Standalone option (Section 50), INR Pricing & Solo Break-Even (Section 51), LazyMind AI Final Architecture (Section 52), Data Portability & Rate Limiting (Section 53), Real Validation Data framework (Section 54). Fixed: Section 33 vs Appendix F contradiction resolved — solo sprint plan is now authoritative. LLM policy updated: two-tier model (Groq fast + Claude Haiku quality) is now the final architecture.** |
| **V8** | **2026-04-04** | **Audit fixes: corrected Neon/Liveblocks free tiers, added AbortController timeouts to AI calls, fixed callLazyMind fallback bug, clarified THREAD priority for solo builds, added Upstash scale warning, fixed Vercel cost projection, reordered version history chronologically.** |
| **V9** | **2026-04-04** | **Full audit & rewrite. Fixed: deprecated Clerk authMiddleware → clerkMiddleware. Fixed: old `reactflow` → `@xyflow/react` v12. Fixed: Drizzle Kit config syntax. Resolved: dual decisions data model (decisions table is canonical, nodes table holds canvas reference). Fixed: export route queried by orgId instead of workspaceId. Fixed: DB URL example region ap-southeast-1 → ap-south-1. Fixed: weekly cron 0 3 → 30 3 (9am IST = 3:30am UTC). Added: missing workspace_members table, updated_by column, search/import API routes to endpoint table. Fixed: CSP header missing required domains. Fixed: position storage inconsistency across import code. Removed: two stale V4 footer blocks. Removed: duplicate middleware.ts, client.ts, rate-limit.ts code blocks. Consolidated: Section 19/43 pricing tables now explicitly defer to Section 51. Removed: unused `numeric` import from schema.** |

---


## 1. PLATFORM IDENTITY & VISION

> ⚠️ **PRICING NOTE (V7):** All USD pricing figures in Sections 1–46 (e.g. $15–25/seat/month for Archetype 1, $19/seat/month in replacement savings tables, $30–50/seat for Archetype 2) were written before the India-first pivot and have **not** been updated in-place. **Section 51 is the single authoritative pricing model.** Use the INR tiers (₹0 / ₹499 / ₹999 / ₹2,999/month) and the solo break-even analysis there for all financial, GTM, and cost decisions. USD equivalents ($9.99 / $19.99 / $49.99) are available for international customers via Stripe but are not the primary pricing strategy.

### Brand Identity

- **Platform Name:** Lazynext
- **Domain:** lazynext.com
- **Tagline:** "One platform that replaces every tool your team is already misusing."
- **Sub-tagline:** "Stop switching apps. Start shipping work."
- **Brand Voice:** Direct, confident, anti-corporate, slightly irreverent. Never say "synergy". Never say "leverage" as a verb.
- **Target Users:** Remote-first teams, SaaS companies, agencies, indie hackers, and operators who are drowning in tool-switching overhead.

### The Problem Lazynext Solves

Every team on earth runs their workflow across a graveyard of half-used tools:
- Slack for comms → Notion for docs → Trello for tasks → Airtable for data → Loom for updates → Calendly for meetings → Miro for thinking → Google Drive for everything else.

Nobody talks to anything. Nothing is in one place. The workflow IS the problem.

**Lazynext is the operating system for work.** A single, living workspace where every workflow primitive — task, decision, document, data, communication, approval, automation — exists in one unified graph. Not integrated via Zapier. Not "connected". Natively one.

### The Killer Insight

Workflow is not a feature. Workflow is the operating system of every team. Nobody has built that OS yet. Lazynext does.

### Customer Archetypes & Pain Stories

Understanding these three archetypes is essential to every product, marketing, and pricing decision.

**Archetype 1 — "The Drowning Founder" (Primary ICP)**
- 2–8 person early-stage startup or agency
- Uses: Notion (docs), Linear (tasks), Slack (comms), Loom (async), Google Sheets (data), Figma (design), and 3–5 more tools
- Pain: "I spend 40 minutes per day just figuring out where things are and updating status across 4 apps."
- Decision trigger: A missed deadline caused by a Slack message that never reached the right person in Notion.
- What they say: "I just want one place."
- Willingness to pay: $15–25/seat/month if they can cancel Notion + Linear

**Archetype 2 — "The Ops-Obsessed PM" (Secondary ICP)**
- Product manager at a 10–50 person company
- Runs sprints in Jira, writes specs in Confluence, tracks KPIs in Databox, manages decisions in... their own head
- Pain: "When something goes wrong six months later, nobody remembers why we made the decision. We just repeat the same mistakes."
- Decision trigger: A costly product decision that was made without anyone checking what was decided last time.
- What they say: "I need a decision log. An actual one that people use."
- Willingness to pay: $30–50/seat/month for Decision DNA alone. This is the Business tier upsell.

**Archetype 3 — "The Remote Team Lead" (Growth ICP)**
- Engineering lead or CTO at a 20–100 person remote-first company
- Pain: Status meetings exist only because there is no living dashboard. Every Monday sync could be replaced if the data was already visible.
- Decision trigger: Realizing that 3 hours/week of status meetings per person × 30 people = 90 hours/week of meeting overhead.
- What they say: "I want to kill the Monday standup."
- Willingness to pay: $25–40/seat/month for PULSE that eliminates meeting overhead

### What Lazynext Replaces Per Seat

| Lazynext Module | Replaces | Savings/seat/month |
|---|---|---|
| TASK | Asana, Linear, Trello, Monday | $10–24 |
| DOC | Notion, Confluence | $8–15 |
| TABLE | Airtable, Google Sheets | $10–20 |
| THREAD | Slack (contextual only) | $7–12 |
| DECISION | Nothing — this capability doesn't exist elsewhere yet | — |
| AUTOMATION | Zapier, Make | $20–100/month flat |
| PULSE | Status meetings, Databox | Priceless |
| **TOTAL REPLACED** | | **$55–$171/seat/month** |
| **LAZYNEXT PRICE** | | **$19/seat/month** |

The ROI conversation sells itself.

---

## 2. CORE CONCEPT & PHILOSOPHY

### Unified Graph Model

Everything in Lazynext is a **node** in a graph. Every relationship between things is an **edge**. The entire platform is one queryable, traversable, AI-readable graph. This is not a metaphor — it is the literal database model.

### Design Principles (Non-Negotiable)

| Principle | Meaning |
|---|---|
| **Graph-first** | Every primitive is a node. Every relationship is an edge. The entire platform is a queryable graph. |
| **Real-time native** | Multiplayer collaboration is not a feature — it is the default state of every object. |
| **AI-readable** | The workflow graph is always serializable to JSON and passable directly to any LLM for analysis. |
| **Zero infrastructure ownership** | Every backend service is managed. No servers, no DevOps, no ops team required to launch. |
| **JSONB flexibility** | Each node stores type-specific data in a JSONB column. New node types require zero schema migrations. |
| **Device agnostic** | Every view, every interaction, every feature works equally on mobile, tablet, and desktop. |
| **Cross-browser** | Must work on Chrome, Firefox, Safari, Edge, Opera, Samsung Internet, and all major mobile browsers. |
| **MVP-first primitives** | Ship TASK + DOC + DECISION first. These three primitives deliver 80% of the value proposition and contain the one thing no competitor has: Decision DNA. |

### The MVP Primitive Priority Order

This is the single most important strategic decision in this document. Do not build all seven primitives at once.

```
Priority 1: TASK     → Replaces Linear/Trello. Immediate utility. Fast to build.
Priority 2: DOC      → Replaces Notion. Pairs naturally with TASK.
Priority 3: DECISION → Lazynext's unique moat. Nothing else does this. Build it early and make it great.
Priority 4: THREAD   → Contextual comms. Adds depth to the above three.
Priority 5: PULSE    → Surfaces data from above four. Easy to build once data exists.
Priority 6: AUTOMATION → Power feature. Complex to build right. Phase 2.
Priority 7: TABLE    → Highest engineering complexity. Full Airtable parity is months of work. Phase 3.
```

Ship 1–3 first. That is your competitive wedge. TABLE and AUTOMATION are retention features, not acquisition features.

---

## 3. THE SEVEN PRIMITIVES

Everything in Lazynext is built from exactly seven building blocks — combined infinitely. All seven share one database table called `nodes`. The `type` column discriminates between them. The `data JSONB` column stores type-specific properties.

### Primitive 1: TASK
- **Icon:** 📋
- **Priority:** MVP (Phase 1)
- **Purpose:** Assignable, trackable, deadlineable unit of work.
- **Fields in `data` JSONB:** `title`, `status` (todo|in_progress|in_review|done|blocked), `priority` (low|medium|high|urgent), `due_at` (ISO timestamp), `assigned_to` (Clerk user ID), `subtasks` (array of node IDs), `estimate_hours`, `tags` (array of strings), `attachments` (array of R2 URLs)
- **Replaces:** Asana, Linear, Trello, Monday

### Primitive 2: DOC
- **Icon:** 📄
- **Priority:** MVP (Phase 1)
- **Purpose:** Living document that embeds tasks, tables, decisions, and other nodes inline using slash commands.
- **Fields in `data` JSONB:** `title`, `content` (Tiptap JSON), `collaborators` (array of Clerk user IDs), `last_edited_by`, `word_count`, `version`
- **Replaces:** Notion, Confluence

### Primitive 3: DECISION
- **Icon:** ✅
- **Priority:** MVP (Phase 1) — **This is Lazynext's primary competitive moat.**
- **Purpose:** Logged, attributed, time-stamped choice with rationale. The foundation of Decision DNA — Lazynext's unique advantage over every competitor.
- **Canonical storage:** The `decisions` table (Section 9). NOT the nodes `data` JSONB.
- **Fields in `nodes.data` JSONB (canvas reference only):** `decisionId` (UUID reference to `decisions.id`), `title` (copied from `decisions.question` for canvas display)
- **Fields in `decisions` table:** `question`, `resolution`, `rationale`, `options_considered`, `information_at_time`, `outcome`, `outcome_tagged_by`, `outcome_tagged_at`, `decision_quality_score`, `quality_feedback`, `tags` — see Section 9 for full schema.
- **Full specification:** See Section 31.
- **Replaces:** Nothing — this primitive does not exist in any other tool.

### Primitive 4: THREAD
- **Icon:** 💬
- **Priority:** Phase 1 (lightweight) for team builds — **DEFERRED (post-MVP) for solo builds.** See Section 54.5 Build Decision Record: THREAD is explicitly excluded from the solo MVP scope-lock alongside PULSE, AUTOMATION, TABLE, and the mobile app. Solo founders should skip THREAD in Phase 1 and re-evaluate after 30 paying workspaces.
- **Purpose:** Contextual conversation attached directly to any other node. NOT a global channel. A thread always belongs to a node.
- **Fields in `data` JSONB:** `parent_node_id`, `title`, `is_resolved`, `message_count`
- **Note:** Actual messages stored in the `messages` table, not in node data.
- **Replaces:** Slack (contextual messaging only)

### Primitive 5: PULSE
- **Icon:** 📊
- **Priority:** Phase 2
- **Purpose:** Auto-generated, real-time status view computed from any combination of other nodes in the workflow. The "status meeting in a widget" primitive.
- **Fields in `data` JSONB:** `title`, `metric_queries` (array of query definitions), `layout` (grid/list/chart), `refresh_interval_seconds`, `last_computed_at`, `cached_values`
- **Replaces:** Status meetings, Databox

### Primitive 6: AUTOMATION
- **Icon:** ⚙️
- **Priority:** Phase 2
- **Purpose:** If/then logic node connecting any primitive to any other. The workflow automation layer.
- **Fields in `data` JSONB:** `name`, `trigger` (object with `type`, `node_type`, `condition`), `actions` (array of action objects), `is_active`, `run_count`, `last_triggered_at`
- **Replaces:** Zapier, Make

### Primitive 7: TABLE
- **Icon:** 🗃️
- **Priority:** Phase 3 — **Do not build this in Phase 1 or 2. It is the highest-complexity primitive.**
- **Purpose:** Structured relational data with custom fields, filters, views (grid, kanban, gallery, calendar), and row-level automation triggers.
- **Fields in `data` JSONB:** `name`, `columns` (array of column definitions with name/type/options), `rows` (array of row objects), `views` (array of saved filter/sort configurations), `linked_nodes` (edges to other primitives)
- **Phase 3 launch scope:** Grid view only. Kanban/gallery/calendar in Phase 3.1.
- **Replaces:** Airtable, Google Sheets

---

## 4. COMPLETE TECH STACK

> **CRITICAL RULE:** Do not substitute any item in this stack with an alternative unless a substitution is explicitly noted. Every item has been chosen for India availability, zero CAPEX, managed infrastructure, and proven developer experience.

### Frontend Layer

| Layer | Tool | Version | Why | Cost |
|---|---|---|---|---|
| Framework | **Next.js** | 14.x (App Router) | Full-stack in one repo. Server Components. API Routes. TypeScript throughout. | Free / Vercel hosting |
| Canvas Engine | **React Flow** (`@xyflow/react`) | 12.x | Open-source node-based canvas. Handles drag/drop, pan/zoom, custom nodes and edges. Powers the entire Workflow Canvas. | Free / MIT |
| Styling | **Tailwind CSS** | 3.x | Utility-first. Mobile-first responsive design built in. | Free |
| UI Components | **shadcn/ui** | latest | Pre-built accessible, Radix-based components. Copy into project — not a dependency. | Free |
| State Management | **Zustand** | 4.x | Lightweight global state. Manages canvas state, selection, UI state. | Free / MIT |
| Rich Text Editor | **Tiptap** | 2.x | Open-source headless rich-text editor. Slash commands, embeds, collaborative editing. | Free (core) |
| Multiplayer Presence | **Liveblocks** | latest | Real-time collaboration — cursors, presence, conflict resolution. Free up to 50 simultaneous connections. | Free tier |
| Form Validation | **Zod** | 3.x | TypeScript-first schema validation. Used in API routes and forms. | Free / MIT |
| Date Handling | **date-fns** | 3.x | Lightweight, tree-shakable date utilities. No moment.js. | Free / MIT |
| Icons | **Lucide React** | latest | Clean, consistent icon library. | Free / MIT |
| Animations | **Framer Motion** | 10.x | Smooth UI transitions and micro-interactions. | Free |
| Charts (Pulse) | **Recharts** | latest | Composable chart library built on D3. For PULSE visualizations. | Free / MIT |
| HTTP Client | **Axios** | 1.x | Consistent HTTP requests from client to API. | Free / MIT |
| Toast Notifications | **Sonner** | latest | Beautiful, accessible toast system. | Free |

### Backend & Database Layer

| Layer | Tool | Version | Why | Cost |
|---|---|---|---|---|
| Database | **Neon.tech** (Serverless Postgres) | latest | India-safe Supabase alternative. Serverless, scales to zero, DB branching per PR. | Free: 0.5GB storage, 1 compute unit (paid trigger at >0.5GB; ~$19/month Pro) |
| ORM | **Drizzle ORM** | 0.29.x | TypeScript-first, zero-overhead ORM. SQL-like syntax, full type safety, Neon integration. | Free / MIT |
| Authentication | **Clerk.dev** | latest | India-safe alternative to Supabase Auth. Email, Google, GitHub, SSO. Org management. | Free: up to 10k MAU |
| File Storage | **Cloudflare R2** | latest | Zero egress fees. S3-compatible SDK. Globally distributed. | ~$0 at early scale |
| Vector Search | **Neon pgvector** | included | Semantic search over decisions and docs. Built into Neon. | Included in Neon |
| API Layer | **Next.js API Routes** | 14.x | Serverless edge functions. No separate backend server needed. | Free on Vercel |
| Rate Limiting | **Upstash Redis** | latest | Serverless Redis. Rate limiting on API routes. Cache layer. | Free: 10k requests/day |
| Validation | **Zod** | 3.x | Shared between frontend and backend. API request validation. | Free |

### Automation & Event Layer

| Layer | Tool | Why | Cost |
|---|---|---|---|
| Event Queue | **Inngest** | Serverless event-driven functions. Handles automation triggers, retries, delays. TypeScript-native. | Free: 50k runs/month |
| Background Jobs | **Trigger.dev** | Long-running background jobs (AI analysis, bulk exports, report generation). | Free tier |
| Email | **Resend** | Transactional email via React Email templates. Invites, notifications, digests. | Free: 3k emails/month |

### AI Layer — Open-Source LLM

> **MANDATORY (V7 UPDATED):** The LLM policy was revised in V7. The primary fast tier uses **Groq (Llama 3.3 70B)** — open-source and free-tier eligible. The quality tier uses **Claude Haiku 3.5** via the Anthropic API for higher-stakes AI tasks (see Section 52 for the full two-tier architecture and cost model). Do NOT use GPT-4 or other OpenAI models. Do NOT use Claude Opus or Claude Sonnet (too expensive at this stage). The authoritative LLM architecture is defined in **Section 52** — refer there for all AI implementation decisions.

| Layer | Tool | Why | Cost |
|---|---|---|---|
| **Primary LLM API** | **Groq API** (`llama-3.3-70b-versatile`) | Fastest open-source LLM inference. Free tier available. Llama 3.3 70B is GPT-4 class. | Free tier: 14,400 req/day |
| **Fallback LLM API** | **Together AI** (`meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo`) | Fallback when Groq quota is exhausted. Same model class, reliable uptime. | Pay per token, near-zero cost |
| **Self-host Option** | **Ollama** (local) | For development and enterprise self-hosted deployments. | Free |
| **Embeddings** | **Nomic Embed Text** via Nomic AI API | Open-source embedding model for Decision DNA semantic search. | Free tier available |
| **Embedding Fallback** | **Together AI Embeddings** | Cloud embeddings when Nomic API unavailable. | ~$0.008/1M tokens |

> **Model Version Note:** Groq model identifiers change as Meta releases new versions. Always verify the current stable model at https://console.groq.com/docs/models before deploying. The current recommended model as of this document is `llama-3.3-70b-versatile`. If that model is unavailable, use `llama3-70b-8192` as the stable fallback.

### Payments

| Layer | Tool | Why | Cost |
|---|---|---|---|
| **International payments** | **Stripe** | Standard SaaS billing. Checkout, Customer Portal, webhooks. | 2.9% + 30¢ per transaction |
| **India payments** | **Razorpay** | Primary payment gateway for Indian customers paying in INR. Required for Indian business registration. | 2% per transaction |

> **CRITICAL — Razorpay is not optional if you are an Indian business.** Stripe is available for Indian businesses but requires a registered entity and has INR conversion overhead that hurts conversion rates with Indian customers. Razorpay accepts UPI, NEFT, IMPS, all Indian cards, and wallets. Run both in parallel: Razorpay for Indian workspace billing, Stripe for international.

### Observability & DevOps

| Layer | Tool | Why | Cost |
|---|---|---|---|
| Hosting & Deploy | **Vercel** | Zero-config deployment for Next.js. Edge network, auto-scaling. Preview deploys per PR. | Free tier → Pro at scale |
| Error Tracking | **Sentry** | Error monitoring, performance tracing, session replay. | Free: 5k errors/month |
| Product Analytics | **PostHog** | Feature flags, funnels, session replay, event tracking. Self-hostable. | Free: 1M events/month |
| Uptime Monitoring | **Better Uptime** | Status page, incident management, uptime checks. | Free tier |
| Logging | **Vercel Logs** | Built-in. No setup required. | Free |

---

## 5. OPEN-SOURCE LLM INTEGRATION — LAZYMIND AI

> This section is the most critical change from the original FlowStack architecture. Read every word.

### Architecture Philosophy

LazyMind doesn't need fine-tuning, a vector database, or expensive proprietary APIs for primary features. The entire workflow graph serializes to a compact JSON representation that fits in an LLM's context window. This makes AI features trivially simple: serialize the graph → pass it to the LLM with a task-specific system prompt → parse the response.

### LLM Provider Priority Chain

```
Priority 1: Groq API (llama-3.3-70b-versatile) — fastest, free tier
     ↓ if quota exceeded or error
Priority 2: Together AI (Meta-Llama-3.3-70B-Instruct-Turbo) — reliable cloud
     ↓ if Together AI unavailable
Priority 3: Ollama (local) — only in development / self-hosted enterprise
     ↓ if none available
Graceful degradation: Return a friendly "AI temporarily unavailable" message
```

### Groq API Integration (Primary)

**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
**Model:** `llama-3.3-70b-versatile`
**Auth:** `Authorization: Bearer ${GROQ_API_KEY}`
**API Format:** OpenAI-compatible chat completions format

> **Model Stability Note:** Always check https://console.groq.com/docs/models for the current recommended model. If `llama-3.3-70b-versatile` is deprecated, the fallback is `llama3-70b-8192`. Implement a config variable `GROQ_MODEL` in your environment to make model switching require zero code changes.

```typescript
// lib/ai/groq.ts
const GROQ_TIMEOUT_MS = 15_000

export async function callGroq(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1500
): Promise<string> {
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      if (response.status === 429) throw new Error('GROQ_RATE_LIMIT')
      throw new Error(`Groq API error: ${error.error?.message}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } finally {
    clearTimeout(timeout)
  }
}
```

### Together AI Integration (Fallback)

**Endpoint:** `https://api.together.xyz/v1/chat/completions`
**Model:** `meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo`
**Auth:** `Authorization: Bearer ${TOGETHER_API_KEY}`

```typescript
// lib/ai/together.ts
const TOGETHER_TIMEOUT_MS = 15_000

export async function callTogether(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1500
): Promise<string> {
  const model = process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TOGETHER_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Together AI error: ${error.error?.message}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } finally {
    clearTimeout(timeout)
  }
}
```

### Master LazyMind Caller with Failover

```typescript
// lib/ai/lazymind.ts
import { callGroq } from './groq'
import { callTogether } from './together'

export async function callLazyMind(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1500
): Promise<string> {
  // Priority 1: Groq — catch ALL errors and fall through (not just rate limits).
  // A network timeout, model deprecation, or malformed response should also trigger
  // the fallback. Only re-throw on non-AI errors (e.g. programming mistakes) if needed.
  try {
    return await callGroq(systemPrompt, userMessage, maxTokens)
  } catch (err: any) {
    console.warn('[LazyMind] Groq failed — falling back to Together AI:', err?.message)
    // All Groq errors fall through to Together AI; nothing is re-thrown here.
  }

  // Priority 2: Together AI
  try {
    return await callTogether(systemPrompt, userMessage, maxTokens)
  } catch (err) {
    console.error('[LazyMind] Together AI failed:', err)
  }

  // All providers failed
  throw new Error('AI_UNAVAILABLE')
}
```

### LazyMind System Prompts

```typescript
// lib/ai/prompts.ts
export const ANALYZE_WORKFLOW_PROMPT = `You are LazyMind, an AI workflow analyst for Lazynext.
You are given a JSON representation of a team's workflow graph.
Analyze it and provide:
1. A 1-sentence summary of the workflow's current state
2. Top 3 blockers or risks (be specific — name the actual nodes and people)
3. One concrete recommendation to unblock the most critical path
4. Workload distribution across assigned team members (who is overloaded?)

Be direct. Do not pad. Use the actual node titles and user names from the graph.
Respond in plain text, no markdown headers.`

export const GENERATE_WORKFLOW_PROMPT = `You are LazyMind, an AI workflow builder for Lazynext.
The user will describe a workflow in plain English.
You must respond with a valid JSON object representing the workflow graph.
The JSON must follow this exact schema:
{
  "name": "string",
  "nodes": [
    {
      "id": "string (short unique id, 6 chars)",
      "type": "task|doc|decision|thread|pulse|automation",
      "position": { "x": number, "y": number },
      "data": { ...type-specific fields }
    }
  ],
  "edges": [
    {
      "id": "string",
      "source": "node id",
      "target": "node id",
      "label": "optional condition label"
    }
  ]
}
Lay out nodes in a logical left-to-right flow. Space nodes 250px apart horizontally.
Respond with ONLY the JSON object. No explanation, no markdown, no preamble.`

export const DECISION_QUALITY_PROMPT = `You are a decision quality analyst.
Given a logged decision with its question, options considered, resolution, and rationale,
score the decision quality from 0 to 100 based on:
- Completeness of options considered (0–25 pts)
- Clarity and specificity of rationale (0–25 pts)
- Evidence of structured thinking (0–25 pts)
- Reversibility acknowledgment (0–25 pts)
Respond with ONLY a JSON object: { "score": number, "feedback": "one sentence" }`

export const WEEKLY_DIGEST_PROMPT = `You are LazyMind, generating a weekly team digest.
Given the workspace activity for the past 7 days, produce a brief digest covering:
1. Completed work (what got done)
2. In-progress items (what's moving)
3. Stuck or overdue items (what needs attention)
4. Decisions logged this week (list them)
5. One AI observation — the most important pattern you noticed

Keep it under 200 words total. Write in second person ("Your team...").`
```

### Workflow Serializer for AI

```typescript
// lib/ai/serialize.ts
export interface WorkflowForAI {
  name: string
  nodes: Array<{
    id: string
    type: string
    title: string
    status?: string
    priority?: string
    assignedTo?: string
    dueAt?: string
    resolution?: string
    threadCount: number
  }>
  edges: Array<{
    from: string
    to: string
    label?: string
  }>
}

export function serializeWorkflowForAI(workflow: any): string {
  const serialized: WorkflowForAI = {
    name: workflow.name,
    nodes: workflow.nodes.map((n: any) => ({
      id: n.id.slice(0, 8),
      type: n.type,
      title: n.data?.title || n.data?.name || n.data?.question || '(untitled)',
      ...(n.status && { status: n.status }),
      ...(n.data?.priority && { priority: n.data.priority }),
      ...(n.assignedTo && { assignedTo: n.assignedTo }),
      ...(n.dueAt && { dueAt: n.dueAt }),
      ...(n.data?.resolution && { resolution: n.data.resolution }),
      threadCount: n.threads?.length || 0,
    })),
    edges: workflow.edges.map((e: any) => ({
      from: e.sourceNodeId?.slice(0, 8),
      to: e.targetNodeId?.slice(0, 8),
      ...(e.condition?.label && { label: e.condition.label }),
    })),
  }
  return JSON.stringify(serialized)
}
```

---

## 6. SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        lazynext.com                         │
│                    Vercel Edge Network                       │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐   │
│  │   Next.js   │  │  Next.js    │  │  Next.js API      │   │
│  │  (Marketing)│  │  (App UI)   │  │  Routes /api/v1/  │   │
│  │  SSG/ISR    │  │  RSC+Client │  │  Edge Functions   │   │
│  └─────────────┘  └─────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                    │                  │
          ▼                    ▼                  ▼
   ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
   │  Clerk.dev  │    │  Liveblocks  │    │   Neon Postgres  │
   │    Auth     │    │  Real-time   │    │   (Mumbai AP)   │
   │  (Sessions) │    │  Presence    │    │  Drizzle ORM    │
   └─────────────┘    └──────────────┘    └─────────────────┘
                                                  │
                             ┌────────────────────┼───────────────────┐
                             ▼                    ▼                   ▼
                    ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
                    │  Cloudflare  │    │   Inngest    │   │  Groq API /  │
                    │     R2       │    │  Automation  │   │  Together AI │
                    │  File Store  │    │   Events     │   │  (LazyMind)  │
                    └──────────────┘    └──────────────┘   └──────────────┘
                                               │
                                        ┌──────────────┐
                                        │   Resend     │
                                        │  Email API   │
                                        └──────────────┘
```

### Request Flow

1. User hits `lazynext.com` → Vercel serves Next.js
2. Auth check via Clerk session cookie in `middleware.ts`
3. Protected routes redirect to `/sign-in` if no valid session
4. API calls hit `/api/v1/*` → Next.js Route Handlers
5. Every API handler calls `scopedQuery()` to inject `workspace_id` automatically
6. Mutations fire Inngest events for async processing (automation triggers, emails)
7. Real-time presence handled by Liveblocks (zero DB load for cursors/selection)
8. AI requests go to Groq → fallback to Together AI → graceful degradation

---

## 7. FRONTEND ARCHITECTURE

### Responsive Breakpoints

| Breakpoint | Width | Experience | Navigation | Canvas |
|---|---|---|---|---|
| Mobile | < 640px | Touch-first | Bottom tab bar | NodeListView (no canvas) |
| Tablet | 640–1023px | Hybrid | Collapsible sidebar | Simplified canvas |
| Desktop | > 1024px | Full canvas experience | Fixed left sidebar | Full React Flow canvas |

### Mobile-First Design Rules

These rules are non-negotiable for every component:

1. Every interactive element must have a minimum touch target of 44×44px.
2. The canvas (`ReactFlow`) must NOT render on screens narrower than 640px. Render `NodeListView` instead.
3. All modals and panels must be full-screen on mobile (`h-screen w-screen` with safe area insets).
4. Font size must never drop below 14px on mobile.
5. The bottom navigation bar on mobile must always be within the safe area bottom (`pb-safe`).

### Keyboard Shortcuts (Desktop)

Implement these shortcuts in all canvas views. They must be documented in a Help modal (`?` key).

| Shortcut | Action |
|---|---|
| `T` | Add TASK node at center |
| `D` | Add DOC node at center |
| `X` | Add DECISION node at center |
| `Delete` / `Backspace` | Delete selected node(s) |
| `Ctrl+Z` / `Cmd+Z` | Undo last action |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+A` / `Cmd+A` | Select all nodes |
| `Ctrl+C` / `Cmd+C` | Copy selected nodes |
| `Ctrl+V` / `Cmd+V` | Paste nodes |
| `Ctrl+D` / `Cmd+D` | Duplicate selected node |
| `Escape` | Deselect / close panel |
| `Space` (hold) | Pan mode |
| `Ctrl+Scroll` / `Cmd+Scroll` | Zoom in/out |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Open global search |
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `?` | Open keyboard shortcuts help |

### Directory Structure

```
lazynext/
├── app/                              # Next.js App Router (root)
│   ├── (auth)/                       # Auth group - unauthenticated routes
│   │   ├── sign-in/[[...sign-in]]/
│   │   │   └── page.tsx
│   │   ├── sign-up/[[...sign-up]]/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (marketing)/                  # Public marketing pages
│   │   ├── page.tsx                  # Landing page (lazynext.com)
│   │   ├── pricing/page.tsx
│   │   ├── templates/page.tsx
│   │   └── layout.tsx
│   │
│   ├── (app)/                        # Protected app routes
│   │   ├── onboarding/
│   │   │   ├── create-workspace/page.tsx
│   │   │   └── first-workflow/page.tsx
│   │   ├── workspace/[slug]/
│   │   │   ├── canvas/[id]/page.tsx
│   │   │   ├── pulse/page.tsx
│   │   │   ├── decisions/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── api/v1/                       # ALL API routes under v1 prefix
│   │   ├── workflows/route.ts
│   │   ├── workflows/[id]/route.ts
│   │   ├── nodes/route.ts
│   │   ├── nodes/[id]/route.ts
│   │   ├── edges/route.ts
│   │   ├── threads/[nodeId]/route.ts
│   │   ├── decisions/route.ts
│   │   ├── decisions/[id]/route.ts
│   │   ├── decisions/[id]/quality/route.ts
│   │   ├── decisions/search/route.ts
│   │   ├── search/route.ts
│   │   ├── ai/analyze/route.ts
│   │   ├── ai/generate/route.ts
│   │   ├── ai/digest/route.ts
│   │   ├── import/notion/route.ts
│   │   ├── import/notion-zip/route.ts
│   │   ├── import/linear/route.ts
│   │   ├── import/csv/route.ts
│   │   ├── templates/route.ts
│   │   ├── templates/[id]/route.ts
│   │   ├── templates/[id]/install/route.ts
│   │   ├── upload/route.ts
│   │   ├── export/route.ts
│   │   ├── account/delete/route.ts
│   │   ├── billing/checkout/route.ts
│   │   ├── billing/portal/route.ts
│   │   └── webhooks/
│   │       ├── inngest/route.ts
│   │       ├── stripe/route.ts
│   │       └── razorpay/route.ts
│   │
│   ├── layout.tsx
│   ├── globals.css
│   ├── not-found.tsx
│   └── sitemap.ts
```

### Canvas State Management (Zustand)

```typescript
// stores/canvas.store.ts
import { create } from 'zustand'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react'

interface CanvasStore {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  isLazyMindOpen: boolean
  isNodePanelOpen: boolean
  history: Array<{ nodes: Node[]; edges: Edge[] }>
  historyIndex: number

  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  addNode: (node: Node) => void
  updateNodeData: (id: string, data: Record<string, any>) => void
  removeNode: (id: string) => void
  addEdge: (edge: Edge) => void
  removeEdge: (id: string) => void
  selectNode: (id: string | null) => void
  hydrateCanvas: (nodes: Node[], edges: Edge[]) => void
  undo: () => void
  redo: () => void
  toggleLazyMind: () => void
  toggleNodePanel: () => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isLazyMindOpen: false,
  isNodePanelOpen: false,
  history: [],
  historyIndex: -1,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
  addNode: (node) => set((state) => {
    const newNodes = [...state.nodes, node]
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    return {
      nodes: newNodes,
      history: [...newHistory, { nodes: newNodes, edges: state.edges }],
      historyIndex: newHistory.length,
    }
  }),
  updateNodeData: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
  })),
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id),
  })),
  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  removeEdge: (id) => set((state) => ({ edges: state.edges.filter(e => e.id !== id) })),
  selectNode: (id) => set({ selectedNodeId: id, isNodePanelOpen: id !== null }),
  hydrateCanvas: (nodes, edges) => set({ nodes, edges, history: [{ nodes, edges }], historyIndex: 0 }),
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1]
      set({ nodes: prev.nodes, edges: prev.edges, historyIndex: historyIndex - 1 })
    }
  },
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1]
      set({ nodes: next.nodes, edges: next.edges, historyIndex: historyIndex + 1 })
    }
  },
  toggleLazyMind: () => set((state) => ({ isLazyMindOpen: !state.isLazyMindOpen })),
  toggleNodePanel: () => set((state) => ({ isNodePanelOpen: !state.isNodePanelOpen })),
}))
```

### Main Canvas Component

```typescript
// components/canvas/WorkflowCanvas.tsx
'use client'
import ReactFlow, { Background, Controls, MiniMap, Panel, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '@/stores/canvas.store'
import { useCallback, useEffect } from 'react'
import { TaskNode } from './nodes/TaskNode'
import { DocNode } from './nodes/DocNode'
import { DecisionNode } from './nodes/DecisionNode'
import { ThreadNode } from './nodes/ThreadNode'
import { PulseNode } from './nodes/PulseNode'
import { AutomationNode } from './nodes/AutomationNode'
import { TableNode } from './nodes/TableNode'
import { ConditionalEdge } from './edges/ConditionalEdge'
import { CanvasToolbar } from './panels/CanvasToolbar'
import { LazyMindPanel } from '@/components/lazymind/LazyMindPanel'
import { NodeDetailPanel } from './panels/NodeDetailPanel'
import { NodeListView } from './mobile/NodeListView'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const nodeTypes = {
  task: TaskNode,
  doc: DocNode,
  table: TableNode,
  thread: ThreadNode,
  decision: DecisionNode,
  automation: AutomationNode,
  pulse: PulseNode,
}

const edgeTypes = { conditional: ConditionalEdge }

export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  const {
    nodes, edges, onNodesChange, onEdgesChange,
    addEdge, selectNode, isLazyMindOpen, isNodePanelOpen,
    selectedNodeId, undo, redo,
  } = useCanvasStore()

  const isMobile = useMediaQuery('(max-width: 640px)')

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (meta && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo() }
      if (e.key === 'Escape') selectNode(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, selectNode])

  const onConnect = useCallback((connection: any) => {
    addEdge({ ...connection, id: `e-${Date.now()}`, type: 'conditional' })
    fetch(`/api/v1/edges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId, sourceNodeId: connection.source, targetNodeId: connection.target }),
    })
  }, [addEdge, workflowId])

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <CanvasToolbar workflowId={workflowId} isMobile />
        <NodeListView nodes={nodes} workflowId={workflowId} />
        {isLazyMindOpen && <LazyMindPanel workflowId={workflowId} />}
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-gray-950"
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#1f2937" gap={20} />
        <Controls className="!bg-gray-900 !border-gray-700 !text-gray-300" />
        <MiniMap className="!bg-gray-900 !border-gray-700" nodeColor="#374151" />
        <Panel position="top-left">
          <CanvasToolbar workflowId={workflowId} />
        </Panel>
      </ReactFlow>

      {isNodePanelOpen && selectedNodeId && (
        <div className="absolute right-0 top-0 h-full w-80 xl:w-96 z-10">
          <NodeDetailPanel nodeId={selectedNodeId} workflowId={workflowId} />
        </div>
      )}

      {isLazyMindOpen && (
        <div className="absolute bottom-4 right-4 w-80 xl:w-96 z-20">
          <LazyMindPanel workflowId={workflowId} />
        </div>
      )}
    </div>
  )
}
```

---

## 8. BACKEND ARCHITECTURE

### Clerk Auth Middleware

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/templates',
  '/api/v1/templates',
  '/api/v1/webhooks/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sitemap.xml',
  '/robots.txt',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

### Workspace Scoping — The Most Critical Pattern

Every database query involving workspace data must be wrapped in `scopedQuery()`. This function injects the `workspace_id` from the authenticated Clerk session automatically. The API caller never controls which workspace is queried. This is the foundation of multi-tenant security.

```typescript
// lib/db/scoped-query.ts
import { auth } from '@clerk/nextjs/server'
import { db } from './client'
import { workspaces } from './schema'
import { eq } from 'drizzle-orm'

export async function getWorkspaceId(): Promise<string> {
  const { orgId } = auth()
  if (!orgId) throw new Error('UNAUTHORIZED')

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.clerkOrgId, orgId),
    columns: { id: true },
  })

  if (!workspace) throw new Error('WORKSPACE_NOT_FOUND')
  return workspace.id
}

// Use this in every API route:
// const workspaceId = await getWorkspaceId()
// const data = await db.select().from(nodes).where(eq(nodes.workspaceId, workspaceId))
```

### Neon + Drizzle Client (with Connection Pooling)

```typescript
// lib/db/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// CRITICAL: Use the POOLED connection string for all API routes (serverless functions)
// Use the UNPOOLED connection string only in drizzle.config.ts (migrations)
// The pooled URL includes ?pgbouncer=true&connection_limit=1
const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})
```

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Use UNPOOLED for migrations — pgBouncer does not support DDL statements
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
} satisfies Config
```

> **Connection Pooling Note:** Neon provides two connection strings:
> - `DATABASE_URL` — Pooled via pgBouncer. Use this in all serverless API routes. Required for Lambda/Edge function environments that open many short-lived connections.
> - `DATABASE_URL_UNPOOLED` — Direct connection. Use ONLY in `drizzle.config.ts` for migrations, never in runtime code.
> Both are available in your Neon project dashboard under "Connection Details".

### Standard API Route Pattern

```typescript
// Example: app/api/v1/nodes/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { nodes } from '@/lib/db/schema'
import { getWorkspaceId } from '@/lib/db/scoped-query'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'

const CreateNodeSchema = z.object({
  workflowId: z.string().uuid(),
  type: z.enum(['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse']),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.unknown()),
})

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 })
  }

  // Rate limit: 100 requests/minute per user
  const rl = await checkRateLimit(userId)
  if (!rl.success) {
    return NextResponse.json({ data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, { status: 429 })
  }

  const body = await req.json()
  const parsed = CreateNodeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 })
  }

  const workspaceId = await getWorkspaceId()
  const { workflowId, type, position, data } = parsed.data

  const [node] = await db.insert(nodes).values({
    workspaceId,
    workflowId,
    type,
    positionX: Math.round(position.x),
    positionY: Math.round(position.y),
    data,
    createdBy: userId,
  }).returning()

  const response = NextResponse.json({ data: node, error: null }, { status: 201 })
  response.headers.set('X-API-Version', '1.0')
  return response
}
```

### Rate Limiting (Upstash Redis)

```typescript
// lib/utils/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
})

export async function checkRateLimit(identifier: string) {
  return ratelimit.limit(identifier)
}
```

---

## 9. DATABASE SCHEMA — COMPLETE DRIZZLE ORM

> **V9 CRITICAL CLARIFICATION — Decisions Data Model:**
> The `decisions` table (below) is the **canonical store** for all decision data — question, resolution, rationale, options, outcomes, quality scores, and embeddings. When a DECISION node is placed on the canvas, it is represented as a row in the `nodes` table with `type='decision'` and the `data` JSONB containing ONLY a reference `{ "decisionId": "<decisions.id>" }` plus display-only fields like `title` (copied from `question` for canvas rendering). **Never duplicate decision-specific fields into nodes.data.** Always JOIN to the `decisions` table for the full decision record.

```typescript
// lib/db/schema.ts
import {
  pgTable, uuid, text, timestamp, jsonb, boolean,
  integer, index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─────────────────────────────────────────────
// WORKSPACES — One per Clerk Organization
// ─────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id:           uuid('id').primaryKey().defaultRandom(),
  clerkOrgId:   text('clerk_org_id').notNull().unique(),
  name:         text('name').notNull(),
  slug:         text('slug').notNull().unique(),
  plan:         text('plan').notNull().default('free'),  // free|team|business|enterprise
  planExpiresAt: timestamp('plan_expires_at'),
  // Billing
  stripeCustomerId:      text('stripe_customer_id'),
  stripeSubscriptionId:  text('stripe_subscription_id'),
  razorpayCustomerId:    text('razorpay_customer_id'),
  razorpaySubscriptionId: text('razorpay_subscription_id'),
  billingRegion:         text('billing_region').default('international'), // india|international
  // Metadata
  logoUrl:      text('logo_url'),
  region:       text('region').default('ap-south-1'), // Neon region
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
})

// ─────────────────────────────────────────────
// WORKSPACE MEMBERS — Clerk org members synced to DB
// ─────────────────────────────────────────────
export const workspaceMembers = pgTable('workspace_members', {
  id:           uuid('id').primaryKey().defaultRandom(),
  workspaceId:  uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  clerkUserId:  text('clerk_user_id').notNull(),
  role:         text('role').notNull().default('member'), // admin|member|guest
  displayName:  text('display_name'),
  email:        text('email'),
  avatarUrl:    text('avatar_url'),
  joinedAt:     timestamp('joined_at').defaultNow(),
}, (t) => ({
  workspaceIdx: index('wm_workspace_idx').on(t.workspaceId),
  userIdx:      index('wm_user_idx').on(t.clerkUserId),
  uniqueMember: index('wm_unique_member_idx').on(t.workspaceId, t.clerkUserId),
}))

// ─────────────────────────────────────────────
// WORKFLOWS — Collections of nodes
// ─────────────────────────────────────────────
export const workflows = pgTable('workflows', {
  id:           uuid('id').primaryKey().defaultRandom(),
  workspaceId:  uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name:         text('name').notNull(),
  description:  text('description'),
  isTemplate:   boolean('is_template').default(false),
  isPublic:     boolean('is_public').default(false),
  templateCategory: text('template_category'),
  createdBy:    text('created_by').notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
}, (t) => ({
  workspaceIdx: index('w_workspace_idx').on(t.workspaceId),
}))

// ─────────────────────────────────────────────
// NODES — The universal primitive table
// ─────────────────────────────────────────────
export const nodes = pgTable('nodes', {
  id:           uuid('id').primaryKey().defaultRandom(),
  workspaceId:  uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowId:   uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  type:         text('type').notNull(), // task|doc|table|thread|decision|automation|pulse
  positionX:    integer('position_x').notNull().default(0),
  positionY:    integer('position_y').notNull().default(0),
  data:         jsonb('data').notNull().default({}),
  // Denormalized for fast queries (no JSONB extraction needed)
  status:       text('status'),
  assignedTo:   text('assigned_to'),
  dueAt:        timestamp('due_at'),
  createdBy:    text('created_by').notNull(),
  updatedBy:    text('updated_by'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
}, (t) => ({
  workspaceIdx:  index('n_workspace_idx').on(t.workspaceId),
  workflowIdx:   index('n_workflow_idx').on(t.workflowId),
  typeIdx:       index('n_type_idx').on(t.workspaceId, t.type),
  assigneeIdx:   index('n_assignee_idx').on(t.workspaceId, t.assignedTo),
  statusIdx:     index('n_status_idx').on(t.workflowId, t.status),
}))

// ─────────────────────────────────────────────
// EDGES — Connections between nodes
// ─────────────────────────────────────────────
export const edges = pgTable('edges', {
  id:           uuid('id').primaryKey().defaultRandom(),
  workspaceId:  uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowId:   uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  sourceNodeId: uuid('source_node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  targetNodeId: uuid('target_node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  condition:    jsonb('condition'),
  createdAt:    timestamp('created_at').defaultNow(),
}, (t) => ({
  workflowIdx: index('e_workflow_idx').on(t.workflowId),
  sourceIdx:   index('e_source_idx').on(t.sourceNodeId),
  targetIdx:   index('e_target_idx').on(t.targetNodeId),
}))

// ─────────────────────────────────────────────
// THREADS — Contextual conversations on nodes
// ─────────────────────────────────────────────
export const threads = pgTable('threads', {
  id:          uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  nodeId:      uuid('node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  isResolved:  boolean('is_resolved').default(false),
  createdBy:   text('created_by').notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
  resolvedAt:  timestamp('resolved_at'),
  resolvedBy:  text('resolved_by'),
}, (t) => ({
  nodeIdx: index('th_node_idx').on(t.nodeId),
}))

// ─────────────────────────────────────────────
// MESSAGES — Thread messages
// ─────────────────────────────────────────────
export const messages = pgTable('messages', {
  id:          uuid('id').primaryKey().defaultRandom(),
  threadId:    uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  content:     text('content').notNull(),
  contentType: text('content_type').default('text'),
  attachments: jsonb('attachments'),
  createdBy:   text('created_by').notNull(),
  createdAt:   timestamp('created_at').defaultNow(),
  editedAt:    timestamp('edited_at'),
}, (t) => ({
  threadIdx: index('m_thread_idx').on(t.threadId),
}))

// ─────────────────────────────────────────────
// DECISIONS — Decision DNA (Lazynext's primary moat)
// ─────────────────────────────────────────────
export const decisions = pgTable('decisions', {
  id:                uuid('id').primaryKey().defaultRandom(),
  workspaceId:       uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  workflowId:        uuid('workflow_id').references(() => workflows.id, { onDelete: 'set null' }),
  nodeId:            uuid('node_id').references(() => nodes.id, { onDelete: 'set null' }),

  madeBy:            text('made_by').notNull(),
  question:          text('question').notNull(),
  resolution:        text('resolution'),
  rationale:         text('rationale'),
  optionsConsidered: jsonb('options_considered'),     // string[]
  informationAtTime: jsonb('information_at_time'),    // snapshot context
  stakeholders:      jsonb('stakeholders'),           // Clerk user IDs who were consulted
  decisionType:      text('decision_type'),           // reversible|irreversible|experimental

  // Outcome tracking (retroactive — could be months later)
  outcome:           text('outcome'),                 // good|bad|neutral|pending
  outcomeTaggedBy:   text('outcome_tagged_by'),
  outcomeTaggedAt:   timestamp('outcome_tagged_at'),
  outcomeNotes:      text('outcome_notes'),
  outcomeConfidence: integer('outcome_confidence'),   // 1–10 scale

  // AI-computed quality score (0–100)
  qualityScore:      integer('quality_score'),
  qualityFeedback:   text('quality_feedback'),
  qualityScoredAt:   timestamp('quality_scored_at'),

  // Vector embedding for semantic search (pgvector)
  embedding:         jsonb('embedding'),

  tags:              jsonb('tags'),                   // string[]
  createdAt:         timestamp('created_at').defaultNow(),
  updatedAt:         timestamp('updated_at').defaultNow(),
}, (t) => ({
  workspaceIdx:  index('d_workspace_idx').on(t.workspaceId, t.createdAt),
  workflowIdx:   index('d_workflow_idx').on(t.workflowId),
  outcomeIdx:    index('d_outcome_idx').on(t.workspaceId, t.outcome),
  qualityIdx:    index('d_quality_idx').on(t.workspaceId, t.qualityScore),
}))

// ─────────────────────────────────────────────
// AUTOMATION RUNS — Execution log
// ─────────────────────────────────────────────
export const automationRuns = pgTable('automation_runs', {
  id:               uuid('id').primaryKey().defaultRandom(),
  workspaceId:      uuid('workspace_id').notNull(),
  automationNodeId: uuid('automation_node_id').notNull(),
  triggerEvent:     text('trigger_event').notNull(),
  status:           text('status').notNull().default('pending'),
  result:           jsonb('result'),
  error:            text('error'),
  triggeredAt:      timestamp('triggered_at').defaultNow(),
  completedAt:      timestamp('completed_at'),
})

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  workflows: many(workflows),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
}))

export const workflowsRelations = relations(workflows, ({ many }) => ({
  nodes: many(nodes),
  edges: many(edges),
}))

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  workflow: one(workflows, { fields: [nodes.workflowId], references: [workflows.id] }),
  threads: many(threads),
}))

export const threadsRelations = relations(threads, ({ one, many }) => ({
  node: one(nodes, { fields: [threads.nodeId], references: [nodes.id] }),
  messages: many(messages),
}))

export const decisionsRelations = relations(decisions, ({ one }) => ({
  workflow: one(workflows, { fields: [decisions.workflowId], references: [workflows.id] }),
}))
```

### Key Raw SQL Indexes

```sql
-- Run via Neon console or migration file after schema push

-- pgvector support
CREATE EXTENSION IF NOT EXISTS vector;

-- Full-text search on node titles
CREATE INDEX IF NOT EXISTS idx_nodes_data_gin ON nodes USING gin(data);

-- pgvector index for Decision DNA semantic search
-- Run this after switching embedding column from jsonb to vector(768)
-- CREATE INDEX IF NOT EXISTS idx_decisions_embedding
--   ON decisions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 10. API DESIGN — ALL ENDPOINTS

### Standard Response Envelope

```typescript
type ApiResponse<T> = {
  data: T | null
  error: { code: string; message: string } | null
  meta?: { total?: number; cursor?: string; page?: number }
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| UNAUTHORIZED | 401 | Missing or invalid Clerk token |
| FORBIDDEN | 403 | Resource belongs to a different workspace |
| NOT_FOUND | 404 | Resource not found in this workspace |
| VALIDATION_ERROR | 400 | Request body failed Zod validation |
| PLAN_LIMIT | 402 | Action requires a higher plan tier |
| AI_UNAVAILABLE | 503 | All LLM providers temporarily unavailable |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Unexpected server error (auto-logged to Sentry) |

### Complete API Endpoint Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/workflows` | GET | Required | List all workflows for current workspace |
| `/api/v1/workflows` | POST | Required | Create a new workflow |
| `/api/v1/workflows/[id]` | GET | Required | Get workflow with all nodes and edges |
| `/api/v1/workflows/[id]` | PATCH | Required | Update workflow metadata |
| `/api/v1/workflows/[id]` | DELETE | Required | Delete workflow and all nodes |
| `/api/v1/nodes` | GET | Required | List nodes (filtered by workflowId) |
| `/api/v1/nodes` | POST | Required | Create a node |
| `/api/v1/nodes/[id]` | GET | Required | Get single node with thread count |
| `/api/v1/nodes/[id]` | PATCH | Required | Update node data, position, or status |
| `/api/v1/nodes/[id]` | DELETE | Required | Delete a node (cascades to threads) |
| `/api/v1/edges` | POST | Required | Create a connection between nodes |
| `/api/v1/edges` | DELETE | Required | Delete a connection |
| `/api/v1/threads/[nodeId]` | GET | Required | Get all threads + messages for a node |
| `/api/v1/threads/[nodeId]` | POST | Required | Post a message to a node's thread |
| `/api/v1/decisions` | GET | Required | List decisions (filterable by workflowId, outcome, tag) |
| `/api/v1/decisions` | POST | Required | Log a new decision |
| `/api/v1/decisions/[id]` | GET | Required | Get single decision |
| `/api/v1/decisions/[id]` | PATCH | Required | Update decision or tag outcome |
| `/api/v1/decisions/[id]/quality` | POST | Required | Trigger AI quality scoring for a decision |
| `/api/v1/decisions/search` | POST | Required | Semantic search over decision history |
| `/api/v1/ai/analyze` | POST | Required | LazyMind: Analyze a workflow graph |
| `/api/v1/ai/generate` | POST | Required | LazyMind: Generate workflow from description |
| `/api/v1/ai/digest` | POST | Required | LazyMind: Generate weekly digest |
| `/api/v1/templates` | GET | Public | Browse public template marketplace |
| `/api/v1/templates/[id]` | GET | Public | Get a single template |
| `/api/v1/templates` | POST | Required | Publish workflow as a template |
| `/api/v1/templates/[id]/install` | POST | Required | Install template into workspace |
| `/api/v1/upload` | POST | Required | Get signed Cloudflare R2 upload URL |
| `/api/v1/export` | GET | Required (Admin) | Export full workspace as JSON or CSV |
| `/api/v1/account/delete` | DELETE | Required | GDPR right-to-erasure: delete account |
| `/api/v1/billing/checkout` | POST | Required | Create Stripe or Razorpay checkout session |
| `/api/v1/billing/portal` | POST | Required | Open Stripe Customer Portal |
| `/api/v1/webhooks/inngest` | POST | Inngest sig | Receive automation event callbacks |
| `/api/v1/webhooks/stripe` | POST | Stripe sig | Handle Stripe subscription events |
| `/api/v1/webhooks/razorpay` | POST | Razorpay sig | Handle Razorpay subscription events |
| `/api/v1/search` | GET | Required | Unified search across all node types (title, content, semantic) |
| `/api/v1/import/notion` | POST | Required | Import workspace data from Notion API |
| `/api/v1/import/notion-zip` | POST | Required | Import workspace data from Notion ZIP export |
| `/api/v1/import/linear` | POST | Required | Import issues from Linear API |
| `/api/v1/import/csv` | POST | Required | Import data from generic CSV file |

---

## 11. REAL-TIME & MULTIPLAYER SYNC

### Two-Layer Real-Time Strategy

**Layer 1 — Presence (Liveblocks)**
Handles ephemeral, high-frequency events only:
- Cursor positions of all users in the canvas
- Active node selections
- Typing indicators in threads
- User join/leave signals

These events do NOT touch the database.

**Layer 2 — Data Sync (Optimistic + Server Reconciliation)**
All mutations flow as: optimistic local update → API write to Neon → broadcast to other clients.

### Conflict Resolution Strategy

| Content Type | Strategy | Rationale |
|---|---|---|
| Node position (x, y) | Last-write-wins | Debounced 500ms |
| Node status, priority | Last-write-wins with timestamp | Scalar field — latest timestamp wins |
| Doc content (rich text) | OT via Liveblocks + Tiptap collab | Google Docs-style merging |
| Table cell content | Last-write-wins per cell | Cell-level granularity |
| Thread messages | Append-only | Never edited or merged |
| Decision rationale | Versioned (updated_at check) | Preserve audit trail |

### Canvas Sync Pattern

```typescript
function onNodeDragStop(_event: any, node: Node) {
  // 1. Zustand already updated via onNodesChange — zero perceived latency
  // 2. Debounced DB write — don't hammer the API during fast drags
  debouncedSave(node.id, {
    positionX: Math.round(node.position.x),
    positionY: Math.round(node.position.y),
  })
  // 3. Liveblocks broadcasts to co-editors
  updatePresence({ dragging: { nodeId: node.id, pos: node.position } })
}

const debouncedSave = debounce(async (nodeId: string, data: any) => {
  await fetch(`/api/v1/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}, 500)
```

---

## 12. AUTOMATIONS ENGINE

### How AUTOMATION Nodes Execute

1. Next.js API route mutation completes successfully.
2. Inngest event fired: `lazynext/node.updated` or `lazynext/node.created`.
3. `processAutomationTrigger` Inngest function wakes.
4. Fetches all active AUTOMATION nodes for the workspace.
5. Evaluates each trigger condition against the change.
6. For each match, executes configured actions.
7. Logs the result to `automation_runs`.

### Inngest Function

```typescript
// lib/inngest/functions/automation-trigger.ts
import { inngest } from '../client'
import { db } from '@/lib/db/client'
import { nodes, automationRuns } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const processAutomationTrigger = inngest.createFunction(
  { id: 'process-automation-trigger', retries: 3 },
  { event: 'lazynext/node.updated' },
  async ({ event, step }) => {
    const { nodeId, workspaceId, changes, nodeType } = event.data

    const automations = await step.run('fetch-automations', async () => {
      return db.select().from(nodes).where(
        and(eq(nodes.workspaceId, workspaceId), eq(nodes.type, 'automation'))
      ).then(rows => rows.filter(r => (r.data as any)?.is_active))
    })

    for (const automation of automations) {
      const triggerConfig = (automation.data as any)?.trigger
      const actions = (automation.data as any)?.actions || []

      if (matchesTrigger(triggerConfig, changes, nodeType)) {
        await step.run(`execute-${automation.id}`, async () => {
          await executeActions(actions, workspaceId, nodeId)
          await db.insert(automationRuns).values({
            workspaceId,
            automationNodeId: automation.id,
            triggerEvent: triggerConfig.type,
            status: 'success',
            triggeredAt: new Date(),
            completedAt: new Date(),
          })
        })
      }
    }
  }
)

function matchesTrigger(trigger: any, changes: any, nodeType: string): boolean {
  if (!trigger) return false
  if (trigger.node_type && trigger.node_type !== nodeType) return false
  switch (trigger.type) {
    case 'node_status_change': return changes.status?.new === trigger.condition?.status
    case 'due_date_passed': return changes.due_at?.new && new Date(changes.due_at.new) < new Date()
    case 'node_created': return changes.event === 'created'
    case 'decision_logged': return nodeType === 'decision' && changes.event === 'created'
    default: return false
  }
}
```

### Built-in Automation Types

| Trigger | Actions Available |
|---|---|
| `node_status_change` | create_node, send_notification, update_node, create_edge |
| `due_date_passed` | send_notification, escalate_to, update_priority |
| `node_created` | assign_to, send_notification, create_thread |
| `decision_logged` | notify_stakeholders, create_followup_task, score_decision |
| `schedule` (cron via Inngest) | create_node, send_digest, generate_pulse |
| `webhook_received` | Any action — triggered by external HTTP POST |

---

## 13. MULTI-TENANCY MODEL

### Architecture: Shared DB, Logical Isolation

All workspaces share one Neon Postgres instance. Isolation is enforced 100% at the application layer using `getWorkspaceId()`. This is the correct model until approximately $5M ARR.

### Clerk Organizations → Workspace Mapping

- One Clerk Organization = One Lazynext Workspace
- `orgId` stored as `clerk_org_id` in the `workspaces` table
- All workspace members managed through Clerk org membership
- Clerk handles invites, roles, and org switching

### RBAC Roles (via Clerk)

| Role | Permissions |
|---|---|
| `org:admin` | Full access. Manage members. Billing. Export. Delete workspace. |
| `org:member` | Create and edit nodes. Cannot delete workflows or manage members. |
| `org:guest` | Read-only access to specific shared workflows only. |

---

## 14. SECURITY MODEL

### Four Defense Layers

**Layer 1 — Network Edge**
- DDoS protection via Cloudflare in front of Vercel
- Automatic HTTPS. No HTTP allowed.
- Rate limiting: 100 requests/minute per user via Upstash Redis
- Bot detection on auth endpoints

**Layer 2 — Authentication (Clerk)**
- All protected routes check `auth()` before any DB access
- Session tokens are short-lived JWTs signed by Clerk
- `middleware.ts` is the first line of defense for all app routes

**Layer 3 — Authorization (Workspace Scoping)**
- `getWorkspaceId()` is called in every API handler before any DB query
- The `workspace_id` is NEVER trusted from the API caller
- Row-level checks: verify `node.workspaceId === workspaceId` before returning data
- Role checks: admin-only actions (billing, export, delete) check Clerk org role

**Layer 4 — Data**
- All secrets stored in Vercel environment variables, never in code
- Database connection strings never exposed to client-side code
- Cloudflare R2 files accessed via signed URLs (time-limited, per-user)
- All webhook endpoints verify signatures (Stripe, Inngest, Razorpay)
- CORS: only `lazynext.com` and `*.lazynext.com` allowed to call API
- CSP headers set to prevent XSS

### Security Headers (next.config.js)

```typescript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.lazynext.com https://*.clerk.accounts.dev https://*.posthog.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.cloudflare.com https://img.clerk.com",
      "connect-src 'self' https://api.clerk.com https://*.clerk.accounts.dev wss://liveblocks.io https://*.liveblocks.io https://api.groq.com https://api.together.xyz https://api-atlas.nomic.ai https://api.anthropic.com https://*.upstash.io https://*.posthog.com https://*.sentry.io https://api.resend.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self' https://api.razorpay.com https://checkout.stripe.com",
    ].join('; '),
  },
]

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

---

## 15. RESPONSIVE DESIGN SYSTEM

### Color Tokens (Tailwind Config)

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',  // Primary brand blue
          600: '#3d5bd4',
          900: '#1a2660',
        },
        canvas: {
          bg: '#0f172a',    // Dark canvas background
          grid: '#1e293b',  // Canvas grid color
          node: '#1e293b',  // Default node background
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
export default config
```

### Component Sizing Rules

| Element | Mobile | Tablet | Desktop |
|---|---|---|---|
| Touch target (buttons, icons) | min 44×44px | min 44×44px | min 32×32px |
| Font size (body) | 16px | 15px | 14px |
| Font size (labels) | 14px | 13px | 12px |
| Node card width | full width | 260px | 240px |
| Sidebar width | full screen drawer | 240px | 240px |
| Right panel width | full screen | 320px | 320–384px |

---

## 16. DEPLOYMENT & CI/CD

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["bom1"],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    },
    "app/api/v1/ai/**": {
      "maxDuration": 60
    }
  }
}
```

> **Region note:** `bom1` is the Mumbai region. This ensures the lowest latency to your primary India user base and to your Neon `ap-south-1` database.

### GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-and-integration:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
        env:
          GROQ_API_KEY: test_groq_key
          TOGETHER_API_KEY: test_together_key
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_placeholder
          CLERK_SECRET_KEY: sk_test_placeholder
          DATABASE_URL: postgresql://test:test@localhost/test

  typecheck:
    name: TypeScript Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit

  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: [unit-and-integration, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Deployment Branches

| Branch | Environment | Vercel | Domain |
|---|---|---|---|
| `main` | Production | Auto-deploy | lazynext.com |
| `develop` | Staging | Auto-deploy | staging.lazynext.com |
| `feature/*` | Preview | Auto-deploy | pr-N.lazynext.com |

---

## 17. ENVIRONMENT VARIABLES — COMPLETE LIST

### .env.example (commit this file)

```bash
# ─────────────────────────────────────────────────────────────────────────────
# LAZYNEXT — Environment Variables
# Copy this file to .env.local and fill in real values.
# NEVER commit .env.local to git.
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE — NEON POSTGRES
# Get from: https://console.neon.tech → Your Project → Connection Details
# CRITICAL: DATABASE_URL is the POOLED connection (for runtime)
#           DATABASE_URL_UNPOOLED is the DIRECT connection (for migrations only)
# ─────────────────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://username:password@ep-xxx.ap-south-1.aws.neon.tech/neondb?pgbouncer=true&connection_limit=1
DATABASE_URL_UNPOOLED=postgresql://username:password@ep-xxx.ap-south-1.aws.neon.tech/neondb

# ─────────────────────────────────────────────────────────────────────────────
# AUTHENTICATION — CLERK
# Get from: https://dashboard.clerk.com → Your App → API Keys
# ─────────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/onboarding/create-workspace
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding/create-workspace

# ─────────────────────────────────────────────────────────────────────────────
# FILE STORAGE — CLOUDFLARE R2
# Get from: https://dash.cloudflare.com → R2 → Your Bucket → API Tokens
# ─────────────────────────────────────────────────────────────────────────────
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=lazynext-files
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://files.lazynext.com

# ─────────────────────────────────────────────────────────────────────────────
# AI — GROQ (PRIMARY)
# Get from: https://console.groq.com → API Keys
# ─────────────────────────────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# ─────────────────────────────────────────────────────────────────────────────
# AI — TOGETHER AI (FALLBACK)
# Get from: https://api.together.xyz → Settings → API Keys
# ─────────────────────────────────────────────────────────────────────────────
TOGETHER_API_KEY=...
TOGETHER_MODEL=meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo

# ─────────────────────────────────────────────────────────────────────────────
# AI — NOMIC EMBEDDINGS
# Get from: https://atlas.nomic.ai → API Keys
# ─────────────────────────────────────────────────────────────────────────────
NOMIC_API_KEY=...

# ─────────────────────────────────────────────────────────────────────────────
# AUTOMATION — INNGEST
# Get from: https://app.inngest.com → Your App → Settings
# ─────────────────────────────────────────────────────────────────────────────
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=signkey-...

# ─────────────────────────────────────────────────────────────────────────────
# EMAIL — RESEND
# Get from: https://resend.com → API Keys
# ─────────────────────────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@lazynext.com

# ─────────────────────────────────────────────────────────────────────────────
# REAL-TIME — LIVEBLOCKS
# Get from: https://liveblocks.io/dashboard
# ─────────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...
LIVEBLOCKS_SECRET_KEY=sk_...

# ─────────────────────────────────────────────────────────────────────────────
# RATE LIMITING — UPSTASH REDIS
# Get from: https://console.upstash.com
# ─────────────────────────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# ─────────────────────────────────────────────────────────────────────────────
# BILLING — STRIPE (International)
# Get from: https://dashboard.stripe.com → Developers → API Keys
# ─────────────────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TEAM_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# ─────────────────────────────────────────────────────────────────────────────
# BILLING — RAZORPAY (India)
# Get from: https://dashboard.razorpay.com → Settings → API Keys
# ─────────────────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_TEAM_PLAN_ID=plan_...
RAZORPAY_BUSINESS_PLAN_ID=plan_...

# ─────────────────────────────────────────────────────────────────────────────
# ERROR TRACKING — SENTRY
# Get from: https://sentry.io → Your Project → Settings → SDK Setup
# ─────────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=lazynext
SENTRY_PROJECT=lazynext-web

# ─────────────────────────────────────────────────────────────────────────────
# PRODUCT ANALYTICS — POSTHOG
# Get from: https://posthog.com → Your Project → Settings
# ─────────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ─────────────────────────────────────────────────────────────────────────────
# APP METADATA
# ─────────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://lazynext.com
NEXT_PUBLIC_APP_NAME=Lazynext
NODE_ENV=production
```

---

## 18. COST ARCHITECTURE

### Free Tier Coverage (Launch Day)

| Service | Free Tier Limit | Action When Exceeded |
|---|---|---|
| Vercel | 100GB bandwidth | Upgrade to Pro ($20/month) |
| Neon | 0.5GB storage + 1 compute unit | Upgrade to Pro ($19/month) |
| Clerk | 10,000 MAU | Upgrade to Pro ($25/month) |
| Liveblocks | 50 simultaneous connections | Upgrade to Starter ($9/month) |
| Inngest | 50,000 runs/month | Upgrade to Pro |
| Cloudflare R2 | 10GB + zero egress | $0.015/GB beyond 10GB |
| Resend | 3,000 emails/month | Upgrade to Pro ($20/month) |
| PostHog | 1M events/month | Self-host or upgrade |
| Sentry | 5,000 errors/month | Upgrade to Team ($26/month) |
| Groq API | 14,400 req/day | Together AI fallback |
| Razorpay | No monthly fee | 2% per transaction |
| **Total at launch** | | **$0/month** |

### Cost Projection at Scale

| Stage | MAU | Monthly Infra | Estimated ARR | Infra % of ARR |
|---|---|---|---|---|
| Pre-launch | 0–500 | $0 | $0 | — |
| Early traction | 500–5k | $25–50 | $50k | 0.1% |
| Growth | 5k–50k | $200–500 | $500k | 0.1% |
| Scale | 50k–200k | $1,500 | $2M | 0.9% |
| PMF+ | 200k–1M | $5,000 | $10M | 0.6% |
| Hypergrowth | 1M+ | $15,000 | $50M+ | 0.03% |

Infrastructure cost stays below 1% of ARR all the way to $50M ARR.

---

## 19. MONETIZATION & PRICING

> ⚠️ **PRICING NOTE (V9):** The pricing tiers below were the original USD-first model. **Section 51 is now the single authoritative pricing model** with INR tiers (₹0 / ₹499 / ₹999 / ₹2,999/month). The tables below are retained for historical context and international reference only. All implementation must use Section 51 values.

### Pricing Tiers

| Tier | Price (International) | Price (India) | Key Features |
|---|---|---|---|
| **Free** | $0 | ₹0 | ≤3 users, 5 workflows, 1 automation, 10 AI queries/month |
| **Team** | $19/seat/month | ₹799/seat/month | Unlimited everything, Decision DNA (basic), guest access, templates |
| **Business** | $39/seat/month | ₹1,599/seat/month | Decision DNA full (quality scoring, analytics), advanced PULSE, audit logs, API access |
| **Enterprise** | Custom | Custom | SSO (SAML), data residency, self-hosted LLM, custom AI prompts, SLA, CSM |
| **Template Marketplace** | Revenue share | Revenue share | 70% to creator, 30% to Lazynext |

> **India Pricing Rationale:** ₹799/seat/month ≈ $9.60. This is a ~50% discount from USD pricing, appropriate for Indian purchasing power parity. Indian companies have the same ROI calculation — they're replacing tools that collectively cost ₹3,000–8,000/seat/month. The math still works.

### Razorpay Integration (India Billing)

```typescript
// lib/billing/razorpay.ts
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function createRazorpaySubscription(
  planId: string,
  customerId: string,
  totalCount: number = 12 // months
) {
  return razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: totalCount,
    notes: { lazynext_customer_id: customerId },
  })
}

export function verifyRazorpayWebhook(body: string, signature: string): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return expectedSignature === signature
}
```

```typescript
// app/api/v1/billing/checkout/route.ts (Razorpay path)
export async function POST(req: Request) {
  const { userId, orgId } = auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { plan, gateway, seats } = await req.json()
  const workspaceId = await getWorkspaceId()

  if (gateway === 'razorpay') {
    const planId = plan === 'team'
      ? process.env.RAZORPAY_TEAM_PLAN_ID!
      : process.env.RAZORPAY_BUSINESS_PLAN_ID!

    const subscription = await createRazorpaySubscription(planId, workspaceId)
    return NextResponse.json({ data: { subscriptionId: subscription.id, gateway: 'razorpay' }, error: null })
  }

  // Stripe path (international)
  // ... existing Stripe checkout logic
}
```

### Plan Feature Gates

```typescript
// lib/utils/plan-gates.ts
export const PLAN_LIMITS = {
  free: {
    maxUsers: 3,
    maxWorkflows: 5,
    maxAutomations: 1,
    aiQueriesPerMonth: 10,
    decisionDNA: 'basic',       // Can log decisions, no quality scoring
    decisionHistory: 20,         // Max decisions stored
    guestAccess: false,
    templatePublish: false,
    apiAccess: false,
    dataExport: false,
  },
  team: {
    maxUsers: Infinity,
    maxWorkflows: Infinity,
    maxAutomations: Infinity,
    aiQueriesPerMonth: Infinity,
    decisionDNA: 'basic',
    decisionHistory: Infinity,
    guestAccess: true,
    templatePublish: true,
    apiAccess: false,
    dataExport: false,
  },
  business: {
    maxUsers: Infinity,
    maxWorkflows: Infinity,
    maxAutomations: Infinity,
    aiQueriesPerMonth: Infinity,
    decisionDNA: 'full',         // Quality scoring, analytics, semantic search
    decisionHistory: Infinity,
    guestAccess: true,
    templatePublish: true,
    apiAccess: true,
    dataExport: true,
  },
  enterprise: {
    maxUsers: Infinity,
    maxWorkflows: Infinity,
    maxAutomations: Infinity,
    aiQueriesPerMonth: Infinity,
    decisionDNA: 'full',
    decisionHistory: Infinity,
    guestAccess: true,
    templatePublish: true,
    apiAccess: true,
    dataExport: true,
  },
}
```

---

## 20. PHASED BUILD ROADMAP — REALISTIC MVP-FIRST APPROACH

> **V3 Change from V2:** The original 16-week roadmap tried to build all 7 primitives simultaneously. That approach is the #1 risk to this project. This V3 roadmap uses a primitive priority order: ship TASK + DOC + DECISION first. They are your wedge and your moat. TABLE and AUTOMATION come later and can be built incrementally.

### Phase 1 — Decision OS MVP (Weeks 1–6)

**Goal:** Ship the one thing no competitor has. A user can log work (TASK), write about it (DOC), and record every decision with full attribution (DECISION). LazyMind can analyze it all.

**This is your launch product. Ship this. Get users. Do not wait for Phase 2.**

- [ ] Initialize Next.js 14 project with TypeScript, Tailwind, shadcn/ui
- [ ] Configure Clerk.dev — sign-up, sign-in, org creation, `middleware.ts`
- [ ] Set up Neon.tech — create database (Mumbai region), enable pgvector
- [ ] Install Drizzle ORM — write complete schema (Section 9), push, verify
- [ ] Implement `getWorkspaceId()` workspace isolation helper
- [ ] Build React Flow canvas — pan, zoom, `NodeWrapper.tsx`
- [ ] Implement TASK nodes — create, drag, update status, assign, set due date
- [ ] Implement DOC nodes — Tiptap editor in sidebar panel, save/load content
- [ ] Implement DECISION nodes — question/options/resolution/rationale form (see Section 31)
- [ ] Implement THREAD nodes — contextual comments on any node
- [ ] Edge connections between nodes
- [ ] Zustand canvas store with undo/redo (see Section 7)
- [ ] NodeListView for mobile (no canvas on mobile)
- [ ] All keyboard shortcuts (Section 7)
- [ ] `/api/v1/workflows`, `/api/v1/nodes`, `/api/v1/edges` CRUD routes
- [ ] `/api/v1/decisions` CRUD routes
- [ ] Liveblocks multiplayer cursor presence
- [ ] Responsive sidebar — desktop fixed, mobile bottom nav
- [ ] Workspace onboarding flow (create workspace → first workflow)
- [ ] LazyMind AI panel with Groq + Together AI failover
- [ ] LazyMind: Workflow analysis (why stuck? who is overloaded? what's at risk?)
- [ ] LazyMind: Workflow generation from text description
- [ ] Resend email: workspace invite, task assignment notification
- [ ] Deploy to Vercel (Mumbai region `bom1`) with custom domain `lazynext.com`
- [ ] GitHub Actions CI pipeline (type-check, unit tests, lint)
- [ ] Sentry error tracking configured
- [ ] PostHog analytics configured

**Phase 1 Success Criteria:**
- [ ] User can sign up, create workspace, build a workflow with TASK + DOC + DECISION nodes
- [ ] User can log a decision with rationale and all fields
- [ ] LazyMind can analyze the workflow and return a meaningful response in under 5 seconds
- [ ] Two users can view the same canvas simultaneously with live cursors
- [ ] Everything works on iPhone (NodeListView + touch targets)
- [ ] TypeScript: zero errors. `npm run typecheck` passes.
- [ ] Unit tests: 60%+ coverage on lib/ai, lib/db, lib/utils
- [ ] Lighthouse score: 85+ on landing page

---

### Phase 2 — Retention Layer (Weeks 7–12)

**Goal:** The primitives from Phase 1 now have automation and visibility. Teams have a reason to stay every week.

**Prerequisites:** At least 10 active users on Phase 1. Do not build Phase 2 in a vacuum.

- [ ] PULSE primitive — auto-computed status view from workspace node data
- [ ] PULSE: task completion rate, overdue count, workload by assignee, blocked count
- [ ] PULSE: configurable refresh interval, widget-based layout
- [ ] AUTOMATION primitive — UI builder in sidebar
- [ ] Inngest automation engine — `processAutomationTrigger` (Section 12)
- [ ] Automation: 4 trigger types + 4 action types fully working
- [ ] Global search — find any node by title across all workflows
- [ ] File attachments — Cloudflare R2 upload, display in node sidebar
- [ ] `@mention` in thread messages — Clerk user lookup autocomplete
- [ ] Node duplicate / copy-paste on canvas
- [ ] Collaborative DOC editing — Liveblocks + Tiptap `CollaborationExtension`
- [ ] Decision DNA: semantic search over past decisions (Nomic embeddings + pgvector)
- [ ] Decision DNA: weekly Decision Digest email (Inngest + Resend)
- [ ] Decision DNA: AI quality scoring (see Section 31)
- [ ] Template system — save workflow as template, browse, install
- [ ] Guest access — share workflow via link (read-only)
- [ ] Weekly AI digest email (Inngest cron + LazyMind + Resend)
- [ ] Trigger.dev background jobs: embedding sync, digest dispatch
- [ ] Unit test coverage to 75%+

**Phase 2 Success Criteria:**
- [ ] LazyMind weekly digest email sends automatically every Monday
- [ ] At least one end-to-end automation (task status change → notify assignee) works
- [ ] Semantic decision search returns relevant results (manual QA test with 20 decisions)
- [ ] All 5 Playwright E2E critical paths pass
- [ ] Sentry is capturing real errors from staging

---

### Phase 3 — TABLE Primitive (Weeks 13–20)

**Goal:** Add the highest-complexity primitive properly. Grid view only for Phase 3 launch. Kanban/gallery views in Phase 3.1.

**Prerequisites:** Phase 2 complete. At least 50 active users. TABLE is a retention/expansion feature, not an acquisition feature.

- [ ] TABLE node — grid view: add/remove columns, add rows, cell editing
- [ ] Column types: text, number, date, select (dropdown), checkbox, person (user lookup)
- [ ] Row-level data persisted in JSONB `data.rows`
- [ ] Basic filter and sort on grid view
- [ ] Export TABLE data as CSV
- [ ] TABLE nodes can reference other nodes (linked records)
- [ ] Automation triggers on TABLE row events (row created, field changed)
- [ ] Kanban view (Phase 3.1 — after grid view ships and is stable)
- [ ] Gallery view (Phase 3.2)
- [ ] Calendar view (Phase 3.2)

**Phase 3 Success Criteria:**
- [ ] User can create a TABLE with 5+ columns of mixed types
- [ ] Table data persists across sessions without loss
- [ ] CSV export produces clean, correct output
- [ ] No regression in Phase 1 or Phase 2 features (full E2E suite passes)

---

### Phase 4 — Monetization & Growth (Weeks 21–24)

**Goal:** First paying customer. Organic growth loop activated.

- [ ] Stripe billing — Checkout for Team and Business (international)
- [ ] Razorpay billing — Subscription for Team and Business (India, INR)
- [ ] Billing detection: workspace IP → India → Razorpay, else → Stripe
- [ ] Stripe + Razorpay webhook handlers — update `workspaces.plan`
- [ ] Plan enforcement — feature gates throughout UI and API
- [ ] Free tier limits enforced: 3 users, 5 workflows, 1 automation, 10 AI queries
- [ ] Template marketplace — public browse, install, and publish
- [ ] Revenue sharing for template creators
- [ ] Public workflow showcase — shareable read-only canvas URLs
- [ ] Guided onboarding tour for new workspaces
- [ ] PostHog: funnel analysis, feature flag rollouts, session replay
- [ ] Performance audit: Lighthouse 90+ on all pages
- [ ] Accessibility audit: WCAG AA compliance
- [ ] SEO: meta tags, Open Graph images, sitemap.xml, robots.txt
- [ ] Status page: https://status.lazynext.com

**Phase 4 Success Criteria:**
- [ ] First Team plan subscriber via Stripe or Razorpay
- [ ] Template marketplace has 5+ public templates
- [ ] Lighthouse score 90+ on landing page
- [ ] All items in Post-Launch Checklist (Section 26) complete

---

### Definition of Done Per Primitive

| Primitive | Done When... |
|---|---|
| TASK | Create, assign, set due date, change status, add to canvas — all work. Subtasks render. Assignee receives email notification. |
| DOC | Tiptap editor loads, saves, reloads without loss. Slash commands work. Two users can edit simultaneously without conflict. |
| DECISION | All fields work. Quality score is computed on save. Outcome tagging works. Semantic search returns relevant results. |
| THREAD | Messages send and persist. Thread visible on parent node. Mark resolved works. `@mention` sends notification. |
| PULSE | 3+ metrics render from live node data. Refresh interval respected. Mobile view works. |
| AUTOMATION | One trigger type + two action types work end-to-end, logged in Inngest dashboard. |
| TABLE | Grid view: add/remove columns, add rows, save. CSV export works. At least text + number + date column types functional. |

---

## 21. DIRECTORY & FILE STRUCTURE — COMPLETE TREE

```
lazynext/
├── .github/
│   └── workflows/
│       └── ci.yml
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   └── layout.tsx
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── templates/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── onboarding/
│   │   │   ├── create-workspace/page.tsx
│   │   │   └── first-workflow/page.tsx
│   │   ├── workspace/[slug]/
│   │   │   ├── canvas/[id]/page.tsx
│   │   │   ├── pulse/page.tsx
│   │   │   ├── decisions/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/v1/
│   │   ├── workflows/route.ts
│   │   ├── workflows/[id]/route.ts
│   │   ├── nodes/route.ts
│   │   ├── nodes/[id]/route.ts
│   │   ├── edges/route.ts
│   │   ├── threads/[nodeId]/route.ts
│   │   ├── decisions/route.ts
│   │   ├── decisions/[id]/route.ts
│   │   ├── decisions/[id]/quality/route.ts
│   │   ├── decisions/search/route.ts
│   │   ├── search/route.ts
│   │   ├── ai/analyze/route.ts
│   │   ├── ai/generate/route.ts
│   │   ├── ai/digest/route.ts
│   │   ├── import/
│   │   │   ├── notion/route.ts
│   │   │   ├── notion-zip/route.ts
│   │   │   ├── linear/route.ts
│   │   │   └── csv/route.ts
│   │   ├── templates/route.ts
│   │   ├── templates/[id]/route.ts
│   │   ├── templates/[id]/install/route.ts
│   │   ├── upload/route.ts
│   │   ├── export/route.ts
│   │   ├── account/delete/route.ts
│   │   ├── billing/checkout/route.ts
│   │   ├── billing/portal/route.ts
│   │   └── webhooks/
│   │       ├── inngest/route.ts
│   │       ├── stripe/route.ts
│   │       └── razorpay/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   ├── not-found.tsx
│   └── sitemap.ts
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx
│   │   ├── nodes/
│   │   │   ├── NodeWrapper.tsx
│   │   │   ├── TaskNode.tsx
│   │   │   ├── DocNode.tsx
│   │   │   ├── TableNode.tsx
│   │   │   ├── ThreadNode.tsx
│   │   │   ├── DecisionNode.tsx
│   │   │   ├── AutomationNode.tsx
│   │   │   └── PulseNode.tsx
│   │   ├── edges/
│   │   │   └── ConditionalEdge.tsx
│   │   ├── panels/
│   │   │   ├── CanvasToolbar.tsx
│   │   │   ├── NodeDetailPanel.tsx
│   │   │   └── AutomationBuilder.tsx
│   │   └── mobile/
│   │       └── NodeListView.tsx
│   ├── lazymind/
│   │   ├── LazyMindPanel.tsx
│   │   ├── LazyMindMessage.tsx
│   │   └── LazyMindQuickActions.tsx
│   ├── pulse/
│   │   ├── PulseDashboard.tsx
│   │   ├── MetricCard.tsx
│   │   └── WorkloadChart.tsx
│   ├── decisions/
│   │   ├── DecisionList.tsx
│   │   ├── DecisionCard.tsx
│   │   ├── DecisionTimeline.tsx
│   │   ├── DecisionQualityBadge.tsx
│   │   ├── DecisionHealthDashboard.tsx
│   │   └── DecisionSearch.tsx
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── command.tsx
│   │   └── separator.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── MobileBottomNav.tsx
│   │   ├── TopBar.tsx
│   │   └── WorkspaceSelector.tsx
│   └── marketing/
│       ├── Hero.tsx
│       ├── FeaturesGrid.tsx
│       ├── PricingTable.tsx
│       ├── ConsolidationMap.tsx
│       ├── Testimonials.tsx
│       ├── DecisionDNAExplainer.tsx
│       └── Footer.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   ├── scoped-query.ts
│   │   └── migrations/
│   ├── ai/
│   │   ├── lazymind.ts
│   │   ├── groq.ts
│   │   ├── together.ts
│   │   ├── embeddings.ts
│   │   ├── prompts.ts
│   │   └── serialize.ts
│   ├── billing/
│   │   ├── stripe.ts
│   │   └── razorpay.ts
│   ├── inngest/
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── automation-trigger.ts
│   │       ├── weekly-digest.ts
│   │       ├── embedding-sync.ts
│   │       └── decision-quality-score.ts
│   ├── email/
│   │   ├── resend.ts
│   │   └── templates/
│   │       ├── InviteEmail.tsx
│   │       ├── WeeklyDigestEmail.tsx
│   │       ├── TaskAssignedEmail.tsx
│   │       └── DecisionDigestEmail.tsx
│   └── utils/
│       ├── cn.ts
│       ├── format.ts
│       ├── constants.ts
│       ├── rate-limit.ts
│       └── plan-gates.ts
├── stores/
│   ├── canvas.store.ts
│   ├── workspace.store.ts
│   └── ui.store.ts
├── hooks/
│   ├── useCanvas.ts
│   ├── useWorkflow.ts
│   ├── useLazyMind.ts
│   └── useMediaQuery.ts
├── tests/
│   ├── unit/
│   │   ├── serialize.test.ts
│   │   ├── zod-schemas.test.ts
│   │   ├── lazymind-failover.test.ts
│   │   ├── plan-gates.test.ts
│   │   └── decision-quality.test.ts
│   ├── integration/
│   │   └── nodes-api.test.ts
│   ├── e2e/
│   │   └── critical-paths.spec.ts
│   ├── mocks/
│   │   └── server.ts
│   └── setup.ts
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json
├── .env.local              # Never commit. Real secrets.
├── .env.example            # Commit this. All vars with placeholder values.
├── .gitignore
└── package.json
```

---

## 22. KEY CODE IMPLEMENTATIONS

### Complete `middleware.ts`

> **See Section 8 for the authoritative `middleware.ts` implementation.** Uses `clerkMiddleware()` from `@clerk/nextjs/server` (not the deprecated `authMiddleware`).

### Complete Neon Client

> **See Section 8 for the authoritative `lib/db/client.ts` and `drizzle.config.ts` implementations.** Uses `@neondatabase/serverless` with pooled connection for runtime, unpooled for migrations.

### Rate Limiting

> **See Section 8 for the authoritative `lib/utils/rate-limit.ts` implementation**, and **Section 53.2 for the comprehensive rate limiter configuration** with per-route limits (API, LazyMind, auth, export, invite).

### R2 File Upload (Signed URL)

```typescript
// app/api/v1/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const UploadSchema = z.object({
  filename: z.string().max(255),
  contentType: z.string().regex(/^(image|video|application|text)\//),
  nodeId: z.string().uuid(),
})

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const parsed = UploadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 })

  const { filename, contentType, nodeId } = parsed.data
  const key = `${userId}/${nodeId}/${Date.now()}-${filename}`

  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 }) // 5 minutes

  return NextResponse.json({
    data: {
      uploadUrl: signedUrl,
      publicUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
    },
    error: null,
  })
}
```

### Complete package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 23. SEO, ACCESSIBILITY & PERFORMANCE

### Target Scores

| Metric | Target | Why |
|---|---|---|
| Lighthouse Performance | 90+ | User trust and Core Web Vitals ranking signal |
| Lighthouse Accessibility | 95+ | Legal compliance and broader reach |
| First Contentful Paint | < 1.5s | Critical for India mobile users on 4G |
| Largest Contentful Paint | < 2.5s | Google ranking signal |
| Cumulative Layout Shift | < 0.1 | Prevents jarring layout jumps on load |
| Time to Interactive | < 3.5s | When the user can actually use the page |

### SEO Implementation

```typescript
// app/(marketing)/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lazynext — One Platform That Replaces Every Tool Your Team Misuses',
  description: 'Replace Notion, Linear, Trello, Airtable, Zapier, and Slack in one unified workflow platform. Lazynext is the operating system for remote teams.',
  keywords: ['workflow management', 'project management', 'notion alternative', 'linear alternative', 'team collaboration', 'decision tracking'],
  openGraph: {
    title: 'Lazynext — The Anti-Software Workflow Platform',
    description: 'Stop switching apps. Start shipping work.',
    url: 'https://lazynext.com',
    siteName: 'Lazynext',
    images: [{ url: 'https://lazynext.com/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@lazynext',
    creator: '@lazynext',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://lazynext.com' },
}
```

### Accessibility Requirements

- All interactive elements: `aria-label` or visible text label
- Color contrast: minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA)
- All images: `alt` attribute required
- Form inputs: associated `label` elements, never placeholder-only
- Focus indicators: visible on all focusable elements (not just `:focus`, also `:focus-visible`)
- Modal dialogs: trap focus inside modal, `aria-modal="true"`, `Escape` closes
- Canvas: all canvas actions available via keyboard or mobile list view

### Performance Optimizations

- Next.js Image component for all images: automatic WebP, lazy loading, sizing
- Dynamic imports for heavy components: `dynamic(() => import('reactflow'), { ssr: false })`
- Landing page: static generation (no server-side rendering)
- Canvas page: client-side only (no SSR for ReactFlow)
- Bundle analysis: run `ANALYZE=true npm run build` monthly, target < 250KB first load JS
- Font loading: `next/font` for Inter, no layout shift on font load

---

## 24. GO-TO-MARKET STRATEGY & GROWTH FLYWHEELS

### Ideal Customer Profile (ICP)

**Primary ICP — The Drowning Founder**
- Company type: B2B SaaS startup, digital agency, or remote-first product team
- Team size: 3–20 people
- Geography: India (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune) and Southeast Asia first
- Tools currently using: Notion + Linear/Trello + Slack + at least one more
- Buying behavior: Founder or operations lead makes the call. No procurement. Can sign up and pay without a sales call.
- Time to value: Must see value within 15 minutes of sign-up

**Secondary ICP — The Ops-Obsessed PM**
- Company type: 20–100 person tech company with an established product team
- Geography: India + UK + Australia (English-speaking markets with SaaS adoption)
- Pain: Decision accountability and institutional memory
- Buying behavior: PM champions it, budget owner approves. Less than $5k/year.
- Time to value: First Decision logged in under 5 minutes

### India-First Launch Strategy

**Why India first:**
- Bengaluru alone has 10,000+ product startups and tech teams
- Indian founders and PMs are highly active on Twitter/X and LinkedIn — word spreads fast
- Low CAC via content marketing (English-language content works natively)
- Competitive tools are priced in USD — ₹799/seat creates an immediate price advantage
- Supabase being blocked creates awareness among Indian developers of India-specific SaaS

**Launch channels (in priority order):**

1. **IndieHackers + Product Hunt (Week 1 of public launch)**
   - Post on IndieHackers 2 weeks before launch. Build an audience before launch day.
   - Launch on Product Hunt with a proper "Maker" profile, 30-second demo video, and first comment that explains Decision DNA.
   - Aim for top 5 Product of the Day. This gets 500–2,000 visitors. Convert 2–5% to free accounts.

2. **Twitter/X Developer Community**
   - Target: Indian devs and founders who follow @patio11, @shreyas, @shl, @startupindia
   - Content: Build-in-public thread. Share every milestone from day 1: "Day 7: built the Decision DNA primitive in Lazynext. Here's why no other tool has this." 
   - One substantive tweet per day during the build. Document the journey.

3. **LinkedIn — India Tech Community**
   - Target: Indian product managers, CTOs, and startup operators
   - Content type: Case study posts — "We replaced 6 tools with Lazynext. Here's how." (Write this after you have 5 real users doing it.)
   - Frequency: 3 LinkedIn posts per week

4. **Slack / Discord Communities**
   - Indian startup communities: SaaSBoomi Slack, Indian Founders Network, Product Folks India
   - Contribution strategy: Answer questions genuinely for 4 weeks before posting about Lazynext. Build credibility first.

5. **SEO Content (Medium-term: 60–180 days)**
   - Decision DNA content: "Why your team keeps making the same mistakes" → ranks for "decision log software", "team decision tracking"
   - Comparison content: "Lazynext vs Notion", "Lazynext vs Linear + Notion" → captures high-intent searches
   - Template SEO: Each public template page is a standalone SEO page (e.g. "Product Sprint Template", "OKR Tracking Template")

6. **Referral Program (at 100 users)**
   - Mechanism: Every Team plan member gets a unique referral link. Successful referral (new workspace upgrades to Team) → 1 month free for referrer.
   - This creates a viral coefficient > 0 within paying customers.

### Growth Flywheels

**Flywheel 1 — Template Virality**
User creates a workflow → publishes as a template → others install it → each installation is a new Lazynext user → some convert to paid → they create more templates. The template marketplace is a self-reinforcing distribution channel.

**Flywheel 2 — Decision DNA Virality**
Team logs decisions in Lazynext → later, a bad outcome is traced back to a logged decision → that moment of clarity is shared publicly ("We used Lazynext and caught ourselves repeating a 6-month-old mistake") → inbound traffic to lazynext.com → new signups.

**Flywheel 3 — Guest Access Virality**
Team member shares a read-only workflow with a client or external collaborator → guest sees the product in action → guest joins their own team or recommends to their company. Every guest view is a free demo.

**Flywheel 4 — AI Digest Forwarding**
The weekly LazyMind digest email is so useful that team members forward it to their managers → manager signs up → becomes an enterprise champion. Make the digest genuinely excellent.

### Activation Funnel & Targets

| Stage | Metric | Target |
|---|---|---|
| Landing page → Sign up | Conversion rate | 8–12% |
| Sign up → First workflow created | Activation rate | 60% (within 24h) |
| First workflow → First decision logged | Key activation event | 40% (within 7d) |
| First decision → Team invite sent | Virality trigger | 30% |
| Free → Team plan upgrade | Paid conversion | 8–12% |
| Team → Business upgrade | Expansion | 20% |

**Key activation event:** The first DECISION node logged is the single most predictive activation event. Users who log one decision within 7 days have 3× higher 30-day retention than users who don't. Optimize the entire onboarding flow to get the user to their first decision.

### Onboarding Optimization

The onboarding flow must be opinionated. Do not show the user a blank canvas and expect them to figure it out.

```
Step 1: "What kind of work does your team do?" (Product / Agency / Ops)
     ↓ (select one)
Step 2: Install the matching template workflow (pre-populated with example nodes)
     ↓ (auto-installed)
Step 3: "Your first task" — guided prompt to rename the first TASK node to a real task
     ↓ (complete)
Step 4: "Log your first decision" — modal appears: "What's one decision your team made recently?"
     ↓ (fill in question + resolution)
Step 5: Invite one teammate (pre-filled email input)
     ↓
Dashboard → LazyMind quick action: "Analyze this workflow"
```

Total time to activation: under 5 minutes. Every step should be skippable but not hidden.

### Competitive Differentiation in Marketing

Lead with Decision DNA in all marketing. Do not lead with "we replace Notion" — that's a race to the bottom against a $10B company.

Lead with: **"Do you know why your team made the decisions that shaped your product? Lazynext is the first tool that does."**

This is a problem every PM, founder, and team lead recognizes immediately. It is a category Lazynext owns entirely. Then once they're in, they discover that Lazynext also replaces Notion + Linear + Zapier.

---

## 25. UNIT ECONOMICS & FINANCIAL MODEL

### Core Assumptions

| Metric | Value | Rationale |
|---|---|---|
| Average team size | 8 seats | Median for B2B SaaS tool adoption |
| Monthly churn rate | 3% | SaaS benchmark for early-stage |
| Annual churn rate | ~32% | Converted from monthly |
| Average contract value (ACV) per seat | $19/seat/month (Team) | Primary tier |
| Blended ACV per workspace | $152/month (8 seats × $19) | |
| Annual workspace value | $1,824/year | |

### Customer Acquisition Cost (CAC)

At the India-first, PLG (product-led growth) model:

| Channel | Estimated CAC | Notes |
|---|---|---|
| Product Hunt launch | $0 | Organic — time cost only |
| Content/SEO | $5–15/signup | After 6 months, content drives inbound |
| Twitter/LinkedIn organic | $0–5/signup | Time cost of posting |
| Referral program | ~$19/workspace | 1 month free credit per referred workspace |
| Paid ads (after PMF) | $50–100/workspace | Google/LinkedIn ads — deploy after validating LTV |
| **Blended CAC target** | **< $30/workspace** | PLG keeps this very low |

### Lifetime Value (LTV)

```
LTV = (Average Monthly Revenue per Workspace) / Monthly Churn Rate
LTV = $152 / 0.03 = ~$5,067 per workspace

LTV:CAC ratio = $5,067 / $30 = ~169:1 (exceptional for PLG)
```

Even with pessimistic assumptions (monthly churn 5%, CAC $60):
```
LTV = $152 / 0.05 = $3,040
LTV:CAC = $3,040 / $60 = ~51:1
```

Both scenarios are excellent. SaaS benchmark for a healthy business is LTV:CAC > 3:1.

### Payback Period

```
Payback = CAC / Monthly Revenue Per Customer
Payback = $30 / $152 = 0.2 months

Even with pessimistic CAC of $100:
Payback = $100 / $152 = 0.66 months
```

CAC is recovered in under 1 month — this is the advantage of PLG.

### Revenue Milestones

| Milestone | Workspaces | MRR | ARR | Timeline |
|---|---|---|---|---|
| Ramen profitable | 20 | $3,040 | $36,480 | Month 6 |
| First $10k MRR | 66 | $10,000 | $120,000 | Month 9–12 |
| $100k ARR | 55 | $8,360 | $100,000 | Month 12–18 |
| $500k ARR | 274 | $41,700 | $500,000 | Month 18–30 |
| $1M ARR | 548 | $83,400 | $1,000,000 | Month 24–36 |

### India vs International Split (Year 1 Projections)

| Market | Workspaces | ARPU/month | MRR contribution |
|---|---|---|---|
| India (₹799/seat avg) | 60% of base | ~$70/workspace | $4,200 |
| International ($19/seat avg) | 40% of base | $152/workspace | $6,080 |
| Total at 100 workspaces | | | $10,280 MRR |

### Business Plan Upgrade Potential

20% of Team workspaces upgrade to Business ($39/seat). This represents:
- Additional $20/seat × 8 seats = $160/month per upgrading workspace
- At 100 workspaces: 20 Business workspaces × ($39×8) = $6,240/month from Business tier alone
- This is 60% revenue uplift from Decision DNA upsell with zero CAC

This is why Decision DNA must be deeply built into the Business plan and genuinely irreplaceable.

---

## 26. POST-LAUNCH CHECKLIST

### Security

- [ ] All API routes have auth check (`auth()` at the top)
- [ ] `getWorkspaceId()` called before any DB query in all API routes
- [ ] Rate limiting active on all `/api/v1/*` routes
- [ ] Stripe webhook secret verified in handler
- [ ] Razorpay webhook signature verified in handler
- [ ] R2 upload URL expiry set to 5 minutes
- [ ] Security headers set in `next.config.js`
- [ ] No secrets in git history (run `git log --all --full-diff -p | grep -E 'sk_|pk_|gsk_'`)

### Functional

- [ ] Sign up → create workspace → create workflow → add TASK → add DECISION → log decision: full flow works
- [ ] LazyMind analyze responds in under 5 seconds
- [ ] LazyMind generate produces a valid, parseable graph
- [ ] Together AI fallback: disable GROQ_API_KEY in staging → verify Together AI responds
- [ ] Groq + Together AI both unavailable: verify "AI temporarily unavailable" message appears
- [ ] Decision quality score is computed on every new decision save
- [ ] Weekly digest email sends on Monday at 9am IST (Inngest cron)
- [ ] Invite email sends when workspace owner invites a new member
- [ ] File upload works for images and PDFs (test both)
- [ ] Canvas undo/redo: add 3 nodes, undo twice, verify state

### Billing

- [ ] Stripe test mode: upgrade free → Team → verify `workspaces.plan` updated in DB
- [ ] Stripe test mode: cancel subscription → verify plan reverts to `free` via webhook
- [ ] Razorpay test mode: upgrade free → Team (INR) → verify plan updated
- [ ] Free tier limit enforced: 6th workflow blocked with upgrade prompt
- [ ] Plan enforcement: feature gates work for all Business-only features
- [ ] Data export: JSON and CSV download work for workspace with 50+ nodes
- [ ] Export restricted to ADMIN role — MEMBER role returns 403

### Mobile

- [ ] Full sign-up to first decision flow on iPhone (Safari): works without horizontal scroll
- [ ] NodeListView renders on screens < 640px (no ReactFlow on mobile)
- [ ] All touch targets are at least 44×44px
- [ ] Bottom navigation is within safe area insets on iPhone with home indicator

### Performance

- [ ] Lighthouse Performance ≥ 90 on landing page
- [ ] Lighthouse Performance ≥ 75 on canvas page (ReactFlow is heavy)
- [ ] LCP < 2.5s on landing page on 4G mobile simulation
- [ ] No N+1 query issues on `/api/v1/workflows` (check Sentry query traces)

### Cross-Browser

- [ ] Chrome (latest): full functional test
- [ ] Firefox (latest): full functional test
- [ ] Safari (latest, macOS): full functional test
- [ ] Safari (iOS, latest): mobile test
- [ ] Samsung Internet (latest): NodeListView test

### Observability

- [ ] Sentry capturing errors from production (test by throwing a deliberate error)
- [ ] PostHog capturing events: `workspace_created`, `node_created`, `decision_logged`, `plan_upgraded`
- [ ] Better Uptime status page live at `status.lazynext.com`
- [ ] Vercel analytics enabled

### Monthly Ongoing

- [ ] Review Sentry errors — fix anything with > 10 occurrences
- [ ] Review PostHog funnel — check sign-up → first decision conversion rate
- [ ] Review Neon query performance — add indexes for any query taking > 100ms
- [ ] Test on Safari, Firefox, Chrome — fix any regressions
- [ ] Rotate any API keys that have been exposed or are approaching limits

---

## 27. TESTING STRATEGY — COMPLETE

### Three Layers (All Mandatory)

| Layer | Tool | What It Tests | Coverage Target |
|---|---|---|---|
| Unit | **Vitest** | Pure functions, Zod schemas, AI serializer, plan gates, decision quality scorer | 80%+ |
| Integration | **Vitest + MSW** | API routes with mocked DB and Clerk auth | 70%+ |
| End-to-End | **Playwright** | Full user journeys in real browser | 5 critical paths |

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 70, functions: 70, branches: 65 },
      exclude: ['node_modules/**', 'tests/**', '**/*.config.*', 'app/(marketing)/**', 'components/ui/**'],
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

### MSW Mock Server

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const server = setupServer(
  http.get('https://api.clerk.com/v1/me', () =>
    HttpResponse.json({ id: 'user_test123', primaryEmailAddress: { emailAddress: 'test@example.com' } })
  ),
  http.post('https://api.groq.com/openai/v1/chat/completions', () =>
    HttpResponse.json({ choices: [{ message: { content: 'Mocked AI response.' } }] })
  ),
  http.post('https://api.together.xyz/v1/chat/completions', () =>
    HttpResponse.json({ choices: [{ message: { content: 'Mocked Together response.' } }] })
  ),
)
```

### Unit Tests — LazyMind Failover

```typescript
// tests/unit/lazymind-failover.test.ts
import { describe, it, expect, vi } from 'vitest'
import { callLazyMind } from '@/lib/ai/lazymind'
import * as groq from '@/lib/ai/groq'
import * as together from '@/lib/ai/together'

describe('callLazyMind failover', () => {
  it('returns Groq result on success', async () => {
    vi.spyOn(groq, 'callGroq').mockResolvedValueOnce('Groq response')
    expect(await callLazyMind('system', 'user')).toBe('Groq response')
  })

  it('falls back to Together AI when Groq rate-limits', async () => {
    vi.spyOn(groq, 'callGroq').mockRejectedValueOnce(new Error('GROQ_RATE_LIMIT'))
    vi.spyOn(together, 'callTogether').mockResolvedValueOnce('Together response')
    expect(await callLazyMind('system', 'user')).toBe('Together response')
  })

  it('throws AI_UNAVAILABLE when both providers fail', async () => {
    vi.spyOn(groq, 'callGroq').mockRejectedValueOnce(new Error('GROQ_RATE_LIMIT'))
    vi.spyOn(together, 'callTogether').mockRejectedValueOnce(new Error('Together down'))
    await expect(callLazyMind('system', 'user')).rejects.toThrow('AI_UNAVAILABLE')
  })
})
```

### Unit Tests — Decision Quality Scorer

```typescript
// tests/unit/decision-quality.test.ts
import { describe, it, expect } from 'vitest'
import { computeDecisionQualityScore } from '@/lib/ai/decision-quality'

describe('computeDecisionQualityScore (local heuristics)', () => {
  it('scores high for a complete decision', () => {
    const decision = {
      question: 'Should we use Neon over Supabase for our database?',
      resolution: 'Yes, use Neon. Supabase is blocked in India under IT Act Section 69A.',
      rationale: 'We evaluated both options. Supabase has geographic restrictions. Neon offers the same Postgres-compatible API, has a Mumbai region, and is not restricted. This is a reversible decision — we can migrate if needed.',
      optionsConsidered: ['Supabase', 'Neon', 'PlanetScale', 'Self-hosted Postgres'],
    }
    const score = computeDecisionQualityScore(decision)
    expect(score).toBeGreaterThan(70)
  })

  it('scores low for an incomplete decision', () => {
    const decision = {
      question: 'What database?',
      resolution: 'Neon',
      rationale: '',
      optionsConsidered: [],
    }
    const score = computeDecisionQualityScore(decision)
    expect(score).toBeLessThan(40)
  })
})
```

### E2E — 5 Critical Paths

```typescript
// tests/e2e/critical-paths.spec.ts
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

test.describe('Path 1: Sign Up & Onboarding', () => {
  test('new user can sign up and reach dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/sign-up`)
    await page.fill('[name="emailAddress"]', `test+${Date.now()}@example.com`)
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/onboarding\/create-workspace/)
    await page.fill('[placeholder="e.g. Acme Corp"]', 'Test Workspace')
    await page.click('button:has-text("Create Workspace")')
    await expect(page).toHaveURL(/\/workspace\//)
  })
})

test.describe('Path 2: Create Workflow & Add Task', () => {
  test('user can create a workflow and add a task node', async ({ page }) => {
    await page.goto(`${BASE_URL}/api/test/seed-session`)
    await page.goto(`${BASE_URL}/workspace/test-workspace`)
    await page.click('button:has-text("New Workflow")')
    await page.fill('[placeholder="Workflow name"]', 'E2E Test Workflow')
    await page.click('button:has-text("Create")')
    await expect(page).toHaveURL(/\/canvas\//)
    await page.click('[data-testid="add-task-node"]')
    await expect(page.locator('[data-testid="node-type-task"]')).toBeVisible()
  })
})

test.describe('Path 3: Log a Decision', () => {
  test('user can log a decision with all fields and see quality score', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/test-workspace/decisions`)
    await page.click('button:has-text("Log Decision")')
    await page.fill('[name="question"]', 'Should we use Neon over Supabase?')
    await page.fill('[name="resolution"]', 'Yes — Supabase is blocked in India.')
    await page.fill('[name="rationale"]', 'IT Act Section 69A compliance. We evaluated 3 alternatives.')
    await page.click('button:has-text("Save Decision")')
    await expect(page.locator('text=Should we use Neon over Supabase?')).toBeVisible()
    await expect(page.locator('[data-testid="decision-quality-score"]')).toBeVisible()
  })
})

test.describe('Path 4: Invite a Team Member', () => {
  test('workspace owner can invite a member by email', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/test-workspace/settings`)
    await page.click('button:has-text("Invite Member")')
    await page.fill('[placeholder="colleague@company.com"]', 'newmember@example.com')
    await page.click('button:has-text("Send Invite")')
    await expect(page.locator('text=Invite sent')).toBeVisible()
  })
})

test.describe('Path 5: LazyMind AI Query', () => {
  test('user can ask LazyMind a question and receive a response', async ({ page }) => {
    await page.goto(`${BASE_URL}/workspace/test-workspace/canvas/test-canvas`)
    await page.click('[data-testid="lazymind-toggle"]')
    await page.fill('[data-testid="lazymind-input"]', 'What are the blockers in this workflow?')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="lazymind-response"]')).toBeVisible({ timeout: 15000 })
  })
})
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 28. REAL-TIME INFRASTRUCTURE — LIVEBLOCKS MIGRATION PLAN

### Three-Stage Plan

#### Stage 1: Launch → 50 Simultaneous Connections (Liveblocks Free)
**Trigger:** 0–50 Simultaneous Connections
**Cost:** $0
**Watch:** Liveblocks dashboard. Upgrade when concurrent connections regularly hit 35.

#### Stage 2: 50–500 Connections (Liveblocks Starter)
**Trigger:** Concurrent connections regularly exceed 35
**Action:** Upgrade to Liveblocks Starter ($99/month, up to 1,000 MAU)
**Code changes required:** None. Same API.

#### Stage 3: 500+ MAU — Self-Hosted (Hocuspocus on Fly.io)
**Trigger:** MAU crosses 400, or Liveblocks bill exceeds $300/month

```typescript
// Current (Liveblocks):
import { LiveblocksProvider } from '@liveblocks/react'

// Stage 3 replacement (Hocuspocus):
import { HocuspocusProvider } from '@hocuspocus/provider'
const provider = new HocuspocusProvider({
  url: process.env.NEXT_PUBLIC_COLLAB_SERVER_URL, // wss://collab.lazynext.com
  name: `workflow-${workflowId}`,
  token: userToken,
})
```

**Fly.io cost:** ~$6/month for a Hocuspocus server handling ~5,000 concurrent users. 94% cost reduction vs Liveblocks at scale.

### MAU Monitoring Alert

In PostHog: create a weekly alert when unique users who triggered any canvas interaction in the last 30 days crosses 35. This gives 3–4 weeks of buffer before hitting the Liveblocks cap.

---

## 29. BUILD FEASIBILITY & TEAM SIZING

### Honest Timeline by Team Configuration

The Phase 1 MVP (TASK + DOC + DECISION + THREAD + LazyMind) is realistically scoped as follows:

| Team Setup | Phase 1 (MVP) | Phase 2 | Phase 3 (TABLE) | Phase 4 (Billing) | Total to Launch |
|---|---|---|---|---|---|
| Solo dev + AI tools (Cursor, Claude) | 7 weeks | 8 weeks | 8 weeks | 4 weeks | **27 weeks** |
| 2 devs (frontend + fullstack) | 5 weeks | 6 weeks | 5 weeks | 4 weeks | **20 weeks** |
| 3+ devs | 4 weeks | 4 weeks | 4 weeks | 3 weeks | **15 weeks** |

> **The key insight from V3:** Phase 1 is a launchable product. You do not need Phase 3 (TABLE) to acquire your first 100 customers. TABLE is a retention and expansion feature. Launch Phase 1, get users, learn, then build TABLE for the users who ask for it.

### Solo Build: What to Cut for Phase 1 MVP

| Feature | Deferral Strategy |
|---|---|
| TABLE primitive | Phase 3. Months of engineering. Do not touch until 50+ users. |
| AUTOMATION primitive | Phase 2. Manual workflows are fine for MVP. |
| PULSE primitive | Phase 2. Build after data exists from Tasks and Decisions. |
| Template marketplace | Phase 4. Hand-create 5 templates. Community marketplace later. |
| Liveblocks multiplayer cursors | Phase 2. Single-user canvas is fine for MVP. |
| Stripe/Razorpay billing | Phase 4. Free tier + manual payments (bank transfer, UPI) until 50 users. |
| Weekly AI digest email | Phase 2. Easy 2-day add. |

**Solo Phase 1 MVP = TASK + DOC + DECISION + THREAD + LazyMind AI + Invite system.**

That is your competitive wedge, your moat, and a product people will pay for.

### Scope Guardrails Per Phase

**Phase 1 Guardrail — Do not move to Phase 2 until:**
- [ ] Sign up → first decision logged: full flow works without bugs
- [ ] LazyMind responds in under 5 seconds consistently
- [ ] Node data persists across page refreshes
- [ ] Zero TypeScript errors
- [ ] Everything works on iPhone Safari

**Phase 2 Guardrail — Do not move to Phase 3 until:**
- [ ] 10 active users using the product weekly
- [ ] LazyMind weekly digest sends automatically
- [ ] Unit test coverage: 70%+
- [ ] All 5 E2E critical paths pass

**Phase 3 Guardrail — Do not move to Phase 4 until:**
- [ ] TABLE grid view works without data loss
- [ ] 50+ active users
- [ ] At least one automation works end-to-end (logged in Inngest)
- [ ] Sentry capturing real errors from staging

**Phase 4 Guardrail — Do not go live with billing until:**
- [ ] Stripe + Razorpay test mode: upgrade and cancellation both work
- [ ] Free tier limits enforced
- [ ] Post-Launch Checklist (Section 26): 100% complete

---

## 30. API VERSIONING, DATA EXPORT & COMPLIANCE

### 30.1 API Versioning Strategy

All routes live under `/api/v1/`. Breaking changes get a new version prefix. Additive changes (new response fields) are safe without a new version.

**Breaking change policy:**
- Breaking change = removing a field, changing a field's type, changing HTTP status codes, removing an endpoint
- Minimum 90-day support for deprecated versions
- `X-Deprecation-Notice` header populated when a route is being sunset

```typescript
// In all API route helpers
headers.set('X-API-Version', '1.0')
```

### 30.2 Data Export

```typescript
// app/api/v1/export/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { nodes, edges, workflows, workspaces, decisions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: Request) {
  const { userId, orgId } = auth()
  if (!userId || !orgId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // Only ADMIN role can export
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'

  // Resolve workspaceId from Clerk orgId first
  const workspaceData = await db.query.workspaces.findFirst({ where: eq(workspaces.clerkOrgId, orgId) })
  if (!workspaceData) return NextResponse.json({ error: 'WORKSPACE_NOT_FOUND' }, { status: 404 })
  const wsId = workspaceData.id

  const [workflowData, nodeData, edgeData, decisionData] = await Promise.all([
    db.select().from(workflows).where(eq(workflows.workspaceId, wsId)),
    db.select().from(nodes).where(eq(nodes.workspaceId, wsId)),
    db.select().from(edges).where(eq(edges.workspaceId, wsId)),
    db.select().from(decisions).where(eq(decisions.workspaceId, wsId)),
  ])

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    platform: 'lazynext',
    workspace: workspaceData,
    workflows: workflowData,
    nodes: nodeData,
    edges: edgeData,
    decisions: decisionData, // Decision DNA exported in full
  }

  if (format === 'json') {
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="lazynext-export-${Date.now()}.json"`,
      },
    })
  }

  const csvRows = nodeData.map(n => ({
    id: n.id,
    type: n.type,
    workflow_id: n.workflowId,
    title: (n.data as any)?.title || (n.data as any)?.question || '',
    status: (n.data as any)?.status || '',
    created_at: n.createdAt,
  }))

  const csvHeader = 'id,type,workflow_id,title,status,created_at\n'
  const csvBody = csvRows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n')

  return new NextResponse(csvHeader + csvBody, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="lazynext-nodes-${Date.now()}.csv"`,
    },
  })
}
```

### 30.3 Data Residency & Compliance

#### India — DPDP Act (2023)
India's Digital Personal Data Protection Act does not currently mandate data localisation for B2B SaaS. However:
- Select **Neon Mumbai region** (`ap-south-1`) as the default for all Indian workspaces.
- Cloudflare R2 uses the nearest PoP — substantial India presence (Mumbai, Chennai, Delhi).
- Clerk.dev stores auth data in the US. Acceptable for B2B SaaS under current DPDP guidance.
- Monitor DPDP guidance updates — the Act is newly in force and rules are evolving.

#### GDPR (EU Users)
- Add GDPR compliance section to `/privacy` and `/terms`.
- Neon EU region (`eu-central-1`, Frankfurt) for EU workspaces — implement region selection at workspace creation.
- Right to erasure endpoint (see below).
- DPAs: Neon, Clerk, Cloudflare, and Vercel all offer standard DPAs. Sign all four before accepting EU enterprise customers.

```typescript
// app/api/v1/account/delete/route.ts
export async function DELETE(req: Request) {
  const { userId, orgId } = auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // Hard delete via Trigger.dev background job (5–30 seconds for large workspaces)
  await triggerDataDeletion({ userId, orgId })

  // Revoke Clerk session
  await clerkClient.users.deleteUser(userId)

  return NextResponse.json({
    message: 'Account deletion initiated. You will receive a confirmation email within 24 hours.'
  })
}
```

#### SOC 2 (Future — Enterprise Sales)
Not required at launch. Initiate when you close your first enterprise deal (> 50 seats). Estimated: 3 months, $15,000–$25,000 via Vanta. All four infrastructure providers are already SOC 2 certified.

---

## 31. DECISION DNA — FULL SPECIFICATION

> **This section is the most important section in the entire document.** Decision DNA is the reason Lazynext exists and the only feature no competitor can copy without rebuilding their product from scratch. Build this with the same care and depth you would give to a standalone product.

### The Problem Decision DNA Solves

Teams repeat mistakes because decisions are never recorded with enough context to be useful later. When a bad outcome occurs 6 months after a decision was made, the original reasoning is gone — it lives in someone's head, a forgotten Slack message, or a meeting nobody recorded.

Existing tools don't solve this:
- Notion: a decision page exists, but it's not structured, not searchable by outcome, and not connected to the work the decision affected
- Confluence: same problem — a doc exists but it's not attributed, dated, or outcome-tracked
- No tool: retroactive outcome tagging (marking a past decision as good/bad months later) exists in any product

### The Decision DNA Data Model

Every decision has:

| Field | Type | Required | Purpose |
|---|---|---|---|
| `question` | text | Yes | "What are we deciding?" — clear, specific |
| `resolution` | text | Yes | "What did we decide?" |
| `rationale` | text | Strongly recommended | "Why did we choose this over alternatives?" |
| `options_considered` | string[] | Recommended | All alternatives that were evaluated |
| `information_at_time` | JSONB | Optional | Snapshot of relevant context (metrics, quotes, links) |
| `stakeholders` | Clerk user IDs[] | Optional | Who was consulted or informed |
| `decision_type` | enum | Recommended | `reversible` / `irreversible` / `experimental` |
| `outcome` | enum | Retroactive | `good` / `bad` / `neutral` / `pending` |
| `outcome_tagged_by` | user ID | Auto | Who tagged the outcome |
| `outcome_tagged_at` | timestamp | Auto | When was the outcome tagged |
| `outcome_notes` | text | Optional | "Here's what actually happened..." |
| `outcome_confidence` | 1–10 | Optional | How confident are we in the outcome judgment? |
| `quality_score` | 0–100 | AI-computed | AI quality score computed on save |
| `quality_feedback` | text | AI-computed | One-sentence AI feedback on decision quality |
| `tags` | string[] | Optional | e.g. ["infrastructure", "pricing", "hiring"] |

### AI Quality Scoring

Every decision is scored by LazyMind automatically when saved. The scoring uses a local heuristic function first (fast, no LLM call needed) and then optionally improves via LLM.

**Local heuristic scorer (instant, no API call):**

```typescript
// lib/ai/decision-quality.ts
interface DecisionInput {
  question: string
  resolution?: string
  rationale?: string
  optionsConsidered?: string[]
  decisionType?: string
}

export function computeDecisionQualityScore(decision: DecisionInput): number {
  let score = 0

  // Category 1: Completeness of options (0–25 pts)
  const optionCount = decision.optionsConsidered?.length || 0
  score += Math.min(optionCount * 8, 25) // 8pts per option, max 25

  // Category 2: Rationale quality (0–25 pts)
  const rationaleLength = decision.rationale?.trim().length || 0
  if (rationaleLength > 200) score += 25
  else if (rationaleLength > 100) score += 18
  else if (rationaleLength > 50) score += 10
  else if (rationaleLength > 0) score += 5

  // Category 3: Question specificity (0–25 pts)
  const questionLength = decision.question?.trim().length || 0
  if (questionLength > 40) score += 25
  else if (questionLength > 20) score += 15
  else if (questionLength > 10) score += 8

  // Category 4: Reversibility acknowledgment (0–25 pts)
  if (decision.decisionType === 'reversible' || decision.decisionType === 'irreversible') score += 15
  if (decision.rationale?.toLowerCase().includes('revers')) score += 10
  else if (decision.decisionType === 'experimental') score += 25

  return Math.min(score, 100)
}
```

**LLM-enhanced scoring (async, Business plan only):**

```typescript
// app/api/v1/decisions/[id]/quality/route.ts
import { callLazyMind } from '@/lib/ai/lazymind'
import { DECISION_QUALITY_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const workspaceId = await getWorkspaceId()
  const decision = await db.query.decisions.findFirst({
    where: and(eq(decisions.id, params.id), eq(decisions.workspaceId, workspaceId))
  })
  if (!decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const prompt = JSON.stringify({
    question: decision.question,
    resolution: decision.resolution,
    rationale: decision.rationale,
    optionsConsidered: decision.optionsConsidered,
    decisionType: (decision as any).decisionType,
  })

  let qualityScore = computeDecisionQualityScore(decision as any)
  let qualityFeedback = ''

  try {
    const aiResponse = await callLazyMind(DECISION_QUALITY_PROMPT, prompt, 200)
    const parsed = JSON.parse(aiResponse)
    qualityScore = parsed.score
    qualityFeedback = parsed.feedback
  } catch {
    // Fall back to local score silently
  }

  await db.update(decisions)
    .set({ qualityScore, qualityFeedback, qualityScoredAt: new Date() })
    .where(eq(decisions.id, params.id))

  return NextResponse.json({ data: { qualityScore, qualityFeedback }, error: null })
}
```

### Decision Health Dashboard

The Decision Health Dashboard is a workspace-level view (Business plan) showing:

1. **Decision Quality Distribution** — histogram of quality scores across all logged decisions
2. **Outcome Track Record** — pie chart of good/bad/neutral outcomes on tagged decisions
3. **Top Decision Makers** — ranked list of users by number of decisions logged and average quality score
4. **Decision Types** — breakdown of reversible/irreversible/experimental decisions
5. **Untagged Decisions** — decisions older than 90 days with no outcome tag (prompt team to retroactively assess)
6. **Decision Patterns** — categories (by tag) and which tags correlate with good vs. bad outcomes

This dashboard is the Business plan's primary upsell driver. Show a teaser with blurred data on Team plan.

```typescript
// components/decisions/DecisionHealthDashboard.tsx
// Renders metrics from /api/v1/decisions with aggregations
// Uses Recharts for the outcome pie chart and quality score histogram
// Uses a simple table for top decision makers
// The "Untagged Decisions" list triggers Inngest reminders to tag outcomes
```

### Semantic Search Over Decisions

Users on Business plan can search decisions using natural language:

> "What did we decide about the database?" → returns all database-related decisions
> "What decisions went badly last quarter?" → returns decisions tagged `outcome: bad` in date range
> "Did we discuss pricing before launch?" → semantic search over decision text

```typescript
// app/api/v1/decisions/search/route.ts
import { callLazyMind } from '@/lib/ai/lazymind'

export async function POST(req: Request) {
  const { query } = await req.json()
  const workspaceId = await getWorkspaceId()

  // If pgvector embeddings are enabled (Business plan):
  // 1. Embed the query using Nomic
  // 2. Run vector similarity search against decisions.embedding
  // 3. Return top-k results

  // Fallback (Team plan): full-text search via Postgres
  const results = await db.execute(sql`
    SELECT * FROM decisions
    WHERE workspace_id = ${workspaceId}
    AND (
      to_tsvector('english', question || ' ' || coalesce(resolution, '') || ' ' || coalesce(rationale, ''))
      @@ plainto_tsquery('english', ${query})
    )
    ORDER BY created_at DESC
    LIMIT 10
  `)

  return NextResponse.json({ data: results.rows, error: null })
}
```

### Weekly Decision Digest Email

Every Monday at 9am IST, the Decision Digest emails go to all workspace admins and members:

```typescript
// lib/inngest/functions/weekly-digest.ts
import { inngest } from '../client'

export const weeklyDigest = inngest.createFunction(
  { id: 'weekly-decision-digest' },
  { cron: '30 3 * * MON' }, // 9am IST = 3:30am UTC
  async ({ step }) => {
    const workspaces = await step.run('fetch-workspaces', async () => {
      return db.select().from(workspacesTable)
        .where(inArray(workspacesTable.plan, ['team', 'business', 'enterprise']))
    })

    for (const workspace of workspaces) {
      await step.run(`digest-${workspace.id}`, async () => {
        // Fetch last 7 days of decisions
        const recentDecisions = await db.select().from(decisions)
          .where(and(
            eq(decisions.workspaceId, workspace.id),
            gte(decisions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          ))

        // AI-generated digest
        const digestContent = await callLazyMind(
          WEEKLY_DIGEST_PROMPT,
          JSON.stringify({ decisions: recentDecisions.map(d => ({
            question: d.question,
            resolution: d.resolution,
            madeBy: d.madeBy,
            qualityScore: d.qualityScore,
          }))})
        )

        // Send via Resend
        await resend.emails.send({
          from: 'digest@lazynext.com',
          to: workspaceAdminEmails,
          subject: `Your Lazynext Decision Digest — ${new Date().toLocaleDateString('en-IN')}`,
          react: DecisionDigestEmail({ content: digestContent, workspace }),
        })
      })
    }
  }
)
```

### Decision DNA UX Flows

**Logging a decision (from canvas — click DECISION node sidebar):**
1. `question` field is focused automatically on sidebar open
2. Auto-suggest: if the node's thread has messages, LazyMind pre-fills `options_considered` by scanning the thread
3. `decision_type` selector: Reversible / Irreversible / Experimental (with explanations on hover)
4. On save: quality score computed locally and shown immediately as a pill badge (green 70+, yellow 40–70, red < 40)
5. If Business plan: LLM quality scoring queued in background, badge updates when complete

**Tagging an outcome (from Decision DNA view — months later):**
1. User sees list of decisions with `outcome: pending`
2. Click "Tag Outcome" → modal with three buttons: 👍 Good / 😐 Neutral / 👎 Bad
3. Optional: `outcome_notes` text area ("What actually happened?")
4. On save: decision quality pattern data updates in Decision Health Dashboard

---

## 32. COMPETITIVE POSITIONING

### The Honest Competitive Landscape

Lazynext will inevitably be compared to these tools. Here is the honest, factual positioning.

### vs. Notion

| Dimension | Notion | Lazynext |
|---|---|---|
| Documents | Excellent — best-in-class editor | Good — Tiptap is capable |
| Tasks | Basic — bolted on | Native primitive with full status/priority/assignment |
| Workflows | Not a concept | First-class feature — visual graph canvas |
| Decisions | None | Unique — Decision DNA with outcome tracking |
| Automations | Basic (buttons) | Native automation engine |
| Real-time collab | Limited | Native with Liveblocks |
| AI | Notion AI (OpenAI) — $10/month addon | LazyMind (open-source LLM) — included |
| Price | $8–16/seat/month | $19/seat/month |
| India accessibility | Available | Available + INR pricing + Razorpay |

**Win position:** Teams using Notion for docs + Linear for tasks + another tool for decisions. Lazynext consolidates all three with a moat (Decision DNA) that Notion cannot add without rebuilding their data model.

### vs. Linear

| Dimension | Linear | Lazynext |
|---|---|---|
| Task management | Best-in-class — fast, opinionated | Good — visual and flexible |
| Roadmapping | Native | Via PULSE primitive |
| Documents | None | Native |
| Decisions | None | Unique — Decision DNA |
| AI | Linear Asks (limited) | LazyMind full workflow analysis |
| Price | $8–18/seat/month | $19/seat/month (but replaces Linear + Notion) |

**Win position:** Teams on Linear + Notion + Slack. The consolidation saves $30–50/seat/month vs. Lazynext's $19/seat.

### vs. Fibery

Fibery is the closest architectural competitor — also graph-first, also all-in-one, also customizable. This is the one competitor that requires a specific answer.

| Dimension | Fibery | Lazynext |
|---|---|---|
| Data model | Entity-relationship graph | Node-edge graph |
| Flexibility | Extremely high — build anything | Opinionated — 7 primitives, no custom entities |
| Learning curve | High — "build your own Notion" | Low — works out of the box |
| AI | Limited | LazyMind natively integrated |
| Decision tracking | None | Unique — Decision DNA with quality scoring |
| Price | $12–18/seat/month | $19/seat/month |
| India support | Limited payment options | Razorpay + INR pricing |

**Win position:** Fibery requires significant configuration before it's useful. Lazynext is opinionated and useful in 15 minutes. The target user (Archetype 1 — Drowning Founder) does not have time to configure a tool. They need it to work now. Also: Fibery has no decision tracking. None. That's a total category gap.

**Key message vs. Fibery:** "Fibery lets you build any workflow. Lazynext ships the 7 workflows your team already needs — and adds the one thing nobody else has: a decision memory."

### vs. Coda.io

Coda is the most technically similar competitor in terms of philosophy — documents, tables, and automations in one tool. It is widely used by ops-heavy teams.

| Dimension | Coda | Lazynext |
|---|---|---|
| Core metaphor | "Doc that can do everything" | "Workflow graph OS" |
| Tasks | Available (as tables + views) | Native primitive — first class |
| Documents | Excellent | Good (Tiptap) |
| Tables | Excellent — full relational model | Phase 3 (not MVP) |
| Automations | Good — button-driven + scheduled | Native automation engine |
| Decisions | None | Unique — Decision DNA |
| Visual canvas | None | Core product — React Flow graph |
| AI | Coda AI ($10/month addon) | LazyMind — open-source, included |
| Learning curve | High — "build your own app" feeling | Low — 7 opinionated primitives |
| Price | $10–30/seat/month | $19/seat/month |
| India accessibility | Available | Available + INR + Razorpay |

**Win position:** Coda users who want a *visual* understanding of their workflows (not just flat docs and tables). The graph canvas is Lazynext's visual wedge that Coda cannot replicate without a platform rebuild. Also: Coda has zero decision tracking. A Coda user who has experienced a costly forgotten decision is Lazynext's highest-conversion prospect.

**Key message vs. Coda:** "Coda lets you build anything inside a doc. Lazynext builds the workflow outside the doc — so you can see the whole picture and never forget a decision again."

---

### vs. Height.app

Height is the most direct TASK-primitive competitor. It targets the same "Linear is too rigid" audience with a more visual, flexible task manager.

| Dimension | Height | Lazynext |
|---|---|---|
| Task management | Excellent — fast, keyboard-driven | Good — visual graph-first |
| Visual canvas | None (list/board/gantt only) | Core product |
| Documents | None | Native |
| Decisions | None | Unique — Decision DNA |
| AI | Height AI (limited — task descriptions) | LazyMind — full workflow analysis |
| Automations | Good — built-in | Native automation engine |
| Real-time collab | Good | Native with Liveblocks |
| Price | $8.50–13.75/seat/month | $19/seat/month (replaces Height + Notion) |
| India accessibility | Available | Available + INR + Razorpay |

**Win position:** Height teams that also use Notion for docs and have no decision tracking. Lazynext consolidates all three for less than Height + Notion combined.

**The honest concession:** Height's task management is faster and more keyboard-native than Lazynext's TASK primitive. Do not compete on task speed. Compete on: the graph (Height has no canvas), the DOC (Height has no editor), and Decision DNA (Height has nothing like it).

**Key message vs. Height:** "Height is the best task manager you can find. But tasks without decisions are just a to-do list that forgets why things were built."

---

### Positioning Statement for All Marketing

> **Lazynext is the only workflow platform built around decisions.**
>
> Other tools help you manage tasks and docs. Lazynext does that too — but it also remembers every decision your team ever made, scores the quality of your decision-making, and lets LazyMind AI tell you "this problem exists because of the decision you made 4 months ago." No other tool does this.

---

## 33. WEEK-BY-WEEK SPRINT PLAN — FIRST 12 WEEKS

> ⚠️ **SUPERSEDED FOR SOLO BUILDS — see Section 49.** This 12-week plan was written for a 1.5–2 developer team. Solo founders must use **Section 49 (10-Week Scope-Locked Solo MVP)** as their authoritative sprint plan. Section 33 remains in this document as the **Phase 2 expansion reference** — the plan that kicks in once the solo MVP is live and the first 30 paying workspaces are onboard.

> **PURPOSE:** This section answers the one question every founder must answer before writing a line of code: *"What can I show a paying customer, and when?"* The answer is Week 8. Every sprint below is scoped to that single goal.

### The North Star: Week 8 Demo

At Week 8, you must be able to sit in front of a "Drowning Founder" ICP user and demo:
1. Create a workspace, invite a teammate
2. Drop 3 TASK nodes + 1 DECISION node onto a canvas and connect them
3. Write a DOC with an embedded task node
4. Show the Decision DNA sidebar with a quality score
5. Ask LazyMind "what's blocking this workflow?"

That is your first paying customer conversation. Everything in Weeks 1–8 serves that demo.

---

### Team Sizing Variants

| Track | Team | Weekly Hours | Realistic Week 8 State |
|---|---|---|---|
| **Solo Founder** | 1 person | 40 hrs/wk | Auth + TASK canvas + basic DECISION node. No DOC editor. Demo-able but narrow. |
| **2-Person Team** | 1 fullstack + 1 frontend | 80 hrs/wk | Full Week 8 target achievable. Recommended minimum. |
| **4-Person Team** | 2 fullstack + 1 frontend + 1 PM/design | 160 hrs/wk | Week 8 target + basic billing live. Stretch to THREAD in Week 10. |

---

### Week-by-Week Sprint Plan (2-Person Team Baseline)

#### WEEK 1 — Foundation
**Goal:** Blank app deployed to Vercel. Auth working. Database connected.

| Task | Owner | Hours |
|---|---|---|
| Init Next.js 14 App Router project, Tailwind, shadcn/ui | FS | 4 |
| Set up Neon Postgres, run initial Drizzle migration (workspaces, users, nodes, edges tables) | FS | 6 |
| Integrate Clerk — sign-in, sign-up, session middleware | FS | 5 |
| Deploy to Vercel, confirm CI pipeline (GitHub → Vercel auto-deploy) | FS | 3 |
| Create basic app shell: sidebar, header, protected route layout | FE | 8 |
| Workspace creation flow (name + slug) | FE | 4 |

**Week 1 Checkpoint:** You can sign up, create a workspace, and see an empty dashboard. ✓

---

#### WEEK 2 — Canvas Skeleton
**Goal:** React Flow canvas renders. Nodes can be dropped and moved. Data persists to Neon.

| Task | Owner | Hours |
|---|---|---|
| Integrate React Flow. Canvas renders with pan/zoom/minimap. | FE | 8 |
| Implement `useCanvasStore` (Zustand) with full state shape from Section 7 | FE | 5 |
| API Route: `POST /api/v1/workflows` — create workflow | FS | 3 |
| API Route: `GET /api/v1/workflows/[id]` — load workflow with nodes + edges | FS | 4 |
| API Route: `POST /api/v1/nodes` — create node (type, position, data) | FS | 4 |
| Auto-save: debounce node position changes → PATCH to API every 1.5s | FE | 4 |

**Week 2 Checkpoint:** Canvas renders. You can drag a placeholder node around and it saves. ✓

---

#### WEEK 3 — TASK Node (Full)
**Goal:** TASK node is fully functional. Create, edit, assign, set status/priority/due date.

| Task | Owner | Hours |
|---|---|---|
| Build `TaskNode` React Flow custom node component with status pill, priority badge, assignee avatar | FE | 8 |
| Build `TaskSidebar` — right panel for editing all TASK fields | FE | 8 |
| Keyboard shortcut `T` → drops TASK node at canvas center | FE | 2 |
| `PATCH /api/v1/nodes/[id]` — update node data (shared across all node types) | FS | 3 |
| `DELETE /api/v1/nodes/[id]` — soft delete with cascade edge removal | FS | 3 |
| Edge creation: drag from node handle → connect to another node. Save to edges table. | FE | 4 |
| Status dropdown (todo → in_progress → in_review → done → blocked) with color coding | FE | 3 |

**Week 3 Checkpoint:** Full TASK node CRUD. You can build a real task list on the canvas. ✓

---

#### WEEK 4 — DOC Node (MVP)
**Goal:** DOC node works. Tiptap editor opens in a full-screen panel. Content persists.

| Task | Owner | Hours |
|---|---|---|
| Integrate Tiptap 2.x with `StarterKit`, `Placeholder`, `Typography` extensions | FE | 6 |
| Build `DocNode` canvas node (small card showing title + word count) | FE | 4 |
| Build `DocEditor` full-screen panel (opens when DOC node selected) | FE | 8 |
| Slash command `/` menu: insert Heading, Bullet list, Code block, Divider | FE | 5 |
| Auto-save DOC content to `nodes.data.content` (Tiptap JSON) on 2s debounce | FE | 3 |
| Keyboard shortcut `D` → drops DOC node | FE | 1 |

**Week 4 Checkpoint:** You can write a document that embeds on the canvas. ✓

---

#### WEEK 5 — DECISION Node (Full — The Moat)
**Goal:** DECISION node is the most polished node in the app. This is the demo's centerpiece.

| Task | Owner | Hours |
|---|---|---|
| Build `DecisionNode` canvas card — shows question, resolution status, quality score badge | FE | 6 |
| Build `DecisionSidebar` with all fields: question, resolution, rationale, options_considered, decision_type, tags | FE | 10 |
| Implement local quality score heuristic (see Section 31). Score computed instantly on save. | FE | 5 |
| Quality score badge: green (70+), amber (40–69), red (<40) — updates in real time | FE | 2 |
| `POST /api/v1/decisions` — create decision, return with initial score | FS | 3 |
| Keyboard shortcut `X` → drops DECISION node | FE | 1 |
| Decision DNA list view at `/workspace/[slug]/decisions` — table of all decisions in workspace | FE | 5 |

**Week 5 Checkpoint:** The unique moat is demo-able. A user can log a decision and see quality scored. ✓

---

#### WEEK 6 — LazyMind AI Integration
**Goal:** AI panel works. "Analyze this workflow" returns real insight in <3 seconds.

| Task | Owner | Hours |
|---|---|---|
| Implement `callGroq` + `callTogether` + `callLazyMind` failover (Section 5 — copy exactly) | FS | 4 |
| `POST /api/v1/ai/analyze` — serializes workflow graph → LazyMind → returns analysis | FS | 5 |
| `LazyMindPanel` component — right-side drawer, streaming text response, loading skeleton | FE | 8 |
| `Ctrl+K` / `Cmd+K` command palette — "Analyze workflow", "Summarize decisions" shortcuts | FE | 5 |
| Decision quality scoring via LLM (`POST /api/v1/ai/score-decision`) — queued on Business plan | FS | 4 |
| Graceful degradation UI — "LazyMind is resting 😴 (quota reached)" message | FE | 2 |

**Week 6 Checkpoint:** You can say "here's my workflow — what's blocking it?" and get a real answer. ✓

---

#### WEEK 7 — Multiplayer + Polish
**Goal:** Two people can work on the same canvas simultaneously. App feels fast and real.

| Task | Owner | Hours |
|---|---|---|
| Integrate Liveblocks — presence (cursor dots), room per workflow | FS | 6 |
| Show teammate cursors on canvas with avatar + name label | FE | 5 |
| Workspace member invite flow (Clerk org invite → Neon workspace_members insert) | FS | 5 |
| Global keyboard shortcuts (Section 7 — all shortcuts implemented) | FE | 4 |
| Mobile: render `NodeListView` instead of canvas on <640px screens | FE | 5 |
| Error states, loading skeletons, empty states for all major views | FE | 5 |

**Week 7 Checkpoint:** Two founders can open the same canvas and see each other live. ✓

---

#### WEEK 8 — Demo-Ready + First Customer
**Goal:** The app is clean enough to show a paying stranger. Ship to 5 beta users.

| Task | Owner | Hours |
|---|---|---|
| Fix all P0 bugs from Weeks 1–7 dogfooding | Both | 10 |
| Landing page at lazynext.com (marketing layout from Section 7) | FE | 8 |
| Onboarding flow: create workspace → create first workflow → drop first node (with tips) | FE | 6 |
| Set up PostHog — track: workspace_created, node_created, decision_logged, ai_analyzed | FS | 3 |
| Set up Sentry error tracking | FS | 2 |
| Manually onboard 5 beta users. Watch them use it. Take notes. | Both | 6 |

**Week 8 Checkpoint:** 5 real humans use the product. At least 1 says "I'd pay for this." ✓

---

#### WEEKS 9–10 — THREAD Node + Billing
**Goal:** Contextual threads on any node. Stripe + Razorpay billing live.

- THREAD node: message list attached to any node. Real-time via Liveblocks.
- `messages` table: `id`, `node_id`, `workspace_id`, `user_id`, `content`, `created_at`
- Stripe Checkout for international billing (Free / Pro / Business tiers)
- Razorpay for INR billing (Indian workspaces auto-routed)
- Billing gate: Pro features (LazyMind AI, >3 members) locked behind paid plan check in API middleware

**Week 10 Checkpoint:** You can charge money. The first invoice goes out.

---

#### WEEKS 11–12 — PULSE Node + Public Launch
**Goal:** PULSE auto-generates a status view from workspace data. Product Hunt launch ready.

- PULSE node: queries task statuses, decision counts, blocked items → renders summary card
- `GET /api/v1/pulse/[workflowId]` — computes live metrics from nodes table
- Weekly Digest email via Resend + Inngest scheduled job (every Monday 9am workspace timezone)
- Product Hunt launch assets: tagline, description, first comment, gallery screenshots
- Public template gallery at lazynext.com/templates — 5 starter workflows

**Week 12 Checkpoint:** Public launch. The product is live, charging, and growing.

---

### Solo Founder Adjusted Timeline

If you are building alone, compress the above by doing:
- Weeks 1–2: same (foundation is non-negotiable)
- Weeks 3–5: TASK only. Skip DOC until after Week 8.
- Week 6: DECISION node (your moat — do not skip)
- Week 7: LazyMind AI
- Week 8: Demo to 5 users. DOC node ships in Week 10.

The solo founder demo at Week 8 is: canvas + TASK + DECISION + LazyMind. That is enough to close a beta customer.

---

## 34. JSONB INDEX STRATEGY & CROSS-PRIMITIVE QUERIES

> **PURPOSE:** The JSONB-for-everything architecture is elegant and fast to build. It becomes a liability at scale without deliberate indexing. This section specifies every index you need and how to query across primitives without full table scans.

### The Core Problem

The `nodes` table stores all node types. At 10,000 nodes per workspace, a query like "show me all TASK nodes assigned to user X that are in_progress" scans the entire table and deserializes JSONB on every row unless you index correctly.

### Required Indexes — Drizzle ORM Definitions

```typescript
// db/schema/indexes.ts
import { index, uniqueIndex } from 'drizzle-orm/pg-core'
import { nodes, edges, workspaces } from './tables'

// Primary lookup indexes (created with schema)
export const nodesWorkspaceTypeIdx = index('nodes_workspace_type_idx')
  .on(nodes.workspaceId, nodes.type)

export const nodesWorkspaceCreatedIdx = index('nodes_workspace_created_idx')
  .on(nodes.workspaceId, nodes.createdAt.desc())

// GIN index for full JSONB search (allows @> containment queries)
// Run this raw SQL in a migration — Drizzle does not yet support GIN expression indexes natively
// CREATE INDEX CONCURRENTLY nodes_data_gin_idx ON nodes USING gin(data);

// Partial index on TASK status — the most common query pattern
// CREATE INDEX CONCURRENTLY nodes_task_status_idx
//   ON nodes ((data->>'status'))
//   WHERE type = 'task';

// Partial index on TASK assignee
// CREATE INDEX CONCURRENTLY nodes_task_assignee_idx
//   ON nodes ((data->>'assigned_to'))
//   WHERE type = 'task';

// Partial index on DECISION outcome (for Decision Health Dashboard)
// CREATE INDEX CONCURRENTLY nodes_decision_outcome_idx
//   ON nodes ((data->>'outcome'))
//   WHERE type = 'decision';

// Partial index on DECISION quality score (for sorting/filtering)
// CREATE INDEX CONCURRENTLY nodes_decision_score_idx
//   ON nodes (((data->>'decision_quality_score')::int))
//   WHERE type = 'decision';
```

### Migration File for Raw Indexes

```sql
-- migrations/0002_add_jsonb_indexes.sql
-- Run CONCURRENTLY to avoid table lock in production

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_data_gin_idx
  ON nodes USING gin(data);

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_task_status_idx
  ON nodes ((data->>'status'))
  WHERE type = 'task';

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_task_assignee_idx
  ON nodes ((data->>'assigned_to'))
  WHERE type = 'task';

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_task_due_idx
  ON nodes ((data->>'due_at'))
  WHERE type = 'task' AND data->>'due_at' IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_decision_outcome_idx
  ON nodes ((data->>'outcome'))
  WHERE type = 'decision';

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_decision_score_idx
  ON nodes (((data->>'decision_quality_score')::int))
  WHERE type = 'decision';

CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_workspace_type_idx
  ON nodes (workspace_id, type);

-- Edge traversal indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS edges_source_idx
  ON edges (source_node_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS edges_target_idx
  ON edges (target_node_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS edges_workflow_idx
  ON edges (workflow_id);
```

### Cross-Primitive Query Patterns

These are the most common queries across node types. Each one is optimized for the indexed schema above.

#### Pattern 1: All tasks assigned to a user in a workspace

```typescript
// lib/queries/tasks.ts
export async function getTasksByAssignee(workspaceId: string, userId: string) {
  return db.execute(sql`
    SELECT id, data, created_at, updated_at
    FROM nodes
    WHERE workspace_id = ${workspaceId}
      AND type = 'task'
      AND data->>'assigned_to' = ${userId}
    ORDER BY created_at DESC
  `)
  // Uses: nodes_task_assignee_idx (partial index on assigned_to WHERE type = 'task')
}
```

#### Pattern 2: All overdue tasks in a workspace (PULSE use case)

```typescript
export async function getOverdueTasks(workspaceId: string) {
  return db.execute(sql`
    SELECT id, data
    FROM nodes
    WHERE workspace_id = ${workspaceId}
      AND type = 'task'
      AND data->>'status' NOT IN ('done', 'blocked')
      AND data->>'due_at' < ${new Date().toISOString()}
    ORDER BY data->>'due_at' ASC
  `)
  // Uses: nodes_task_status_idx + nodes_task_due_idx
}
```

#### Pattern 3: TASK nodes linked to a specific DECISION node (the graph traversal query)

```typescript
// "Show me all tasks that exist because of decision X"
export async function getTasksLinkedToDecision(decisionNodeId: string, workspaceId: string) {
  return db.execute(sql`
    SELECT n.id, n.type, n.data
    FROM nodes n
    INNER JOIN edges e ON (
      (e.source_node_id = ${decisionNodeId} AND e.target_node_id = n.id)
      OR
      (e.target_node_id = ${decisionNodeId} AND e.source_node_id = n.id)
    )
    WHERE n.workspace_id = ${workspaceId}
      AND n.type = 'task'
  `)
  // Uses: edges_source_idx + edges_target_idx + nodes_workspace_type_idx
}
```

#### Pattern 4: Decision Health Dashboard query

```typescript
// All decisions with outcome data for the health dashboard
export async function getDecisionHealthData(workspaceId: string) {
  return db.execute(sql`
    SELECT
      id,
      data->>'question' AS question,
      data->>'decision_type' AS decision_type,
      (data->>'decision_quality_score')::int AS quality_score,
      data->>'outcome' AS outcome,
      data->>'outcome_tagged_at' AS outcome_tagged_at,
      created_at
    FROM nodes
    WHERE workspace_id = ${workspaceId}
      AND type = 'decision'
    ORDER BY created_at DESC
  `)
  // Uses: nodes_workspace_type_idx + nodes_decision_outcome_idx
}
```

#### Pattern 5: Workspace-wide activity feed (most recent changes across all node types)

```typescript
export async function getWorkspaceActivityFeed(workspaceId: string, limit = 50) {
  return db.execute(sql`
    SELECT
      id,
      type,
      data->>'title' AS title,
      data->>'question' AS question,
      updated_at,
      updated_by
    FROM nodes
    WHERE workspace_id = ${workspaceId}
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `)
  // Uses: nodes_workspace_created_idx
}
```

### JSONB Query Performance Rules

These rules must be followed by every engineer on the project:

1. **Never use `data::text LIKE '%search%'`** — this is a full-table scan. Use `pg_trgm` or `pgvector` for text search (see Section 35).
2. **Always filter by `workspace_id` first** — it is the most selective index prefix.
3. **Always filter by `type` second** when querying a specific primitive — the partial indexes are built on type.
4. **Cast JSONB numeric fields before comparing** — `(data->>'score')::int > 70`, not `data->>'score' > '70'` (string comparison fails for 2-digit numbers).
5. **Use `@>` containment for multi-value JSONB matching** — e.g., `data @> '{"status": "blocked"}'` uses the GIN index.

---

## 35. SEARCH ARCHITECTURE

> **PURPOSE:** Search is the second most-used feature after the canvas. Users search for nodes by title, decision questions, document content, and assignee. This section specifies a three-layer search architecture that works at every scale from Day 1 to 100k nodes.

### Three-Layer Search Architecture

```
Layer 1: Title/metadata search (pg_trgm)       → Available Day 1. Zero config.
Layer 2: Full-text content search (tsvector)   → Needed at Week 4 for DOC content.
Layer 3: Semantic search (pgvector embeddings) → Needed for Decision DNA. Available Day 1 via Neon.
```

Each layer answers a different user intent:
- **"Find the task about onboarding"** → Layer 1 (title match)
- **"Find all docs that mention pricing"** → Layer 2 (full-text)
- **"Find decisions similar to this one"** → Layer 3 (semantic)

---

### Layer 1: Title Search with pg_trgm

`pg_trgm` is a Postgres extension that enables fuzzy text matching. It handles typos, partial matches, and word-order insensitivity.

```sql
-- Enable extension (run once in initial migration)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on title field extracted from JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_title_trgm_idx
  ON nodes USING gin((data->>'title') gin_trgm_ops)
  WHERE data->>'title' IS NOT NULL;

-- Same for decision questions
CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_question_trgm_idx
  ON nodes USING gin((data->>'question') gin_trgm_ops)
  WHERE type = 'decision';
```

```typescript
// lib/search/title-search.ts
export async function searchNodesByTitle(workspaceId: string, query: string) {
  return db.execute(sql`
    SELECT
      id, type,
      COALESCE(data->>'title', data->>'question', data->>'name') AS label,
      similarity(
        COALESCE(data->>'title', data->>'question', data->>'name'),
        ${query}
      ) AS score
    FROM nodes
    WHERE workspace_id = ${workspaceId}
      AND COALESCE(data->>'title', data->>'question', data->>'name') % ${query}
    ORDER BY score DESC
    LIMIT 20
  `)
}
```

---

### Layer 2: Full-Text Content Search (tsvector)

For DOC content search, add a generated `search_vector` column that indexes Tiptap document text.

```sql
-- Add search vector column to nodes table
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- GIN index on the vector
CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_search_vector_idx
  ON nodes USING gin(search_vector);
```

```typescript
// lib/search/update-search-vector.ts
// Called by Inngest event handler whenever a DOC node is saved

export async function updateDocSearchVector(nodeId: string, tiptapContent: any) {
  // Extract plain text from Tiptap JSON
  const plainText = extractTextFromTiptap(tiptapContent)

  await db.execute(sql`
    UPDATE nodes
    SET search_vector = to_tsvector('english', ${plainText})
    WHERE id = ${nodeId}
  `)
}

function extractTextFromTiptap(content: any): string {
  if (!content?.content) return ''
  return content.content
    .flatMap((node: any) => node.content || [])
    .filter((n: any) => n.type === 'text')
    .map((n: any) => n.text || '')
    .join(' ')
}

// Full-text search query
export async function searchDocContent(workspaceId: string, query: string) {
  return db.execute(sql`
    SELECT id, type, data->>'title' AS title,
      ts_rank(search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM nodes
    WHERE workspace_id = ${workspaceId}
      AND type = 'doc'
      AND search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT 20
  `)
}
```

---

### Layer 3: Semantic Search (pgvector — Decision DNA)

Semantic search enables "find decisions similar to this problem" — the killer feature of Decision DNA.

```sql
-- Enable pgvector (pre-installed in Neon)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to nodes table
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX CONCURRENTLY IF NOT EXISTS nodes_embedding_hnsw_idx
  ON nodes USING hnsw(embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
```

```typescript
// lib/search/semantic-search.ts
import { generateEmbedding } from '../ai/embeddings'

export async function semanticSearchDecisions(
  workspaceId: string,
  query: string,
  limit = 10
) {
  const queryEmbedding = await generateEmbedding(query)

  return db.execute(sql`
    SELECT
      id,
      data->>'question' AS question,
      data->>'resolution' AS resolution,
      data->>'decision_quality_score' AS quality_score,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
    FROM nodes
    WHERE workspace_id = ${workspaceId}
      AND type = 'decision'
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `)
}

// lib/ai/embeddings.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  // Primary: Nomic AI
  try {
    const res = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NOMIC_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'nomic-embed-text-v1.5',
        texts: [text],
        task_type: 'search_document',
      }),
    })
    const data = await res.json()
    return data.embeddings[0]
  } catch {
    // Fallback: Together AI embeddings
    const res = await fetch('https://api.together.xyz/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'togethercomputer/m2-bert-80M-8k-retrieval',
        input: text,
      }),
    })
    const data = await res.json()
    return data.data[0].embedding
  }
}
```

### Embedding Update Strategy

Embeddings are generated asynchronously via Inngest — never blocking the user's save action.

```typescript
// inngest/functions/embed-decision.ts
import { inngest } from '../client'
import { generateEmbedding } from '../../lib/ai/embeddings'

export const embedDecision = inngest.createFunction(
  { id: 'embed-decision', retries: 3 },
  { event: 'decision/saved' },
  async ({ event }) => {
    const { nodeId, question, rationale, resolution } = event.data
    const text = [question, rationale, resolution].filter(Boolean).join(' ')
    const embedding = await generateEmbedding(text)
    await db.execute(sql`
      UPDATE nodes SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${nodeId}
    `)
  }
)
```

### Unified Search API Route

```typescript
// app/api/v1/search/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const mode = searchParams.get('mode') || 'all' // all | decisions | docs | tasks

  const { workspaceId } = await getAuthContext(req)

  const [titleResults, contentResults, semanticResults] = await Promise.allSettled([
    searchNodesByTitle(workspaceId, query),
    mode !== 'tasks' ? searchDocContent(workspaceId, query) : Promise.resolve([]),
    mode === 'decisions' || mode === 'all'
      ? semanticSearchDecisions(workspaceId, query)
      : Promise.resolve([]),
  ])

  // Merge and deduplicate results by node ID, ranking by source
  const merged = mergeSearchResults(titleResults, contentResults, semanticResults)
  return Response.json({ results: merged })
}
```

---

## 36. CHURN MODEL & ARR SCENARIOS

> **PURPOSE:** Revenue projections without churn assumptions are fiction. This section specifies realistic churn rates, LTV calculations, and three ARR scenarios (conservative, base, optimistic) across 36 months. Use this to set investor expectations and operational targets.

### Churn Assumptions

| Plan | Monthly Churn | Annual Churn | Rationale |
|---|---|---|---|
| Free | 8% | 64% | High — free users have low commitment. |
| Pro ($19/seat) | 2.5% | 26% | Industry average for SMB productivity SaaS. |
| Business ($39/seat) | 1.2% | 14% | Higher switching cost. Decision DNA creates lock-in. |
| Enterprise (custom) | 0.5% | 6% | Contract-driven. Low churn by design. |

**Churn reduction levers built into Lazynext:**
- Decision DNA creates institutional memory that cannot be migrated to another tool — this is the primary retention moat.
- The workspace graph model means migrating away requires re-building the entire workflow structure elsewhere.
- Weekly Digest email keeps inactive users re-engaged weekly.

### Unit Economics Per Seat

| Metric | Pro | Business |
|---|---|---|
| MRR per seat | $19 | $39 |
| Monthly churn | 2.5% | 1.2% |
| Average LTV (months) | 40 months | 83 months |
| LTV per seat | $760 | $3,237 |
| Target CAC (3× payback) | < $190 | < $810 |
| Payback period at $50 CAC | 2.6 months | 1.3 months |

### 36-Month ARR Scenarios

All scenarios assume: launch at Week 12, average team size of 4 seats/workspace.

#### Conservative Scenario — "Slow Organic"
*Assumptions: 10 new workspaces/month growing to 30 by Month 12. Word-of-mouth only. No paid marketing.*

| Month | Workspaces | Avg Seats | MRR | ARR |
|---|---|---|---|---|
| 3 | 25 | 3.5 | $1,662 | $19,950 |
| 6 | 60 | 4 | $4,560 | $54,720 |
| 12 | 150 | 4.5 | $12,825 | $153,900 |
| 18 | 280 | 5 | $26,600 | $319,200 |
| 24 | 420 | 5.5 | $43,890 | $526,680 |
| 36 | 700 | 6 | $79,800 | $957,600 |

#### Base Scenario — "Steady Growth"
*Assumptions: ProductHunt launch at Week 12. Content marketing from Month 3. 30–60 new workspaces/month by Month 6.*

| Month | Workspaces | Avg Seats | MRR | ARR |
|---|---|---|---|---|
| 3 | 80 | 4 | $6,080 | $72,960 |
| 6 | 200 | 4.5 | $17,100 | $205,200 |
| 12 | 500 | 5 | $47,500 | $570,000 |
| 18 | 900 | 5.5 | $93,150 | $1,117,800 |
| 24 | 1,400 | 6 | $159,600 | $1,915,200 |
| 36 | 2,800 | 7 | $370,440 | $4,445,280 |

#### Optimistic Scenario — "Viral + Paid"
*Assumptions: Viral onboarding loop. $5k/month paid acquisition from Month 6. Featured in Indie Hackers, Hacker News.*

| Month | Workspaces | Avg Seats | MRR | ARR |
|---|---|---|---|---|
| 3 | 200 | 4 | $15,200 | $182,400 |
| 6 | 600 | 5 | $57,000 | $684,000 |
| 12 | 1,800 | 6 | $205,200 | $2,462,400 |
| 18 | 3,500 | 7 | $479,500 | $5,754,000 |
| 24 | 6,000 | 8 | $912,000 | $10,944,000 |
| 36 | 14,000 | 9 | $2,394,000 | $28,728,000 |

### Churn Recovery Levers

When churn spikes above target, activate these in order:

1. **Trigger: churn > 3.5% in any month** → Email campaign: "You have [N] unseen decisions from last month" (re-engagement via Decision DNA).
2. **Trigger: workspace inactive > 14 days** → Inngest scheduled job sends a personalized "Your workflow misses you" digest.
3. **Trigger: plan downgrade attempt** → Show "what you'll lose" modal: decision history, quality scores, LazyMind access. Offer 30-day extension.
4. **Trigger: cancellation survey shows "too expensive"** → Auto-offer 20% discount for annual commitment.

### Break-Even Analysis

| Cost Item | Monthly at Launch | Monthly at 500 Workspaces |
|---|---|---|
| Vercel Pro | $20 | $150 |
| Neon (compute) | $19 | $69 |
| Clerk (MAU) | $25 | $150 |
| Liveblocks | $0 (free tier) | $99 |
| Groq / Together AI | $0 (free tier) | $80 |
| Inngest | $0 (free tier) | $25 |
| Resend | $0 (free tier) | $20 |
| Sentry | $0 (free tier) | $26 |
| PostHog | $0 (free tier) | $0 |
| Cloudflare R2 | $0 | $15 |
| **Total Infra** | **$64** | **$634** |
| **Break-even MRR** | **$64** | **$634** |

At $19/seat average, you break even at **4 seats** on Day 1. Infrastructure cost is never the constraint. Sales is the constraint.

---

## 37. SCALE MIGRATION PLAN

> **PURPOSE:** The founding stack is chosen for zero-ops launch speed. But every component has a scale ceiling. This section specifies exactly when to migrate, what to migrate to, and what triggers the migration. Engineers must read this before asking "should we use X instead?"

### The Rule

**Do not migrate anything until you hit the trigger.** Premature optimization kills startups. The founding stack handles 10,000 workspaces without architectural changes. Migration is a success problem.

---

### Component Migration Map

#### Neon.tech → Dedicated Postgres (PlanetScale or self-hosted RDS)

| Trigger | Signal | Timeline |
|---|---|---|
| Neon compute costs exceed $500/month | Dashboard alert | Within 60 days of trigger |
| Query P99 latency > 200ms consistently | Sentry performance dashboard | Within 30 days of trigger |
| DB size > 50GB | Neon dashboard | Plan ahead at 30GB |

**Migration path:** Neon → PlanetScale Postgres (managed, no ops) or AWS RDS Postgres in `ap-south-1` (Mumbai) for India latency. Use `pg_dump` + Drizzle schema sync. Zero downtime via blue-green deployment.

**What does NOT change:** All Drizzle ORM queries, all schema, all index definitions. The migration is infrastructure-only.

---

#### Liveblocks → Self-Hosted (Hocuspocus + Yjs)

| Trigger | Signal | Timeline |
|---|---|---|
| Liveblocks cost > $500/month | Billing dashboard | Within 90 days |
| > 5,000 concurrent active users | Liveblocks dashboard | Plan at 3,000 |
| Enterprise customer requires data residency | Sales deal requirement | Before closing deal |

**Migration path:** Deploy [Hocuspocus](https://tiptap.dev/hocuspocus) (open-source Yjs server) on a single Fly.io machine. Liveblocks SDK is swapped for `@hocuspocus/provider`. Presence (cursors) re-implemented using Hocuspocus awareness protocol. Budget: 2 engineer-weeks.

---

#### Inngest → Temporal (for complex long-running workflows)

| Trigger | Signal | Timeline |
|---|---|---|
| Automation workflows exceed 30 steps | Product feature request | Phase 3 (TABLE primitive) |
| Need sub-second trigger reliability | Customer SLA requirement | Enterprise tier |
| Monthly Inngest cost > $300 | Billing dashboard | Evaluate at $200 |

**Migration path:** Temporal Cloud (managed) → same Inngest function signatures, re-implemented as Temporal Workflows. The Inngest `createFunction` pattern maps cleanly to Temporal Activities. Budget: 3 engineer-weeks.

---

#### Vercel → Fly.io + Custom CDN

| Trigger | Signal | Timeline |
|---|---|---|
| Vercel Pro cost > $1,000/month | Billing dashboard | Evaluate at $600 |
| Need persistent server (WebSockets native) | Post-Liveblocks migration | After Hocuspocus migration |
| Enterprise data residency requirement | Sales deal | Before closing |

**Migration path:** Dockerize the Next.js app → deploy to Fly.io (Mumbai region: `bom`). Cloudflare as CDN in front. Fly.io is $10–50/month for the same traffic that costs $500+ on Vercel at scale.

---

#### Groq/Together AI → Dedicated LLM Inference

| Trigger | Signal | Timeline |
|---|---|---|
| Groq free tier insufficient AND Together AI costs > $200/month | Billing dashboard | Evaluate at $100/month |
| Enterprise customer requires private LLM | Sales deal | Before closing |
| Need fine-tuned model for Lazynext-specific tasks | Product decision | Phase 3+ |

**Migration path (cloud):** Fireworks AI or Deepinfra — same OpenAI-compatible format, swap the URL in `lib/ai/groq.ts`. Zero code changes beyond env vars.

**Migration path (self-hosted enterprise):** Deploy Llama 3.3 70B on a single A100 GPU via [Vast.ai](https://vast.ai) or [RunPod](https://runpod.io) for ~$2/hour. Serve via Ollama. Route enterprise workspaces to private endpoint via `ENTERPRISE_LLM_URL` env var.

---

#### Upstash Redis → Valkey (self-hosted) or Elasticache

| Trigger | Signal | Timeline |
|---|---|---|
| Upstash cost > $100/month | Billing dashboard | Evaluate at $60 |
| Rate limiting needs sub-millisecond response | Performance requirement | Enterprise tier |

**Migration path:** Redis-compatible drop-in. Change connection string. Zero code changes.

---

### The Non-Migration List

These components do NOT have a migration path because they are correct at all scales:

- **Drizzle ORM** — stays forever. SQL is SQL.
- **Clerk.dev** — stays until >100k MAU (their Enterprise tier handles it). Migration to Auth.js is a last resort.
- **Cloudflare R2** — zero egress fees forever. No reason to migrate.
- **Tiptap** — the editor is infrastructure. Do not swap.
- **React Flow** — the canvas is infrastructure. Do not swap.
- **Zod** — validation library. Stays forever.
- **Resend** — email infrastructure. Stays until >100k emails/month.

---

### When to Hire DevOps

**Do not hire a DevOps engineer before $50k MRR.** The founding stack requires zero infrastructure management. When you hit $50k MRR and are migrating off Vercel + Neon, hire one senior platform engineer. Not before.

---

## APPENDIX A — LLM PROVIDER ALTERNATIVES

If Groq or Together AI become unavailable or change pricing, these providers use the same OpenAI-compatible format:

| Provider | Model | Notes |
|---|---|---|
| **Fireworks AI** | `accounts/fireworks/models/llama-v3p3-70b-instruct` | Very competitive pricing |
| **Deepinfra** | `meta-llama/Meta-Llama-3.3-70B-Instruct` | Reliable, OpenAI-compatible |
| **Perplexity AI** | `llama-3.3-70b-instruct` | Chat API available |
| **Ollama (self-hosted)** | `llama3.3:70b` | For enterprise self-hosting |
| **LM Studio (local dev)** | Any GGUF model | For development only |

Swapping providers requires only changing the URL and model name in `lib/ai/groq.ts` or `lib/ai/together.ts`. The `GROQ_MODEL` and `TOGETHER_MODEL` environment variables make this a zero-code change.

---

## APPENDIX B — INDIA-SPECIFIC NOTES

- **Supabase:** Blocked in India under IT Act Section 69A as of 2024. Do NOT use. Neon.tech is the replacement.
- **Neon.tech:** Fully accessible from India. Mumbai region available.
- **Cloudflare R2:** Fully accessible from India. Substantial India PoP presence.
- **Groq API:** Accessible from India. No geo-restrictions observed.
- **Together AI:** Accessible from India. No geo-restrictions observed.
- **Stripe:** Available for Indian businesses. Requires registered business entity. Use Razorpay as the primary India gateway — better conversion rates with Indian payment methods (UPI, net banking, wallets).
- **Razorpay:** India's leading payment gateway. Supports UPI, IMPS, NEFT, all Indian cards, Paytm, PhonePe wallets. Required for INR billing. Integration details in Section 19.
- **Clerk.dev:** Fully accessible from India. No geo-restrictions.
- **Vercel:** Fully accessible from India. Mumbai edge location (`bom1`) available.
- **Inngest:** Accessible from India. No restrictions.

---

---

## 38. WHY NOW — THE MOMENT FOR LAZYNEXT  ← **NEW in V5**

> This section answers the single most important investor and customer question: "Why is this the right time to build this?" Good timing is not luck — it is a convergence of forces that makes a previously impossible product suddenly possible and necessary.

### The Five Converging Forces (2025–2026)

#### Force 1: LLMs Make Workflow Graphs Queryable for the First Time

Before 2023, a workflow graph was data. After 2023, it is a reasoning substrate. The ability to pass your entire workspace state as JSON to an LLM and receive coherent strategic analysis is new. Decision DNA's killer feature — "what have we decided about X before, and how did those decisions turn out?" — requires LLM reasoning over structured historical data. This capability did not exist at production quality before Llama 3 and GPT-4. It exists now, and it is free via Groq.

**The timing implication:** Building Lazynext in 2021 would have produced a fancy database. Building it in 2026 produces an intelligent operating system. The AI layer is not a feature — it is the reason the product is possible now.

#### Force 2: Permanent Tool Fragmentation Post-COVID

Remote-first work normalized the adoption of best-in-class point solutions. Between 2020 and 2024, the average tech team went from 4 tools to 11 tools. This fragmentation is now structural — it is not going to self-heal. The "SaaS fatigue" inflection point has passed. Teams are actively looking to consolidate. This is the first time in SaaS history that "fewer tools" has been a genuine buyer motivation rather than a theoretical aspiration.

**The timing implication:** The market is now pull, not push. Buyers are coming to the conversation pre-motivated. CAC is lower when the problem is already felt.

#### Force 3: India's Startup Ecosystem Crossed Critical Mass

Bengaluru alone crossed 10,000 funded startups in 2024. India produced 100+ unicorns by 2025. The country has more English-speaking, software-native, SaaS-tool-using knowledge workers than the US did in 2010. Yet almost no B2B SaaS product has been built specifically for the Indian startup market — most tools are USD-priced, US-timezone-supported, and US-culture-assumed.

**The timing implication:** A product built India-first (INR pricing, UPI support, India-region data, India-aware cultural defaults) has a structural advantage over every US-headquartered competitor in the fastest-growing SaaS market in the world.

#### Force 4: Notion, Linear, and Airtable All Raised Prices in 2024–2025

Notion raised prices 20% in 2024 and removed features from the free tier. Linear moved features behind paid gates. Airtable's per-seat pricing became untenable for small teams. This created a churning pool of dissatisfied users actively evaluating alternatives — the switching window is open.

**The timing implication:** The comparison in every buyer's mind is already happening. A consolidated tool at $19/seat vs. $55+/seat across three fragmented tools closes itself.

#### Force 5: Managed Infrastructure Makes Zero-Ops Launch Possible

Neon, Clerk, Vercel, Liveblocks, Inngest — every component of this stack was either unavailable or significantly worse 3 years ago. A solo developer in 2026 can ship a production-grade, multi-tenant, real-time collaborative SaaS in 12 weeks using this stack. In 2021, the same product required a 4-person engineering team and 9 months minimum.

**The timing implication:** The cost and time to build has collapsed. This lowers the capital requirement and risk profile, while increasing the speed of iteration. The founding team's execution speed advantage over an incumbent trying to copy this product is measured in years, not months.

### Why Not Earlier? Why Not Later?

**Why not 2022:** LLMs were GPT-3 quality. Neon didn't exist. Liveblocks was in beta. The AI-readable workflow graph would have been a demo, not a product.

**Why not 2028:** By 2028, this market will have a winner. Notion is already experimenting with AI natively. Linear is building automation. Coda has Formula AI. The window to establish the "unified workflow + institutional memory" category is 18–24 months. After that, the category will be defined and the distribution advantages of incumbents will be decisive.

**The answer:** 2026 is the narrowest window when everything needed to build this is available and no one has yet won the category.

---

## 39. DECISION DNA PRE-MVP — 3-WEEK VALIDATION SPRINT  ← **NEW in V5**

> **This section is mandatory reading before writing a single line of application code.** The biggest risk to Lazynext is not technical — it is building seven primitives and discovering that the market does not pull toward them. This section specifies a 3-week validation sprint that de-risks the entire investment before the main build begins.

### The Validation Hypothesis

**Core hypothesis:** Teams will voluntarily log decisions in a structured tool if the act of logging takes less than 2 minutes and the search experience makes past decisions findable in under 10 seconds.

**Null hypothesis:** People will not form the habit of logging decisions regardless of how good the tool is, because the pain is felt months later (when a bad outcome occurs) not at the time of logging.

If the null hypothesis is true, Lazynext's core moat does not exist, and the architecture should shift toward Task + Doc primitives as the primary acquisition lever.

**The sprint exists to falsify or confirm the core hypothesis with real users before investing 12+ weeks of engineering.**

### Sprint Structure (3 Weeks)

#### Week 1: Zero-Code Validation (Days 1–7)

**Goal:** Validate the problem, not the solution.

**Actions:**

1. **5 founder interviews.** Find 5 people who match Archetype 1 or 2 (see Section 1). Ask only: "Walk me through the last time a bad outcome happened that could have been prevented if someone had logged a decision better." Do not pitch. Do not show anything. Just listen.

2. **The "decision graveyard" audit.** Ask each interviewee to screen-share their Notion/Confluence/Google Drive. Count how many "decision" or "ADR" or "why we chose X" documents exist. Observe: are they ever opened? Are they findable? Are they up-to-date?

3. **Willingness-to-pay signal.** At the end of each interview: "If a tool did only one thing — logged decisions with context and let you search them — would you pay $10/seat/month for it?" Record the answer exactly, including hedges and objections.

**Success criteria for Week 1:**
- [ ] At least 4/5 interviewees describe a real, recent, costly decision-logging failure
- [ ] At least 3/5 say "yes" or "maybe" to the $10/seat WTP question
- [ ] At least 2 interviewees ask "when can I try it?"

**If Week 1 fails:** The problem is not felt acutely enough. Pivot the framing to Task + Doc. Do not proceed with Decision DNA as the primary wedge.

#### Week 2: Concierge MVP (Days 8–14)

**Goal:** Validate the behavior (will people actually log decisions), not the technology.

**Do not write any code.** Use these tools instead:
- **Tally.so** — build a structured decision logging form (question, resolution, rationale, options considered, reversibility)
- **Notion database** — act as the "backend" — manually populate it with each submitted decision
- **Linear** — act as the issue tracker — manually create a "quality feedback" task for each submission
- **Loom** — record a 60-second personalized video for each submitter with your "AI quality score" (computed manually using the heuristic in Section 31)

Run this for 10 users. Check back with them at Day 14.

**Success criteria for Week 2:**
- [ ] 10 users onboarded (cold outreach, Twitter/X DMs, LinkedIn)
- [ ] At least 7/10 submit at least one decision in the first week
- [ ] At least 4/10 return to submit a second decision without being asked
- [ ] At least 2/10 use the Tally form to search for a past decision and find it useful

**The single most important signal:** Repeat usage without prompting. If only 2/10 users return, the habit loop is not forming. Pause and investigate before building.

#### Week 3: Signal Amplification (Days 15–21)

**Goal:** Identify what drives retention and what kills it.

**Actions:**

1. **Exit interviews for non-returners.** DM the 3 users who did not return after Week 2. Ask: "Why didn't you come back? What would have made you?" The answers will reveal the real UX blockers.

2. **Power user interview.** Interview the 2 users who returned without prompting. Ask: "What made you come back? What did you get from the second log that you didn't get from the first?" These users are your design partners.

3. **Qualitative quality scoring.** Manually review every decision submitted. Which ones had the best rationale? Which had the worst? Use this to calibrate the AI quality scoring algorithm in Section 31 before you implement it.

4. **The price test.** Tell the 4 returning users: "This will be $15/seat/month when it launches. Would you pay?" If 3/4 say yes, you have product-market fit for the wedge. Proceed to full build.

**Success criteria for Week 3:**
- [ ] Identified top 3 UX failure points from non-returner interviews
- [ ] At least 2 "design partner" users confirmed — people who will test every week during build
- [ ] At least 3/10 total users confirm willingness to pay $15+/seat
- [ ] Written summary of what the concierge MVP taught you (the "Validation Log" — see below)

### The Validation Log (Required Artifact)

Before writing any application code, complete this document and keep it as `VALIDATION_LOG.md` in the repo root:

```markdown
# Lazynext Validation Log

## Core Hypothesis Status
- [ ] CONFIRMED: 3+ users returned without prompting AND 3+ confirmed WTP
- [ ] REJECTED: Fewer than 2 returners OR fewer than 3 WTP confirmations
- [ ] INCONCLUSIVE: Mixed signals — document and decide

## Interview Findings (5 founder interviews)
| Interviewee | Role | Company Size | Real pain described? | WTP signal |
|---|---|---|---|---|
| | | | | |

## Behavioral Data (10 concierge users)
| User | Decisions logged (W1) | Returned in W2? | Decision logged (W2) | WTP $15? |
|---|---|---|---|---|
| | | | | |

## Top 3 UX Failure Points
1.
2.
3.

## Design Partners (commit to weekly check-ins)
1.
2.

## Build Decision
- **Proceed with Decision DNA as primary wedge:** YES / NO
- **If NO, pivot to:** [Task+Doc first / Different ICP / Different problem]
- **Rationale:**
```

### Decision Gate

**If validation confirms the hypothesis:** Proceed to the 12-week build sprint in Section 33. Decision DNA is the primary acquisition wedge.

**If validation rejects the hypothesis:** Run a parallel 1-week sprint validating the Task primitive with the same 10 users. The Task primitive has no validation risk — it replaces well-understood tools. Build Task + Doc first, add Decision DNA in Phase 2 when users ask for it.

**If validation is inconclusive:** Run 5 more interviews with a different ICP (try Archetype 2 — the Ops-Obsessed PM). They have a stronger felt need for decision accountability.

**Do not proceed to full build without completing this sprint.** The 3 weeks spent here saves 20+ weeks of building the wrong thing.

---

## 40. FAILURE MODES & RESILIENCE PATTERNS  ← **NEW in V5**

> **PURPOSE:** Every dependency in the founding stack has a failure mode. This section catalogs each one and specifies the exact response — both the automated system response and the human response. A system that fails gracefully is more trustworthy than one that never fails.

### Dependency Failure Matrix

| Dependency | Failure Mode | Probability | User Impact | Automated Response | Human Response |
|---|---|---|---|---|---|
| Neon Postgres | Connection timeout / cold start | Medium (serverless) | API errors, data not loading | Retry with exponential backoff (3 attempts, 100ms/500ms/2s) | Alert on Sentry; investigate Neon status page |
| Neon Postgres | Full outage | Low | Complete app unavailability | Show maintenance page; queue writes in Redis | Post status update at status.lazynext.com within 5 minutes |
| Clerk.dev | Auth service outage | Very low | Users cannot sign in | Cache last valid session for 30 minutes | Communicate on status page; contact Clerk support |
| Groq API | Rate limit exhausted | High (free tier) | LazyMind AI features unavailable | Automatic failover to Together AI | Monitor usage; upgrade Groq plan or pre-warm Together AI |
| Together AI | API errors | Low | LazyMind unavailable | Return cached response if available; show "AI temporarily unavailable" | Log to Sentry; check Together AI status |
| Liveblocks | Outage | Low | Multiplayer cursors disappear | Fall back to polling (5-second interval); canvas continues to work | No action required — canvas is still functional |
| Inngest | Queue backlog | Medium (free tier limits) | Automations delayed | Alert when queue depth > 1000 | Prioritize critical functions; upgrade plan |
| Vercel | Edge function timeout (30s) | Medium (AI routes) | AI requests time out | Return 504 with retry prompt to user | Move long-running AI to Trigger.dev background jobs |
| Cloudflare R2 | File upload failure | Low | Attachment upload fails | Retry upload 3 times; show error state | Check R2 status; verify credentials |
| Resend | Email delivery failure | Low | Notifications not delivered | Retry via Inngest 3 times with 1-hour delay | Check Resend dashboard; verify domain DNS |
| Upstash Redis | Rate limit check failure | Low | Rate limiting bypassed | Fail open (allow request) with logging | Alert on anomalous traffic patterns |

### Resilience Patterns by Layer

#### Database Resilience

```typescript
// lib/db/resilient-query.ts
// Exponential backoff wrapper for all database operations

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      const isRetryable = error?.message?.includes('connection') ||
                          error?.message?.includes('timeout') ||
                          error?.code === 'ECONNRESET'

      if (!isRetryable || attempt === maxAttempts) throw error

      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('Max retries exceeded')
}

// Usage in every API route that touches the DB:
const result = await withRetry(() =>
  db.select().from(nodes).where(eq(nodes.workspaceId, workspaceId))
)
```

#### AI Failover Chain

```typescript
// lib/ai/lazymind.ts
// The failover chain: Groq → Together AI → Cached Response → Graceful Degradation

export async function callLazyMind(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000
): Promise<string> {

  // Attempt 1: Groq (fastest, free tier)
  try {
    return await callGroq(systemPrompt, userMessage, maxTokens)
  } catch (error: any) {
    console.warn('[LazyMind] Groq failed:', error?.message)
    // Log to Sentry but don't throw — attempt fallback
    Sentry.captureException(error, { tags: { provider: 'groq' } })
  }

  // Attempt 2: Together AI (reliable fallback)
  try {
    return await callTogether(systemPrompt, userMessage, maxTokens)
  } catch (error: any) {
    console.warn('[LazyMind] Together AI failed:', error?.message)
    Sentry.captureException(error, { tags: { provider: 'together' } })
  }

  // Attempt 3: Return a cached response if available
  const cacheKey = `lazymind:${hashPrompt(userMessage)}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return `${cached} [This response was served from cache due to temporary AI unavailability.]`
  }

  // Graceful degradation: return a useful error message
  // Do NOT throw — the canvas should still work without AI
  return `LazyMind is temporarily unavailable. Your workflow data is safe. Please try again in a few minutes.`
}
```

#### Real-Time Degradation (Liveblocks Fallback)

```typescript
// hooks/useRealtimePresence.ts
// Falls back to polling if Liveblocks is unavailable

export function useRealtimePresence(workflowId: string) {
  const [liveblocksAvailable, setLiveblocksAvailable] = useState(true)

  useEffect(() => {
    // If Liveblocks connection fails after 5 seconds, fall back to polling
    const timeout = setTimeout(() => {
      setLiveblocksAvailable(false)
    }, 5000)

    // If connection succeeds, clear the timeout
    liveblocksRoom.subscribe('connection', (status) => {
      if (status === 'open') clearTimeout(timeout)
    })

    return () => clearTimeout(timeout)
  }, [])

  // When Liveblocks is down, poll for changes every 5 seconds
  useEffect(() => {
    if (liveblocksAvailable) return
    const interval = setInterval(() => {
      fetch(`/api/v1/workflows/${workflowId}/nodes`)
        .then(r => r.json())
        .then(data => hydrateCanvas(data.nodes, data.edges))
    }, 5000)
    return () => clearInterval(interval)
  }, [liveblocksAvailable, workflowId])
}
```

#### Inngest Failure Handling

```typescript
// lib/inngest/functions/automation-trigger.ts
// All Inngest functions must handle partial failures gracefully

export const processAutomationTrigger = inngest.createFunction(
  {
    id: 'process-automation-trigger',
    retries: 3,                           // Auto-retry 3 times
    cancelOn: [{ event: 'workspace/deleted' }], // Cancel if workspace deleted
    rateLimit: {
      limit: 100,
      period: '1m',
      key: 'event.data.workspaceId',      // Per-workspace rate limit
    },
  },
  { event: 'lazynext/node.updated' },
  async ({ event, step }) => {
    // Use step.run() for each logical operation
    // Inngest resumes from the last successful step on retry
    const automations = await step.run('fetch-automations', async () => { /* ... */ })

    for (const automation of automations) {
      // Each automation execution is isolated — one failure doesn't block others
      await step.run(`execute-${automation.id}`, async () => {
        try {
          await executeActions(automation.actions, event.data.workspaceId)
        } catch (error) {
          // Log but don't rethrow — allow other automations to proceed
          await logAutomationFailure(automation.id, error)
        }
      })
    }
  }
)
```

### Neon Cold Start Mitigation

Neon serverless Postgres "scales to zero" — the database pauses after 5 minutes of inactivity. The cold start adds 200–800ms to the first query. For production, mitigate this with a keep-alive ping:

```typescript
// lib/inngest/functions/db-keepalive.ts
// Runs every 4 minutes to prevent cold starts during business hours

export const dbKeepAlive = inngest.createFunction(
  { id: 'db-keepalive', concurrency: 1 },
  { cron: '*/4 5-22 * * 1-5' }, // Every 4 min, 5am–10pm IST, weekdays
  async () => {
    await db.execute(sql`SELECT 1`)
  }
)
```

### Status Page & Incident Communication

**Status page:** https://status.lazynext.com — use Better Uptime (free tier, monitors every service).

**Incident SLAs:**
- P0 (complete outage): First communication within 5 minutes. Resolution or workaround within 2 hours.
- P1 (major feature down): First communication within 15 minutes. Resolution within 8 hours.
- P2 (degraded performance): First communication within 1 hour. Resolution within 48 hours.

**Communication channels:**
- status.lazynext.com (primary)
- Email to affected workspace admins (via Resend, triggered by Inngest)
- Twitter/X @lazynext (for P0/P1 only)

---

## 41. WCAG 2.1 AA ACCESSIBILITY SPECIFICATION  ← **NEW in V5**

> **PURPOSE:** WCAG 2.1 AA compliance is not optional. It is a legal requirement in the EU and many enterprise procurement requirements, and it is the right thing to build. This section specifies every accessibility requirement with actionable implementation guidance. Target: Lighthouse Accessibility score 95+.

### Compliance Target

**Standard:** WCAG 2.1 Level AA  
**Testing tools:** axe-core (automated), NVDA + Chrome (screen reader), VoiceOver + Safari (iOS)  
**Audit cadence:** Run axe-core on every PR via CI. Manual screen reader audit monthly.

### Keyboard Navigation Map

Every user action available via mouse must be reachable via keyboard. The full keyboard map:

| Action | Keys | Notes |
|---|---|---|
| Open command palette | `⌘K` / `Ctrl+K` | Available everywhere in app |
| Add node to canvas | `N` (when canvas focused) | Opens node type picker |
| Delete selected node | `Delete` / `Backspace` | Confirmation dialog before delete |
| Connect nodes | `Enter` on source node, `Tab` to target | Alternative to drag |
| Undo | `⌘Z` / `Ctrl+Z` | Canvas actions only |
| Redo | `⌘Shift+Z` / `Ctrl+Shift+Z` | Canvas actions only |
| Open node detail | `Enter` on selected node | Opens right panel |
| Close panel / modal | `Escape` | Returns focus to trigger element |
| Navigate node list (mobile) | Arrow keys | When list view is active |
| Log a decision | `⌘D` / `Ctrl+D` | Opens decision form |
| Open LazyMind | `⌘L` / `Ctrl+L` | Opens AI panel |
| Navigate LazyMind results | `Tab` / `Shift+Tab` | Through all interactive elements |
| Submit LazyMind query | `Enter` | When input is focused |

### Focus Management Rules

```typescript
// components/ui/Modal.tsx
// All modals must trap focus and restore it on close

import { useEffect, useRef } from 'react'

export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Store the element that triggered the modal
      triggerRef.current = document.activeElement as HTMLElement

      // Move focus into modal
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    } else {
      // Restore focus to trigger element when modal closes
      triggerRef.current?.focus()
    }
  }, [isOpen])

  // Trap focus inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab') return

    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable?.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}
```

### ARIA Requirements by Component

| Component | Required ARIA | Notes |
|---|---|---|
| Canvas node | `role="article"`, `aria-label="{type}: {title}"` | Must be readable by screen readers |
| Node status badge | `aria-label="Status: {status}"` | Not just color — color-blind accessible |
| LazyMind chat | `role="log"`, `aria-live="polite"` | New messages announced to screen readers |
| Loading states | `aria-busy="true"`, `aria-label="Loading {thing}..."` | Spinners alone are inaccessible |
| Error messages | `role="alert"`, `aria-live="assertive"` | Errors announced immediately |
| Decision quality score | `aria-label="Decision quality score: {score} out of 100"` | Never expose only the number |
| Icon-only buttons | `aria-label="{action}"` | All icon buttons MUST have aria-label |
| Form inputs | `aria-describedby` linked to error message ID | Connect error to its input |
| Dropdown menus | `aria-haspopup="listbox"`, `aria-expanded` | Native state management |
| Tab panels | `role="tablist"`, `role="tab"`, `role="tabpanel"` | Standard ARIA pattern |

### Color Contrast Requirements

| Text Type | Minimum Ratio | Notes |
|---|---|---|
| Normal body text | 4.5:1 | WCAG AA requirement |
| Large text (18px+ / bold 14px+) | 3:1 | WCAG AA large text |
| UI components (borders, icons) | 3:1 | Focus indicators, active state borders |
| Decorative elements | No requirement | But keep intentional |

**High-risk components (must audit manually):**
- Status badges (colored backgrounds with text — verify every color)
- Node type icons (colored icons on canvas backgrounds)
- Decision quality score gradient (green/yellow/red) — add text label alongside
- Disabled state form elements — verify they meet 3:1 minimum

### Skip Links

```typescript
// app/layout.tsx — add at top of body before all navigation

<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded"
>
  Skip to main content
</a>
```

### Screen Reader Testing Checklist

Run this checklist monthly using NVDA + Chrome (Windows) and VoiceOver + Safari (macOS/iOS):

- [ ] Can a user sign up and reach their workspace without using a mouse?
- [ ] Is the canvas node list accessible via the mobile list view for screen reader users? (The canvas itself does not need to be accessible — the list view is the accessible alternative.)
- [ ] Can a user log a decision using keyboard only?
- [ ] Does LazyMind announce new responses without requiring focus change?
- [ ] Are all error states announced?
- [ ] Can a user navigate the pricing page and reach the CTA without a mouse?

### Automated Accessibility Testing in CI

```typescript
// tests/accessibility/axe.test.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('accessibility', () => {
  const pages = ['/', '/pricing', '/sign-in', '/sign-up']

  for (const path of pages) {
    test(`${path} has no critical WCAG violations`, async ({ page }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      // Filter to critical and serious violations only
      const violations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      )
      expect(violations).toHaveLength(0)
    })
  }
})
```

---

## 42. COMPETITIVE FEATURE PARITY MATRIX  ← **NEW in V5**

> **PURPOSE:** Every sales conversation eventually becomes "how do you compare to X?" This section provides the honest, specific answer — not marketing copy. The matrix is designed to be used as a sales tool and as a build prioritization guide.

### Feature Parity Matrix

Ratings: ✓ Full parity | ~ Partial / limited | ✗ Not available | ★ Lazynext advantage

| Feature | Lazynext | Notion | Linear | Airtable | ClickUp | Coda | Fibery | Height |
|---|---|---|---|---|---|---|---|---|
| **Tasks & Projects** | | | | | | | | |
| Task creation & assignment | ✓ | ~ | ✓ | ~ | ✓ | ~ | ✓ | ✓ |
| Subtasks | ✓ | ~ | ✓ | ✗ | ✓ | ~ | ✓ | ✓ |
| Priority levels | ✓ | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ |
| Due dates | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Kanban view | ~ Ph2 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sprint planning | ✗ Ph3 | ✗ | ✓ | ✗ | ✓ | ✗ | ✓ | ✓ |
| Time tracking | ✗ | ✗ | ✗ | ~ | ✓ | ~ | ~ | ~ |
| **Documents** | | | | | | | | |
| Rich text editor | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ |
| Real-time collaboration | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ~ | ✗ |
| Slash commands | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ~ | ✗ |
| Embed other node types inline | ✓★ | ~ | ✗ | ✗ | ~ | ✓ | ✓ | ✗ |
| **Structured Data** | | | | | | | | |
| Spreadsheet/table view | ~ Ph3 | ~ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Custom field types | ~ Ph3 | ~ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Relational linking | ✓ | ~ | ✗ | ✓ | ~ | ✓ | ✓ | ✗ |
| Formula fields | ✗ | ~ | ✗ | ✓ | ~ | ✓ | ✓ | ✗ |
| **Decision Tracking** | | | | | | | | |
| Structured decision logging | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Retroactive outcome tagging | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Decision quality scoring | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Semantic decision search | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Decision health dashboard | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **AI** | | | | | | | | |
| AI writing assistant | ✓ | ✓ | ✗ | ✗ | ~ | ✓ | ✗ | ✗ |
| AI workflow analysis | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| AI decision quality scoring | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Open-source LLM | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Automation** | | | | | | | | |
| If/then automations | ✓ Ph2 | ✗ | ~ | ✓ | ✓ | ✓ | ✓ | ~ |
| Scheduled triggers | ✓ Ph2 | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Webhook triggers | ✓ Ph2 | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| **Pricing** | | | | | | | | |
| INR pricing (India) | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| UPI / Razorpay | ✓★ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Price (starter/team tier) | $19/seat | $16/seat | $8/seat | $20/seat | $10/seat | $10/seat | $12/seat | $18/seat |

**Key:** Ph2 = Available in Phase 2, Ph3 = Available in Phase 3

### The Honest Gaps

Lazynext V1 will lose comparison on: Sprint planning, Kanban (Phase 2), Time tracking (never planned), Formula fields (never planned), Template marketplace depth.

**The correct sales response to these gaps:** "You're right — we don't have sprint planning. We're built for teams who find Jira overkill and Linear too rigid. If you need sprint velocity charts and story points, Linear is the better choice. If you want everything in one place including *why* you made the decisions that drove those sprints — we're the only option."

---

### Why Fibery Failed to Go Mainstream — A Post-Mortem

Fibery is the closest technical analog to Lazynext. It has the graph model, it has custom entities, it has relations. It launched in 2019, has raised $5.5M, and has not broken through to mainstream adoption. Understanding why is essential to avoiding the same mistakes.

**Fibery's failure modes:**

**1. Infinite configurability as the UX.** Fibery's primary interface asks users to design their own data model before they can do any work. "Create an entity type, add fields, define relations..." This is a developer's product pitched to non-developers. The cognitive load to onboard is enormous. Most users quit before their first task.

**Lazynext's response:** Seven opinionated primitives. You cannot create a custom entity type. You work with Task, Doc, Decision, Thread, Pulse, Automation, and Table. This removes 90% of the onboarding friction at the cost of some flexibility power users might want.

**2. No emotional hook.** Fibery does everything and therefore has no story. "The connected workspace" is not a pain point — it's a feature description. Their marketing is rational when it should be emotional.

**Lazynext's response:** Decision DNA is the emotional hook. "Never repeat a mistake your team already made" is a story, not a feature list. Every piece of marketing leads with the pain, not the product.

**3. Priced for enterprise, built for startups.** Fibery's pricing starts at $12/seat but requires minimum 5 seats ($60/month minimum). Their sales motion is top-down and their onboarding assumes a dedicated system administrator.

**Lazynext's response:** Start for free. One person can set up a workspace in 10 minutes with no configuration. The pricing scales with the team, not against it.

**4. No mobile-first design.** Fibery's mobile experience is a port, not a design. For a tool targeting remote teams, this is fatal — remote teams work from phones.

**Lazynext's response:** Every view designed mobile-first. The mobile list view is the primary design constraint for canvas interactions.

**5. No AI native integration.** Fibery added AI in 2023 as a bolt-on. It is not integrated into the workflow model — it is a chat sidebar.

**Lazynext's response:** LazyMind reads the entire workspace graph. The AI is not a sidebar — it is the operating layer over the graph.

**The meta-lesson from Fibery:** Technical correctness is not product-market fit. Fibery built the right architecture and the wrong product. Lazynext's job is to take the graph model and wrap it in opinionated, emotionally resonant, mobile-native UX with a clear story that non-technical buyers understand in 30 seconds.

---

## 43. PAYWALL PLACEMENT & EXPANSION REVENUE MODEL  ← **NEW in V5**

> ⚠️ **PRICING NOTE (V9):** The tier names and prices in this section (Free / Starter $19 / Business $39) predate the India-first pivot. **Section 51 is the authoritative pricing model.** Use INR tiers (₹0 / ₹499 / ₹999 / ₹2,999). The feature gating logic below remains correct — only the price labels need updating during implementation.

### Exact Feature Gating by Plan

The paywall must be specific. Vague limits erode trust. Every user must know exactly what they get at every tier before they sign up.

| Feature | Free | Starter ($19/seat/mo) | Business ($39/seat/mo) | Enterprise (custom) |
|---|---|---|---|---|
| **Workspace** | | | | |
| Seats | 3 | Unlimited | Unlimited | Unlimited |
| Workflows (canvases) | 5 | Unlimited | Unlimited | Unlimited |
| Nodes per workspace | 200 | 5,000 | Unlimited | Unlimited |
| **Tasks** | | | | |
| Create & assign tasks | ✓ | ✓ | ✓ | ✓ |
| Subtasks | ✓ | ✓ | ✓ | ✓ |
| File attachments | 3 per node | Unlimited | Unlimited | Unlimited |
| **Documents** | | | | |
| Rich text docs | ✓ | ✓ | ✓ | ✓ |
| Real-time collaboration | ✓ | ✓ | ✓ | ✓ |
| Doc history / versions | 7 days | 30 days | Unlimited | Unlimited |
| **Decisions** | | | | |
| Log decisions | ✓ | ✓ | ✓ | ✓ |
| Local quality scoring | ✓ | ✓ | ✓ | ✓ |
| AI quality scoring (LLM) | ✗ | ✓ | ✓ | ✓ |
| Outcome tagging | ✗ | ✓ | ✓ | ✓ |
| Semantic search | ✗ | ✓ | ✓ | ✓ |
| Decision health dashboard | ✗ | ✗ | ✓ | ✓ |
| Weekly decision digest email | ✗ | ✓ | ✓ | ✓ |
| Decision export (JSON/CSV) | ✗ | ✗ | ✓ | ✓ |
| **AI — LazyMind** | | | | |
| AI queries per month | 10 | 100 | Unlimited | Unlimited |
| Workflow analysis | ✗ | ✓ | ✓ | ✓ |
| Decision quality AI | ✗ | ✓ | ✓ | ✓ |
| Custom AI prompts | ✗ | ✗ | ✓ | ✓ |
| **Automation** | | | | |
| Automation rules | 1 | 10 | Unlimited | Unlimited |
| Automation run history | 7 days | 30 days | 1 year | Unlimited |
| Webhook triggers | ✗ | ✓ | ✓ | ✓ |
| **PULSE** | | | | |
| Pulse dashboards | 1 | 5 | Unlimited | Unlimited |
| Custom metric queries | ✗ | ✓ | ✓ | ✓ |
| **Data** | | | | |
| Data export | ✗ | JSON only | JSON + CSV | All formats + API |
| Workspace backup | ✗ | Monthly | Weekly | Daily + custom |
| **Support** | | | | |
| Support channel | Community | Email (48h) | Priority email (8h) | Dedicated Slack + SLA |
| Onboarding | Self-serve | Self-serve | 1:1 onboarding call | Custom onboarding |

### Paywall UX Rules

**Rule 1: Never block access — show the wall.** When a Free user hits a limit, show them what they're missing with a clear upgrade CTA. Do not hide the feature — show it grayed out with a lock icon and "Upgrade to Starter."

**Rule 2: Celebrate the upgrade moment.** When a user upgrades, send a personal congratulations email from the founder. In-app, show a brief animation. Make it feel like joining something.

**Rule 3: The 10-query LazyMind free limit is generous enough to prove value.** 10 AI queries is enough for a user to get a workflow analysis, 3 decision quality scores, and 2 semantic searches. They will have experienced the product's best features before hitting the wall.

**Rule 4: Decision DNA limits should trigger at the worst possible moment — when a user tries to search for a past decision and gets a paywall.** This is the highest-intent moment for conversion. The user is already experiencing the pain the product solves.

### Expansion Revenue Model

Expansion MRR (revenue from existing customers spending more) is the most efficient revenue growth. Lazynext has three expansion levers:

#### Lever 1: Seat Expansion (Natural Growth)
When a user invites a colleague, they convert a Free workspace into a paid workspace, or they add a billable seat. This is the most reliable expansion lever.

**Viral mechanism:** When a Lazynext user references a decision in a message (e.g., "Here's the decision we made about pricing last month: [decision link]"), the recipient needs a Lazynext account to view the full decision context. This creates organic seat-level virality.

**Target:** 1.3× seat growth per workspace per quarter for the first 4 quarters.

#### Lever 2: Plan Upgrade (Feature-Triggered)
Users upgrade when they hit a specific limit. The sequence that converts most reliably:
1. Free user hits the 10 LazyMind query limit → offer Starter
2. Starter user discovers the Decision Health Dashboard is Business-only → offer Business
3. Business user needs a dedicated Slack support channel or custom onboarding → offer Enterprise

**Conversion optimization:** Every paywall shows a specific, quantified value claim. Not "upgrade for more features" — "upgrade to see the quality trend across your last 47 decisions."

#### Lever 3: Annual Commitment (Cash Flow + Retention)
Offer 2 months free for annual commitment (equivalent to ~17% discount). This improves cash flow, reduces monthly churn by ~40% (annual customers churn at the renewal date, not monthly), and provides a cleaner revenue recognition model for potential investors.

**Target:** 30% of paid workspaces on annual plans within 12 months of launch.

### Pricing Sensitivity Analysis

The $19/seat starting price is a hypothesis. This table quantifies the trade-off:

| Price Point | Conversion Rate Estimate | MRR at 500 Workspaces (4 seats avg) | Notes |
|---|---|---|---|
| $9/seat | 8% free-to-paid | $18,000 | Races to the bottom; undervalues Decision DNA |
| $15/seat | 6% | $18,000 | Same MRR as $9 with better unit economics |
| **$19/seat** | **5%** | **$19,000** | **Recommended — proven price point for SMB SaaS** |
| $25/seat | 3.5% | $17,500 | Slight MRR reduction; better LTV per seat |
| $39/seat | 2% | $15,600 | Reaches Business ICP only; loses Founder ICP |

**The $19 price point maximizes the intersection of conversion rate and MRR at the SMB scale.** It is above the psychological "commodity" threshold ($9–12) and below the "requires procurement" threshold ($25+/seat).

**INR Pricing:** ₹799/seat/month (not a direct conversion — priced for Indian market purchasing power and competitive positioning vs. USD-priced tools). Annual: ₹7,990/seat/year (2 months free).

**Price adjustment trigger:** If free-to-paid conversion is below 3% at 90 days post-launch, reduce to $15/seat. If conversion is above 8%, test $25/seat with new signups via A/B test in PostHog.

---

## APPENDIX C — USER RESEARCH FRAMEWORK & VALIDATION  ← **NEW in V5**

> This appendix provides the templates and framework for ongoing user research throughout the build. Product decisions made without user input are guesses. This makes the guessing systematic.

### Interview Template (Founder/PM Discovery)

Use this exact script for the 5 validation interviews in Section 39. Do not deviate — consistency enables comparison.

```
INTRO (2 min):
"Thanks for making time. I'm building a tool to help teams manage workflow
and decisions better. I'm not going to pitch you anything today — I just
want to understand your actual experience. Everything you say is helpful,
even if it's not what I want to hear."

WARM-UP (3 min):
1. "What tools does your team use day-to-day for getting work done?"
2. "Which one causes the most friction? Why?"

CORE (15 min):
3. "Tell me about a time something went wrong in your team because
   of a decision that wasn't well-communicated or well-documented."
   [Let them talk. Don't interrupt. Note: specificity of the story]

4. "How was that decision made? Who was involved? What happened next?"

5. "When that bad outcome happened, did you know what the original
   reasoning was? How did you find out?"

6. "If you had a tool that let you search every decision your team had
   ever made — including why you made it and how it turned out — how
   often do you think you'd use it?"

CLOSE (5 min):
7. "If a tool did just that one thing — decision logging and search —
   what would it need to look like to fit into your workflow?"

8. "Would you pay for something like that? Ballpark."

NOTES TO CAPTURE:
- Verbatim quote from question 3 (the failure story)
- Emotion level (scale 1-10) when describing the pain
- Exact WTP answer including any hedges ("maybe", "depends", "probably")
- Any features or tools mentioned that we don't have yet
```

### Continuous Feedback Loop (Post-Launch)

**Weekly:** Review PostHog session replays for the top 3 most-used and bottom 3 least-used features. Watch 5 sessions per week.

**Bi-weekly:** Review all support emails and categorize by theme (bug, confusion, feature request, praise). Share summary in team Slack.

**Monthly:** Interview 2 active users and 1 churned user. Ask churned users exactly: "What made you decide to stop using Lazynext?" Do not try to win them back during the call.

**Quarterly:** Run a NPS survey to all workspaces with 10+ nodes. Target NPS of 40+ by end of Year 1.

### The "Mom Test" for Every Feature

Before building any feature, answer these three questions (from Rob Fitzpatrick's The Mom Test):

1. **Do users have this problem without prompting?** (If you have to explain the problem, it's not real enough.)
2. **Have users paid for an inadequate solution?** (Money spent = validated pain.)
3. **Is this a problem they have every day, every week, or only occasionally?** (Daily problems are worth solving. Occasional problems are nice-to-haves.)

Apply this test to every item on the backlog before scheduling it for a sprint.

---


---

## 44. ONBOARDING & MIGRATION STRATEGY  ← **NEW in V6**

> **PURPOSE:** The most beautifully-architected platform fails if users cannot get their existing data into it on Day 1. This section specifies the full migration pipeline, template library, and the emotional journey of switching a team from 4 tools to 1. This is the missing piece that determines whether acquisition converts to retention.

### The Migration Problem

Every Lazynext ICP already has data somewhere:
- **Archetype 1 (Drowning Founder):** 3 years of Notion pages, Linear tickets, Slack threads
- **Archetype 2 (Ops PM):** Confluence docs, Jira epics, spreadsheet decision logs
- **Archetype 3 (Remote Lead):** Notion wikis, Linear projects, Airtable trackers

The blank canvas is the #1 churn point for all-in-one tools. If a user signs up and sees an empty workspace, they leave. The migration story must be so good that the first session feels like homecoming, not starting over.

**Rule:** No user should ever see a fully blank workspace unless they explicitly choose "Start from scratch."

---

### 44.1 Migration Sources — Priority Order

Build importers in this order. Each one unlocks a specific ICP.

| Priority | Source | ICP Unlocked | Import Format | Complexity |
|---|---|---|---|---|
| 1 | **Notion** | Archetype 1 & 2 | Notion API (OAuth) or ZIP export | Medium |
| 2 | **Linear** | Archetype 1 & 3 | Linear API (OAuth) | Low |
| 3 | **Trello** | Archetype 1 | Trello JSON export | Low |
| 4 | **Asana** | Archetype 2 | CSV export | Low |
| 5 | **Jira** | Archetype 2 | CSV export | Medium |
| 6 | **CSV (generic)** | All | Any structured CSV | Low |
| 7 | **Airtable** | Archetype 2 & 3 | Airtable API (Phase 3, TABLE primitive) | High |

---

### 44.2 Notion Importer — Full Specification

Notion is the primary migration source. 80% of ICPs have Notion. Getting this right is a competitive advantage.

**Method 1: Notion API (Preferred — requires user to connect Notion)**

```typescript
// app/api/v1/import/notion/route.ts
import { Client } from '@notionhq/client'

export async function POST(req: Request) {
  const { notionToken, workspaceId } = await req.json()
  const notion = new Client({ auth: notionToken })

  // Step 1: Fetch all pages from the Notion workspace
  const pages = await notion.search({ filter: { property: 'object', value: 'page' } })

  const importResults = { docs: 0, tasks: 0, skipped: 0, errors: [] as string[] }

  for (const page of pages.results) {
    if (page.object !== 'page') continue

    try {
      // Step 2: Fetch full page content
      const blocks = await notion.blocks.children.list({ block_id: page.id })
      const markdownContent = notionBlocksToTiptapJSON(blocks.results)

      // Step 3: Determine node type
      // Pages with database parent → TASK node
      // Regular pages → DOC node
      const nodeType = page.parent.type === 'database_id' ? 'task' : 'doc'

      // Step 4: Extract TASK-specific fields if applicable
      const taskData = nodeType === 'task' ? extractTaskFromNotionProperties(page.properties) : {}

      // Step 5: Create node in Lazynext
      await db.insert(nodes).values({
        id: generateId(),
        workspaceId,
        workflowId: null, // Goes to "Imported" workflow
        type: nodeType,
        data: {
          title: extractNotionTitle(page.properties),
          content: markdownContent,
          ...taskData,
          importedFrom: 'notion',
          notionPageId: page.id,
        },
        positionX: 0, positionY: 0, // Will be auto-arranged
        createdBy: 'importer',
        createdAt: new Date(page.created_time),
      })

      nodeType === 'task' ? importResults.tasks++ : importResults.docs++
    } catch (err: any) {
      importResults.errors.push(`Page ${page.id}: ${err.message}`)
      importResults.skipped++
    }
  }

  // Step 6: Auto-arrange imported nodes in a grid layout
  await autoArrangeImportedNodes(workspaceId)

  return NextResponse.json({ data: importResults, error: null })
}

// Convert Notion blocks to Tiptap JSON format
function notionBlocksToTiptapJSON(blocks: any[]): object {
  // Maps Notion block types to Tiptap node types:
  // paragraph → paragraph
  // heading_1/2/3 → heading with level
  // bulleted_list_item → bulletList > listItem
  // numbered_list_item → orderedList > listItem
  // to_do → taskList > taskItem
  // code → codeBlock
  // quote → blockquote
  // divider → horizontalRule
  return {
    type: 'doc',
    content: blocks.map(block => notionBlockToTiptapNode(block)).filter(Boolean)
  }
}

// Extract task-specific fields from Notion database properties
function extractTaskFromNotionProperties(properties: any): Partial<TaskData> {
  return {
    status: mapNotionStatus(properties['Status']?.select?.name),
    priority: mapNotionPriority(properties['Priority']?.select?.name),
    due_at: properties['Due Date']?.date?.start || null,
    assigned_to: null, // Cannot map Notion users to Clerk users automatically
    tags: properties['Tags']?.multi_select?.map((t: any) => t.name) || [],
  }
}

function mapNotionStatus(status?: string): string {
  const map: Record<string, string> = {
    'Not started': 'todo',
    'In progress': 'in_progress',
    'Done': 'done',
    'Blocked': 'blocked',
    'In Review': 'in_review',
  }
  return map[status || ''] || 'todo'
}
```

**Method 2: Notion ZIP Export (No API — lower friction)**

When users export their Notion workspace as a ZIP, it produces a folder of `.md` files. Parse these directly.

```typescript
// app/api/v1/import/notion-zip/route.ts
import JSZip from 'jszip'
import matter from 'gray-matter'

export async function POST(req: Request) {
  const formData = await req.formData()
  const zipFile = formData.get('file') as File
  const workspaceId = formData.get('workspaceId') as string

  const zip = new JSZip()
  const contents = await zip.loadAsync(await zipFile.arrayBuffer())

  const results = { docs: 0, tasks: 0, errors: [] as string[] }

  for (const [filename, file] of Object.entries(contents.files)) {
    if (!filename.endsWith('.md') || file.dir) continue

    const content = await file.async('text')
    const { data: frontmatter, content: body } = matter(content)

    const title = filename.replace(/\.md$/, '').split('/').pop() || 'Untitled'

    await db.insert(nodes).values({
      id: generateId(),
      workspaceId,
      workflowId: null,
      type: 'doc',
      data: {
        title,
        content: markdownToTiptapJSON(body),
        importedFrom: 'notion-zip',
        originalPath: filename,
      },
      positionX: 0, positionY: 0,
      createdBy: 'importer',
      createdAt: new Date(),
    })

    results.docs++
  }

  await autoArrangeImportedNodes(workspaceId)
  return NextResponse.json({ data: results, error: null })
}
```

---

### 44.3 Linear Importer — Full Specification

```typescript
// app/api/v1/import/linear/route.ts
// Uses Linear GraphQL API

const LINEAR_ISSUES_QUERY = `
  query GetIssues($teamId: String!) {
    issues(filter: { team: { id: { eq: $teamId } } }) {
      nodes {
        id
        title
        description
        state { name type }
        priority
        dueDate
        assignee { name email }
        labels { nodes { name } }
        createdAt
      }
    }
  }
`

export async function POST(req: Request) {
  const { linearApiKey, teamId, workspaceId } = await req.json()

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': linearApiKey,
    },
    body: JSON.stringify({ query: LINEAR_ISSUES_QUERY, variables: { teamId } }),
  })

  const { data } = await response.json()
  const issues = data.issues.nodes

  let imported = 0
  for (const issue of issues) {
    await db.insert(nodes).values({
      id: generateId(),
      workspaceId,
      workflowId: null,
      type: 'task',
      data: {
        title: issue.title,
        content: issue.description ? markdownToTiptapJSON(issue.description) : null,
        status: mapLinearStatus(issue.state.type),
        priority: mapLinearPriority(issue.priority),
        due_at: issue.dueDate,
        tags: issue.labels.nodes.map((l: any) => l.name),
        importedFrom: 'linear',
        linearIssueId: issue.id,
      },
      positionX: 0, positionY: 0,
      createdBy: 'importer',
      createdAt: new Date(issue.createdAt),
    })
    imported++
  }

  await autoArrangeImportedNodes(workspaceId)
  return NextResponse.json({ data: { tasks: imported }, error: null })
}

function mapLinearStatus(stateType: string): string {
  const map: Record<string, string> = {
    'backlog': 'todo',
    'unstarted': 'todo',
    'started': 'in_progress',
    'completed': 'done',
    'cancelled': 'done',
  }
  return map[stateType] || 'todo'
}

function mapLinearPriority(priority: number): string {
  // Linear: 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
  const map: Record<number, string> = { 0: 'medium', 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low' }
  return map[priority] || 'medium'
}
```

---

### 44.4 CSV Generic Importer

For users of any tool that exports CSV (Asana, Jira, Monday, Basecamp, etc.):

```typescript
// The CSV importer uses column header detection to auto-map fields
// Supported column names (case-insensitive, partial match):

const COLUMN_MAPPINGS = {
  title: ['title', 'name', 'task name', 'issue', 'summary', 'subject'],
  status: ['status', 'state', 'stage', 'column'],
  priority: ['priority', 'importance', 'urgency'],
  due_at: ['due date', 'deadline', 'due', 'target date'],
  assigned_to: ['assignee', 'owner', 'assigned to', 'responsible'],
  tags: ['labels', 'tags', 'categories', 'components'],
  description: ['description', 'notes', 'details', 'body', 'content'],
}

// If title column detected → TASK node
// If title + large description → DOC node (when description > 200 chars)
// Always creates an "Imported" workflow to hold all imported nodes
```

---

### 44.5 Auto-Arrange Algorithm

After import, nodes need to be positioned in the canvas so users see a sensible layout:

```typescript
// lib/import/auto-arrange.ts
export async function autoArrangeImportedNodes(workspaceId: string) {
  const importedNodes = await db.select().from(nodes)
    .where(and(
      eq(nodes.workspaceId, workspaceId),
      sql`data->>'importedFrom' IS NOT NULL`,
      sql`data->>'position' = '{"x":0,"y":0}'`
    ))

  // Grid layout: 4 columns, 200px spacing
  const COLS = 4
  const X_SPACING = 280
  const Y_SPACING = 160

  for (let i = 0; i < importedNodes.length; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    await db.update(nodes)
      .set({ positionX: col * X_SPACING + 60, positionY: row * Y_SPACING + 60 })
      .where(eq(nodes.id, importedNodes[i].id))
  }
}
```

---

### 44.6 Template Library — Starter Templates

Every new workspace should have access to these 12 templates, selectable during onboarding. Templates are installed via the existing `/api/v1/templates/[id]/install` endpoint.

| # | Template Name | Primitives Used | Target ICP | Description |
|---|---|---|---|---|
| 1 | **Product Sprint** | TASK + DOC + DECISION | Archetype 2 | 2-week sprint with tasks, design doc, and sprint decision log |
| 2 | **Client Onboarding** | TASK + DOC + THREAD | Archetype 1 | Sequential onboarding workflow with checklists and comms |
| 3 | **Launch Checklist** | TASK + DECISION | Archetype 1 | Pre-launch tasks + go/no-go decision tree |
| 4 | **Weekly Standup** | PULSE + TASK | Archetype 3 | Auto-populated status dashboard replacing Monday meetings |
| 5 | **Decision Log** | DECISION | All | Blank decision log — just start logging decisions |
| 6 | **Bug Triage** | TASK + THREAD | Archetype 3 | Bug intake, triage, fix, and resolution workflow |
| 7 | **Hiring Pipeline** | TASK + DOC + DECISION | Archetype 2 | Candidate tracking with interview notes and hire decision |
| 8 | **Content Calendar** | TASK + DOC | Archetype 1 | Weekly content pipeline from idea to publish |
| 9 | **Quarterly OKR Review** | DOC + DECISION + PULSE | Archetype 2 | OKR documentation + outcome review + metric tracking |
| 10 | **Vendor Evaluation** | DOC + DECISION | All | Structured vendor comparison with final decision log |
| 11 | **Incident Post-mortem** | DOC + DECISION | Archetype 3 | Structured incident analysis + root cause decision |
| 12 | **Empty Canvas** | — | All | Blank workspace for power users |

**Template selection screen (onboarding step 2):**
- Show all 12 templates as cards with a preview thumbnail
- Allow selecting multiple templates
- Show "Most popular for your team size: Product Sprint + Decision Log"
- Always include "Empty Canvas" for power users who want control

---

### 44.7 The Emotional Journey of Switching

This is the UX sequence a switching team follows. Every step must be frictionless.

```
Day 0 — Discovery
  → User reads a tweet/post about Decision DNA
  → Lands on lazynext.com → watches 60-second demo
  → Clicks "Start Free" → signs up in 30 seconds (Clerk magic link)

Day 0 — First Session (must end with "aha moment")
  → Onboarding step 1: "Name your workspace" (pre-filled with company name from email domain)
  → Onboarding step 2: "Choose a template or import your data"
     → If import: connect Notion/Linear → import runs in background
     → If template: pick one → workspace pre-populated in 3 seconds
  → Onboarding step 3: "Log your first decision"
     → LazyMind prompts: "What's the most important decision your team made this week?"
     → User types it → quality score appears → dopamine hit
  → AHA MOMENT: User sees their decision logged, scored, and searchable
  → CTA: "Invite your team" (because the platform is useless alone)

Day 1 — Team joins
  → Invite email sent → teammate signs up → joins workspace
  → Both users see each other's cursor on canvas in real-time
  → Second AHA moment: "Oh, this is like Figma but for our workflow"

Day 7 — Habit formation
  → User receives first weekly Decision Digest email
  → Opens it → sees decisions from the week they would have forgotten
  → Returns to platform to tag outcomes

Day 30 — Lock-in
  → Workspace now has 10+ decisions logged
  → User tries to search for a past decision → it works instantly
  → User realizes: "We can't go back to Notion. This is our institutional memory now."
  → This is the churn-prevention moment. Decision DNA creates irreversible switching cost.
```

---

### 44.8 Import UI — Complete Flow

```typescript
// components/onboarding/ImportStep.tsx
// Rendered as step 2 of the onboarding flow

export function ImportStep({ onComplete }: { onComplete: () => void }) {
  const [importSource, setImportSource] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const sources = [
    { id: 'notion-api', label: 'Notion (connect)', icon: '📝', description: 'Connect your Notion account directly' },
    { id: 'notion-zip', label: 'Notion (ZIP file)', icon: '📦', description: 'Upload your Notion export ZIP' },
    { id: 'linear', label: 'Linear', icon: '📋', description: 'Import issues and projects' },
    { id: 'trello', label: 'Trello', icon: '🗂️', description: 'Import boards and cards' },
    { id: 'csv', label: 'CSV file', icon: '📊', description: 'Import from any tool with CSV export' },
    { id: 'template', label: 'Use a template', icon: '✨', description: 'Start with a pre-built workflow' },
    { id: 'blank', label: 'Start blank', icon: '⬜', description: 'I prefer an empty canvas' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Bring your work in</h2>
        <p className="text-gray-500 mt-1">Import from your existing tools or start with a template.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {sources.map(source => (
          <button
            key={source.id}
            onClick={() => setImportSource(source.id)}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              importSource === source.id
                ? 'border-black bg-black text-white'
                : 'border-gray-200 hover:border-gray-400 bg-white'
            )}
          >
            <span className="text-2xl">{source.icon}</span>
            <p className="font-medium mt-2 text-sm">{source.label}</p>
            <p className={cn('text-xs mt-1', importSource === source.id ? 'text-gray-300' : 'text-gray-400')}>
              {source.description}
            </p>
          </button>
        ))}
      </div>

      {importSource && importSource !== 'blank' && importSource !== 'template' && (
        <ImportSourceForm source={importSource} onImport={async (params) => {
          setImporting(true)
          const result = await startImport(importSource, params)
          setResult(result)
          setImporting(false)
        }} />
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-medium text-green-800">
            Import complete! {result.docs} docs and {result.tasks} tasks imported.
          </p>
          {result.errors.length > 0 && (
            <p className="text-sm text-amber-600 mt-1">
              {result.errors.length} items skipped — check import log for details.
            </p>
          )}
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={!importSource || importing}
        className="w-full py-3 bg-black text-white rounded-xl font-medium disabled:opacity-40"
      >
        {importing ? 'Importing...' : 'Continue →'}
      </button>
    </div>
  )
}
```

---

### 44.9 Empty State Design — Per Primitive

The blank canvas is the #1 drop-off point. Every empty state must answer: "What do I do first?"

| View | Empty State Message | CTA |
|---|---|---|
| Workspace (no workflows) | "Your workflow canvas is waiting. Start by creating your first workflow." | "Create workflow" button + template picker |
| Decision log (no decisions) | "No decisions logged yet. Every team makes 10+ decisions a week. Start capturing yours." | "Log first decision" → opens DECISION node form |
| Task view (no tasks) | "Nothing assigned yet. Add tasks here or import from Linear, Trello, or CSV." | "Add task" + "Import" |
| PULSE (no metrics) | "PULSE shows you what your team built, shipped, and decided. Add your first metric." | "Add metric" |
| Search results (no results) | "No results for '[query]'. Your decision might predate your Lazynext workspace." | "Log a past decision" |
| Thread (no messages) | "No messages yet. Threads stay attached to this [task/decision/doc] forever." | Input focused automatically |

---

## 45. UX DESIGN SPECIFICATION  ← **NEW in V6**

> **PURPOSE:** This section specifies the complete user experience — user flows, screen layouts (described as structured wireframes), the "aha moment" path, and critical empty states. Before any frontend code is written, the engineer should be able to sketch every screen from this document alone.

### 45.1 Information Architecture

```
lazynext.com/
├── / (Marketing landing page — public)
├── /pricing (Pricing page — public)
├── /templates (Template marketplace — public)
├── /sign-in (Clerk auth)
├── /sign-up (Clerk auth)
└── /workspace/[slug]/ (Protected — requires auth)
    ├── / (Dashboard / canvas list)
    ├── /canvas/[id] (Workflow canvas — primary view)
    ├── /decisions (Decision DNA global view)
    ├── /pulse (PULSE dashboard — Phase 2)
    ├── /templates (Workspace template picker)
    └── /settings (Workspace settings, billing, members)
```

---

### 45.2 Screen Wireframes — Text Format

Each wireframe below describes the exact layout of a key screen. These are implementation contracts, not suggestions.

---

#### SCREEN 1: Landing Page (lazynext.com)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                   │
│ [Logo: Lazynext]     [Templates] [Pricing] [Blog]    [Sign In] [→ Start]│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ HERO (full width, ~80vh, centered)                                      │
│                                                                         │
│          One platform that replaces every tool                          │
│          your team is already misusing.                                 │
│                                                                         │
│   Stop switching apps. Start shipping work.                             │
│                                                                         │
│   [→ Start free — no credit card]   [Watch 60-second demo →]           │
│                                                                         │
│   ─────────────────────────────────────────────                        │
│   Trusted by 1,200+ teams replacing Notion + Linear + Slack            │
│   [Logo strip: abstract company icons, not real brands]                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PROBLEM SECTION ("The Graveyard of Tools")                              │
│                                                                         │
│  [Icon: Notion]  [Icon: Linear]  [Icon: Slack]  [Icon: Airtable]       │
│     Docs            Tasks          Comms           Data                 │
│                                                                         │
│  "Nobody talks to anything. Nothing is in one place.                   │
│   The workflow IS the problem."                                         │
│                                                                         │
│  [Animated arrow pointing down to...]                                   │
│                                                                         │
│  [Icon: Lazynext]  — One canvas. One graph. One truth.                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PRODUCT SECTION — "The Seven Primitives"                                │
│                                                                         │
│ [Interactive canvas preview — React Flow demo with sample workflow]     │
│                                                                         │
│ Sidebar: [TASK] [DOC] [DECISION ← "This is new"] [THREAD]              │
│          [PULSE] [AUTOMATION] [TABLE]                                   │
│                                                                         │
│ Click any primitive → canvas animates to show that primitive in use     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ DECISION DNA SECTION (the unique moat — give it extra space)            │
│                                                                         │
│ "Every team makes decisions. Nobody remembers why."                     │
│                                                                         │
│ [Left: Decision log UI screenshot showing quality score + outcome tag] │
│ [Right: copy explaining the concept]                                   │
│                                                                         │
│ "What did we decide about X? Why? How did it turn out?"                │
│ "For the first time, you'll actually know."                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PRICING SECTION (3 tiers — simplified)                                 │
│                                                                         │
│ [Free] [Pro $19/seat] [Business $39/seat]                              │
│                                                                         │
│ [Annual toggle: Save 17%]                                              │
│                                                                         │
│ [INR pricing note: ₹799/seat/month for Indian teams]                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SOCIAL PROOF                                                            │
│                                                                         │
│ [3 testimonial cards — after launch, replace placeholders with real]   │
│                                                                         │
│ Placeholder 1: "We cancelled Notion AND Linear on day 3."              │
│ Placeholder 2: "The decision search alone is worth the price."         │
│ Placeholder 3: "Our Monday standup is now 10 minutes because of PULSE."│
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ FOOTER                                                                  │
│ [Logo] [Links: Privacy, Terms, Docs, Status, Blog]                     │
│ Built in India. Priced for humans.                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

#### SCREEN 2: Workflow Canvas (Primary App View)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (h-12, border-bottom)                                            │
│ [≡ Sidebar toggle] [Workspace: Acme Corp ▼] [/ Sprint Q2 ▼] [+Workflow]│
│                                   [Presence avatars] [Share] [LazyMind]  │
└──────────────────────────────────────────────────────────────────────────┘
│                                                                          │
│ LEFT SIDEBAR (w-56, collapsible, border-right)                          │
│ ─────────────────────                                                   │
│ WORKFLOWS                                                               │
│   📋 Sprint Q2          ← active                                       │
│   📋 Client Onboarding                                                  │
│   📋 Decision Log                                                        │
│   [+ New Workflow]                                                       │
│ ─────────────────────                                                   │
│ PRIMITIVES (drag onto canvas)                                           │
│   [📋 Task]  [📄 Doc]                                                   │
│   [✅ Decision] [💬 Thread]                                             │
│   [📊 Pulse] [⚙ Auto]                                                  │
│ ─────────────────────                                                   │
│ WORKSPACE                                                               │
│   👥 Members (4)                                                        │
│   ⚙ Settings                                                            │
│   💳 Upgrade                                                            │

│ MAIN CANVAS (flex-1, ReactFlow)                                         │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │                                                                    │  │
│ │   [TASK: Design homepage]──────→[TASK: Build homepage]            │  │
│ │         |                              |                           │  │
│ │         ↓                              ↓                           │  │
│ │   [DOC: Design brief]        [DECISION: Framework choice]         │  │
│ │                                       |                            │  │
│ │                                  Quality: 84 🟢                   │  │
│ │                                                                    │  │
│ │   [MiniMap: bottom-right]   [Zoom controls: bottom-right]         │  │
│ │   [+ Add node: bottom-center]                                     │  │
│ └────────────────────────────────────────────────────────────────────┘  │

│ RIGHT PANEL (w-80, slides in when node selected, border-left)          │
│ ─────────────────────────────────────                                  │
│ [✅ DECISION: Framework choice]    [✕ close]                           │
│                                                                         │
│ Question:                                                               │
│ [Which frontend framework for MVP?                    ]                 │
│                                                                         │
│ Resolution:                                                             │
│ [Next.js 14 — App Router                             ]                 │
│                                                                         │
│ Rationale:                                                              │
│ [SSR, API routes in one repo. Team knows React...    ]                 │
│                                                                         │
│ Options Considered:                                                     │
│ [Next.js ✓] [Remix ×] [SvelteKit ×]  [+ Add]                          │
│                                                                         │
│ Decision Type: [Reversible ▼]                                           │
│                                                                         │
│ Quality Score: ████████░░ 84/100 🟢                                    │
│ "Good options coverage. Add reversibility note."                        │
│                                                                         │
│ Outcome: [Tag outcome ▼]  (Not yet tagged)                             │
│                                                                         │
│ Thread [3 messages]                                                     │
│   Priya: "Why not Remix?"                                               │
│   Rahul: "Team velocity on Next.js is 2x"                              │
│   [Reply...]                                                            │
│ ─────────────────────────────────                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

#### SCREEN 3: Decision DNA Global View (/workspace/[slug]/decisions)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOP BAR (same as canvas)                                                 │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ DECISION DNA                                              [+ Log Decision]│
│                                                                          │
│ [🔍 Search decisions...  ]   [Filter: All ▼] [Quality ▼] [Date ▼]      │
│                                                                          │
│ ┌── HEALTH OVERVIEW (Business plan — blurred on lower plans) ──────────┐│
│ │  Quality distribution: ████████░░ 84 avg │ Outcomes: 60% good        ││
│ │  Untagged: 12 decisions need outcome tags [Tag them →]               ││
│ └───────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ DECISIONS LIST                                                           │
│ ┌───────────────────────────────────────────────────────────────────────┐│
│ │ ✅ Which framework for MVP?                                           ││
│ │    Resolution: Next.js 14 · Made by Rahul · 3 days ago               ││
│ │    Quality: 84 🟢 · Outcome: Pending tag · Sprint Q2                 ││
│ ├───────────────────────────────────────────────────────────────────────┤│
│ │ ✅ Should we use Neon over Supabase?                                  ││
│ │    Resolution: Yes, Neon · Made by Priya · 5 days ago                ││
│ │    Quality: 91 🟢 · Outcome: 👍 Good · Sprint Q2                    ││
│ ├───────────────────────────────────────────────────────────────────────┤│
│ │ ✅ Pricing: $15 or $19/seat?                                         ││
│ │    Resolution: $19/seat · Made by Rahul · 8 days ago                 ││
│ │    Quality: 76 🟡 · Outcome: Pending tag · Strategy                 ││
│ └───────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

---

#### SCREEN 4: Mobile View (< 640px)

```
┌──────────────────────────────┐
│ STATUS BAR                   │
├──────────────────────────────┤
│ ≡  Sprint Q2          👤 [+] │
├──────────────────────────────┤
│                              │
│  TASK: Design homepage       │
│  Rahul · Due Apr 10 · High   │
│  ──────────────────────      │
│  TASK: Build homepage        │
│  Priya · Due Apr 15 · High   │
│  ──────────────────────      │
│  DECISION: Framework         │
│  Next.js · Score: 84 🟢      │
│  ──────────────────────      │
│  DOC: Design brief           │
│  Updated 2h ago              │
│  ──────────────────────      │
│  [+ Add node]                │
│                              │
├──────────────────────────────┤
│ [🏠 Home] [✅ Decisions]     │
│ [💬 Threads] [📊 Pulse]      │
└──────────────────────────────┘
```

Note: ReactFlow canvas is NOT rendered on mobile. The `NodeListView` component renders all nodes as a sortable, filterable list. All node operations (add, edit, delete) work the same. Only the visual canvas is replaced.

---

### 45.3 User Flow Diagrams

#### Flow 1: New User → First Aha Moment (Target: < 5 minutes)

```
Sign Up → Email verify (Clerk magic link)
    ↓
Create Workspace (name + slug auto-suggested from email domain)
    ↓
Choose setup: [Import] or [Template] or [Blank]
    ↓ (most common: Template)
Select template → workspace pre-populated in 3 seconds
    ↓
Guided tooltip: "This is your canvas. Try clicking a DECISION node."
    ↓
User clicks DECISION node → right panel opens
    ↓
Guided tooltip: "Log what was decided and why."
    ↓
User types their first real decision → saves
    ↓
Quality score appears with feedback → *** AHA MOMENT ***
    ↓
CTA: "Invite a teammate to see this decision"
    ↓
Invite sent → conversion to team workspace
```

#### Flow 2: Returning User — Weekly Habit

```
Monday 9am → Decision Digest email arrives
    ↓
User opens email → sees 3 decisions from last week with quality summary
    ↓
"Tag outcomes" CTA in email → deep links to decisions needing tags
    ↓
User tags 2 outcomes (30 seconds) → closes app
    ↓
Decision Health Dashboard updates → patterns emerge over months
    ↓
User tells colleague: "We have a 92% good decision rate when Priya is involved"
    ↓ ← THIS IS THE RETENTION FLYWHEEL
Team becomes emotionally invested in the platform
```

#### Flow 3: Plan Upgrade — Decision DNA Paywall

```
Free user searches for a past decision
    ↓
[Search bar] User types: "What did we decide about pricing?"
    ↓
Results show: 3 matches → [PAYWALL] "Upgrade to search more than your last 10 decisions"
    ↓
    ^ THIS IS THE HIGHEST-INTENT UPGRADE MOMENT
    ^ User is experiencing the pain the product solves
    ↓
Upgrade modal: "You have 47 decisions. See all of them + their outcomes."
    ↓
"Upgrade to Pro — $19/seat/month" → Stripe/Razorpay checkout
    ↓
User upgrades → full Decision DNA access → immediate value
```

---

### 45.4 Component Inventory — Complete List

Every UI component required for MVP. Build these in this order.

**Phase 1 Components (MVP — must have for launch):**

| Component | Location | Description |
|---|---|---|
| `WorkflowCanvas` | `components/canvas/WorkflowCanvas.tsx` | Main ReactFlow canvas wrapper |
| `TaskNode` | `components/canvas/nodes/TaskNode.tsx` | TASK node card in canvas |
| `DocNode` | `components/canvas/nodes/DocNode.tsx` | DOC node card in canvas |
| `DecisionNode` | `components/canvas/nodes/DecisionNode.tsx` | DECISION node card with quality score pill |
| `NodePanel` | `components/canvas/NodePanel.tsx` | Right-side edit panel for selected node |
| `DecisionForm` | `components/decisions/DecisionForm.tsx` | Form to log/edit a decision |
| `QualityScoreBadge` | `components/decisions/QualityScoreBadge.tsx` | Color-coded quality score pill |
| `ThreadPanel` | `components/threads/ThreadPanel.tsx` | Message thread attached to any node |
| `Sidebar` | `components/layout/Sidebar.tsx` | Left sidebar with workflow list and primitives |
| `TopBar` | `components/layout/TopBar.tsx` | Top navigation with presence and actions |
| `NodeListView` | `components/canvas/NodeListView.tsx` | Mobile: flat list of nodes (no canvas) |
| `LazyMindPanel` | `components/ai/LazyMindPanel.tsx` | AI chat panel triggered by Ctrl+K |
| `ImportModal` | `components/import/ImportModal.tsx` | Multi-source import flow |
| `OnboardingFlow` | `components/onboarding/OnboardingFlow.tsx` | 3-step onboarding modal |
| `PricingModal` | `components/billing/PricingModal.tsx` | Plan upgrade prompt with paywall context |
| `DecisionDNAView` | `components/decisions/DecisionDNAView.tsx` | Global decision log with search and filters |
| `EmptyState` | `components/shared/EmptyState.tsx` | Reusable empty state with message + CTA |
| `PresenceAvatars` | `components/realtime/PresenceAvatars.tsx` | Live user presence indicators |
| `CommandPalette` | `components/shared/CommandPalette.tsx` | Cmd+K global command palette |
| `TiptapEditor` | `components/editor/TiptapEditor.tsx` | Rich text editor for DOC nodes |

**Phase 2 Components (post-MVP):**

| Component | Primitive |
|---|---|
| `PulseDashboard` | PULSE |
| `AutomationBuilder` | AUTOMATION |
| `DecisionHealthDashboard` | DECISION DNA (Business plan) |
| `TemplateMarketplace` | Templates |

---

### 45.5 Design System — Extended Tokens

```typescript
// tailwind.config.ts — custom tokens
module.exports = {
  theme: {
    extend: {
      colors: {
        // Node type colors
        task: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
        doc: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
        decision: { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
        thread: { bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8' },
        pulse: { bg: '#F0F9FF', border: '#BAE6FD', text: '#0C4A6E' },
        automation: { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' },

        // Quality score colors
        quality: {
          high: '#16A34A',    // 70-100
          mid: '#CA8A04',     // 40-69
          low: '#DC2626',     // 0-39
        },

        // Outcome colors
        outcome: {
          good: '#16A34A',
          bad: '#DC2626',
          neutral: '#6B7280',
          pending: '#9CA3AF',
        },
      },
      animation: {
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'score-pulse': 'scorePulse 0.5s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scorePulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
}
```

---

### 45.6 Accessibility — Screen-by-Screen Requirements

Every screen must meet WCAG 2.1 AA. These are the screen-specific requirements beyond the global ARIA spec in Section 41.

| Screen | Specific Requirement |
|---|---|
| Canvas | Canvas nodes must be tab-navigable. `Tab` cycles through nodes. `Enter` opens the node panel. `Arrow keys` move selected node by 10px. |
| Decision form | All fields must have explicit `<label>` elements. Quality score must have `aria-live="polite"` so screen readers announce updates. |
| Thread panel | Messages must use `role="log"` on the message list. New messages must trigger aria-live announcement. |
| Mobile list view | Swipe-left gesture on node rows reveals "Edit / Delete" actions. Must also be accessible via keyboard (long press → context menu). |
| LazyMind panel | Chat messages must use `role="log"`. Loading state must announce "LazyMind is thinking" to screen readers. |
| Upgrade modal | Focus must trap inside modal. `Escape` key closes it. First focusable element receives focus on open. |

---

## 46. PROTOTYPE FEEDBACK LOOP & LIVE VALIDATION DATA  ← **NEW in V6**

> **PURPOSE:** A blueprint without user evidence is a hypothesis document. This section specifies the exact prototype to build before writing application code, the feedback methodology, and — critically — contains the template for recording real validation results. A V6 document that reaches 950+ must show evidence that the plan has been tested against reality.

### 46.1 The Pre-Code Prototype

**What to build:** A 3-screen interactive prototype in Figma (or Framer, or HTML — whatever the builder is fastest in) that simulates:

1. **Screen A:** The Decision log form — user fills in question, resolution, rationale, and options considered
2. **Screen B:** The quality score reveal — the "84/100 🟢" moment appears after saving
3. **Screen C:** The Decision search — user types a query and sees results

**Time budget:** 4 hours maximum. The prototype does not need to be beautiful. It needs to feel real enough that testers forget they're looking at a prototype.

**Prototype success criteria:**
- [ ] Tester can complete the log → score reveal flow without instruction
- [ ] Tester understands what the quality score means without explanation
- [ ] Tester uses the search screen without being prompted to

If any of these fail, redesign before building.

---

### 46.2 Prototype Testing Protocol

Run this with 8-12 testers. Do NOT use friends or family. Use real founders, PMs, or team leads.

**Recruitment:** Post in:
- IndieHackers "Looking for" section: "I'll give you 30 min of honest feedback on a prototype. No sales."
- Founder Slack groups (India SaaS, Buildspace, Indie Makers)
- Twitter/X reply to anyone complaining about Notion or Linear
- Personal network — but only people who run or manage a team

**Session format (30 minutes):**

```
0:00-5:00   — Intro + context setting (do NOT demo the product — let them discover)
             "I'm building something for teams that make decisions. I want you to try
              this and tell me what you think is happening."

5:00-15:00  — Unmoderated walkthrough
             Hand them the prototype (in-person: hand laptop, remote: share screen)
             Say NOTHING. Watch where they click. Note where they pause or frown.
             Timer: how long to first successful decision log (target < 90 seconds)

15:00-25:00 — Structured questions
             1. "What do you think this product does?"
             2. "What does the number [84] mean to you?"
             3. "Would you use this for real? What would stop you?"
             4. "What's the one thing you'd change?"
             5. "Would you pay $19/seat/month for this?"

25:00-30:00 — Open notes + thanks
```

---

### 46.3 Validation Results Template

Complete this after every testing session. Store in `VALIDATION_LOG.md` in the repo root.

```markdown
# Lazynext Prototype Validation Results

**Prototype Version:** [1.0]
**Testing Period:** [Date range]
**Total Testers:** [N]

## Tester Summary

| # | Role | Company Size | Time to First Decision | Understood Score? | WTP Signal | Would Use? |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| ... | | | | | | |

## Quantitative Results

- Average time to first completed decision log: ___ seconds (target: < 90s)
- % who understood quality score without explanation: ___% (target: > 70%)
- % who confirmed WTP ≥ $15/seat: ___% (target: > 40%)
- % who said they'd use it for real: ___% (target: > 50%)
- % who returned without prompting (if running multi-week): ___% (target: > 50%)

## Verbatim Quotes (Positive)

1. "[exact quote]" — [Role, Company size]
2. "[exact quote]" — [Role, Company size]
3. "[exact quote]" — [Role, Company size]

## Verbatim Quotes (Negative / Confusing)

1. "[exact quote]" — [Role, Company size]
   Implication: [what we'd change]
2. "[exact quote]" — [Role, Company size]
   Implication: [what we'd change]

## UX Failure Points (where testers got stuck)

1. [Description of failure] — observed in [N] of [total] sessions
   Fix: [proposed change]
2.
3.

## Design Partner Commitments

These testers agreed to be Design Partners — weekly check-ins throughout build:

| Name | Role | Contact | Commitment |
|---|---|---|---|
| | | | Weekly Loom feedback |
| | | | |

## Build Decision

**Proceed with Decision DNA as primary wedge:** YES / NO / INCONCLUSIVE

**Rationale:** [Written summary of what the validation taught you — minimum 100 words]

**Changes to make before full build:**
1.
2.
3.

**Score against success criteria:**
- [ ] 3+ users returned without prompting
- [ ] 3+ confirmed WTP ≥ $15/seat
- [ ] Top 3 UX failure points identified and fixed in prototype
- [ ] 2+ design partners confirmed

**Decision Gate Result:** PROCEED / PIVOT / RUN MORE TESTS
```

---

### 46.4 Post-Prototype Changes — What to Expect

Based on patterns from other B2B SaaS prototypes at this stage, expect these common failure modes and their fixes:

| Common Failure | Why It Happens | Fix |
|---|---|---|
| Testers don't understand the quality score | The number appears without context | Add a tooltip: "This score rates how complete your decision-making was. 70+ is healthy." |
| Testers log a trivial decision (e.g., "what to eat for lunch") | The form doesn't guide them to real work decisions | Add placeholder text: "e.g. Should we use Next.js or Remix for the new feature?" |
| Testers skip "Options Considered" field | It feels like extra work | Make it autocomplete from thread content using LazyMind. Default: shows 2 pre-filled suggestions |
| Testers don't understand "Reversible vs Irreversible" | Jargon without explanation | Rename to "Can we undo this?" with Yes/No/Partially |
| Testers ignore the search screen | They don't yet have decisions to search | Add sample data: show 5 example decisions pre-populated in the prototype |
| WTP answer is "depends" or "maybe" | Too early in the session to anchor price | Ask WTP last, after they've felt the value of the quality score |

---

### 46.5 Smoke Test — Pre-Launch Landing Page

Before writing any application code, put up a smoke test page at lazynext.com:

**Page content:**
```
Headline: "Lazynext — Your team's decision memory"
Sub: "Every decision. Every outcome. Every reason. One searchable log."

[Email input: "Get early access"] [→ Join waitlist]

Below fold:
"What problem does this solve?"
[2-minute Loom walkthrough of the prototype]

"How does it work?"
[3 screenshots from the prototype]

"When will it launch?"
"We're building now. Join 200+ founders on the waitlist."
```

**Success criteria for smoke test (measure over 2 weeks):**
- [ ] Landing page conversion rate ≥ 15% (visitors → email signups)
- [ ] ≥ 50 email signups before writing application code
- [ ] At least 5 signups reply to the "What problem do you need solved?" follow-up email

If conversion rate < 10%, the headline is wrong. A/B test the headline before proceeding.

---

## APPENDIX D — LIVE VALIDATION DATA  ← **NEW in V6**

> **PURPOSE:** This appendix is intentionally left as a live document. It starts with the framework and placeholder data. The builder must fill it in with real results as validation progresses. A completed Appendix D — with real quotes, real WTP numbers, and real waitlist data — is the difference between a 832-point blueprint and a 950+ blueprint.

### D.1 Waitlist Metrics

| Metric | Target | Actual | Notes |
|---|---|---|---|
| Waitlist signups (before code) | ≥ 50 | _____ | Track in Mailchimp or Beehiiv |
| Landing page CVR | ≥ 15% | _____ | Measure in PostHog |
| Email open rate (follow-up) | ≥ 40% | _____ | Healthy open rate = real interest |
| Replies to follow-up email | ≥ 10 | _____ | Each reply is a potential design partner |
| Design partners confirmed | ≥ 2 | _____ | Weekly check-in commitment |

### D.2 Prototype Test Results

| Metric | Target | Actual |
|---|---|---|
| Testers recruited | 8-12 | _____ |
| Avg time to first decision | < 90s | _____ |
| Understood quality score | > 70% | _____ |
| WTP ≥ $15 confirmed | > 40% | _____ |
| "Would use for real" | > 50% | _____ |

### D.3 Top Verbatim Quotes

*Fill in after prototype sessions*

**Most powerful positive quote:**
> "[Record the exact words from your best tester session here]"

**Most valuable negative quote:**
> "[Record the most useful criticism here — this is what will make the product better]"

**Most surprising insight:**
> "[What you didn't expect to hear]"

### D.4 Build Decision Record

*Complete this before writing any application code*

- **Date of decision:** ___________
- **Decision:** Proceed / Pivot / Run more tests
- **Primary reason:**
- **What we learned that changed the plan:**
- **What we confirmed from the blueprint:**
- **First sprint start date:** ___________

---

## APPENDIX E — COMPETITIVE INTELLIGENCE UPDATE  ← **NEW in V6**

> **PURPOSE:** Section 32 covers competitive positioning. This appendix goes deeper on three critical questions: Why did Notion fail to win the full workflow market? What does the exact "switch moment" look like for each competitor? And what is the kill switch if Decision DNA doesn't get traction?

### E.1 Why Notion Failed to Win the Full Workflow Market

Notion is the most instructive case study for Lazynext. It has:
- 30M+ users
- $10B+ valuation at peak
- A head start of 8 years
- The brand recognition that Lazynext will never have at launch

And yet, almost every Notion team also pays for Linear. Or Asana. Or Jira. Or Slack. Or all of them.

**The reasons Notion couldn't win the full workflow market:**

1. **Document-first DNA.** Notion's data model is block-based documents. Tasks, databases, and relations are bolted on top of that. The result is that tasks in Notion are slower, less ergonomic, and less powerful than a dedicated task tool. The DNA of the product is "document that can pretend to be a database." That cannot be surgically changed.

2. **No workflow graph concept.** Notion has no concept of nodes and edges — no way to visually connect a document to the decision that created it, or the task that resulted from it. Everything lives in a folder structure. The graph model is Lazynext's structural advantage that Notion cannot adopt without rewriting their core architecture.

3. **No decision primitive.** Notion has no native "decision" type. Teams simulate it with databases. But simulation is not native — it requires discipline to maintain, degrades over time, and has no quality scoring or outcome tracking. The absence is structural, not accidental.

4. **The configuration burden.** Notion requires significant setup before it's useful for any specific workflow. "We need to build our system" is a common complaint. Lazynext's 7 opinionated primitives ship ready to use.

5. **Enterprise drift.** As Notion moved upmarket (enterprise contracts, SSO, advanced permissions), the product became less responsive to the Drowning Founder ICP. The $16/seat price point plus the time cost of setup made it too expensive for small teams who just need something that works now.

**Lesson for Lazynext:** Do not make Notion's mistake. The 7 primitives must be opinionated and immediately useful. Do not make Lazynext a "build your own workflow" tool. Ship the workflow. The user's job is to fill it with their work, not configure it.

### E.2 Win/Loss Decision Tree

When a potential user is evaluating Lazynext vs. alternatives, this is the decision tree that should guide the sales conversation (and the marketing copy):

```
User: "I'm evaluating Lazynext vs. [competitor]"
  │
  ├─ vs. Notion
  │    "Do you find yourself opening Notion for docs and
  │     Linear/Trello for tasks?"
  │     YES → Lazynext wins (consolidation + Decision DNA)
  │     NO  → "Are you happy with how your team tracks decisions?"
  │            NO  → Lazynext wins (Decision DNA alone is worth it)
  │            YES → Stay on Notion (Lazynext can't beat Notion docs)
  │
  ├─ vs. Linear
  │    "Do you want visual workflow mapping beyond a flat issue list?"
  │     YES → Lazynext wins (graph canvas + Decision DNA)
  │     NO  → "Do you have any documentation need?"
  │            YES → Lazynext wins (replaces Linear + Notion)
  │            NO  → Stay on Linear (Linear's speed for pure dev tasks is unbeatable)
  │
  ├─ vs. Asana/Monday
  │    "Are you a software/tech team?"
  │     YES → Lazynext wins (tech-native UX + Decision DNA)
  │     NO  → "How important is it to log why decisions were made?"
  │            Very → Lazynext wins (Decision DNA is the differentiator)
  │            Not  → Asana may be better (more HR/ops integrations)
  │
  └─ vs. Fibery
       "Do you want to customize your data model from scratch?"
        YES → Fibery (more flexible, more complex)
        NO  → Lazynext wins (opinionated, works out of box in 15 min)
```

### E.3 Kill Switch — If Decision DNA Doesn't Get Traction

This is the most important contingency in the entire blueprint. Every founder must read it.

**The kill switch scenario:** 90 days post-launch, Decision DNA is not being used as the primary acquisition driver. Fewer than 30% of new workspaces log their first decision within 7 days of signup. The WTP for Decision DNA specifically is not confirmed by user interviews.

**This does not mean the product is dead. It means the wedge needs to change.**

**Kill switch option 1 — Task-first pivot:**
- Reposition Lazynext as "the visual task manager that also does decisions"
- Decision DNA becomes a Phase 2 feature, not the headline
- Compete on Task + Doc simplicity vs. Linear's opinionated developer-only UX
- Target ICP shifts from "decision-aware PM" to "visual workflow founder"
- Pricing remains the same; messaging changes entirely

**Kill switch option 2 — DOC-first pivot:**
- Reposition as "Notion that doesn't require configuration"
- Decision DNA as a unique doc type within a doc-first product
- Target users who are paying for Notion but not using 80% of its features

**Kill switch option 3 — Vertical focus:**
- Narrow from "all teams" to a specific vertical (e.g., "product teams" or "agencies")
- Ship deep integrations for that vertical (e.g., GitHub + Figma for product teams)
- Decision DNA stays as the moat but is positioned as "product decision intelligence"

**Kill switch trigger criteria:**
- < 30% of new workspaces log a decision in first 7 days (measured in PostHog)
- Free-to-paid conversion < 2% at 90 days
- NPS < 20 from users who HAVE used Decision DNA

**The rule:** Do not reach Day 90 without having this conversation. The Validation Log in Appendix D should flag if this is coming before launch.

---

## APPENDIX F — FOUNDER RISK & SOLO BUILD STRATEGY  ← **NEW in V6**

> **PURPOSE:** The 12-week sprint plan in Section 33 was written assuming approximately 1.5 full-time developers. This appendix addresses the solo founder path and the risks that are not covered in the technical failure modes of Section 40.

### F.1 Solo Founder Reality Check

If Lazynext is being built by one person, the 12-week timeline is achievable only under specific conditions:

| Condition | Requirement |
|---|---|
| Full-time commitment | 8+ hours/day on Lazynext. No consulting, no part-time job. |
| Technical capability | Must have shipped a full-stack Next.js app before. This is not a beginner project. |
| Pre-validated wedge | The Validation Log (Appendix D) must be complete before Week 1 of building. |
| Scope discipline | DO NOT add features not in Phase 1. Every addition extends the timeline by 2x its estimated time. |

**Realistic solo timeline adjustments:**

| Phase | V5 Timeline (2 devs) | Solo Timeline | What to cut |
|---|---|---|---|
| Phase 1 (MVP) | 12 weeks | 18-20 weeks | Cut THREAD to Phase 2; cut LazyMind to basic text-only in MVP |
| Phase 2 | 8 weeks | 14 weeks | Cut AUTOMATION to Phase 3; ship PULSE without custom metrics |
| Phase 3 | 12 weeks | 18+ weeks | Cut TABLE to "eventually" — validate demand first |

**The golden rule for solo builders:** Ship TASK + DOC + DECISION. That is your MVP. Everything else is Phase 2. The temptation to add THREAD or PULSE before launch will kill the timeline. Resist it.

### F.2 Team Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Solo founder burnout | High (12+ week projects) | Project death | Weekly review: "If I do nothing else this week, what is the one thing that moves the needle?" |
| Scope creep | Very High | 3-6 month delay | Every feature request goes in a backlog. Nothing enters the current sprint without removing something else. |
| Technical rabbit holes | High | 1-2 week delays | Time-box every technical problem to 4 hours. After 4 hours without resolution, use a simpler solution or skip the feature. |
| Loss of motivation | Medium | Project stall | Design partners (Appendix D) are the accountability mechanism. Weekly Loom updates to design partners keep the builder moving. |
| Building the wrong thing | Medium | Wasted weeks | Validation Log (Appendix D) prevents this. Trust the data, not the intuition. |
| Competitor ships first | Low | Market risk | Decision DNA has no direct competitor. The race is not about being first — it's about being right. |

### F.3 The Complexity Trap — And How to Escape It

The "7 primitives in a unified graph" concept is architecturally elegant. It is also a trap.

**The complexity trap:** Lazynext's target user — the Drowning Founder — is drowning because they have too many tools, too many concepts, and too much complexity. If Lazynext presents them with 7 new primitives and an infinite canvas on Day 1, they will experience the same overwhelm they're trying to escape. Elegant architecture is invisible to users. What they see is the UI.

**Mitigation strategy — Progressive Disclosure:**

```
ONBOARDING MODE (first 14 days)
  → Only TASK, DOC, and DECISION are visible in the primitive picker
  → Canvas starts pre-populated with a template (not blank)
  → LazyMind greets new users: "I've set up a starting point. Want me to explain how it works?"
  → THREAD appears automatically when a node gets its first message
  → PULSE, AUTOMATION, TABLE are hidden behind a "More primitives" toggle

POWER MODE (after 14 days OR after user dismisses onboarding)
  → All 7 primitives visible
  → Blank canvas option available
  → Full keyboard shortcut set available
  → LazyMind proactive suggestions enabled

TOGGLE: Settings → "Simplified mode" (always available for teams who want it)
```

**Implementation notes:**
```typescript
// hooks/useWorkspaceMode.ts
export function useWorkspaceMode(workspaceId: string) {
  const workspaceAge = useWorkspaceAge(workspaceId) // days since creation

  return {
    isOnboardingMode: workspaceAge < 14,
    visiblePrimitives: workspaceAge < 14
      ? ['task', 'doc', 'decision']
      : ['task', 'doc', 'decision', 'thread', 'pulse', 'automation', 'table'],
    showTemplatePrompt: workspaceAge < 3,
  }
}
```

---

---

## 47. INDIA-FIRST GTM STRATEGY — CHANNEL-LEVEL DISTRIBUTION PLAN

> **PURPOSE:** This section replaces the theoretical "growth flywheels" of V6 with a channel-by-channel, week-by-week, INR-denominated distribution plan designed for a solo founder with ₹0 paid marketing budget. Every channel is scored on Effort (1–5), Expected CAC, and Timeline to first 10 customers.

### 47.1 The Beachhead Market — Who We Own First

**Do not try to own "remote-first teams globally" from Day 1. Own one segment so completely that they evangelize for you.**

**Chosen beachhead:** India-based product managers and ops leads at bootstrapped SaaS companies and digital agencies, team size 5–25, currently paying for Notion + Linear or Notion + Trello.

**Why this segment:**
- Concentrated in Bengaluru, Mumbai, Hyderabad, Pune — reachable via online communities
- English-first workflow, so no localization needed
- High tool fatigue: typically using 4–7 tools simultaneously
- Price-sensitive to USD pricing (₹20/seat = ₹1,500+/month for a 5-person team feels expensive; ₹499/seat feels like a no-brainer)
- Active on Twitter/X, LinkedIn, Slack communities, and ProductHunt
- Decision DNA directly solves the "we keep making the same mistake" problem they talk about publicly

**Beachhead size:** Estimated 15,000–25,000 people in India matching this profile. Need to convert 0.2% (30–50 paying workspaces) to reach ₹1L MRR at ₹3,000/workspace/month.

---

### 47.2 Channel-by-Channel Plan

#### CHANNEL 1 — Direct Outreach to Indian PM Communities (Weeks 1–6)
**Effort:** 3/5 | **Expected CAC:** ₹0 | **Timeline to first 10 customers:** 3–4 weeks

**Target communities:**
- `Product Folks India` (Slack — ~8,000 members)
- `GrowthX` community (Discord — India's largest growth community)
- `Indie Hackers India` (Twitter/X hashtag + community)
- `SaaSBOOMi` (India's top SaaS founder community)
- `PeopleFirst Founders` WhatsApp/Telegram circles

**Execution playbook:**
```
Week 1: Join all communities. Do NOT pitch. Spend 5 days answering questions about 
        workflow, productivity, decision-making. Build credibility first.

Week 2: Post a "What tool do you use to log product decisions?" poll in each community.
        Do not mention Lazynext. Collect 50+ responses. Screenshot the chaos in responses.

Week 3: Post a case study: "Here's what happens to a 10-person team's decision log 
        over 6 months in Notion vs. a dedicated decision tool." Make it data-driven.
        Include one line: "I'm building something for this. DM me if you want early access."

Week 4: DM every person who engaged with your posts. Offer a 30-min onboarding call 
        in exchange for 6-month free access. Target: 20 calls.

Week 5-6: Convert calls into design partners. Even 5 design partners at ₹0 revenue
          is 5 data points worth more than ₹5L in funding.
```

**Success metric:** 20 DMs sent → 10 calls booked → 5 design partner agreements → 2 paying users by Week 8.

---

#### CHANNEL 2 — Twitter/X Content Engine (Weeks 2–12, ongoing)
**Effort:** 2/5 | **Expected CAC:** ₹0 | **Timeline to first 10 customers:** 6–8 weeks

**The content angle:** Decision DNA is inherently shareable. Bad product decisions are universal pain. Build in public around the problem, not the solution.

**Weekly content cadence (30–45 minutes/day):**

| Day | Content Type | Example |
|---|---|---|
| Monday | Problem post | "A startup I know pivoted twice because nobody recorded *why* they chose their tech stack. Both pivots were preventable." |
| Wednesday | Build-in-public | "Day 23 of building LazyNext. Here's what our decision log looked like after our first architecture call. [screenshot]" |
| Friday | Question/poll | "Quick poll: Does your team have a written record of the top 5 product decisions you made this year? Be honest." |

**Hashtags:** #IndieHackers #BuildInPublic #ProductManagement #StartupIndia #SaaSIndia #PMLife

**Growth tactic:** Reply to every tweet by @shreyas, @lennysan, @shreyjain, @kunal_b that mentions decision-making, product process, or team alignment. Add genuine value in replies. Do not pitch.

**Target:** 500 followers → 1,000 → 2,500 by Week 12. At 2,500 engaged followers in this niche, you have a direct channel to your ICP.

---

#### CHANNEL 3 — SEO Content — Decision DNA Keyword Cluster (Weeks 4–16, compounding)
**Effort:** 3/5 | **Expected CAC:** ₹0 (time cost only) | **Timeline:** 8–16 weeks for organic traffic

**The opportunity:** Nobody owns the "product decision log" keyword cluster. It is entirely un-SEO'd.

**Target keyword cluster:**

| Keyword | Monthly Search Volume | Difficulty | Priority |
|---|---|---|---|
| product decision log template | 800–1,200/mo | Low | P0 |
| how to document product decisions | 600–900/mo | Low | P0 |
| decision making framework for product teams | 1,500–2,000/mo | Medium | P1 |
| team decision tracking tool | 400–600/mo | Low | P0 |
| notion template for decisions | 2,000–3,000/mo | Medium | P1 |
| product decision tracker | 300–500/mo | Very Low | P0 |
| architectural decision record template | 1,000–1,500/mo | Low | P0 |

**Content to publish (one per week, starting Week 4):**
1. "The Product Decision Log: Why Your Team Keeps Making the Same Mistakes" (pillar post)
2. "Free Decision Log Template for Product Teams (Notion + LazyNext versions)"
3. "Architectural Decision Records: What They Are and Why Every Team Needs One"
4. "How to Run a Decision Review Meeting (Template Included)"
5. "The Hidden Cost of Undocumented Decisions: A Case Study"
6. "Decision DNA: Building a Company Memory That Outlasts Any Team Member"

**SEO tactic:** Publish a free Notion template for decision logging. Optimise it for "notion template decisions". Link back to LazyNext as the "native" version. Capture emails from Notion template downloads.

**Target:** 500 organic visitors/month by Month 4 → 2,000/month by Month 6.

---

#### CHANNEL 4 — Product Hunt Launch (Week 10 or 11 of build)
**Effort:** 4/5 | **Expected CAC:** ₹0 | **Expected result:** 200–800 signups in 48 hours

**Launch strategy:**
- Launch on a Tuesday or Wednesday (highest traffic days)
- Tagline: "One place to capture, track, and learn from every product decision your team makes"
- Lead with Decision DNA, not the full platform — one clear use case wins on PH
- Pre-recruit 30 supporters from your communities (design partners, Twitter followers, SaaSBOOMi connections) to upvote in the first 2 hours — this is the critical window
- Offer "Lifetime deal — ₹4,999 one-time for first 50 PH users" — converts better than monthly pricing on PH
- Write a maker comment every 2 hours answering questions personally

**Success target:** Top 5 Product of the Day → 500+ upvotes → 300+ signups → 20+ paid conversions at lifetime deal pricing.

---

#### CHANNEL 5 — Newsletter Sponsorship / Swap (Weeks 8–16)
**Effort:** 2/5 | **Expected CAC:** ₹500–2,000 per signup | **Timeline:** 2–3 weeks per swap

**Target newsletters for free/swap sponsorship:**
- `The Bootstrapped Founder` (Arvid Kahl — global, but India readers present)
- `Product Lessons` (Indian PM newsletter)
- `SaaSBOOMi Weekly` (India SaaS community newsletter)
- `Maker Mind` (global, productivity/tools audience)

**Approach:** Offer 3 months free Pro access in exchange for a sponsored post or swap. Do not pay cash in the first 6 months.

---

#### CHANNEL 6 — Notion Template Marketplace (Weeks 6–12)
**Effort:** 2/5 | **Expected CAC:** ₹0 | **Timeline:** Passive, compounding

Publish 3 free Notion templates:
1. Decision Log Template (links back to LazyNext)
2. Product Sprint Tracker (links back to LazyNext)
3. Team Onboarding Checklist (links back to LazyNext)

Each template includes: "Built this in Notion so you could try it. We built the native version at LazyNext — it auto-links decisions to tasks and tracks outcomes. Try it free."

**Distribution:** Notion's template gallery + Gumroad (free download, email capture) + ProductHunt Ship.

---

### 47.3 Week-by-Week Distribution Calendar (First 12 Weeks)

| Week | Building Focus | GTM Focus | Target |
|---|---|---|---|
| 1 | Auth + workspace setup | Join 5 communities. Start answering questions. | 0 customers, 10 community replies |
| 2 | TASK primitive | Post decision poll in communities. Start Twitter cadence. | 0 customers, 50 poll responses |
| 3 | DOC primitive | Post case study. Add "DM for early access" CTA. | 5 DMs received |
| 4 | DECISION primitive | Send 20 DMs. Book 10 calls. Publish first SEO post. | 5 calls booked |
| 5 | Decision DNA logic | Run 5 onboarding calls. Collect feedback. | 3 design partners |
| 6 | Linked nodes (TASK↔DOC↔DECISION) | Publish Notion template. List on Gumroad. | 5 design partners, 50 email signups |
| 7 | LazyMind basic (text only) | Publish 2nd SEO post. Twitter content continues. | 100 email signups |
| 8 | Polish + bug fix | Activate design partners on live product. | 5 beta users, first feedback |
| 9 | Real-time sync (basic) | Incorporate beta feedback. Post build-in-public update. | 10 beta users |
| 10 | PH launch prep | Pre-recruit 30 PH supporters. Prep assets. | 150 email signups |
| 11 | **PRODUCT HUNT LAUNCH** | Full launch day execution. | 300+ signups, 20+ paid |
| 12 | Fix PH feedback | Newsletter swap outreach. Start THREAD development. | 50 paying workspaces |

---

### 47.4 CAC and Channel ROI Summary

| Channel | Estimated CAC | Customers by Week 12 | Revenue at ₹999/seat/month |
|---|---|---|---|
| Direct outreach | ₹0 | 10–15 | ₹30,000–45,000 MRR |
| Twitter/X | ₹0 | 5–10 | ₹15,000–30,000 MRR |
| SEO (early) | ₹0 | 2–5 | ₹6,000–15,000 MRR |
| Product Hunt | ₹0–500 | 20–50 | ₹60,000–150,000 MRR |
| Notion templates | ₹0 | 5–10 | ₹15,000–30,000 MRR |
| **Total** | | **42–90 customers** | **₹1.26L–2.7L MRR** |

**Conservative target by Week 16:** 30 paying workspaces × ₹3,000/month average = **₹90,000 MRR**. This is the "default alive" threshold.

---

## 48. DISTRIBUTION MOAT ANSWER — HOW LAZYNEXT WINS WITHOUT $400M

> **PURPOSE:** This section directly answers the question: "How does a solo Indian founder win customers when ClickUp has $400M in marketing and Notion has global brand recognition?" The answer is not "better product." The answer is distribution asymmetry.

### 48.1 Why Big Players Cannot Win This Segment

ClickUp, Notion, and Linear all share one structural weakness: **they are optimised for the average global customer.**

- Notion's pricing starts at $10/user/month (₹830). For a 10-person team, that's ₹8,300/month. For an India-based bootstrapped agency earning ₹5–10L/month, this is 1–2% of revenue.
- ClickUp's free tier is their primary acquisition channel. Their paid conversion is driven by US/EU enterprise sales. India is an afterthought.
- Linear targets engineering teams and is priced at $8/user/month. It does not market in India.
- None of them have a "Decision DNA" equivalent. Their roadmaps are public. None of them are building it.

**The structural advantage of being small:**
- You can do things that don't scale: hand-hold every beta user, join every Slack community personally, DM every person who tweets about tool fatigue
- You can price in INR from Day 1 (they cannot, due to global pricing consistency requirements)
- You can be in the SaaSBOOMi WhatsApp group. ClickUp is not.
- You can respond to a support ticket in 3 minutes. Notion takes 48 hours.

### 48.2 The Three Moats That Compound Over Time

**Moat 1 — Decision DNA Data Network Effect**

Once a team logs 50+ decisions in LazyNext, the tool becomes irreplaceable. The data is proprietary to the team. Migrating away means losing their institutional memory. This is a switching cost moat that ClickUp and Notion cannot replicate without a full product redesign.

**Compounding mechanism:** Every team that stays for 90+ days becomes a reference customer. Every reference customer in the India SaaS community is worth 3–5 referrals. The community is small and tight-knit.

**Moat 2 — India-Native Pricing & Trust**

LazyNext will be the first workflow platform that:
- Prices in INR from Day 1
- Has an Indian founder who is reachable on Twitter/X
- Integrates with Indian payment infrastructure (Razorpay)
- Is compliant with Indian data residency preferences (Neon.tech allows region selection)

In a market where every tool is US-built and US-priced, being Indian-native is a trust signal worth more than any feature.

**Compounding mechanism:** Indian SaaS Twitter has tight network effects. One "I switched from Notion to this Indian tool and it's better" tweet from a credible founder gets 5,000 impressions. This is unachievable for ClickUp with any amount of paid media.

**Moat 3 — Community Ownership**

LazyNext will own the "product decision logging" conversation in India before any competitor knows this conversation exists. By the time Notion or ClickUp adds a "decisions" feature, LazyNext will have 6 months of SEO content, 50 case studies, and a community of 500+ practitioners who learned the concept through LazyNext.

**Compounding mechanism:** SEO content compounds. Communities compound. Brand association ("LazyNext = where teams log decisions") is extremely hard to dislodge once established.

### 48.3 The "Right Person at the Right Moment" Distribution Strategy

Big companies market to everyone. LazyNext markets to **the exact person, at the exact moment they feel the pain.**

**Trigger moments to intercept:**

| Trigger | Where it happens | LazyNext interception |
|---|---|---|
| "We just made the same mistake twice" | Twitter/X, PM communities | Blog post: "Why your team keeps repeating decisions" → email capture |
| "I hate switching between Notion and Linear" | Indie Hackers, Twitter | Direct reply: "We built one place for this. Here's a 5-min demo." |
| "Looking for Notion alternatives" | Reddit r/Notion, r/productivity | Comment with genuinely helpful comparison, mention LazyNext last |
| Post-sprint retrospective frustration | ProductHunt "Discussions" | Share decision log template, link to LazyNext |
| New PM starting a job | LinkedIn | Content: "First week as a PM? Here's the one doc you need to create on Day 1." |

**The rule:** Never advertise. Always intercept. The difference is that advertising is interruption; interception is relevance.

### 48.4 The Referral Engine — Built Into the Product

LazyNext's referral loop is embedded in the core workflow, not bolted on as a "refer a friend" button.

```
REFERRAL TRIGGER: When a team logs their 10th decision, LazyNext shows:
"Your team has logged 10 decisions. This is your institutional memory. 
Share your Decision DNA dashboard with a stakeholder?"

[Generate shareable read-only link] ← This link shows the decision log to outsiders
                                       with a "Built with LazyNext" watermark at the bottom.
                                       Every stakeholder who sees it is a potential user.
```

**Secondary referral:** When a user exports a decision summary as a PDF (e.g., to share with investors or board), the PDF footer reads: "Decision tracking powered by LazyNext — lazynext.com"

**Target:** 15% of new workspaces come from referral by Month 4.

---

## 49. SOLO FOUNDER SPRINT PLAN — 10-WEEK SCOPE-LOCKED MVP

> **AUTHORITATIVE STATEMENT:** This section supersedes Section 33 (Week-by-Week Sprint Plan) for solo founder builds. Section 33 was written for a 1.5-developer team. If you are building alone, Section 49 is your plan. Section 33 is your Phase 2 reference.

### 49.1 Scope Lock — What You Are Building

**MVP = TASK + DOC + DECISION + LazyMind (text-only) + Workspace + Auth**

**Hard NOT-BUILDING list (do not touch until Week 11+):**

| Feature | Why excluded | Phase |
|---|---|---|
| THREAD (real-time chat) | Liveblocks dependency adds 2 weeks. Async comments on nodes suffice for MVP. | Phase 2 |
| PULSE (dashboards) | Requires working data from TASK first. Ship after 30 days of real user data. | Phase 2 |
| AUTOMATION (triggers) | Inngest integration is a week of work. Zero users need it in Week 1. | Phase 3 |
| TABLE (database views) | Most complex primitive. Validate demand before building. | Phase 3 |
| LazyMind (AI beyond text) | Groq integration for full AI. MVP gets Claude Haiku for simple text summarisation only. | Phase 2 |
| Mobile app | PWA + responsive web is sufficient for MVP. Native app is Phase 3. | Phase 3 |
| GitHub/Figma integrations | Post-PMF features. Validate core workflow first. | Phase 3 |

### 49.2 The 10-Week Plan (Solo, Full-Time, 8 hrs/day)

#### WEEK 1 — Foundation (Days 1–7)
**Goal:** Working auth, workspace, and navigation shell

| Day | Task | Done When |
|---|---|---|
| 1 | Repo setup, Vercel project, Neon DB, Clerk app, env vars | `npm run dev` works, Clerk login works |
| 2 | Drizzle ORM schema — users, workspaces, workspace_members | Tables exist in Neon, Drizzle migrate runs clean |
| 3 | Workspace creation flow, invite by email, role assignment | Can create workspace, invite user, assign role |
| 4 | App shell — sidebar, workspace switcher, primitive nav | Shell renders, navigation between sections works |
| 5 | Workspace settings page — name, logo, danger zone | Settings save to DB |
| 6 | User profile page, notification preferences | Profile updates work |
| 7 | Review + fix. Deploy to Vercel. | Live at lazynext.vercel.app |

**GTM task this week:** Join 5 communities. Start answering questions. 0 pitching.

---

#### WEEK 2 — TASK Primitive (Days 8–14)
**Goal:** Fully working task management

| Day | Task | Done When |
|---|---|---|
| 8 | Task schema — tasks table, status enum, assignee, due_date | Schema migrated |
| 9 | Task list view — create, read, update, delete | CRUD works |
| 10 | Task board view — Kanban columns by status | Drag-drop works |
| 11 | Task detail panel — description (rich text), comments (async), activity log | Detail panel opens, rich text saves |
| 12 | Task filters — by assignee, status, due date | Filters work |
| 13 | Task notifications — assigned to you, due tomorrow | Emails send via Resend |
| 14 | Review + deploy. | TASK feature complete |

**GTM task this week:** Post decision poll in communities. Set up Twitter account.

---

#### WEEK 3 — DOC Primitive (Days 15–21)
**Goal:** Fully working collaborative document editor

| Day | Task | Done When |
|---|---|---|
| 15 | Doc schema — docs table, content (JSONB), version history | Schema migrated |
| 16 | BlockNote.js integration — basic rich text editor | Editor renders, text saves |
| 17 | Doc list + folder structure | Docs list, create folder, move doc |
| 18 | Doc sharing — workspace-wide, link sharing, read-only | Share link works |
| 19 | Doc → Task linking (mention a task in a doc) | `@task-123` resolves to task |
| 20 | Doc templates — 5 starter templates | Templates available on new doc creation |
| 21 | Review + deploy. | DOC feature complete |

**GTM task this week:** Post case study. Add "DM for early access" CTA.

---

#### WEEK 4 — DECISION Primitive (Days 22–28)
**Goal:** Decision DNA — the core differentiator

| Day | Task | Done When |
|---|---|---|
| 22 | Decision schema — decisions table, status, context, options, outcome, rationale | Schema migrated |
| 23 | Decision creation flow — structured form with required fields | Decision saves with all fields |
| 24 | Decision list + filter by status (Open / Decided / Reversed) | List + filters work |
| 25 | Decision detail page — full context view, linked tasks, linked docs | Detail page renders all linked entities |
| 26 | Decision → Task linking, Decision → Doc linking | Cross-primitive links work |
| 27 | Decision history — who changed what, when | Audit log renders |
| 28 | Review + deploy. | DECISION feature complete |

**GTM task this week:** Send 20 DMs. Book 10 calls. Publish first SEO blog post.

---

#### WEEK 5 — Cross-Primitive Graph (Days 29–35)
**Goal:** TASK ↔ DOC ↔ DECISION linked in a unified graph

| Day | Task | Done When |
|---|---|---|
| 29 | Unified node model — every primitive is a node with edges | nodes + edges tables migrated |
| 30 | Graph traversal API — "give me everything linked to decision-456" | API returns full linked graph |
| 31 | Canvas view (basic) — render nodes as cards with edges as lines | Canvas renders with React Flow |
| 32 | Node creation from canvas — right-click to create TASK/DOC/DECISION | Right-click menu works |
| 33 | Search across all node types — one search box, all results | Search returns tasks + docs + decisions |
| 34 | Activity feed — workspace-level stream of all node changes | Feed renders in sidebar |
| 35 | Review + deploy. | Graph feature complete |

**GTM task this week:** Run 5 onboarding calls with design partners.

---

#### WEEK 6 — LazyMind Basic (Days 36–42)
**Goal:** AI that summarises decisions and suggests next actions

| Day | Task | Done When |
|---|---|---|
| 36 | Claude Haiku API integration — streaming responses | API call works, response streams to UI |
| 37 | "Summarise this decision" — LazyMind reads decision context + history | Summary renders in decision detail |
| 38 | "What tasks are blocked?" — LazyMind scans workspace for overdue/blocked tasks | Summary renders in workspace home |
| 39 | "Draft a doc from this decision" — LazyMind generates doc skeleton | Doc opens pre-populated |
| 40 | LazyMind usage limits — 20 queries/user/month on free, unlimited on paid | Limit enforced, upgrade prompt shows |
| 41 | LazyMind UI — floating button, command palette trigger (Cmd+K) | UI works across all pages |
| 42 | Review + deploy. | LazyMind MVP complete |

**GTM task this week:** Activate design partners on live product. Collect first real feedback.

---

#### WEEK 7 — Payments & Billing (Days 43–49)
**Goal:** Working Razorpay billing, paid tier enforcement

| Day | Task | Done When |
|---|---|---|
| 43 | Razorpay account setup, test mode, webhook endpoint | Webhook receives Razorpay events |
| 44 | Subscription plans in DB — Free, Starter, Pro, Business | Plans table populated |
| 45 | Upgrade flow — workspace settings → choose plan → Razorpay checkout | Payment completes in test mode |
| 46 | Feature gating — enforce limits per plan (member count, LazyMind queries, etc.) | Free tier limits enforced |
| 47 | Billing management — cancel, upgrade, download invoice | All billing actions work |
| 48 | Trial logic — 30-day Business trial on workspace creation | Trial activates, expires correctly |
| 49 | Review + test all billing flows. | Billing complete |

**GTM task this week:** Incorporate beta feedback into product. Post build-in-public update.

---

#### WEEK 8 — Polish, Performance, Error Handling (Days 50–56)
**Goal:** A product that doesn't embarrass you

| Day | Task | Done When |
|---|---|---|
| 50 | Error boundaries — every page has graceful error state | No white screens of death |
| 51 | Loading states — skeletons for all data-fetching components | No layout shift on load |
| 52 | Empty states — every list has a helpful empty state with CTA | Empty states render correctly |
| 53 | Mobile responsiveness — all pages usable on iPhone SE | Mobile layout passes |
| 54 | Performance audit — Lighthouse score > 85 on all key pages | Lighthouse passes |
| 55 | Onboarding flow — 5-step wizard for new workspaces | Wizard completes, workspace set up |
| 56 | Review + deploy production build. | Production-ready |

**GTM task this week:** Pre-recruit 30 Product Hunt supporters.

---

#### WEEK 9 — Pre-Launch Hardening (Days 57–63)
**Goal:** Ready for 500 simultaneous users

| Day | Task | Done When |
|---|---|---|
| 57 | Rate limiting — API routes protected by Upstash rate limiter | Rate limits enforced |
| 58 | Abuse prevention — detect and block workspace spam creation | Spam creation blocked |
| 59 | PostHog analytics — events for all key user actions | Events flowing to PostHog |
| 60 | Sentry error monitoring — all unhandled errors captured | Sentry dashboard active |
| 61 | Data export — JSON export of full workspace data | Export downloads valid JSON |
| 62 | Status page — uptime monitoring via BetterStack | Status page live |
| 63 | Security audit — check all API routes for missing auth | All routes auth-protected |

**GTM task this week:** Final PH prep. Load all 30 supporters. Prep launch assets.

---

#### WEEK 10 — LAUNCH (Days 64–70)
**Goal:** Product Hunt launch + first revenue

| Day | Task | Done When |
|---|---|---|
| 64 | Final staging test — run through all user flows | No critical bugs |
| 65 | Set up lazynext.com (custom domain, SSL, redirects) | Domain live |
| 66 | PH assets ready — thumbnail, gallery images, tagline, maker comment | All assets uploaded to PH |
| 67 | **PRODUCT HUNT LAUNCH DAY** | Submitted, supporters notified |
| 68 | Respond to every PH comment personally | 100% response rate |
| 69 | Process launch signups — onboard first 50 users manually | 50 users onboarded |
| 70 | First revenue check — did anyone pay? | At least 1 paying workspace |

---

### 49.3 Go / No-Go Gates

| Gate | Week | Criteria | Action if Failed |
|---|---|---|---|
| Architecture gate | End of Week 1 | Auth works, DB connected, deploy succeeds | Stop and fix before Week 2 |
| Core primitives gate | End of Week 4 | TASK + DOC + DECISION all work end-to-end | Do not proceed to Week 5 |
| Design partner gate | End of Week 6 | At least 3 design partners using live product | Extend Week 6 by 1 week |
| Billing gate | End of Week 7 | At least 1 payment processed in test mode | Do not launch without billing |
| Launch gate | End of Week 9 | Lighthouse > 85, 0 critical bugs, 30 PH supporters confirmed | Delay launch by 1 week maximum |

---

### 49.4 Daily Founder Schedule (Non-Negotiable)

```
07:00 — 07:30  Review yesterday's PostHog events. One sentence: "What did users actually do?"
07:30 — 12:30  Deep build work. Phone off. Slack off. No exceptions.
12:30 — 13:00  Lunch + Twitter reply session (15 min max)
13:00 — 16:00  Build continues.
16:00 — 17:00  Community engagement — answer questions, DM prospects, respond to comments
17:00 — 17:30  GTM task of the week (per Section 47.3 calendar)
17:30 — 18:00  Daily standup with yourself: What did I build? What's blocked? What's tomorrow?
```

**Weekly review (every Sunday, 1 hour):**
- Am I on-track with the week's go/no-go gate?
- What did design partners say this week?
- Did I do my GTM tasks?
- What is the one thing that, if I skip it next week, kills the project?

---

## 50. DECISION DNA STANDALONE — SINGLE-PRIMITIVE LAUNCH OPTION

> **PURPOSE:** If the 10-week plan feels too large, this section defines the escape hatch: launch LazyNext's Decision DNA as a standalone tool in 4–5 weeks, validate the market, then expand to the full platform.

### 50.1 The Case for Going Smaller

The 10-week plan is right for a founder who has already validated the market. If you have not yet spoken to 20 potential users, the standalone option is the correct first move.

**The question this option answers:** "Is Decision DNA alone worth paying for?" If yes, you build the rest of the platform. If no, you pivot to a different wedge before wasting 10 weeks.

### 50.2 Decision DNA Standalone — Scope

**What it is:** A dedicated tool for logging, tracking, and learning from product decisions. Nothing else.

**Features:**
- Create a decision (title, context, options considered, final choice, rationale, outcome)
- Tag decisions by category (technical, product, hiring, strategy)
- Mark decisions as Open / Decided / Reversed / Revisited
- Link a decision to an outcome (6 months later: did this work?)
- Share a read-only decision log with stakeholders/investors
- Export decisions as PDF (for board updates)
- LazyMind: "Summarise all decisions we made in Q1" / "Find decisions we reversed"

**What it is NOT:** Tasks, docs, real-time chat, automations, canvas. None of that.

### 50.3 Standalone Build Timeline — 4 Weeks

| Week | Focus | Output |
|---|---|---|
| 1 | Auth (Clerk) + Decision schema + CRUD | Decisions can be created, edited, listed |
| 2 | Decision detail view + status workflow + tagging | Full decision lifecycle works |
| 3 | Sharing + export + LazyMind basic | Share link + PDF export + AI summary |
| 4 | Billing (Razorpay) + Polish + Launch | Paying workspaces possible |

### 50.4 Standalone Pricing

| Plan | Price | Limit | Target |
|---|---|---|---|
| Free | ₹0 | 10 decisions, 1 user | Individual PMs |
| Solo | ₹299/month | Unlimited decisions, 1 user | Freelance PMs, consultants |
| Team | ₹999/month | Unlimited decisions, up to 10 users | Small product teams |
| Company | ₹2,999/month | Unlimited decisions, unlimited users | Larger teams |

### 50.5 The Decision Tree

```
LAUNCH STANDALONE DECISION DNA
        ↓
Week 4–8: Do 20 teams sign up?
        ↓
   YES → Do 5 teams convert to paid?
        ↓
      YES → Decision DNA is validated. Build TASK + DOC around it. 
             Reframe full platform as "Decision DNA + everything connected to it."
      NO  → The problem is real but pricing/messaging is wrong. 
             Run 10 user interviews. Adjust. Retry.
   NO  → Decision DNA as a product is not the right wedge.
          Pivot to TASK-first (Section E: Kill Switch Option 1).
          Don't build the full platform yet.
```

### 50.6 Expansion Trigger Criteria

Only begin building the full platform (TASK + DOC + full graph) when ALL of these are true:

| Criterion | Target |
|---|---|
| Paying workspaces | ≥ 10 |
| Decision DNA NPS | ≥ 30 |
| User request for tasks/docs | ≥ 50% of users have asked for it |
| MRR | ≥ ₹30,000/month |
| Time using tool per week per user | ≥ 30 minutes |

---

## 51. INR PRICING MODEL & SOLO BREAK-EVEN ANALYSIS

> **PURPOSE:** Every pricing number in Sections 1–46 was in USD or left vague. This section defines the India-native pricing in INR, calculates break-even for a solo founder, and models three ARR scenarios.

### 51.1 INR Pricing Tiers

| Tier | Monthly (INR/workspace) | Annual (INR/workspace) | Members | Key Limits |
|---|---|---|---|---|
| **Free** | ₹0 | ₹0 | Up to 3 | 50 nodes total, 10 decisions, 20 LazyMind queries/month, no exports |
| **Starter** | ₹499 | ₹4,990 (save 17%) | Up to 5 | 500 nodes, unlimited decisions, 100 LazyMind queries/month, PDF export |
| **Pro** | ₹999 | ₹9,990 (save 17%) | Up to 15 | Unlimited nodes, unlimited decisions, unlimited LazyMind, all primitives, priority support |
| **Business** | ₹2,999 | ₹29,990 (save 17%) | Unlimited | Everything in Pro + SAML SSO, admin audit log, SLA, custom onboarding |

**Pricing rationale:**
- ₹499/month = cost of one Notion seat. Teams replacing Notion + Linear save ₹1,500+/month/member.
- ₹999/month for up to 15 members = ₹67/member/month. Linear alone is ₹665/member/month.
- ₹2,999/month Business tier is for teams where Decision DNA has become mission-critical.
- Annual pricing creates 2–3 months of runway upfront per customer.

**INR vs. USD conversion note:** USD pricing ($9.99 / $19.99 / $49.99) is available for international customers via Stripe. INR pricing via Razorpay is the default for Indian customers (auto-detected by IP/billing country).

### 51.2 Infrastructure Cost at Scale

| Service | Free tier | Paid trigger | Cost at 100 workspaces | Cost at 1,000 workspaces |
|---|---|---|---|---|
| Neon.tech | 0.5GB storage, 1 compute unit | Storage > 0.5GB | ~$19/month | ~$69/month |
| Clerk.dev | 10,000 MAU | MAU > 10,000 | $0 | $25/month |
| Liveblocks | 50 connections | Connections > 50 | $29/month | $99/month |
| Vercel | 100GB bandwidth | Bandwidth > 100GB | $20/month | ~$75/month (Pro $20 + bandwidth/build overages at this traffic level) |
| Resend | 3,000 emails/month | Emails > 3,000 | $20/month | $20/month |
| Cloudflare R2 | 10GB storage | Storage > 10GB | $0 | $5/month |
| Upstash | 10,000 req/day | Req > 10,000/day | $10/month | $30/month ⚠️ (10K req/day exhausts in minutes at 1K active workspaces — budget $50–100/month at this scale and switch to a paid Upstash plan with higher throughput) |
| Claude Haiku API | — | Per token | ~$5/month | ~$50/month |
| **Total** | | | **~$103/month (₹8,600)** | **~$318/month (₹26,500)** |

### 51.3 Solo Founder Break-Even Model

**Monthly personal expenses (Bengaluru, modest lifestyle):** ₹60,000–80,000/month
**Infrastructure at 30 workspaces:** ~₹8,600/month
**Total monthly burn (no salary, just infra):** ₹8,600/month
**Total monthly burn (with ₹60K salary):** ₹68,600/month

| Workspaces | Avg MRR/workspace | Gross MRR | Infra Cost | Net MRR |
|---|---|---|---|---|
| 10 | ₹999 | ₹9,990 | ₹8,600 | ₹1,390 |
| 20 | ₹999 | ₹19,980 | ₹8,600 | ₹11,380 |
| 30 | ₹1,200 (mix of plans) | ₹36,000 | ₹8,600 | ₹27,400 |
| 50 | ₹1,500 | ₹75,000 | ₹12,000 | ₹63,000 |
| 75 | ₹1,800 | ₹135,000 | ₹15,000 | ₹1,20,000 |
| 100 | ₹2,000 | ₹2,00,000 | ₹18,000 | ₹1,82,000 |

**Break-even (covering ₹60K/month personal expenses + infra):** ~35 paying workspaces at average ₹1,500/month MRR

**"Default alive" threshold:** Reached at 35 workspaces. This is the first milestone. Everything before it is survival mode.

### 51.4 ARR Scenarios

| Scenario | Assumption | Workspaces at Month 12 | ARR |
|---|---|---|---|
| **Pessimistic** | PH launch flops. Slow community growth. | 25 workspaces | ₹3.6L ARR |
| **Base case** | PH does OK (Top 10). Community converts. | 75 workspaces | ₹13.5L ARR |
| **Optimistic** | PH Top 5. One viral tweet. Word of mouth fires. | 200 workspaces | ₹48L ARR |

**VC-investable threshold:** ₹1Cr ARR (~120 workspaces at ₹7,000/month avg). Achievable by Month 18–24 in the base case scenario.

### 51.5 Free Tier Economics

**The free tier is a growth channel, not a cost center.**

- Free users cost ₹0 in infra (within Neon/Clerk free tiers at small scale)
- Free users who invite teammates are the most effective referral mechanism
- Free → Paid conversion target: 5% within 90 days (industry average for PLG tools: 3–8%)
- At 5% conversion: for every 100 free workspaces, 5 become paying → at ₹999/month average, 100 free signups = ₹4,995 MRR

**Free tier paywall placement (engineered scarcity):**

| Limit | Free | Why this limit |
|---|---|---|
| 50 nodes total | Yes | Hits in 2–3 weeks of real use. Creates natural upgrade moment. |
| 10 decisions | Yes | Decision DNA is the core value prop. Hits fast. |
| No PDF export | Yes | Sharing decisions with investors/board is a power-user need. |
| 3 members | Yes | The moment a 4th person needs to join, upgrade is obvious. |
| LazyMind: 20 queries/month | Yes | Users will run out mid-workflow and upgrade immediately. |

---

## 52. LAZYMIND AI QUALITY DECISION — FINAL ARCHITECTURE

> **PURPOSE:** V1–V6 waffled between Groq/Llama and Claude API. This section makes the final architectural decision and documents the rationale, fallback strategy, and cost model.

### 52.1 The Decision

**LazyMind uses a two-tier model:**

| Tier | Model | Use Case | Cost |
|---|---|---|---|
| **Fast tier** | Groq + Llama 3.3 70B | Short responses: summarise a decision, suggest a next task, generate a tag | ~$0.0006/1K tokens |
| **Quality tier** | Claude Haiku 3.5 | Complex requests: draft a document from a decision, root-cause a blocked workflow, compare two decision paths | ~$0.0008/1K input, $0.004/1K output |

**Rule:** Fast tier first. Quality tier only when explicitly triggered by user ("Write a full document") or when fast tier confidence score is below threshold.

**NOT using:** Claude Opus or Sonnet for LazyMind (cost prohibitive at scale). GPT-4o (OpenAI dependency risk). Self-hosted models (infrastructure overhead for a solo founder).

### 52.2 Why Not Full Groq/Llama Only

Groq/Llama 3.3 70B is excellent for:
- Short text summarisation
- Structured output generation (JSON)
- Fast, low-latency responses

Groq/Llama fails on:
- Long-form document generation (coherence degrades over 500 tokens)
- Multi-step reasoning ("given these 5 decisions, what pattern do you see?")
- Tone-consistent writing (drafting docs that match a team's existing style)

Claude Haiku handles all three. The cost difference at MVP scale is negligible (< $5/month for 100 workspaces).

### 52.3 LazyMind Cost Model

**Assumptions:**
- Average user sends 10 LazyMind queries/month
- Average query = 500 input tokens + 300 output tokens
- 70% of queries go to Groq (fast tier), 30% go to Claude Haiku (quality tier)

| Workspaces | Users | Monthly Queries | Groq Cost | Claude Haiku Cost | Total |
|---|---|---|---|---|---|
| 50 | 150 | 1,500 | $0.45 | $1.80 | $2.25 |
| 200 | 600 | 6,000 | $1.80 | $7.20 | $9.00 |
| 1,000 | 3,000 | 30,000 | $9.00 | $36.00 | $45.00 |

**Conclusion:** LazyMind cost is negligible until 1,000+ workspaces. Use the two-tier model without cost anxiety.

### 52.4 LazyMind Fallback Chain

```
User sends LazyMind query
        ↓
[1] Check rate limit (Upstash) — is user within plan limits?
        ↓ YES
[2] Classify query complexity (simple / complex) via fast local heuristic
        ↓
[3a] Simple → Groq/Llama 3.3 70B → stream response
[3b] Complex → Claude Haiku 3.5 → stream response
        ↓
[4] If Groq down → fallback to Claude Haiku for all queries
[5] If Claude Haiku down → fallback to Groq for all queries
[6] If both down → show user: "LazyMind is temporarily unavailable. 
    Your data is safe. We'll be back in minutes." — log incident to Sentry
```

### 52.5 System Prompt Architecture

Every LazyMind query includes a workspace context injection:

```typescript
const buildLazyMindSystemPrompt = (workspace: WorkspaceContext) => `
You are LazyMind, the AI assistant built into LazyNext — a workflow platform.
You have access to the following workspace context:

WORKSPACE: ${workspace.name}
TEAM SIZE: ${workspace.memberCount} members
RECENT DECISIONS: ${workspace.recentDecisions.slice(0, 5).map(d => d.title).join(', ')}
OPEN TASKS: ${workspace.openTaskCount} tasks currently open
BLOCKED TASKS: ${workspace.blockedTasks.map(t => t.title).join(', ')}

Your role:
- Help this team make better decisions and ship faster
- Summarise, draft, and surface patterns — never hallucinate data
- If you don't know something, say so and suggest where to find it
- Be direct, useful, and concise. No filler phrases.
- Never mention that you're powered by Llama or Claude. You are LazyMind.
`;
```

---

## 53. DATA PORTABILITY, RATE LIMITING & ABUSE PREVENTION

> **PURPOSE:** These three systems were missing from V1–V6 at the implementation level. This section closes those gaps.

### 53.1 Data Portability — Full Workspace Export

**Why this matters:** Enterprise and Business tier customers will not adopt a new tool without a credible answer to "what happens to our data if we leave?" Data export is a trust signal, not just a feature.

**Export format:** JSON (primary) + CSV (for tabular data like tasks)

**Export endpoint:**
```typescript
// app/api/workspace/[workspaceId]/export/route.ts
export async function GET(req: Request, { params }: { params: { workspaceId: string } }) {
  const { userId } = getAuth(req)
  await requireWorkspaceAdmin(userId, params.workspaceId)
  
  const exportData = await buildWorkspaceExport(params.workspaceId)
  // exportData includes: tasks, docs, decisions, members, automation rules, 
  //                      all node links, all comments, all activity logs
  
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="lazynext-export-${params.workspaceId}-${Date.now()}.json"`,
    }
  })
}
```

**Export schema structure:**
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-04-03T00:00:00Z",
  "workspace": { "id": "...", "name": "...", "createdAt": "..." },
  "members": [...],
  "tasks": [...],
  "docs": [...],
  "decisions": [...],
  "nodes": [...],
  "edges": [...],
  "automations": [...],
  "comments": [...],
  "activityLog": [...]
}
```

**Access:** Settings → Workspace → Export Data → "Export full workspace as JSON"
**Frequency limit:** 1 export per 24 hours per workspace (prevents DB overload)
**Async processing:** For workspaces with >1,000 nodes, generate export as background job (Inngest) and email download link.

---

### 53.2 Rate Limiting — All API Routes

**Implementation:** Upstash Redis + `@upstash/ratelimit`

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL!, token: process.env.UPSTASH_REDIS_TOKEN! })

export const rateLimiters = {
  // General API: 60 requests per minute per user
  api: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1m") }),
  
  // LazyMind: 20 queries per hour per user (free), 200 (paid)
  lazymind: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1h") }),
  
  // Auth: 5 attempts per 15 minutes per IP
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15m") }),
  
  // Export: 1 per 24 hours per workspace
  export: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(1, "24h") }),
  
  // Invitations: 10 per hour per workspace
  invite: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1h") }),
}

// Middleware wrapper
export async function withRateLimit(
  limiter: Ratelimit,
  identifier: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier)
  
  if (!success) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded", reset }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      }
    })
  }
  
  return handler()
}
```

### 53.3 Abuse Prevention

**Threat model for LazyNext:**

| Threat | Attack vector | Mitigation |
|---|---|---|
| Workspace spam | Script creates 100s of workspaces to abuse free tier | Max 3 workspaces per user on free plan. Email verification required before workspace creation. |
| Member invite abuse | Invite 1,000 people to spam them | Max 50 pending invitations per workspace. Invite rate limited to 10/hour. |
| Storage abuse | Upload 10GB of files to abuse R2 free tier | Per-workspace storage quota enforced (1GB free, 10GB Starter, unlimited Pro+). |
| LazyMind abuse | Script sends 10,000 AI queries | Per-user rate limit enforced at Upstash layer. Free tier: 20/month hard cap in DB. |
| API key abuse | Share API key publicly | API keys are workspace-scoped. Automatic rotation on suspicious activity. Alert to workspace admin. |
| Comment spam | Bot posts spam comments on all nodes | Comment rate limit: 20 comments per hour per user. Honeypot field in comment form. |

**Suspicious activity detection (PostHog + Sentry):**
```typescript
// Track anomalous patterns
if (workspacesCreatedToday > 3) flagAccount(userId, 'workspace_spam')
if (lazyMindQueriesInLastHour > 50) flagAccount(userId, 'ai_abuse')
if (invitesSentInLastHour > 20) flagWorkspace(workspaceId, 'invite_spam')
```

### 53.4 Degraded Mode Specification

**What happens when dependencies fail:**

| Service Down | User Impact | Fallback Behaviour |
|---|---|---|
| Liveblocks | No real-time sync | Show "Live sync paused" banner. All writes still save to Neon. Refresh to see others' changes. |
| Neon DB | Full outage | Maintenance page with status link. PostHog event: `db_outage`. Sentry alert: P0. |
| Clerk | No auth | Maintenance page. Existing sessions continue for 30 minutes (JWT expiry buffer). |
| Resend | No email | Queue emails in Neon. Retry every 15 minutes via Inngest. User unaware of delay. |
| Groq | No fast AI | Fallback to Claude Haiku. User sees no difference. |
| Claude Haiku | No quality AI | Fallback to Groq for all queries. Complex queries get a "This response may be less detailed" notice. |
| Cloudflare R2 | No file uploads | Disable upload button. Show "File uploads temporarily unavailable." |
| Razorpay | No payments | Disable upgrade flow. Show "Payments temporarily unavailable. Your current plan continues." |

---

## 54. REAL VALIDATION DATA — MINIMUM VIABLE EVIDENCE

> **PURPOSE:** This section replaces the empty Appendix D templates with a structured framework for collecting and recording real validation data. It also includes the minimum evidence required to consider the concept "validated" before spending a single day building.

### 54.1 The Validation Threshold

**LazyNext is validated when ALL of the following are true:**

| Criterion | Target | Status |
|---|---|---|
| Problem interviews completed | ≥ 15 conversations | [ ] |
| Interviewees who named tool-switching as a top-3 pain | ≥ 10/15 (67%) | [ ] |
| Interviewees who have tried to solve this and failed | ≥ 8/15 (53%) | [ ] |
| Interviewees who asked "when can I use this?" unprompted | ≥ 5/15 (33%) | [ ] |
| Willingness to pay (WTP) confirmed | ≥ 8 said they'd pay ₹499+/month | [ ] |
| Competitive switching: already paying for 2+ tools you'd replace | ≥ 10/15 | [ ] |

**If you cannot hit these thresholds after 15 conversations, do not build. Change the ICP or the wedge.**

### 54.2 Interview Script — 15-Minute Problem Interview

**The goal:** Understand the pain, not sell the solution. Never mention LazyNext during this interview.

```
OPENING (2 minutes)
"Thanks for chatting. I'm researching how product teams manage workflow across tools. 
 No sales pitch — I just want to understand how your team actually works."

CURRENT STATE (5 minutes)
1. "Walk me through a typical work week. What tools do you use and what do you use each for?"
2. "When something goes wrong — a missed deadline, a repeated mistake — walk me through what happened."
3. "How do you currently make and document product decisions? Show me if you can."

PAIN DEPTH (4 minutes)
4. "What's the most frustrating part of your current setup?"
5. "Have you ever tried to fix this? What happened?"
6. "If I told you there was a way to fix this, what would make you not trust it?"

WILLINGNESS TO PAY (2 minutes)
7. "If a tool completely solved this for your team, roughly what would you pay for it per month?"
   [Do not anchor with a number. Let them name a price.]

CLOSE (2 minutes)
8. "Is there anyone else I should talk to who has this problem even worse than you?"
   [Every "yes" = one warm referral.]
```

### 54.3 Interview Log Template

Record every interview in this format. Keep this log in a LazyNext decision node (meta).

```markdown
## Interview #[N] — [Date]
**Interviewee:** [First name only] | [Role] | [Company size] | [Industry]
**Duration:** [X] minutes
**Source:** [How did you find them?]

### Current Tool Stack
- [Tool]: [What they use it for]

### Key Quotes (verbatim)
- "[Quote about pain]"
- "[Quote about failed solution]"
- "[Quote about what they'd want]"

### Pain Score (1–10): [N]
### WTP (what they said): ₹[X]/month
### "When can I use it?" moment: [YES / NO]
### Referrals given: [N]

### What I learned that contradicts my assumptions:
[Honest note — this is the most important field]
```

### 54.4 Prototype Test Protocol

**Before writing code, test a Figma prototype with 5 people.**

**What to build in Figma (2 days, not more):**
- Screen 1: Workspace home with 3 primitives visible (TASK, DOC, DECISION)
- Screen 2: Decision creation form (the unique flow)
- Screen 3: Decision detail page with linked tasks and AI summary
- Screen 4: Search results across all node types

**Test script (20 minutes per person):**
```
[Show Screen 1]
"Without me explaining anything, what do you think this is?"
"What would you click first?"

[Let them explore Screen 1–3 freely]
"Talk me through what you're doing."

[After they've seen Decision creation]
"What is this 'Decision' thing? What does it mean to you?"
"Would you use this? Why or why not?"

[Show Screen 4: Search]
"If you needed to find something from 3 months ago, how would you use this?"

[Close]
"On a scale of 1–10, how likely are you to use this if I built it?"
"What would make it a 10?"
```

**Pass criteria:** Average "likelihood to use" ≥ 7/10, and at least 3/5 testers understood the Decision concept without explanation.

### 54.5 Build Decision Record

Record this in your LazyNext workspace (again, meta) before writing Line 1 of code:

```markdown
## BUILD DECISION RECORD — LazyNext V1
**Date of decision:** [Date]
**Decision maker:** [Your name]

### The bet I am making:
"India-based product teams (5–25 people) will pay ₹999/month for a tool that 
replaces Notion + Linear AND adds native decision logging."

### Evidence that supports this bet:
- [X] interviews completed
- [X]% named tool-switching as top-3 pain
- [X] said they'd pay ₹499+ unprompted
- [X] said they'd pay ₹999+ unprompted
- Prototype test average score: [X]/10

### Evidence that challenges this bet:
- [Honest note about what you heard that worried you]

### What would make me stop building this:
- Decision DNA NPS < 20 at 90 days
- < 2% free-to-paid conversion at 90 days
- < 30% of new workspaces log a decision in first 7 days

### What I am NOT building in MVP (scope lock):
THREAD, PULSE, AUTOMATION, TABLE, mobile app, GitHub integration, Figma integration.

### My personal runway without revenue:
[X] months at current burn rate. I must hit break-even (₹68,600/month) by [Date].
```

---

## SECTION 33 — AUTHORITATIVE STATUS NOTE (V7)

> **IMPORTANT:** Section 33 (Week-by-Week Sprint Plan — First 12 Weeks) was written for a 1.5-developer team. For solo founders, **Section 49 of this document (V7) is the authoritative sprint plan.** Section 33 remains in this document as the Phase 2 reference — the plan that kicks in once the MVP is live and the first 30 customers are onboard.

**The contradiction between Section 33 and Appendix F has been resolved:**
- Solo path → Section 49 (10-week scope-locked, solo-optimised)
- Post-MVP path → Section 33 (12-week expansion plan, applies after 30 paying workspaces)

---

---

*Document version: 9.0*
*Platform: Lazynext*
*Domain: lazynext.com*
*LLM: Two-tier — Groq/Llama 3.3 70B (fast) + Claude Haiku 3.5 (quality)*
*Last updated: 2026-04-04*

*Primary changes from V8 → V9 (full audit & rewrite):*
*— Clerk middleware: Replaced deprecated `authMiddleware` with `clerkMiddleware()` + `createRouteMatcher()` across all code blocks*
*— React Flow: Updated from `reactflow` v11 to `@xyflow/react` v12 across all imports*
*— Drizzle Kit: Updated config from `driver: 'pg'` to `dialect: 'postgresql'`, fixed command syntax (no `:pg` suffix)*
*— Decisions data model: Resolved dual-storage contradiction — `decisions` table is canonical, `nodes.data` holds only `{ decisionId }` reference*
*— Database schema: Added missing `workspace_members` table, added `updated_by` column to `nodes` table, removed unused `numeric` import*
*— Export route: Fixed bug where queries used Clerk `orgId` instead of resolved `workspaceId`*
*— Environment variables: Fixed Neon DB URL region from `ap-southeast-1` to `ap-south-1` (Mumbai)*
*— Weekly digest cron: Fixed from `0 3 * * MON` to `30 3 * * MON` (9:00am IST = 3:30am UTC)*
*— CSP headers: Added all required service domains (Groq, Together AI, Anthropic, Upstash, PostHog, Sentry, Razorpay, Stripe, Clerk)*
*— Section 18: Fixed Neon free tier to `0.5GB storage, 1 compute unit` (matching Section 51.2)*
*— Section 18: Fixed Liveblocks free tier to `50 simultaneous connections` (matching Section 51.2)*
*— Section 28: Updated Liveblocks migration stages to use connection-based metrics*
*— API endpoints: Added missing `/api/v1/search`, `/api/v1/import/notion`, `/api/v1/import/linear`, `/api/v1/import/csv` to endpoint table*
*— Import code: Fixed `position: { x, y }` JSON objects to use `positionX`/`positionY` integer columns matching schema*
*— Package.json: Updated Drizzle Kit scripts to current syntax (`generate`, `push`, `migrate`)*
*— Removed: Two stale V4 document footer blocks that were never cleaned up*
*— Removed: Duplicate `middleware.ts`, `client.ts`, `rate-limit.ts` code blocks in Section 22 (replaced with cross-references)*
*— Section 19: Added explicit deferral note — Section 51 is authoritative for all pricing*
*— Section 43: Added explicit deferral note — INR tiers from Section 51 supersede USD labels*
*— AI instruction block: Added V9-specific builder notes covering all breaking changes*

*This document is the single source of truth for the Lazynext platform. Version 9.0 supersedes all previous versions.*

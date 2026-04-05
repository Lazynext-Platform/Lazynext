# 💬 Project Discussion

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Status**: 🟢 COMPLETE
> **Date Started**: 2026-04-05
> **Date Completed**: 2026-04-05 (reconstructed from existing codebase and design documents)

---

## What Are We Building?

**Lazynext** is a unified workflow platform that replaces the fragmented stack of project management, documentation, communication, and decision-tracking tools that remote teams currently juggle. Instead of switching between Notion, Jira, Slack, and spreadsheets, teams get one graph-native workspace where everything — tasks, docs, decisions, threads, and automations — lives as connected nodes on an infinite canvas.

The platform's hero feature is **Decision DNA** — a system that tracks every decision a team makes, scores its quality, and later lets teams tag outcomes to learn from their decision-making patterns over time.

Lazynext is built for remote-first teams, SaaS companies, agencies, indie hackers, and operators who are drowning in tool-switching overhead.

## Why Does This Project Exist?

**The tool-switching problem**: Modern knowledge workers use 8-12 SaaS tools daily. Context switches between them fragment attention, lose information at handoff boundaries, and make it impossible to trace how decisions led to outcomes. Existing tools optimize for their own silo (project management, docs, chat) but none unify the full workflow graph.

**Decision amnesia**: Teams make hundreds of decisions but rarely track them systematically. When outcomes are bad, there's no way to trace back to the decision, the information available at the time, or who was involved. Lazynext's Decision DNA fixes this by treating decisions as first-class objects with quality scoring and outcome tracking.

**Why not use existing solutions?**
- **Notion**: Great for docs, weak on project management and has no decision tracking
- **Linear/Jira**: Great for tasks, no docs, no decisions, no canvas view
- **Monday.com**: Tries to do everything but feels bloated and corporate
- **Slack/Teams**: Communication only, no structured workflows

Lazynext takes the "anti-software" approach — do less, but do it right. One graph, seven primitives, one AI assistant.

## Target Users / Consumers

| User Type | Description | Primary Need |
|---|---|---|
| Remote team leads | Managers of 5-50 person distributed teams | Single place to manage work, docs, and decisions |
| SaaS operators | Startup founders and product managers | Decision tracking and workflow visibility |
| Agency project managers | Client-facing team leads | Canvas-based workflow planning with template reuse |
| Indie hackers | Solo founders and small teams | Lightweight all-in-one tool replacement |
| Enterprise teams | Department-level adoption (future) | Compliance-grade decision audit trails |

## Core Use Cases

- **Create and connect workflow nodes** on an infinite canvas (tasks, docs, decisions, threads, pulses, automations, tables)
- **Track decisions** with structured quality scoring and outcome tagging (Decision DNA)
- **Discuss in context** via threaded conversations attached to any node
- **Get AI assistance** via LazyMind — the contextual AI panel that understands your workflow graph
- **Automate recurring workflows** with trigger-action automation nodes
- **Share and reuse** canvas templates via a template marketplace
- **View work from multiple angles** — canvas view on desktop, list/board views on mobile, dashboard views for metrics

## Tech Stack Discussion

| Layer | Options Considered | Decision | Rationale |
|---|---|---|---|
| **Language** | TypeScript, JavaScript | TypeScript | Type safety critical for complex graph data models, better DX |
| **Framework** | Next.js, Remix, Nuxt | Next.js 14 (App Router) | SSR + API routes + React ecosystem, strongest community |
| **Database** | Supabase, PlanetScale, Neon | Neon PostgreSQL | Serverless Postgres, branching for dev, generous free tier, India region |
| **ORM** | Prisma, Drizzle | Drizzle ORM | Lightweight, SQL-like, better serverless cold starts than Prisma |
| **Auth** | Clerk, NextAuth, Auth0 | Clerk | Best DX, org/workspace support built-in, India compliance |
| **Canvas** | ReactFlow, Konva, custom | ReactFlow (@xyflow/react) | Purpose-built for node-graph UIs, active community, performant |
| **State** | Redux, Zustand, Jotai | Zustand | Minimal boilerplate, great with React 18, simple for canvas state |
| **Styling** | Tailwind, CSS Modules, styled-components | Tailwind CSS 3 | Fast iteration, consistent design tokens, design team preference |
| **Animation** | Framer Motion, GSAP | Framer Motion | React-native, declarative, great for panel transitions |
| **Payments** | Stripe, Razorpay | Both (Stripe intl + Razorpay India) | Dual-provider for global + India-specific UPI support |
| **AI** | OpenAI, Groq, Together | Groq (primary) + Together (fallback) | Fastest inference for real-time AI panel, cost-effective |
| **Email** | SendGrid, Resend | Resend | Modern API, React email templates, great DX |
| **Monitoring** | PostHog, Sentry | Both | PostHog for analytics, Sentry for error tracking |
| **Testing** | Jest, Vitest, Playwright | TBD (to be decided at first test plan) | — |
| **Deployment** | Vercel, AWS, Railway | TBD | Vercel likely for Next.js, but need to evaluate costs |

## Architecture Discussion

### Proposed Pattern

**Monolithic Next.js App Router** with service-layer separation:
- `app/` — Next.js pages and API routes (presentation layer)
- `lib/` — Business logic, database, external services (service layer)
- `components/` — React components organized by domain (UI layer)
- `stores/` — Zustand state management (client state)

### Key Architectural Decisions

| Decision | Choice | Why |
|---|---|---|
| Monolith vs Microservices | Monolith | Small team, no operational overhead, Next.js handles API + UI |
| Graph visualization | ReactFlow with custom node types | Native support for node-edge graphs, drag-and-drop, zoom/pan |
| 7 node primitives | Task, Doc, Decision, Thread, Pulse, Automation, Table | Covers 95% of team workflow needs without complexity |
| Canvas + Mobile | Canvas (desktop 1024px+), NodeListView (mobile <640px) | Canvas doesn't work on mobile, list view is natural alternative |
| Multi-tenant | Workspace-level with Clerk org mapping | Clean tenant isolation, Clerk handles user management |
| Dual payments | Stripe (international) + Razorpay (India/UPI) | India market is primary, but need global reach |
| Decision DNA as core | First-class decision tracking with quality scores | This is the differentiator — no competitor does this well |
| AI panel (LazyMind) | Context-aware AI sidebar, not chatbot | AI should understand the workflow graph, not just answer questions |

## Project Structure Discussion

```
lazynext/
├── app/
│   ├── (marketing)/          # Landing page, pricing — public routes
│   ├── (auth)/               # Sign-in, sign-up — Clerk-powered
│   ├── (app)/                # Authenticated app — workspace/canvas
│   │   ├── onboarding/       # First-time workspace creation
│   │   └── workspace/[slug]/ # Dynamic workspace routes
│   │       ├── canvas/       # Workflow canvas view
│   │       ├── decisions/    # Decision DNA views
│   │       ├── members/      # Team management
│   │       ├── pulse/        # Pulse dashboard
│   │       ├── settings/     # Workspace settings
│   │       └── templates/    # Template marketplace
│   └── api/v1/               # API routes
├── components/
│   ├── canvas/               # ReactFlow nodes, edges, panels
│   ├── decisions/            # Decision DNA components
│   ├── layout/               # App shell, sidebar, topbar
│   ├── lazymind/             # AI panel components
│   ├── marketing/            # Landing page components
│   ├── pulse/                # Pulse dashboard components
│   └── ui/                   # Shared UI primitives
├── lib/
│   ├── ai/                   # Groq/Together integration
│   ├── billing/              # Stripe + Razorpay
│   ├── db/                   # Drizzle schema + client
│   ├── email/                # Resend templates
│   ├── inngest/              # Background job processing
│   └── utils/                # Shared utilities
├── stores/                   # Zustand stores
├── hooks/                    # Custom React hooks
├── tests/                    # Test files
├── docs/                     # Mastery + Blueprint documentation
│   ├── mastery.md            # Framework (read-only)
│   ├── mastery-compact.md    # Compact rules
│   ├── design-system.md      # Design tokens
│   └── features/             # 38 feature folders
└── public/                   # Static assets
```

## Scope & Boundaries

### In Scope (v1.0 / MVP)

- Landing page + pricing page (marketing)
- Auth (sign-in, sign-up, workspace creation)
- Onboarding flow (workspace setup, first canvas)
- Workflow canvas with 7 node types (TASK, DOC, DECISION, THREAD, PULSE, AUTOMATION, TABLE)
- Node detail panels (edit node properties)
- LazyMind AI panel (contextual AI assistant)
- Thread comments (discussion on any node)
- Workspace home (dashboard)
- Command palette + keyboard shortcuts
- Notification center + toast notifications
- Empty & error states
- Mobile-responsive views (NodeListView, not canvas)
- Basic workspace settings
- Node creation menu + canvas context controls
- Decision DNA view + Decision Health Dashboard

### Out of Scope (v1.0 / MVP)

- Real-time collaboration (multi-cursor) — deferred to Phase 2
- Template marketplace — deferred to Phase 2
- Automation builder (complex triggers) — deferred to Phase 2
- Billing & subscription management — deferred to Phase 2
- Data import/export — deferred to Phase 2
- Public shared canvas — deferred to Phase 4
- Decision outcome review (at scale) — deferred to Phase 3
- Integrations settings — deferred to Phase 2
- Activity feed & audit log — deferred to Phase 2
- Email templates — deferred to Phase 2

### Known Constraints

- **Canvas limitation**: ReactFlow does NOT render on viewports <640px — mobile uses NodeListView instead
- **Single region**: Initial deployment in ap-south-1 (India) — expand later
- **AI rate limits**: Groq free tier has rate limits — need paid plan for production
- **Clerk pricing**: Free tier supports up to 10,000 MAU — plan tier change at scale
- **Solo developer**: Initial velocity constrained — prioritize ruthlessly

## Feature Brainstorm

| Feature Idea | Priority | Notes / Dependencies |
|---|---|---|
| Landing Page | 🔴 Must Have | First impression, conversion |
| Pricing Page | 🔴 Must Have | Revenue path |
| Auth Pages | 🔴 Must Have | Gate to app |
| Onboarding Flow | 🔴 Must Have | First-run experience |
| Workflow Canvas | 🔴 Must Have | Core product, depends on auth |
| Mobile App View | 🔴 Must Have | Mobile responsiveness |
| Decision DNA View | 🔴 Must Have | Hero differentiator |
| Decision Health Dashboard | 🔴 Must Have | Decision analytics |
| Node Detail Panels | 🔴 Must Have | Node editing |
| LazyMind AI Panel | 🔴 Must Have | AI is core value prop |
| Thread Comments | 🔴 Must Have | Collaboration |
| Workspace Home | 🔴 Must Have | Dashboard |
| Command Palette & Search | 🔴 Must Have | Power user nav |
| Keyboard Shortcuts | 🔴 Must Have | Power user efficiency |
| Node Creation Menu | 🔴 Must Have | Core canvas interaction |
| Canvas Context Controls | 🔴 Must Have | Canvas interaction |
| Toast Notifications | 🔴 Must Have | User feedback |
| Notification Center | 🔴 Must Have | Activity awareness |
| Empty & Error States | 🔴 Must Have | UX polish |
| Workspace Settings | 🟡 Should Have | Admin config |
| Billing & Subscription | 🟡 Should Have | Revenue |
| Import Modal | 🟡 Should Have | Data migration |
| Pulse Dashboard | 🟡 Should Have | Activity metrics |
| Automation Builder | 🟡 Should Have | Workflow automation |
| Template Marketplace | 🟡 Should Have | Growth/sharing |
| Real-time Collaboration | 🟡 Should Have | Multi-user |
| Profile & Account Settings | 🟡 Should Have | User config |
| Integrations Settings | 🟡 Should Have | Third-party connections |
| Marketing Pages | 🟡 Should Have | SEO/content |
| Team Member Management | 🟡 Should Have | Team admin |
| Decision Outcome Review | 🟡 Should Have | Advanced Decision DNA |
| Task Views (Kanban/List) | 🟡 Should Have | Alternative task views |
| Activity Feed & Audit Log | 🟡 Should Have | Compliance/audit |
| Data Export | 🟢 Nice to Have | Data portability |
| Email Templates | 🟢 Nice to Have | Transactional emails |
| Upgrade & Paywall Modal | 🟢 Nice to Have | Conversion |
| Table Primitive | 🟢 Nice to Have | Advanced node type |
| Public Shared Canvas | 🟢 Nice to Have | Public sharing |

## Conventions & Standards Discussion

| Convention | Standard | Notes |
|---|---|---|
| **Code formatting** | Prettier (implicit via ESLint) | Default config |
| **Linting** | ESLint + eslint-config-next | Next.js conventions |
| **Naming convention** | camelCase (JS/TS), PascalCase (React components) | Standard React |
| **File naming** | kebab-case for routes, PascalCase for components | Next.js convention |
| **CSS** | Tailwind utility classes only | No custom CSS unless absolutely necessary |
| **Git workflow** | Mastery branching strategy | feature/XX-name from main |
| **Commit messages** | Mastery convention | type(scope): description |
| **Design framework** | Blueprint (`blueprint.mastery.md`) | Governs UI design process |
| **Design tokens** | `docs/design-system.md` | Single source of truth for colors, typography, spacing |

## Research & Prior Art

### Sources Consulted

| Source | Type | Key Takeaway |
|---|---|---|
| Notion | Competitor | Docs-first but weak on workflow and decisions |
| Linear | Competitor | Beautiful task management but no docs or decision tracking |
| Monday.com | Competitor | Feature-heavy but feels corporate and bloated |
| Miro | Competitor | Canvas model works, but it's presentation not workflow |
| ReactFlow docs | Docs | Excellent node-graph library, handles canvas well |
| Clerk documentation | Docs | Org-based multi-tenancy maps to workspace model |

### Key Findings

- No competitor combines canvas-based workflow + decision tracking in one tool
- ReactFlow handles 500+ nodes smoothly — sufficient for team workflows
- Graph-based data models map naturally to PostgreSQL + JSONB

### Impact on Decisions

- Decision to use ReactFlow was confirmed by its performance benchmarks
- Decision to make Decision DNA a first-class feature was confirmed by competitor gap analysis

## Open Questions

- [x] Tech stack — resolved (see table above)
- [x] Architecture pattern — resolved (monolithic Next.js)
- [x] Design framework — resolved (Blueprint for UI, Mastery for dev process)
- [x] Node types — resolved (7 primitives)
- [x] Mobile strategy — resolved (NodeListView below 640px)

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-05 | Adopt Mastery framework for development process | Need structured workflow for building 38 features systematically |
| 2026-04-05 | Keep Blueprint alongside Mastery | Blueprint governs UI design (already has 38 complete feature designs), Mastery governs development process |
| 2026-04-05 | Use mid-project adoption workflow | Project already has code, design docs, and architecture decisions — not a fresh start |
| 2026-04-05 | Map 38 design features to development roadmap | Each Blueprint feature becomes a development feature in Mastery roadmap |

## Discussion Complete ✅

**Summary**: Lazynext is a graph-native workflow platform replacing fragmented SaaS tools for remote teams. Built with Next.js 14, ReactFlow, Clerk, Neon, and Drizzle. Its hero feature is Decision DNA — structured decision tracking with quality scores and outcome tagging. 38 features are fully designed via Blueprint; the Mastery framework is being adopted to govern the development process going forward.

**Completed**: 2026-04-05 (reconstructed from existing codebase)

**Next Steps**:
1. ✅ Create `project-context.md` — formalize project identity
2. ✅ Create `project-roadmap.md` — order features and assign sequence numbers
3. Start Feature development — begin the feature lifecycle

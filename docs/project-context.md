# 🎯 Project Context

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Version**: Pre-release (0.1.0-dev)
> **Last Updated**: 2026-04-05

---

## What Is This Project?

Lazynext is a unified workflow platform that replaces the fragmented stack of project management, documentation, communication, and decision-tracking tools. Everything lives as connected nodes on an infinite canvas — tasks, docs, decisions, threads, pulses, automations, and tables.

The platform's hero differentiator is **Decision DNA**: a first-class system that tracks every decision a team makes, scores its quality, and lets teams tag outcomes to learn from decision-making patterns over time.

Target audience: remote-first teams, SaaS companies, agencies, indie hackers, and operators drowning in tool-switching overhead.

## Project Type

| Property | Value |
|---|---|
| **Type** | Web App |
| **Platform** | Web (desktop-first canvas, mobile-responsive) |
| **Distribution** | SaaS |

## Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Language** | TypeScript | 5.9.x | Type safety for complex graph data models |
| **Framework** | Next.js (App Router) | 14.2.x | SSR + API routes + React ecosystem |
| **React** | React | 18.3.x | Stable, ReactFlow compatible |
| **Database** | Neon PostgreSQL | Serverless | Serverless Postgres, branching, India region |
| **ORM** | Drizzle ORM | 0.45.x | Lightweight, SQL-like, fast serverless cold starts |
| **Auth** | Clerk | 7.0.x | Org/workspace support, India compliance |
| **Canvas** | ReactFlow (@xyflow/react) | 12.10.x | Purpose-built for node-graph UIs |
| **State** | Zustand | 5.0.x | Minimal boilerplate, great with React 18 |
| **Styling** | Tailwind CSS | 3.4.x | Consistent design tokens, fast iteration |
| **Animation** | Framer Motion | 12.38.x | Declarative, React-native animations |
| **Charts** | Recharts | 3.8.x | React-based charting for dashboards |
| **AI (Primary)** | Groq | API | Fastest inference for real-time AI panel |
| **AI (Fallback)** | Together | API | Fallback provider |
| **Payments (India)** | Razorpay | API | India market, UPI support |
| **Payments (Intl)** | Stripe | API | International payments |
| **Email** | Resend | API | Modern email API, React templates |
| **Analytics** | PostHog | SaaS | Product analytics |
| **Error Tracking** | Sentry | SaaS | Error monitoring |
| **Background Jobs** | Inngest | SDK | Event-driven background jobs |
| **Validation** | Zod | 4.3.x | Runtime type validation |
| **Utilities** | clsx, tailwind-merge, date-fns, lucide-react, sonner | Various | UI utilities |
| **Testing** | TBD | — | To be decided at first test plan |
| **Deployment** | TBD (likely Vercel) | — | To be decided |

## Architecture Overview

### Pattern

**Monolithic Next.js App Router** with service-layer separation and graph-native data model.

### Project Structure

```
lazynext/
├── app/                      # Next.js App Router pages + API
│   ├── (marketing)/          # Public routes — landing, pricing
│   ├── (auth)/               # Auth routes — Clerk sign-in/up
│   ├── (app)/                # Protected routes — workspace
│   │   ├── onboarding/       # First-time workspace setup
│   │   └── workspace/[slug]/ # Dynamic workspace routes
│   │       ├── canvas/       # Workflow canvas
│   │       ├── decisions/    # Decision DNA views
│   │       ├── members/      # Team management
│   │       ├── pulse/        # Pulse dashboard
│   │       ├── settings/     # Workspace settings
│   │       └── templates/    # Template marketplace
│   └── api/v1/               # REST API routes
├── components/               # React components by domain
│   ├── canvas/               # ReactFlow nodes, edges, panels
│   ├── decisions/            # Decision DNA components
│   ├── layout/               # App shell, sidebar, topbar
│   ├── lazymind/             # AI panel components
│   ├── marketing/            # Landing page components
│   ├── pulse/                # Pulse dashboard components
│   └── ui/                   # Shared UI primitives
├── lib/                      # Service layer
│   ├── ai/                   # Groq/Together AI integration
│   ├── billing/              # Stripe + Razorpay
│   ├── db/                   # Drizzle schema + Neon client
│   ├── email/                # Resend email templates
│   ├── inngest/              # Background job definitions
│   └── utils/                # Shared utility functions
├── stores/                   # Zustand state stores
│   ├── canvas.store.ts       # Canvas nodes, edges, selection, history (undo/redo)
│   ├── ui.store.ts           # UI state (sidebar, modals)
│   └── workspace.store.ts    # Active workspace context
├── hooks/                    # Custom React hooks
├── tests/                    # Test files
├── docs/                     # Documentation
│   ├── mastery.md            # Development process framework (read-only)
│   ├── mastery-compact.md    # Compact rules for AI sessions
│   ├── design-system.md      # Design tokens and patterns
│   └── features/             # 38 feature folders (design + development)
├── public/                   # Static assets
├── middleware.ts             # Clerk auth middleware
├── drizzle.config.ts         # DB config
├── tailwind.config.ts        # Design tokens
└── next.config.js            # Next.js config
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Canvas engine | ReactFlow (@xyflow/react) | Native node-graph support, 500+ node performance |
| 7 node primitives | TASK, DOC, DECISION, THREAD, PULSE, AUTOMATION, TABLE | Covers 95% of team workflow needs |
| Graph data model | Nodes + Edges tables with JSONB data | Flexible per-type data without separate tables per primitive |
| Mobile canvas fallback | NodeListView below 640px | ReactFlow doesn't render on small viewports |
| Multi-tenant isolation | Workspace-level with Clerk org mapping | Clean tenant isolation, Clerk handles user management |
| Decision DNA | First-class decisions with quality scoring + outcome tracking | Core differentiator — no competitor does this |
| AI integration | Context-aware sidebar (LazyMind), not generic chatbot | AI should understand the workflow graph |
| Dual payment providers | Stripe (international) + Razorpay (India/UPI) | Primary market is India, need global reach |
| Design process | Blueprint framework for UI design | Complete 7-stage design lifecycle, 38 features designed |
| Development process | Mastery framework for feature lifecycle | Structured discuss → design → plan → build → ship → reflect |

## Conventions & Standards

### Code Style

| Convention | Standard |
|---|---|
| **Formatting** | Prettier (via ESLint config) |
| **Linting** | ESLint + eslint-config-next |
| **Naming** | camelCase (variables/functions), PascalCase (React components/types) |
| **File naming** | kebab-case for routes, PascalCase for component files |
| **CSS** | Tailwind utility classes only — no custom CSS unless absolutely necessary |
| **Imports** | Relative paths, `@/` alias for project root |

### Git Conventions

- Branching: See `mastery.md` Git Branching Strategy
- Commits: See `mastery.md` Commit Message Convention — `type(scope): description`

### Environment Setup

```bash
# 1. Clone the repository
git clone <repo-url> && cd lazynext

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Fill in Clerk, Neon, Groq, Razorpay, Stripe, Resend keys

# 4. Push database schema
npm run db:push

# 5. Start dev server
npm run dev
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk public key |
| `CLERK_SECRET_KEY` | Yes | — | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` | Sign-up route |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | `/onboarding/create-workspace` | Post-auth redirect |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | `/onboarding/create-workspace` | Post-signup redirect |
| `DATABASE_URL` | Yes | — | Neon PostgreSQL connection string |
| `GROQ_API_KEY` | Yes | — | Groq AI API key |
| `TOGETHER_API_KEY` | No | — | Together AI fallback key |
| `RAZORPAY_KEY_ID` | No | — | Razorpay key (India payments) |
| `RAZORPAY_KEY_SECRET` | No | — | Razorpay secret |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret (intl payments) |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | — | Stripe public key |
| `RESEND_API_KEY` | No | — | Resend email API key |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | — | PostHog analytics |
| `SENTRY_DSN` | No | — | Sentry error tracking |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Base URL |

## Scope & Constraints

### In Scope (v1.0)

- Marketing pages (landing, pricing)
- Auth + onboarding (Clerk-powered)
- Workflow canvas with 7 node types
- Node detail editing panels
- LazyMind AI assistant panel
- Thread comments on any node
- Decision DNA (view + health dashboard)
- Workspace home dashboard
- Command palette + keyboard shortcuts
- Notification center + toast notifications
- Empty & error states
- Mobile-responsive (NodeListView)
- Canvas context controls + node creation menu
- Basic workspace settings

### Out of Scope (v1.0)

- Real-time collaboration — deferred to Phase 2 (complexity + infrastructure)
- Template marketplace — deferred to Phase 2 (needs content + moderation)
- Billing & subscription — deferred to Phase 2 (revenue not urgent for beta)
- Data import/export — deferred to Phase 2 (data portability not MVP-blocking)
- Public shared canvas — deferred to Phase 4 (security + permissions complexity)
- Email templates — deferred to Phase 2 (transactional emails can be basic initially)

### Known Constraints

- ReactFlow does NOT render below 640px — mobile uses NodeListView
- Solo developer — velocity constrained, must prioritize ruthlessly
- Groq free tier has rate limits — production needs paid plan
- Clerk free tier up to 10,000 MAU — plan for tier upgrade at scale
- India-first market — latency-sensitive, Neon ap-south-1 region

## Team & Roles

| Role | Who | Responsibilities |
|---|---|---|
| **Lead / Owner** | Avas Patel | Final decisions, merge approval, product direction |
| **AI Agent** | Any Mastery-compatible agent | Implementation within Mastery framework |
| **Contributors** | None yet | — |

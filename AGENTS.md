# AGENTS.md

Lazynext is a graph-native workflow platform that unifies tasks, docs, decisions, threads, and automations on an infinite canvas. Built with Next.js 14, ReactFlow, Supabase (Auth + PostgreSQL), and Tailwind CSS. Its hero feature — Decision DNA — tracks decision quality and outcomes to help teams learn from their choices.

## Project Structure

```
lazynext/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Public — landing, pricing
│   ├── (auth)/               # Auth — Supabase sign-in/up
│   ├── (app)/                # Protected — workspace
│   │   ├── onboarding/       # First-time workspace setup
│   │   └── workspace/[slug]/ # Dynamic workspace routes
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
│   ├── ai/                   # Groq/Together AI
│   ├── billing/              # Stripe + Razorpay
│   ├── db/                   # Supabase client + schema types
│   ├── email/                # Resend templates
│   ├── inngest/              # Background jobs
│   └── utils/                # Utilities
├── stores/                   # Zustand state stores
├── hooks/                    # Custom React hooks
├── docs/                     # Documentation
│   ├── mastery.md            # Development process framework (READ-ONLY)
│   ├── mastery-compact.md    # Compact rules for AI sessions
│   ├── design-system.md      # Design tokens and patterns
│   ├── features/             # 38 feature folders
│   └── references/           # ADRs, process overrides, guides
└── public/                   # Static assets
```

## Two Frameworks

This project uses **two complementary frameworks**:

### 1. Mastery — Development Process
Governs how features are built: Discuss → Design → Plan → Build → Ship → Reflect.

### 2. Blueprint — UI Design
Governs how features are designed: Discover → Explore → Define → Create → Refine → Handoff → Reflect.

See `docs/references/process-overrides.md` for how they work together.

## Getting Started (for AI Agents)

### Development Process Context
Read docs in this exact order (Mastery AI Agent Protocol):

1. `docs/mastery-compact.md` — Framework rules (compact — all rules, no templates)
2. `docs/project-discussion.md` — Understand WHY the project exists and key decisions
3. `docs/project-context.md` — Understand WHAT the project is (formalized)
4. `docs/project-roadmap.md` — Understand WHERE the project stands
5. `docs/features/` (active) — Understand the current feature state

### UI Design Context (for UI work only)
Before any UI work, also load:

1. `docs/design-system.md` — Design tokens, color palette, typography, component patterns
2. Active feature's `design-brief.md` — Requirements, constraints, layout
3. Active feature's `design-spec.md` — What was designed and why
4. Active feature's `design-handoff.md` — Implementation notes and verification

> Need a document template? Load it from the full `docs/mastery.md` — search for the specific template heading.

### Finding Current Work

1. Check `docs/project-roadmap.md` for features marked 🟡 IN PROGRESS
2. Open that feature's folder: `discussion → architecture → tasks → changelog`
3. In `tasks.md`, find the last checked checkbox — that's where work stopped
4. In `changelog.md`, read the latest Session Note for context

## Key Rules

- **Docs before code** — discuss, design, and plan before building. Never skip stages.
- **Feature branches only** — all work happens on `feature/XX-name` branches, never on `main`.
- **Never delete branches** — kept forever as historical reference.
- **Human approval required** for: merging to main, modifying architecture after finalization, changing `project-context.md`, reordering the roadmap, adding dependencies.
- **AI agents CAN** autonomously: read docs, write code within active tasks, check off tasks, log changelog entries, create commits, push to feature branches, update project changelog.
- **Design system sync** — `docs/design-system.md` and `tailwind.config.ts` must always stay in sync.

See the full Autonomy Boundaries table in `docs/mastery.md` → AI Agent Protocol section.

## Conventions

**Branches**: `feature/XX-feature-name` from `main` (e.g., `feature/01-landing-page`)

**Commits**: `type(scope): short description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `hotfix`
- Scope: feature name or module (e.g., `landing-page`, `canvas`, `api`, `docs`)

**File naming**: kebab-case for routes, PascalCase for components

**CSS**: Tailwind utility classes only — no custom CSS unless absolutely necessary

**Markdown style**: ATX headings (`#`), fenced code blocks (triple backtick)

## Key Design System Rules

- **Dark theme app** (slate-950/900), **light theme marketing** (white)
- **Brand primary**: `#4F6EF7`
- **7 node-type colors**: TASK blue, DOC emerald, DECISION orange, THREAD purple, PULSE cyan, AUTOMATION amber, TABLE teal
- **Font**: Inter (400/500/600/700), JetBrains Mono for code
- **Responsive**: Mobile-first — Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)
- **Canvas**: ReactFlow does NOT render below 640px — use NodeListView instead
- **Accessibility**: WCAG 2.1 AA minimum

## Feature Index

See `docs/features/FEATURE-INDEX.md` for the complete list of 38 features with links to all design documents.

## Full Protocol

The complete AI Agent Protocol — including context loading order, autonomy boundaries, session handoff protocol, and communication style rules — is defined in:

**`docs/mastery.md` → Section: 🤖 AI Agent Protocol**

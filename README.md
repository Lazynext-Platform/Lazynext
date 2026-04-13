# Lazynext

> The Anti-Software Workflow Platform — tasks, docs, decisions, and AI in one unified graph.

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2014-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

Lazynext is a graph-native workflow platform that unifies tasks, docs, decisions, threads, and automations on an infinite canvas. Its hero feature — **Decision DNA** — tracks decision quality and outcomes to help teams learn from their choices.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 |
| Canvas | ReactFlow (@xyflow/react) |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| State | Zustand |
| AI | Groq + Together AI |
| Payments | Lemon Squeezy |
| Email | Resend |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) project

### Setup

```bash
# Clone the repo
git clone https://github.com/lazynext/Lazynext.git
cd Lazynext

# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

# Fill in your keys in .env.local (see Environment Variables below)

# Run the SQL migration in your Supabase SQL Editor
# See lib/db/migrations/00001_supabase_init.sql

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `GROQ_API_KEY` | For AI | Groq API key for LazyMind |
| `TOGETHER_API_KEY` | Fallback | Together AI fallback key |
| `LEMONSQUEEZY_API_KEY` | For billing | Lemon Squeezy API key |
| `LEMONSQUEEZY_STORE_ID` | For billing | Lemon Squeezy store ID |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | For billing | Lemon Squeezy webhook signing secret |
| `RESEND_API_KEY` | For email | Resend API key |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your app URL (default: http://localhost:3000) |

## Project Structure

```
app/
  (marketing)/     Landing, pricing, features, blog, about, comparison, changelog
  (auth)/          Sign-in and sign-up (Supabase Auth)
  (app)/           Protected workspace routes
    onboarding/    First-time setup wizard
    workspace/     Dynamic [slug] routes — canvas, tasks, decisions, pulse, etc.
  api/v1/          REST API — workflows, nodes, decisions, search, AI, billing, webhooks
components/
  canvas/          ReactFlow nodes, edges, panels
  decisions/       Decision DNA components
  layout/          Sidebar, TopBar, MobileBottomNav
  marketing/       Landing page sections
  ui/              Shared primitives
lib/
  ai/              Groq/Together AI integration + decision quality scoring
  billing/         Plan definitions
  db/              Supabase client, schema types, migrations
  email/           Transactional email templates
stores/            Zustand state (canvas, ui, workspace)
hooks/             Custom React hooks
tests/             Vitest unit tests
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm test             # Run tests (Vitest)
npm run test:watch   # Tests in watch mode
npm run db:types     # Generate Supabase TypeScript types
npm run type-check   # TypeScript type checking
npm run test:e2e     # Playwright E2E tests
```

## Features (38 total)

### Core
- Infinite workflow canvas with 7 node types (Task, Doc, Decision, Thread, Pulse, Automation, Table)
- Decision DNA — quality scoring, outcome tracking, health dashboard
- LazyMind AI panel — Groq-powered analysis and suggestions
- Real-time collaboration with cursor overlays
- Command palette (⌘K) with search, quick actions, navigation
- Mobile-responsive with NodeListView below 640px

### Workspace
- Kanban + List task views with filters
- Automation builder (WHEN/THEN rules)
- Template marketplace with install flow
- Pulse dashboard — workload, burndown, AI summaries
- Activity feed + audit log
- Data import (Notion, Linear, Trello, CSV) and export

### Platform
- Supabase Auth with email/password and OAuth (Google, GitHub)
- 4-tier billing (Free/Starter/Pro/Business)
- Workspace settings, member management, integrations
- Keyboard shortcuts, notifications, toast system
- Public shared canvas with read-only view

## Design System

- **Dark theme** app (slate-950/900), **light theme** marketing
- **Brand**: `#4F6EF7`
- **Font**: Inter (400/500/600/700)
- **7 node-type colors**: Task blue, Doc emerald, Decision orange, Thread purple, Pulse cyan, Automation amber, Table teal
- **Responsive**: Mobile-first — Mobile (<640px), Tablet (640–1024px), Desktop (>1024px)
- See `docs/design-system.md` for full tokens and patterns

## License

Private — All rights reserved.

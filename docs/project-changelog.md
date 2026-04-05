# 📋 Project Changelog

> **Project**: Lazynext — The Anti-Software Workflow Platform
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-04-05

---

## [Unreleased]

<!-- Features merged to main but not yet released/deployed -->

### Added

- **Mastery Framework Adoption** — Adopted the Mastery development process framework (v3.4) alongside the existing Blueprint design framework. Created all required project-level docs: project-discussion.md, project-context.md, project-roadmap.md, mastery-compact.md, project-changelog.md, process-overrides.md. Updated AGENTS.md to reference both frameworks.

### Changed
### Fixed
### Removed

---

## [0.0.1] — 2026-04-05 (Pre-Mastery)

### Added

- **Project Scaffolding** — Next.js 14 App Router setup with TypeScript, Tailwind CSS 3, ESLint
- **Auth Integration (Clerk)** — Sign-in, sign-up, middleware protection, workspace-based routing
- **Database Schema (Drizzle + Neon)** — Full schema with workspaces, members, workflows, nodes, edges, threads, messages, decisions, automation runs, and all relations
- **Canvas State (Zustand)** — Canvas store with nodes, edges, selection, history (undo/redo), LazyMind toggle
- **Design System** — Complete design token system in docs/design-system.md and tailwind.config.ts
- **Blueprint Design Docs** — 38 features fully designed with mockups, briefs, specs, reviews, and handoffs
- **Marketing Landing Page** — Basic marketing layout and landing page
- **App Shell** — Protected workspace routes with dynamic slug-based routing

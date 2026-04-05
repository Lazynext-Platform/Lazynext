# 🏛️ MASTERY — Compact Rules Reference

> **Version**: 3.4
> **Purpose**: All framework rules, no templates. Load this every session (~5k tokens).
> **Templates**: When you need a template, load the specific section from the full `docs/mastery.md`.

---

## 💡 Core Principles

1. **Think before you type.** No code until discussion is complete.
2. **Design before you build.** Architecture decisions are documented, not improvised.
3. **Plan before you execute.** Every task is written down and checkable.
4. **Test before you ship.** Every feature has a test plan.
5. **Document as you go.** Changes are logged, not remembered.
6. **Review when you're done.** Reflect, learn, improve.
7. **Never edit the framework in consuming projects.** `docs/mastery.md` is read-only.

---

## 🤖 AI Agent Protocol

### Context Loading Order (every new session)

```
1. docs/mastery-compact.md      → This file (mandatory every session)
2. docs/project-discussion.md   → WHY the project exists
3. docs/project-context.md      → WHAT the project is
4. docs/project-roadmap.md      → WHERE the project stands
5. docs/features/ (active)      → Current feature state
```

**Rule**: Never write code until you have read `project-context.md` and `project-roadmap.md`.

### Determining Current State

1. Check `project-roadmap.md` — look for 🟡 IN PROGRESS
2. Open that feature's docs: `discussion → architecture → tasks → changelog`
3. In tasks doc, find last checked checkbox — that's where work stopped
4. In changelog, read most recent entries
5. Check git branch — `git log --oneline -10`

### Autonomy Boundaries

**AI CAN do autonomously**: Read docs, write code within active tasks, check off tasks, log changelog entries, create commits, push to feature branches, create discussion docs, perform cross-checks, update project changelog.

**AI CANNOT do (requires human)**: Modify architecture after finalization, skip lifecycle stages, merge to main, delete branches, delete/overwrite docs, change project-context.md, reorder roadmap, add dependencies, edit docs/mastery.md, skip cross-checks.

### Verification Cross-Checks

**When**: After planning docs created, every ~5 build tasks, before merge.

**What to verify**:
1. Architecture ↔ Code alignment
2. Tasks ↔ Code (checkboxes updated)
3. Testplan ↔ Tests (cases have tests, statuses filled)
4. Changelog ↔ Session (what happened is logged)
5. Dependencies ↔ Architecture (only approved deps)

### Session Handoff

When ending a session:
1. Update changelog with what was done
2. Update task checkboxes
3. Leave a Session Note at top of changelog with: Who, Duration, Worked On, Stopped At, Blockers, Next Steps

### AI Communication Style

- Ask before assuming
- Reference docs when making decisions
- Explain deviations in changelog before proceeding
- Never silently skip steps
- Ask about testing if testplan.md exists

---

## 🔄 Feature Lifecycle (6 Stages)

```
DISCUSS → DESIGN → PLAN → BUILD → SHIP → REFLECT
```

### Stage 1 — Discuss 💬
- Entry: Feature in roadmap → Exit: Discussion marked COMPLETE
- Create `discussion.md`, define requirements, surface edge cases, identify dependencies

### Stage 2 — Design 🏗️
- Entry: Discussion COMPLETE → Exit: Architecture finalized
- Create `architecture.md`, define file structure, data models, interfaces, trade-offs

### Stage 3 — Plan 📋
- Entry: Architecture finalized → Exit: Tasks + testplan + API spec created
- Create `tasks.md`, `testplan.md`, `api.md` (if needed), `changelog.md` (empty)
- Create feature branch

### Stage 4 — Build 🔨
- Entry: Branch + planning docs done → Exit: All tasks checked, tests pass
- Execute tasks, log changes in changelog, commit frequently, push to feature branch

### Stage 5 — Ship 🚀
- Entry: All tasks complete → Exit: Merged to main (human-approved)
- Self-review, final test pass, human approval, merge, update project changelog, update README if needed

### Stage 6 — Reflect 🪞
- Entry: Feature merged → Exit: Review doc completed
- Create `review.md`, update roadmap to mark feature complete

---

## 🚑 Hotfix Workflow

For critical production bugs only. Abbreviated: Identify → Branch → Fix → Verify → Merge → Document.
- Skips discussion, architecture, tasks docs
- NEVER skips testing
- Must be documented after the fact

---

## 🪶 Lightweight Feature Variant

For planned trivial changes. ALL must be true: no new code logic, no architectural decisions, well-understood scope, low risk, self-contained.

Uses single `lightweight.md` instead of 6 docs. Still uses feature branches and requires human merge approval.

---

## 📂 Required Documents

| Document | Required? |
|---|---|
| mastery-compact.md | ✅ Always |
| project-discussion.md | ✅ Always |
| project-context.md | ✅ Always |
| project-roadmap.md | ✅ Always |
| project-changelog.md | ✅ Always |
| AGENTS.md | ✅ Always |
| Feature discussion.md | ✅ Always |
| Feature architecture.md | ✅ Always |
| Feature tasks.md | ✅ Always |
| Feature testplan.md | ✅ Always |
| Feature changelog.md | ✅ Always |
| Feature review.md | ✅ Always |
| Feature api.md | ⚡ Conditional (when external interfaces exist) |
| Feature research.md | ⚡ Conditional (when knowledge gaps exist) |

---

## 📛 Naming Convention

- **Feature folders**: `XX-feature-name` (zero-padded, lowercase, hyphen-separated)
- **Doc filenames**: `discussion.md`, `architecture.md`, `tasks.md`, `testplan.md`, `api.md`, `research.md`, `changelog.md`, `review.md`
- **Branch names**: `feature/XX-feature-name`

---

## 🌿 Git Branching

- `main` — always deployable, only receives merges
- `feature/XX-name` — one per feature, created from latest main
- `hotfix/description` — critical fixes only
- **Never delete branches** — kept forever as historical reference

---

## ✍️ Commit Convention

Format: `type(scope): short description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `hotfix`

Scope: feature name or module (e.g., `auth`, `canvas`, `api`, `docs`)

---

## ✅ Definition of Done

- All tasks checked off
- All test cases pass
- Changelog up to date
- Code committed and pushed
- Human reviewed and approved merge
- Feature merged to main
- Review doc completed
- Project roadmap updated

---

## ⚡ Quick Start

```
1. Read this file (mandatory every session)
2. Read project-context.md
3. Read project-roadmap.md
4. Find the 🟡 IN PROGRESS feature
5. Read its changelog (latest session note)
6. Read its tasks (find where work stopped)
7. Continue from there
8. Log a session note when done
```

> *"Think. Design. Plan. Build. Ship. Reflect. Repeat."*

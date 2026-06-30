# 🏛️ MASTERY — Development Process Framework (Compact)

> **A universal, tech-agnostic framework for building software with discipline.**
> Every feature starts as a discussion, gets designed, becomes a plan, and ships as clean, tested code.
> Works for any project. Any language. Any stack. Any team size. Human or AI-driven.
>
> ⚠️ **THIS FILE IS READ-ONLY** in every project that uses this framework. Project-specific decisions belong in `project-context.md`. Feature-specific decisions belong in feature docs. Process customizations go in `docs/references/process-overrides.md`.
>
> 📦 **This is the compact variant** — optimized for AI agent context loading (~6k tokens vs ~25k). Contains all framework rules, lifecycle stages, and conventions. **Templates are NOT included** — load specific templates from the full `mastery.md` when creating new documents.

---

## 📋 Table of Contents

- [Philosophy](#-philosophy)
- [AI Agent Protocol](#-ai-agent-protocol)
- [Project Initialization](#-project-initialization)
- [Document Ecosystem](#-document-ecosystem)
- [The Workflow — Feature Lifecycle](#-the-workflow--feature-lifecycle)
- [Lightweight Feature Variant](#-lightweight-feature-variant)
- [Document Naming Convention](#-document-naming-convention)
- [Git Branching Strategy](#-git-branching-strategy)
- [Commit Message Convention](#-commit-message-convention)
- [Resuming Work](#-resuming-work)
- [Definition of Done](#-definition-of-done)
- [Quick Reference](#-quick-reference)

> **Sections in the full `mastery.md` but not here**: Adopting Mastery Mid-Project, Hotfix Workflow, Parallel Features, References Directory, Cross-Tool Configuration, and all 16 Document Templates. Load these from the full file when needed.

---

## 💡 Philosophy

1. **Think before you type.** No code until the discussion is complete.
2. **Design before you build.** Architecture decisions are documented, not improvised.
3. **Plan before you execute.** Every task is written down and checkable.
4. **Test before you ship.** Every feature has a test plan.
5. **Document as you go.** Changes are logged, not remembered.
6. **Review when you're done.** Reflect, learn, improve.
7. **Never edit the framework in consuming projects.** The `docs/mastery.md` copy is read-only.

Mastery makes the process as important as the product — whether the builder is human, AI, or both.

---

## 🤖 AI Agent Protocol

This section defines how AI agents (copilots, coding assistants, autonomous agents) should interact with this framework. Every AI agent working on a project using Mastery MUST follow these rules.

### Cardinal Rule — Plan-Driven Execution

> 🚨 **ABSOLUTE RULE — NO EXCEPTIONS**
>
> **Stick to the plan. Anticipate, don't improvise. Never drift or hallucinate. Work ONLY on what is documented.**

- Every action MUST trace back to a documented task, architecture decision, or explicit human instruction.
- If it's not in the plan, don't do it. If you think the plan is wrong, raise it — don't silently "fix" it.
- Do NOT invent features, refactor undocumented code, add "nice to have" improvements, or explore tangents.
- Do NOT assume, guess, or fabricate information. If you don't know, say so. If context is missing, ask or look it up.
- Anticipate problems by reading docs thoroughly BEFORE starting — not by improvising mid-stream.
- When you feel the urge to go beyond scope: **STOP. Re-read the task. Do only that.**

Violating this rule — even with good intentions — is the single most common AI agent failure mode. Trust the docs, not your instincts.

### Context Loading Order

When an AI agent starts a session on this project, it MUST read documents in this exact order:

```
1. docs/mastery-compact.md      → Framework rules (this file — compact, no templates)
2. docs/project-discussion.md   → Understand WHY the project exists and key decisions
3. docs/project-context.md      → Understand WHAT the project is (formalized)
4. docs/project-roadmap.md      → Understand WHERE the project stands
5. docs/features/ (active)      → Understand the current feature state
```

**Rule**: Never write code until you have read at minimum `project-context.md` and `project-roadmap.md`. Read `project-discussion.md` when you need deeper context on WHY decisions were made.

> ⚠️ **Every new context**: AI agents MUST re-read `docs/mastery-compact.md` at the start of every new context window or session — not just the first one. The framework rules, autonomy boundaries, and verification requirements must be fresh in context before any work begins.

> 📝 **Need a document template?** Load the specific template from `docs/mastery.md` — search for the heading (e.g., "### 4. Discussion Document"). Do NOT load the full file for rules — use this compact variant.

> 🔄 **Fallback**: If `docs/mastery-compact.md` does not exist in the project, fall back to reading `docs/mastery.md` directly. The compact file is preferred for token efficiency, but the full file contains all the same rules. Never skip context loading because the compact variant is missing.

### Determining Current State

To figure out what's in progress:

1. Check `project-roadmap.md` — look for features marked 🟡 IN PROGRESS
2. Open that feature's docs in order: `discussion → architecture → tasks → changelog`
3. In the tasks doc, find the last checked checkbox — that's where work stopped
4. In the changelog doc, read the most recent entries — that's what happened last
5. Check the git branch — `git log --oneline -10` on the feature branch shows recent commits

### Autonomy Boundaries

AI agents MUST follow these rules about what they can and cannot do independently:

| Action | AI Can Do Autonomously? | Requires Human Approval |
|---|---|---|
| Read any project document | ✅ Yes | — |
| Write code within an active task | ✅ Yes | — |
| Check off completed tasks | ✅ Yes | — |
| Log entries in changelog | ✅ Yes | — |
| Create commits on feature branch | ✅ Yes | — |
| Push to feature branch | ✅ Yes | — |
| Update project changelog | ✅ Yes | — |
| Create a new feature's discussion doc | ✅ Yes | — |
| Amend architecture (minor, logged) | ✅ Yes | — |
| Modify architecture (structural change) | ❌ No | ✅ Must discuss first |
| Skip any lifecycle stage | ❌ No | ✅ Never — no exceptions |
| Self-approve a non-lightweight feature's plan (Stage 4) | ❌ No | ✅ Always human-approved |
| Edit `project-discussion.md` after COMPLETE | ❌ No | ✅ Always human-approved |
| Update roadmap feature status markers (🔴/🟡/🟢) | ✅ Yes | — |
| Append entries to `project-changelog.md` | ✅ Yes | — |
| Merge to main | ❌ No | ✅ Always human-approved |
| Delete any branch | ❌ No | ✅ Always human-approved |
| Delete or overwrite existing docs | ❌ No | ✅ Always human-approved |
| Change project-context.md | ❌ No | ✅ Always human-approved |
| Reorder features in roadmap | ❌ No | ✅ Always human-approved |
| Add new dependencies/packages | ❌ No | ✅ Always human-approved |
| Edit docs/mastery.md | ❌ No | ✅ Never — the project copy is read-only, no exceptions |
| Perform verification cross-check | ✅ Yes | — |
| Skip a required cross-check | ❌ No | ✅ Never — no exceptions |

### Verification Cross-Checks

AI agents MUST verify their work against planning docs — not just check that tests pass. A cross-check is a structured self-audit that catches drift between what was planned and what was built.

#### When to Cross-Check

| Trigger | What to Verify |
|---|---|
| After planning docs created | Discussion ↔ architecture ↔ tasks ↔ testplan alignment |
| Every ~5 build tasks, or after any high-complexity/high-risk task | Code matches architecture, tasks checked off, changelog current |
| Before requesting merge | Full cross-check — all items below |

#### What to Verify

1. **Architecture ↔ Code** — Does the implementation match the architecture doc? Are deviations documented?
2. **Tasks ↔ Code** — Are completed tasks reflected in code? Are checkboxes updated?
3. **Testplan ↔ Tests** — Do testplan cases have corresponding tests? Are statuses filled in?
4. **Changelog ↔ Session** — Does the changelog reflect what happened this session?
5. **Dependencies ↔ Architecture** — Are only approved dependencies used?

#### Handling Gaps

- Fix gaps autonomously — update checkboxes, fill testplan statuses, log deviations
- Log the cross-check in the changelog: "Cross-check performed: N gaps found, N fixed"
- Escalate to human for architectural deviations or blocking issues

### MCP-Enhanced Workflow

If an MCP server is configured for a Mastery project, AI agents can use structured tool calls as an alternative to reading raw files. MCP is **optional** — the file-based workflow in Context Loading Order remains fully functional without it.

| Task | Without MCP | With MCP |
|---|---|---|
| Load project context | Read markdown files in order | Call status/overview tools for structured data |
| Find active feature | Parse roadmap for 🟡 markers | Call roadmap tool for parsed feature list |
| Check task progress | Read task file, count checkboxes | Call task tool for structured status |
| Search across docs | Grep through files | Call search tools with queries |

**Guidance**: Prefer MCP tools for status overviews and navigation. Always verify against raw docs when making changes — the files are the source of truth, not the MCP responses.

### Session Handoff Protocol

When ending a session (human-to-AI, AI-to-human, or AI-to-AI), the outgoing party MUST:

1. **Update the changelog** — log what was done in this session
2. **Update task checkboxes** — mark completed items, note partial progress
3. **Leave a "Session Note"** at the top of the changelog:

```markdown
### Session Note — YYYY-MM-DD
- **Who**: [Human / AI Agent Name]
- **Duration**: [Approximate time or "async"]
- **Worked On**: [Brief description]
- **Stopped At**: [Exact task ID, e.g., "B.3 — halfway through validation logic"]
- **Blockers**: [Any issues preventing progress, or "None"]
- **Next Steps**: [What the next session should pick up]
```

### AI Communication Style

When an AI agent is working within this framework:
- **Ask before assuming** — if a requirement is ambiguous, ask. Don't guess.
- **Reference docs** — when making decisions, cite which doc informed the choice.
- **Explain deviations** — if you deviate from the architecture or tasks, log WHY in the changelog before proceeding.
- **Never silently skip** — if a step seems unnecessary, say so and get confirmation. Don't just skip it.
- **Ask about testing** — if a `testplan.md` exists for the active feature, ask the developer if they want test auditing (TC coverage check) during the build stage. Don't assume.
- **Respect autonomy boundaries** — before any action, check the Autonomy Boundaries table above. Run a Verification Cross-Check before declaring a phase complete.

---

## 🚀 Project Initialization

When starting a new project with Mastery, the very first thing you do is **discuss the project**.

1. **Set Up Docs Skeleton** — Create `docs/` with `mastery.md`, `mastery-compact.md`, `project-discussion.md`, `features/`, `references/`
2. **Discuss the Project** — Create `project-discussion.md`, have a thorough conversation covering: what, why, who, tech stack, architecture, constraints, features, definition of done. Mark COMPLETE when decided.
3. **Create Project Context** — Distill discussion into `project-context.md` (single source of truth)
4. **Generate AGENTS.md** — Create at project root using Template #12 (see full `mastery.md`). Derived from `project-context.md`.
5. **Build the Roadmap** — Create `project-roadmap.md`: list features, order by dependency, assign sequence numbers
6. **Create Project Changelog** — Create `project-changelog.md` with empty `[Unreleased]` section
7. **Start Feature 01** — Follow the Feature Lifecycle below

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐
│   1. DISCUSS     │    │  2. FORMALIZE    │    │   3. PLAN        │    │  4. BUILD    │
│   the project    │───▶│  project-context │───▶│  project-roadmap │───▶│  Feature 01  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────┘
```

---

## 📂 Document Ecosystem

```
AGENTS.md                           # 🤖 AI agent orientation (project root)
SKILL.md                            # ⚡ AI agent skill (optional)
llms.txt                            # ⚡ Machine-readable summary (optional)
docs/
├── mastery.md                  # 🏛️ Full framework (with templates)
├── mastery-compact.md          # 📦 Compact framework (this file — rules only, no templates)
├── project-discussion.md       # 💬 WHY and WHAT
├── project-context.md          # 🎯 Project identity
├── project-motto.md            # 🧭 Project guardrails — DO/DON'T for agents
├── project-roadmap.md          # 🗺️ Feature priorities and progress
├── project-changelog.md        # 📝 Shipped features log
├── features/                   # 📁 Per-feature folders
│   └── XX-feature-name/
│       ├── discussion.md / architecture.md / tasks.md
│       ├── testplan.md / api.md (if needed) / research.md (if needed) / motto.md / changelog.md
│       ├── review.md / lightweight.md (if lightweight)
│       └── summary.md (retroactive only)
└── references/                 # 📁 ADRs, specs, guides
```

### Document Roles

| Document | Purpose | When Created |
|---|---|---|
| **AGENTS.md** | AI agent orientation | After project-context.md |
| **SKILL.md** | Domain knowledge packaging (optional) | When project has domain expertise |
| **llms.txt** | Machine-readable summary (optional) | When publicly discoverable |
| **mastery.md** | Full process framework with templates | Once (project init) |
| **mastery-compact.md** | Compact framework for AI loading | Once (project init) |
| **project-discussion.md** | Project-level WHY and WHAT | First (project init) |
| **project-context.md** | Project identity — WHAT | After discussion COMPLETE |
| **project-motto.md** | Project guardrails — DO/DON'T boundaries | After context + roadmap created |
| **project-roadmap.md** | Feature plan — WHEN | After discussion COMPLETE |
| **project-changelog.md** | Shipped features history | After first feature ships |
| **discussion.md** | Feature requirements conversation | Start of every feature |
| **architecture.md** | Technical design | After discussion |
| **tasks.md** | Implementation checklist | After architecture |
| **testplan.md** | Test cases & acceptance criteria | Alongside tasks |
| **api.md** | Interface contracts (conditional) | When feature has external interfaces |
| **research.md** | Structured research findings (conditional) | When significant knowledge gaps exist |
| **changelog.md** | Build-phase running log | During build |
| **motto.md** | Feature guardrails — DO/DON'T for this feature | After approval, before Build |
| **review.md** | Post-implementation retrospective | After merge |
| **lightweight.md** | Single combined doc (conditional) | When ALL lightweight criteria met |

### Which Docs Are Required?

All docs are **required** except: `SKILL.md` (conditional), `llms.txt` (conditional), `api.md` (only for features with external interfaces), `research.md` (only when significant knowledge gaps exist), `summary.md` (only for retroactive mid-project adoption), `lightweight.md` (only when ALL lightweight eligibility criteria are met). Both `project-motto.md` and feature `motto.md` are **always required** — they are the corrective reference when agents drift.

---

## 🔄 The Workflow — Feature Lifecycle

Every feature flows through **7 stages** with clear entry/exit conditions.

```
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │1.DISCUS│▶│2.DESIGN│▶│3.PLAN  │▶│4.APPROV│▶│5.BUILD │▶│6.SHIP  │▶│7.REFLEC│
  │  💬    │ │  🏗️    │ │  📋    │ │  ✅    │ │  🔨    │ │  🚀    │ │  🪞    │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
  discussion  architect.  tasks +    human     changelog  merged to  review +
              doc         testplan   signoff   updates    main       lessons
```

### Stage 1 — Discuss 💬

> **Entry**: Feature in roadmap → **Exit**: Discussion doc marked COMPLETE

**First action**: Read the previous feature's `review.md` and import any "Key Lessons to Carry Forward" into the new discussion's "Lessons from Previous Features" section (write "N/A — first feature" for feature #01).

Create `discussion.md`. Define requirements, current state, approach, edge cases, dependencies. If knowledge gaps exist, research before proceeding — document findings in the discussion doc or a separate `research.md`. Update iteratively until confident. Mark COMPLETE.

### Stage 2 — Design 🏗️

> **Entry**: Discussion COMPLETE → **Exit**: Architecture doc FINALIZED

Create `architecture.md`. Define file structure, data models, component design, data flow, trade-offs, config changes.

> **Architecture Amendments**: After finalization, minor amendments (renamed fields, adjusted signatures, small additions) can be logged in the changelog and applied. Structural changes (new components, changed data flow, different patterns) still require human approval.

### Stage 3 — Plan 📋

> **Entry**: Architecture FINALIZED → **Exit**: Tasks + testplan + api (if needed) created + feature branch

Create `tasks.md` with phased checklist (adapt phases to project type — always end with Testing + Docs phases). Create `testplan.md` with acceptance criteria and test cases. Create `api.md` if feature has external interfaces. Create `changelog.md` (empty). Create feature branch `feature/XX-feature-name` from latest `main`.

#### Phase Organization Guidance

| Project Type | Suggested Phases |
|---|---|
| **Web Application** | Data Layer → Business Logic → HTTP/API → UI → Testing → Docs |
| **CLI Tool** | Core Logic → Command Parsing → I/O → Error Handling → Testing → Docs |
| **Library/SDK** | Core API → Internal Utilities → Public Interface → Testing → Docs |
| **Data Pipeline** | Ingestion → Transformation → Validation → Output → Testing → Docs |
| **Mobile App** | Data/State → Core Logic → UI Components → Navigation → Testing → Docs |

### Stage 4 — Approve ✅

> **Entry**: All Stage 3 planning docs created → **Exit**: Human approval recorded in `tasks.md`

The explicit human signoff gate on the plan before any code is written. Reviewer reads discussion → architecture → tasks → testplan, raises blockers if any, then records approval as an `## Approval ✅` block at the top of `tasks.md` with their name, date, and notes.

> **Rules**: AI agents MUST NOT begin Stage 5 (Build) until the Approval block is filled. Lightweight features self-approve in `lightweight.md`. Hotfixes skip Approve entirely.

**After approval, create `motto.md`** — the feature's corrective reference (Template #19 in full `mastery.md`). Distill discussion + architecture + tasks into a short DO/DON'T doc (~20-40 lines). If writing the motto reveals gaps, fix planning docs first. AI agents MUST create `motto.md` before starting Build.

### Stage 5 — Build 🔨

> **Entry**: Plan approved (Stage 4 signoff), motto created → **Exit**: All tasks checked, all tests pass

Execute tasks phase by phase, check off items, log changes in changelog, add session notes, commit frequently, run tests at checkpoints, push to feature branch.

### Stage 6 — Ship 🚀

> **Entry**: All tasks complete, all tests pass → **Exit**: Merged to main (human-approved)

Self-review diffs. Security review (auth gaps, input validation, hardcoded secrets, PII exposure). Final test pass. Human approval. Merge to main. Update `project-changelog.md`. Update README/public docs if user-facing info changed. Create release with tag and notes if versioned. Push main. **Keep the feature branch** (never delete).

### Stage 7 — Reflect 🪞

> **Entry**: Feature merged → **Exit**: Review doc completed

Create `review.md`. Document what went well, what went wrong, what was learned. Mark 1-3 key lessons to carry forward into the next feature's discussion. Update roadmap (mark feature 🟢 Complete).

---

## 🪶 Lightweight Feature Variant

For **planned trivial** changes (docs-only, config-only, no architecture decisions). A single `lightweight.md` replaces all standard planning docs. Lightweight features do **not** create a separate `motto.md` — the scope is trivial enough that guardrails are unnecessary.

### Eligibility (ALL must be true)

1. No new code logic
2. No architectural decisions
3. Well-understood scope (few sentences)
4. Low risk
5. Self-contained

If **any** criterion is not met, use the full lifecycle.

### Rules

- Still uses feature branches — no direct commits to main
- Still requires human approval for merge
- Feature branches never deleted
- If scope grows, upgrade to full lifecycle (lightweight.md becomes discussion.md)

---

## 📛 Document Naming Convention

| Element | Format | Example |
|---|---|---|
| **Feature folder** | `XX-feature-name` | `01-project-setup`, `02-auth-system` |
| **Doc filenames** | Simple type name | `discussion.md`, `architecture.md`, `tasks.md` |
| **Branch name** | `feature/XX-feature-name` | `feature/02-auth-system` |

Features numbered in **dependency order** defined in `project-roadmap.md`.

---

## 🌿 Git Branching Strategy

```
main ─────●────●────●────●──────▶
           \       ↗  \       ↗
            ●─●─●─●    ●─●─●─●
           feature/     feature/
           01-name      02-name
           (kept)       (kept)
```

| Rule | Detail |
|---|---|
| **main** | Always deployable. Only receives merges. |
| **feature/XX-name** | Created from latest `main`. One per feature. |
| **hotfix/description** | Created from latest `main`. Critical fixes only. |
| **Never delete** | All branches kept forever. |

```bash
# Start feature          # Merge feature (human-approved)
git checkout main         git checkout main
git pull origin main      git pull origin main
git checkout -b feature/  git merge feature/XX-name
  XX-feature-name         git push origin main
```

---

## ✍️ Commit Message Convention

```
type(scope): short description
```

| Type | When |
|---|---|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code restructure — no behavior change |
| `test` | Adding or updating tests |
| `chore` | Build, config, tooling, dependencies |
| `perf` | Performance improvement |
| `hotfix` | Critical production fix |

Scope = feature name or module (e.g., `auth`, `api`, `docs`).

---

## 🔁 Resuming Work

### For AI Agents

1. Read `docs/mastery-compact.md` — reload framework rules (mandatory every session)
2. Read `docs/project-context.md` — refresh on what this project is
3. Read `docs/project-roadmap.md` — find the 🟡 IN PROGRESS feature
4. Read that feature's `changelog.md` — latest Session Note
5. Read that feature's `tasks.md` — find last checked checkbox
6. Continue from the exact task where work stopped
7. Add a new Session Note to the changelog when you start

### For Humans

1. Check `project-roadmap.md` for current status
2. Open active feature's `tasks.md` and `changelog.md`
3. If an AI was working, review its commits: `git log --oneline -20`
4. Continue from where things left off

---

## ✅ Definition of Done

### Feature Level

- [ ] All tasks checked off
- [ ] All acceptance criteria met
- [ ] All test cases pass
- [ ] Plan was approved at Stage 4 before Build started (approval entry in `tasks.md`)
- [ ] Changelog up to date
- [ ] Code committed and pushed to feature branch
- [ ] Human reviewed and approved merge
- [ ] Merged to main
- [ ] Review doc completed
- [ ] Roadmap updated (🟢 Complete)

### Code Level

- [ ] Runs without errors
- [ ] No known bugs introduced
- [ ] Follows project conventions
- [ ] No hardcoded secrets or environment-specific values
- [ ] Error handling for expected failure modes

### Documentation Level

- [ ] All feature docs complete and accurate
- [ ] Changelog reflects what actually happened
- [ ] Deviations from architecture documented
- [ ] Project changelog updated

---

## ⚡ Quick Reference

### Project Initialization

```
 1. Create docs/ skeleton (mastery.md, mastery-compact.md, project-discussion.md)
 2. Discuss → mark COMPLETE
 3. Create project-context.md
 4. Create AGENTS.md (project root)
 5. Create project-roadmap.md
 6. Create project-changelog.md
 7. Create project-motto.md (project guardrails — DO/DON'T)
 8. Start Feature 01
```

### Feature Lifecycle

```
 1. Read previous feature's review.md → carry forward lessons
 2. Create  XX-feature-name/discussion.md    → Discuss → mark COMPLETE   (Stage 1)
 3. Create  XX-feature-name/architecture.md  → Design → mark FINALIZED   (Stage 2)
 4. Create  XX-feature-name/tasks.md         → Plan tasks                (Stage 3)
 5. Create  XX-feature-name/testplan.md      → Define done               (Stage 3)
 6. Create  XX-feature-name/api.md           → If external interfaces    (Stage 3)
 7. Create  XX-feature-name/changelog.md     → Empty, ready              (Stage 3)
 8. Create  feature branch                                                (Stage 3)
 9. Human approval on plan → record in tasks.md                           (Stage 4)
10. Create  XX-feature-name/motto.md         → Feature guardrails        (after Stage 4)
11. Execute tasks, log in changelog                                       (Stage 5)
12. Run test plan → verify
13. Human approval → merge, keep branch                                   (Stage 6)
14. Create  XX-feature-name/review.md                                     (Stage 7)
15. Update  project-roadmap.md
```

> **Lightweight path**: If ALL lightweight criteria are met, use single `lightweight.md` instead.

### Document Quick Reference

| Need to... | Open this doc |
|---|---|
| Understand the full process + templates | `docs/mastery.md` |
| Understand framework rules (compact) | `docs/mastery-compact.md` (this file) |
| See project identity | `docs/project-context.md` |
| Correct a drifting agent (project) | `docs/project-motto.md` |
| See what's next | `docs/project-roadmap.md` |
| See project history | `docs/project-changelog.md` |
| Start/design/plan a feature | `docs/features/XX/discussion.md` → `architecture.md` → `tasks.md` |
| Correct a drifting agent (feature) | `docs/features/XX/motto.md` |

### AI Agent Quick Start

```
1.  Read mastery-compact.md (this file — mandatory every session)
2.  Read project-motto.md (project guardrails — your DO/DON'T reference)
3.  Read project-discussion.md (if you need WHY context)
4.  Read project-context.md
5.  Read project-roadmap.md
6.  Find the 🟡 IN PROGRESS feature
7.  Read its changelog (latest session note)
8.  Read its tasks (find where work stopped)
9.  Before starting Build: verify the Stage 4 Approval entry exists in tasks.md
10. Before starting Build: read the feature's motto.md (or create it if missing)
11. Continue from there
12. Log a session note when done
```

---

> *"Think. Design. Plan. Build. Ship. Reflect. Repeat."*

---

*Mastery Framework v3.7 (Compact)*
*Works for any project. Any language. Any stack. Any team. Human or AI.*

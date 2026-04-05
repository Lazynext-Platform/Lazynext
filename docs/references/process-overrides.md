# Process Overrides — Lazynext

> **Purpose**: Document project-specific adjustments to the Mastery framework.
> **Rule**: Never edit `docs/mastery.md` directly — document overrides here instead.
> **Last Updated**: 2026-04-05

---

## Override 1: Dual Framework — Blueprint + Mastery

**What**: Lazynext uses **two complementary frameworks**:
- **Blueprint** (`blueprint.mastery.md`) — governs UI design process (7 stages: Discover → Explore → Define → Create → Refine → Handoff → Reflect)
- **Mastery** (`docs/mastery.md`) — governs development process (6 stages: Discuss → Design → Plan → Build → Ship → Reflect)

**Why**: Blueprint was adopted first and has already completed the full design lifecycle for all 38 features. Mastery is being adopted for the development lifecycle. They are complementary, not competing.

**How they work together**:

```
Blueprint Design                          Mastery Development
─────────────────                         ──────────────────
1. Discover  ──┐                          1. Discuss  ← feeds FROM design-brief.md
2. Explore     │                          2. Design   ← feeds FROM design-spec.md + design-handoff.md
3. Define      │ (already complete        3. Plan
4. Create      │  for all 38 features)    4. Build
5. Refine      │                          5. Ship
6. Handoff   ──┘                          6. Reflect
7. Reflect
```

**Rule**: When starting a Mastery discussion for a feature that has Blueprint design docs, reference them:
- `design-brief.md` → informs Discussion (functional requirements, constraints)
- `design-spec.md` → informs Architecture (component design, data flow)
- `design-handoff.md` → informs Tasks (implementation notes, verification checklist)
- `mockups/*.html` → visual reference during Build

---

## Override 2: Feature Numbering Shared Between Frameworks

**What**: Both Blueprint and Mastery use the same feature numbering (01-38). Feature folders contain both design docs (from Blueprint) and development docs (from Mastery) in the same directory.

**Why**: Avoids confusion and duplication. One feature = one folder = one truth.

**Resulting folder structure per feature**:

```
docs/features/XX-feature-name/
├── design-brief.md           # Blueprint — Define stage
├── design-spec.md            # Blueprint — Create/Refine stage
├── design-review.md          # Blueprint — Refine stage
├── design-handoff.md         # Blueprint — Handoff stage
├── mockups/                  # Blueprint — HTML+Tailwind mockups
│   └── feature-name.html
├── discussion.md             # Mastery — Discuss stage
├── architecture.md           # Mastery — Design stage
├── tasks.md                  # Mastery — Plan stage
├── testplan.md               # Mastery — Plan stage
├── changelog.md              # Mastery — Build stage
└── review.md                 # Mastery — Reflect stage
```

---

## Override 3: Design System as Shared Reference

**What**: `docs/design-system.md` serves both frameworks — Blueprint references it for design tokens, Mastery references it for implementation accuracy.

**Rule**: Any changes to the design system must be reflected in BOTH `docs/design-system.md` AND `tailwind.config.ts`. These two files must always be in sync.

---

## Override 4: AI Agent Context Loading Includes Blueprint

**What**: AI agents working on UI features must load Blueprint context in addition to Mastery context.

**Context loading order for UI work**:

```
1. docs/mastery-compact.md           → Mastery rules
2. docs/project-context.md           → Project identity
3. docs/project-roadmap.md           → Progress tracking
4. docs/design-system.md             → Design tokens (UI work)
5. docs/features/XX/design-brief.md  → Requirements (UI work)
6. docs/features/XX/design-spec.md   → Design decisions (UI work)
7. docs/features/XX/design-handoff.md → Implementation notes (UI work)
8. docs/features/XX/tasks.md         → Current task (if exists)
9. docs/features/XX/changelog.md     → Session context (if exists)
```

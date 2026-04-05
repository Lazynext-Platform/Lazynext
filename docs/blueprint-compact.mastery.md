# BLUEPRINT — Compact Reference

> Condensed version of `blueprint.mastery.md` for AI agent context loading.
> Full version: `/blueprint.mastery.md`
> Version: 1.1 · March 2026

---

## Philosophy

1. Discover before you design
2. Constrain before you create
3. The design system is the AI's brain
4. Review every AI output
5. Minimize cognitive load
6. Document your decisions
7. Iterate, don't restart
8. Direction before detail

---

## Design Lifecycle (7 Stages)

```
1.DISCOVER → 2.EXPLORE → 3.DEFINE → 4.CREATE → 5.REFINE → 6.HANDOFF → 7.REFLECT
```

| Stage | Purpose | Key Output | Skip? |
|---|---|---|---|
| **1. Discover** | Understand the problem | Design requirements | Never |
| **2. Explore** | Research patterns | Annotated references | Simple features |
| **3. Define** | Constrain for AI | Design brief | Never |
| **4. Create** | AI generates design | HTML+Tailwind files | Never |
| **5. Refine** | Human reviews + AI iterates | Approved design | Never |
| **6. Handoff** | Document decisions | Design spec / code | At high fidelity, code is the spec |
| **7. Reflect** | Learn + update system | Review notes | Trivial changes |

### Flow Patterns

- **Linear**: 1→2→3→4→5→6→7
- **Create–Refine Loop**: 3→4→5 (loop)→6
- **Lightweight**: 1→3→4→5→6
- **Multi-Fidelity**: 3→(4→5 wireframe)→(4→5 mockup)→(4→5 UI)→6

---

## Fidelity Levels

| Level | What | Use When |
|---|---|---|
| **Wireframe** | Structure only — gray boxes, no colors | Validating layout |
| **Mockup** | Styled with design system tokens | Validating visual design |
| **Production UI** | Ship-ready responsive code | Design IS the deliverable |

---

## Feature Folder Structure

```
docs/features/XX-feature-name/
├── design-brief.md        # Define stage — requirements
├── design-spec.md         # Create/Refine — what was designed
├── design-review.md       # Refine — review feedback
├── design-handoff.md      # Handoff — implementation checklist
└── mockups/               # Create — HTML+Tailwind files
```

---

## Cognitive Load Principles

1. **Information Density**: ≤7 content groups per view, one primary task
2. **Visual Hierarchy**: One focal point, obvious primary action, clear reading order
3. **Progressive Disclosure**: Show essentials first, details on demand
4. **Interaction Cost**: Minimize steps, inputs, and decisions per task

### Review Checklist

- [ ] ≤7 content groups visible without scrolling
- [ ] Clear visual hierarchy — primary action obvious
- [ ] No competing focal points
- [ ] Progressive disclosure for complex info
- [ ] Labels and icons immediately understandable

---

## Accessibility Requirements

### Contrast & Color
- Normal text: 4.5:1 minimum
- Large text (≥18px bold / ≥24px): 3:1 minimum
- UI components: 3:1 minimum
- Never use color as sole information carrier

### Interactive Elements
- Minimum touch target: 44×44px
- Visible focus states on all interactive elements
- Form inputs must have visible labels
- Error states must include descriptive text

### Structure
- Logical heading hierarchy (h1→h2→h3, no skips)
- Reading order matches visual order
- Animations respect `prefers-reduced-motion`

---

## Responsive Strategy

Mobile-first: default styles target smallest screen, layer up with breakpoints.

| Breakpoint | Tailwind | Width | Behavior |
|---|---|---|---|
| Default | — | <640px | Single column, essential content |
| `sm` | sm: | ≥640px | Two columns possible |
| `md` | md: | ≥768px | Sidebar visible |
| `lg` | lg: | ≥1024px | Full desktop layout |
| `xl` | xl: | ≥1280px | Max-width container |

---

## AI Design Protocol

### On Every Design Task

1. Read `docs/design-system.md` — reload tokens and patterns
2. Read the feature's `design-brief.md` — requirements
3. Check `design-review.md` — outstanding feedback
4. Check `design-spec.md` — current state
5. Generate HTML+Tailwind, mobile-first
6. Self-review against Cognitive Load + Accessibility checklists
7. Present to human for review

### Cross-Page Consistency Rules

- Same page = same layout structure
- Token references, never hardcoded values
- Component patterns from design system, not invented per-page
- Spacing rhythm consistent across pages

---

## Quick Reference

| I want to… | Go to… |
|---|---|
| See design tokens/patterns | `docs/design-system.md` |
| Start a new design | `docs/features/XX-name/design-brief.md` |
| See what was designed | `docs/features/XX-name/design-spec.md` |
| Review a design | `docs/features/XX-name/design-review.md` |
| Check handoff status | `docs/features/XX-name/design-handoff.md` |
| See AI-generated files | `docs/features/XX-name/mockups/` |
| See full framework | `blueprint.mastery.md` |

---

> *"Discover. Explore. Define. Create. Refine. Handoff. Reflect."*

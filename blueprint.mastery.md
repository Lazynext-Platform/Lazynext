# 🎨 BLUEPRINT — Design Process Framework for AI Agents

> **A design process framework for AI coding agents.**
> Every design starts with discovery, gets explored and defined, then AI generates it — humans review, iterate, and approve.
> Works with any UI project. Any styling approach. Any AI coding agent. Standalone or alongside any development process.
> **Version**: 1.1 · March 2026
>
> ⚠️ **THIS FILE IS READ-ONLY** in every project that uses this framework. The copy at `docs/blueprint.mastery.md` must never be edited — it stays identical across all projects. The only place this file is developed and improved is in its **origin repository**. Project-specific design decisions belong in your design system doc. Feature-specific design decisions belong in design briefs.

---

## 📋 Table of Contents

- [Philosophy](#-philosophy)
- [The Design Lifecycle](#-the-design-lifecycle)
  - [Stage 1: Discover](#stage-1-discover--understand-the-design-problem)
  - [Stage 2: Explore](#stage-2-explore--research-and-gather-references)
  - [Stage 3: Define](#stage-3-define--constrain-and-specify)
  - [Stage 4: Create](#stage-4-create--generate-the-design)
  - [Stage 5: Refine](#stage-5-refine--review-and-iterate)
  - [Stage 6: Handoff](#stage-6-handoff--approve-and-document)
  - [Stage 7: Reflect](#stage-7-reflect--learn-and-update)
  - [Flow Patterns](#flow-patterns)
  - [Project Integration](#project-integration)
    - [Feature Folder Structure](#feature-folder-structure)
    - [Workflow: When to Trigger Blueprint](#workflow-when-to-trigger-blueprint)
    - [Using with MASTERY.md](#using-with-masterymd)
  - [Stage Summary](#stage-summary)
- [Fidelity Levels](#-fidelity-levels)
  - [Choosing Your Path](#choosing-your-path)
  - [Valid Paths](#valid-paths)
- [Cognitive Load](#-cognitive-load)
  - [Design Review Checklist](#design-review-checklist)
- [Document Templates](#-document-templates)
  - [Design System Template](#design-system-template)
  - [Design Brief Template](#design-brief-template)
  - [Design Specification Template](#design-specification-template)
  - [Design Review Template](#design-review-template)
  - [Design Handoff Checklist](#design-handoff-checklist)
- [Responsive Design](#-responsive-design)
- [Accessibility](#-accessibility)
- [Component Patterns](#-component-patterns)
- [Project Setup](#-project-setup)
- [Adopting Blueprint Mid-Project](#-adopting-blueprint-mid-project)
- [Resuming Design Work](#-resuming-design-work)
- [Definition of Done](#-definition-of-done)
- [AI Design Protocol](#-ai-design-protocol)
- [Quick Reference](#-quick-reference)
- [Changelog](#-changelog)

---

## 💡 Philosophy

1. **Discover before you design.** Understand the problem before generating pixels.
2. **Constrain before you create.** AI agents need explicit rules, not open-ended prompts.
3. **The design system is the AI's brain.** Without it, every session starts from scratch.
4. **Review every AI output.** Unreviewed designs drift from intent.
5. **Minimize cognitive load.** Every design should reduce the user's mental effort, not increase it.
6. **Document your decisions.** Design rationale is as important as the design itself.
7. **Iterate, don't restart.** Structured feedback loops beat starting over.
8. **Direction before detail.** Explore visual directions before polishing one. Refining the wrong direction wastes effort.

Blueprint makes the design process as disciplined as the development process — whether the designer is human, AI, or both.

---

## 🔄 The Design Lifecycle

Every UI design flows through **7 stages** with clear entry and exit criteria. The lifecycle structures how AI coding agents generate designs and how humans review them.

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │1.DISCOVER│─▶│2.EXPLORE │─▶│3.DEFINE  │─▶│4.CREATE  │─▶│5.REFINE  │─▶│6.HANDOFF │─▶│7.REFLECT │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
   understand    research       constrain     generate      review        approve        learn
   the problem   & reference    & specify     the design    & iterate     & document     & improve
```

The stages are sequential by default. Some stages can be skipped for simple work. Stages 4–5 (Create–Refine) often loop as the human provides feedback and the AI iterates.

**The core principle**: Design goes wrong when early stages are skipped. Discover (1) and Define (3) should never be skipped — they prevent AI agents from guessing requirements and producing inconsistent results.

---

### Stage 1: Discover — Understand the Design Problem

> **Entry**: Feature identified in roadmap, discussion started → **Exit**: Design requirements captured, constraints documented

**Purpose**: Understand who the design is for, what problem it solves, and what constraints apply.

**Activities**:
- Human identifies the UI need in the feature discussion
- Capture: target users, use cases, must-have elements, reference pages, constraints
- AI can help research user patterns and surface relevant precedents

**Key Output**: Design requirements section in the feature's `discussion.md` (or design brief if using the template).

**Who**: Human (primarily) — AI can help research user patterns.

**Skippable?**: Never — skipping discovery leads to UI that solves the wrong problem.

---

### Stage 2: Explore — Research and Gather References

> **Entry**: Discovery complete, requirements documented → **Exit**: Reference patterns identified, design direction chosen

**Purpose**: Research existing patterns, UI precedents, and reference implementations before designing.

**Activities**:
- Gather reference screenshots, links, and pattern examples
- Identify existing UI patterns that solve similar problems
- Analyze competitor approaches — note what works and what doesn't
- AI can search for patterns; human curates and selects direction

> **AI Reference Gathering — Practical Limitations**: AI agents often cannot fetch live websites (bot protection, CAPTCHAs, JS-rendered pages). Instead of relying on web scraping, prefer: (1) verbal descriptions of reference patterns ("Airbnb-style card grid with large photos"), (2) AI training knowledge of common UI patterns, (3) human-provided screenshots or links in the design brief. The AI's knowledge of established design patterns is usually sufficient without live access.

**Key Output**: Annotated references (links, screenshots, pattern notes) — can be in the design brief or discussion doc.

**Who**: Human and AI — AI can search for patterns, human curates and selects.

**Skippable?**: Yes, for simple or familiar UI patterns where the approach is obvious. Minimal for small changes.

---

### Stage 3: Define — Constrain and Specify

> **Entry**: Exploration done (or skipped for simple features) → **Exit**: Design brief complete — fidelity chosen, tokens selected, layout specified

**Purpose**: Translate requirements and research into specific, actionable design constraints for the AI agent.

**Activities**:
- Create the design brief document
- Specify which design system tokens apply (colors, typography, spacing)
- Choose the fidelity level: wireframe, mockup, or production UI
- Define the layout structure, required states, and interactions
- Set responsive behavior expectations
- AI can help draft the brief if given clear requirements

**Key Output**: Completed design brief document (`design-brief.md`).

**Who**: Human (defines constraints) — AI can help draft the brief if given requirements.

**Skippable?**: Never — without explicit constraints, AI agents guess everything and produce inconsistent results.

---

### Stage 4: Create — Generate the Design

> **Entry**: Design brief complete, AI has access to design system + brief → **Exit**: Design artifact generated at the specified fidelity level

**Purpose**: AI coding agent generates the actual design artifact based on the design system and brief.

**Activities**:
- AI loads the design system document (colors, typography, spacing, component patterns)
- AI reads the design brief (layout, states, interactions, target fidelity)
- AI generates HTML+Tailwind/CSS code at the specified fidelity level
- Human can also generate manually or provide sketches as starting context

**Key Output**: Generated design file(s) in `docs/features/XX-name/mockups/`.

**Who**: AI (primarily) — human provides the design system + brief as context.

**Skippable?**: Never — this is where the design is actually made.

---

### Stage 5: Refine — Review and Iterate

> **Entry**: Design artifact generated → **Exit**: Design approved by human — meets requirements, passes cognitive load check

**Purpose**: Human reviews the AI-generated design, provides structured feedback, AI iterates until approved.

**Activities**:
- Human reviews against: design system compliance, cognitive load guidelines, requirements from the brief, responsive behavior, accessibility basics
- Provide specific, actionable feedback (not "make it better" — say what and why)
- AI regenerates based on feedback
- Repeat until the design meets requirements and is approved

> **Creative Delegation**: When a human explicitly delegates creative freedom ("make it perfect, use your judgment"), the AI should still: (1) respect the design system tokens and guidelines, (2) document every creative choice made with rationale, (3) flag any additions or deviations from the brief, (4) present choices for approval rather than assuming final authority. Creative delegation ≠ creative autonomy — the AI makes informed decisions but the human retains final approval.

**Key Output**: Approved design artifact (may go through multiple iterations).

**Who**: Human reviews, AI iterates — collaborative loop.

**Skippable?**: Never — unreviewed AI output should not proceed to handoff.

---

### Stage 6: Handoff — Approve and Document

> **Entry**: Design approved after review → **Exit**: Design specification written, ready for implementation

**Purpose**: Formally document the approved design decisions so implementation is faithful to the design intent.

**Activities**:
- Create design specification: layout rationale, token usage, component patterns, responsive behavior, states, accessibility requirements
- At production fidelity, the approved code IS the handoff — document any nuances
- At wireframe/mockup fidelity, the spec guides the implementation phase
- AI drafts the spec from the approved design; human verifies accuracy

**Key Output**: Design specification document — or the approved production code itself.

**Who**: AI drafts spec from the approved design, human verifies.

**Skippable?**: Partially — at production fidelity, the code is the spec. At wireframe/mockup fidelity, a brief spec is needed to guide implementation.

---

### Stage 7: Reflect — Learn and Update

> **Entry**: Feature shipped (design implemented in production) → **Exit**: Lessons captured, design system updated if needed

**Purpose**: Review what worked and what didn't in the design process, update the design system with any new patterns.

**Activities**:
- Note design decisions that worked well and patterns worth reusing
- Identify cognitive load issues found late (should have been caught earlier)
- Log design system gaps discovered during implementation
- Update the design system with new patterns or refined tokens

**Key Output**: Design review notes, design system updates.

**Who**: Human and AI — collaborative review.

**Skippable?**: Yes, for trivial changes. Recommended for any feature that revealed new patterns or design system gaps.

---

### Flow Patterns

The lifecycle supports several flow patterns depending on the feature's complexity and familiarity.

#### Linear Flow (Standard)

The default path for most features — each stage completes before the next begins.

```
1. Discover → 2. Explore → 3. Define → 4. Create → 5. Refine → 6. Handoff → 7. Reflect
```

#### Create–Refine Loop

The most common iteration pattern. Human reviews in Stage 5 and provides feedback; AI regenerates in Stage 4. Repeat until approved.

```
                          ┌──────────────┐
                          │              │
                          ▼              │
3. Define → 4. Create → 5. Refine ──────┘ → 6. Handoff
                          (loop until approved)
```

#### Define–Explore Loop

Constraints reveal gaps in research. Stage 3 loops back to Stage 2 to fill knowledge gaps before proceeding.

```
              ┌──────────────┐
              │              │
              ▼              │
1. Discover → 2. Explore → 3. Define ──┘ → 4. Create
              (loop if gaps found)
```

#### Multi-Fidelity Flow

When a feature uses multiple fidelity levels (e.g., wireframe → mockup → production UI), Stages 4–5 repeat for each pass. The Define stage (3) sets the full fidelity plan.

```
3. Define (fidelity plan: wireframe → mockup → UI)
    │
    ├─▶ 4. Create (wireframe) → 5. Refine (approve wireframe)
    ├─▶ 4. Create (mockup)    → 5. Refine (approve mockup)
    └─▶ 4. Create (prod UI)   → 5. Refine (approve UI) → 6. Handoff
```

#### Lightweight Flow

For simple, well-understood UI changes — skip Explore (2) and minimize Reflect (7).

```
1. Discover → 3. Define → 4. Create → 5. Refine → 6. Handoff
```

Use when: the UI pattern is familiar, scope is small, and no research is needed. If uncertainty surfaces during Define, upgrade to the standard flow and add Explore.

#### Direction Exploration Flow

When the visual direction is uncertain, create multiple design versions with different aesthetic identities before committing to one. This is distinct from the Create–Refine loop (which iterates within the same direction).

```
3. Define (brief specifies: explore directions)
    │
    ├─▶ 4. Create (Direction A — e.g., light/minimal)  → 5. Refine (evaluate)
    ├─▶ 4. Create (Direction B — e.g., dark/premium)   → 5. Refine (evaluate)
    │
    └─▶ Human selects direction → 4. Create (polish chosen direction) → 5. Refine → 6. Handoff
```

Use when: the brand personality is undefined, multiple visual styles could work, or stakeholders need to see options before deciding. The brief should state "explore directions" and describe 2–3 possible styles. Each direction gets a separate mockup file (see [Mockup File Naming](#mockup-file-naming)).

---

### Project Integration

Blueprint works with any development process. It manages the **design** side of feature development — your project's own workflow handles requirements, planning, building, and shipping.

**Non-UI features**: Skip Blueprint entirely. Not every feature has UI — Blueprint only applies when there's something to design.

#### Feature Folder Structure

Design documents live alongside other feature docs:

```
docs/features/XX-feature-name/
├── design-brief.md        # Blueprint — design input (Define stage)
├── design-spec.md         # Blueprint — design output (Create/Refine stages)
├── design-review.md       # Blueprint — review feedback (Refine stage)
├── design-handoff.md      # Blueprint — handoff checklist (Handoff stage)
├── mockups/               # Blueprint — AI-generated wireframes/mockups/UI (Create stage)
│   ├── page.html              # V1 — first version
│   ├── page-v2-variant.html   # V2 — direction variant (e.g., dark-premium)
│   └── page-v3-refined.html   # V3 — polished chosen direction
└── ...                    # Other feature docs from your project's process
```

The design system lives at project level, not per-feature:

```
docs/
├── blueprint.mastery.md   # Framework (read-only)
├── design-system.md       # Project design system (shared across all features)
└── features/              # Per-feature docs including Blueprint docs
```

#### Workflow: When to Trigger Blueprint

| Project Activity | Blueprint Trigger | Blueprint Action |
|---|---|---|
| Discussing a new feature | "This feature has UI" | Start Discover — note design requirements |
| Architecture / technical design | UI components identified | No Blueprint action yet — architecture is technical |
| Starting design work | Feature scoped, requirements known | Run Blueprint lifecycle: Explore → Define → Create → Refine → Handoff |
| Planning implementation tasks | Design spec available | Reference design spec for UI implementation tasks |
| Building the feature | Loading AI context | AI loads `design-system.md` + `design-spec.md` as context |
| QA / review | Visual QA | Compare implementation against design spec at key breakpoints |
| Retrospective / reflection | Design learnings | Update design system with new patterns; run Blueprint's Reflect stage |

#### Using with MASTERY.md

If your project uses [MASTERY.md](https://github.com/raiworks/mastery.md), Blueprint drives **Stage 2 (Design)** for features with UI:

| Mastery Stage | Blueprint's Role |
|---|---|
| **Discuss** | Design requirements surface naturally — Blueprint's Discover happens here |
| **Design** | **Blueprint drives this stage** — Explore, Define, Create, Refine, Handoff |
| **Plan** | Handoff outputs (design spec) feed into implementation task planning |
| **Build** | AI loads the design system as context while building production code |
| **Ship** | Design can be reviewed against the spec during final review |
| **Reflect** | Blueprint's Reflect stage folds into Mastery's feature reflection |

Design docs coexist with Mastery's feature docs (`discussion.md`, `architecture.md`, `tasks.md`, `testplan.md`, `changelog.md`) in the same feature folder.

---

### Stage Summary

| Stage | Purpose | Key Output | Skip? |
|---|---|---|---|
| **1. Discover** | Understand the problem | Design requirements | Never |
| **2. Explore** | Research patterns | Annotated references | Simple features |
| **3. Define** | Constrain for AI | Design brief | Never |
| **4. Create** | AI generates design | HTML+Tailwind files | Never |
| **5. Refine** | Human reviews + AI iterates | Approved design | Never |
| **6. Handoff** | Document decisions | Design spec / code | At high fidelity, code is the spec |
| **7. Reflect** | Learn + update system | Review notes | Trivial changes |

---

## 🎯 Fidelity Levels

Blueprint supports three independent fidelity levels for AI-generated design output. Each level controls the detail and polish of what the AI produces. Levels are **independent** — use any one, any combination, or all three per feature. There is no mandatory pipeline.

### The Three Levels

| Level | What AI Generates | Use When |
|---|---|---|
| **Wireframe** | Structure only — gray boxes, placeholder text, no colors or branding | Validating layout and information architecture |
| **Mockup** | Styled — real colors, typography, spacing from the design system | Validating visual design, cognitive load, and consistency |
| **Production UI** | Ship-ready — responsive, accessible, final code | The design IS the deliverable |

---

### Wireframe

A wireframe is **structure without style**. It validates layout, information hierarchy, and content placement before investing in visual design.

**What it includes**:
- Page/component layout structure (grid, sections, spacing)
- Content blocks with placeholder text
- Navigation structure and element placement
- Basic sizing and proportions

**What it excludes**:
- Colors, branding, imagery
- Typography choices (uses default/system fonts)
- Design system tokens
- Hover states, animations, micro-interactions

**AI instruction**: Generate a structural HTML layout using gray backgrounds, borders for section boundaries, and placeholder text. No design system tokens. Focus on layout, hierarchy, and content placement.

**Example use cases**:
- New page with uncertain layout — validate structure before styling
- Complex dashboard — get section arrangement right first
- Redesign — explore multiple layout alternatives quickly

---

### Mockup

A mockup is **styled with the design system**. It validates visual design decisions, cognitive load, and cross-page consistency.

**What it includes**:
- Full design system tokens applied (colors, typography, spacing)
- Component patterns from the design system
- Real (or realistic) content
- Responsive behavior at key breakpoints
- Visual hierarchy and cognitive load considerations

**What it excludes**:
- Production-grade accessibility (detailed ARIA, full keyboard nav)
- Performance optimization
- Backend integration
- Edge-case states (error handling, empty states — unless specified in brief)

**AI instruction**: Generate a styled HTML+Tailwind page using the design system tokens. Apply real colors, typography, and spacing. Show the primary state at desktop and mobile breakpoints. Follow component patterns from the design system.

**Example use cases**:
- Feature with new visual patterns — validate the look and feel
- Design system compliance check — ensure the page follows established patterns
- Stakeholder review — show what the feature will look like

#### Interactive Mockups

When interactions are central to evaluating the design — carousels, scroll effects, tabbed content, transitions — plain static HTML is insufficient. Interactive mockups add **vanilla JavaScript** to the mockup fidelity to validate how the design *feels*, not just how it looks.

**When to use**: The design's value depends on motion, transitions, or user interaction that can't be evaluated from a static screenshot.

**What's allowed**: Vanilla JS for UI interactions only — image carousels, scroll-triggered animations, tab switching, hover effects, accordion toggles. No frameworks, no API calls, no state management.

**AI instruction**: When the brief specifies interactions, add vanilla JS to the mockup. Keep scripts inline or in a single `<script>` block. Interactions should demonstrate the design intent, not production behavior.

---

### Production UI

Production UI is **ship-ready code**. The design artifact IS the deliverable — no separate implementation step needed.

**What it includes**:
- Everything from Mockup, plus:
- Full accessibility (ARIA labels, keyboard navigation, focus management, semantic HTML)
- All states (loading, empty, error, success)
- Responsive behavior across all breakpoints
- Production-quality code structure

**What it excludes**:
- Backend logic and data fetching
- State management integration
- Build/bundle configuration
- Testing (covered by your project's test process)

**AI instruction**: Generate production-ready HTML+Tailwind/CSS code. Apply all design system tokens. Include accessibility attributes, responsive breakpoints, and all specified states. Code should be ready to integrate into the application.

**Example use cases**:
- Simple, well-understood UI — go straight to production (skip wireframe/mockup)
- Final step after approved wireframe or mockup — build the real thing
- Small UI changes — button, form field, notification banner

---

### Choosing Your Path

Use these factors to decide which fidelity level(s) a feature needs:

| Factor | Start with Wireframe | Start with Mockup | Go straight to Production UI |
|---|---|---|---|
| **Layout complexity** | High — multiple viable layouts | Medium — layout is known, styling isn't | Low — standard pattern |
| **Visual risk** | — | High — new visual territory | Low — existing patterns |
| **Pattern familiarity** | New/unfamiliar pattern | Known pattern, new context | Repeat of existing pattern |
| **Stakeholder review** | Need layout approval | Need visual approval | No approval needed |
| **Feature scope** | Large, multi-section page | Medium, focused component | Small, isolated change |

**Rules of thumb**:
- **When in doubt, start with wireframe** — it's the cheapest way to validate structure
- **Skip wireframe** when the layout is obvious (e.g., standard form, list page, detail page)
- **Skip mockup** when you're confident in the visual direction and want to go straight to production
- **Use all three** for high-risk, complex features where both structure and visuals are uncertain

---

### Valid Paths

| Path | When to Use |
|---|---|
| **Wireframe only** | Validate layout for planning purposes — implementation happens later or separately |
| **Mockup only** | Layout is obvious, but you need to validate the visual design |
| **Production UI only** | Simple, well-understood change — go straight to ship-ready code |
| **Wireframe → Mockup** | Validate structure first, then apply styling — common for new page types |
| **Wireframe → Production UI** | Validate structure, skip mockup, build production — when visual direction is already established |
| **Mockup → Production UI** | Validate visual design, then build production — common for features with new styling |
| **Wireframe → Mockup → Production UI** | Full spectrum — use for high-risk, complex features where every level adds validation value |

---

## 🧠 Cognitive Load

Every design should minimize the user's mental effort. Cognitive load guidelines are baked into Blueprint's design review process (Stage 5: Refine) — they're not optional nice-to-haves, they're core evaluation criteria.

These four principles give AI agents and human reviewers a shared vocabulary for evaluating whether a design is usable, not just visually correct.

---

### 1. Information Density

**Definition**: Don't show everything at once — limit visible elements to what the user needs right now.

**Review Check**: For each screen or section, ask: "Can the user accomplish their current task without scrolling or scanning through unrelated information?"

**Red Flags**:
- More than 7 distinct content groups visible simultaneously
- Long forms with all fields visible at once
- Dashboards showing every metric without hierarchy or filtering
- Walls of text without clear sections or summaries

**AI Instruction**: Limit each view to one primary task. Group related content. Use whitespace to separate sections. If a page has more than 7 content groups, break it into tabs, accordions, or progressive steps.

---

### 2. Visual Hierarchy

**Definition**: Guide the eye — primary actions and content should be visually dominant, secondary elements recede.

**Review Check**: Squint at the design. Can you immediately identify (1) what this page is about, (2) the primary action, and (3) where to look first?

**Red Flags**:
- Multiple elements competing for attention (same size, same weight, same color)
- Primary and secondary actions styled identically
- No clear reading order — the eye bounces randomly
- Important content buried below the fold or in corners

**AI Instruction**: Make exactly one element the clear visual focus. Use size, weight, and color contrast to create a clear reading order: heading → primary content → primary action → secondary content. Secondary actions should be visually quieter (outlined buttons, text links).

---

### 3. Progressive Disclosure

**Definition**: Reveal complexity gradually — start simple, let users drill deeper when ready.

**Review Check**: Is the default view the simplest useful version? Can advanced options be reached without cluttering the main interface?

**Red Flags**:
- Advanced settings visible by default
- Full edit forms shown when a summary would suffice
- All filter options expanded before the user asks for them
- Error details shown at full verbosity without a "show more" option

**AI Instruction**: Show the minimum information needed for the primary use case. Hide advanced options behind expandable sections, "Advanced" links, or secondary pages. Use summaries that expand to detail views.

---

### 4. Interaction Complexity

**Definition**: Minimize steps — fewer clicks, fewer decisions, fewer context switches.

**Review Check**: Count the steps to complete the primary task. Can any steps be eliminated, combined, or defaulted?

**Red Flags**:
- Multi-step wizards where a single form would work
- Confirmation dialogs for non-destructive actions
- Requiring navigation away from the current context to complete a related task
- Forms that ask for information the system already has

**AI Instruction**: Aim for the fewest possible steps. Use smart defaults. Inline editing over navigate-to-edit. Combine related fields. Only confirm destructive or irreversible actions.

---

### Design Review Checklist

Use this checklist during Stage 5 (Refine) to evaluate cognitive load:

- [ ] **Information Density**: Each view focuses on one primary task — no information overload
- [ ] **Visual Hierarchy**: Clear reading order — one focal point, obvious primary action
- [ ] **Progressive Disclosure**: Default view is the simplest useful version — complexity is opt-in
- [ ] **Interaction Complexity**: Primary task completes in minimum steps — no unnecessary clicks or navigation
- [ ] **Consistency**: Patterns match the design system — familiar patterns reduce learning effort
- [ ] **Feedback**: User actions produce visible results — no silent operations

---

## 📄 Document Templates

Blueprint provides templates for design documents. Copy the template, fill in the placeholders, and use it as context for AI agents.

---

### Design System Template

The design system document is the AI agent's "design brain." Create it once at project setup, update it as the project evolves. AI agents load this document at the start of every UI session.

**File**: `docs/design-system.md`
**When to create**: During project initialization, before any UI features
**Who fills it in**: Human (with AI assistance)

````markdown
# Design System — [Project Name]

> **Last Updated**: YYYY-MM-DD
> **Design Direction**: [Brief description — e.g., "Clean, minimal SaaS dashboard with blue accents"]

---

## Project Identity

| Property | Value |
|---|---|
| **Project Name** | [Name] |
| **Design Direction** | [2-3 sentences: visual style, mood, inspirations] |
| **Target Audience** | [Who uses this — e.g., "B2B SaaS users, primarily desktop"] |
| **Primary Platform** | [Web / Mobile / Desktop / Responsive] |

---

## Design Guidelines

> These guidelines capture the **intent behind the tokens**. AI agents: read this section first — it tells you *how* to use the design system, not just *what* the values are. Every wireframe, mockup, and UI screen in this project should reflect these guidelines.

### Brand Personality

[Describe the visual personality in 1–2 sentences — e.g., "Clean and professional with subtle warmth. Feels trustworthy, not cold. Minimal decoration, generous whitespace, confident typography."]

### Design Principles

<!-- 3–5 project-specific rules that guide every design decision. Examples below — replace with your own. -->

1. **[Principle]**: [One-line explanation — e.g., "Clarity over decoration — every element earns its place"]
2. **[Principle]**: [One-line explanation]
3. **[Principle]**: [One-line explanation]

### Color Usage

- **Primary color** is reserved for: [what — e.g., "CTAs, links, and active navigation only"]
- **Avoid using primary color for**: [what — e.g., "backgrounds, large areas, decorative elements"]
- **Semantic colors** (success/warning/error) are used for: [what — e.g., "status indicators and form validation only, never decorative"]
- **Dark mode**: [Yes/No — if yes, note any rules — e.g., "Primary color shifts to a lighter variant for contrast"]

### Typography Usage

- **Headings**: [Font + weight — e.g., "Inter Semi-Bold, sentence case, never all-caps"]
- **Body text**: [Font + weight — e.g., "Inter Regular, 16px base, 1.5 line height for readability"]
- **Maximum font sizes in use**: [count — e.g., "5 sizes total — h1 through body-small. Don't invent new sizes."]
- **Emphasis**: [How to emphasize — e.g., "Bold for keywords, never italic, never underline except links"]

### Layout & Density

- **Overall feel**: [Dense / Balanced / Spacious — e.g., "Spacious — generous padding, clear separation between sections"]
- **Navigation**: [Style — e.g., "Fixed sidebar on desktop, bottom bar on mobile"]
- **Content width**: [Constraint — e.g., "Max 1200px centered, never full-bleed text"]
- **Cards and panels**: [Usage — e.g., "Use cards to group related content, subtle shadow, rounded corners"]

### Do's and Don'ts

**Do**:
- [Project-specific positive pattern — e.g., "Use whitespace to separate sections instead of divider lines"]
- [Another — e.g., "Align form labels to the left, inputs full-width within their container"]

**Don't**:
- [Project-specific anti-pattern — e.g., "Don't use more than 2 colors in a single component"]
- [Another — e.g., "Don't stack more than 3 actions in a single button group"]

### Project Constraints

- **CSS Framework**: [Framework and version — e.g., "Tailwind CSS v3" or "Plain CSS"]
- **Existing Styles**: [Styles to preserve or integrate — e.g., "Legacy header CSS must remain unchanged"]
- **Accessibility Baseline**: [Requirements — e.g., "WCAG AA" or "WCAG AAA for government compliance"]
- **Browser Support**: [Minimums — e.g., "Last 2 versions of Chrome, Firefox, Safari, Edge"]
- **Platform Constraints**: [Limitations — e.g., "Must work in Electron webview" or "No CSS Grid, IE11 support required"]

---

## Color Palette

| Token | Value | Usage |
|---|---|---|
| **Primary** | [#hex] | Buttons, links, active states |
| **Primary Hover** | [#hex] | Hover state for primary elements |
| **Secondary** | [#hex] | Secondary actions, accents |
| **Background** | [#hex] | Page background |
| **Surface** | [#hex] | Card/panel backgrounds |
| **Text Primary** | [#hex] | Main body text |
| **Text Secondary** | [#hex] | Muted/secondary text |
| **Border** | [#hex] | Dividers, input borders |
| **Success** | [#hex] | Success states, confirmations |
| **Warning** | [#hex] | Warning states |
| **Error** | [#hex] | Error states, destructive actions |

<!-- AI-extractable tokens: -->
```css
:root {
  --color-primary: [#hex];
  --color-primary-hover: [#hex];
  --color-secondary: [#hex];
  --color-bg: [#hex];
  --color-surface: [#hex];
  --color-text: [#hex];
  --color-text-secondary: [#hex];
  --color-border: [#hex];
  --color-success: [#hex];
  --color-warning: [#hex];
  --color-error: [#hex];
}
```

---

## Typography

| Token | Value | Usage |
|---|---|---|
| **Font Family (Body)** | [font-name] | All body text |
| **Font Family (Heading)** | [font-name] | Headings (h1–h6) |
| **Font Family (Mono)** | [font-name] | Code, technical content |
| **Base Size** | [px/rem] | Body text |
| **Scale** | [ratio or sizes] | Type scale (e.g., 1.25 major third) |

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **h1** | [size] | [weight] | [lh] | Page titles |
| **h2** | [size] | [weight] | [lh] | Section headings |
| **h3** | [size] | [weight] | [lh] | Subsection headings |
| **body** | [size] | [weight] | [lh] | Body text |
| **small** | [size] | [weight] | [lh] | Captions, labels |

<!-- AI-extractable tokens: -->
```css
:root {
  --font-body: [font-name];
  --font-heading: [font-name];
  --font-mono: [font-name];
  --font-size-base: [size];
  --font-size-sm: [size];
  --font-size-h3: [size];
  --font-size-h2: [size];
  --font-size-h1: [size];
  --line-height-tight: [value];
  --line-height-normal: [value];
  --line-height-relaxed: [value];
}
```

---

## Spacing & Layout

| Token | Value | Usage |
|---|---|---|
| **Space XS** | [size] | Tight spacing (inside buttons, between icons and labels) |
| **Space SM** | [size] | Related elements (form label to input) |
| **Space MD** | [size] | Between content groups |
| **Space LG** | [size] | Between sections |
| **Space XL** | [size] | Major section separation |

### Breakpoints

| Breakpoint | Width | Behavior |
|---|---|---|
| **Mobile** | < 640px | Single column, stacked layout |
| **Tablet** | 640–1024px | Adaptive columns |
| **Desktop** | > 1024px | Full multi-column layout |

### Grid

- **Max width**: [value]
- **Columns**: [number]
- **Gutter**: [value]
- **Container padding**: [value]

<!-- AI-extractable tokens: -->
```css
:root {
  --space-xs: [size];
  --space-sm: [size];
  --space-md: [size];
  --space-lg: [size];
  --space-xl: [size];
  --grid-max-width: [value];
  --grid-columns: [number];
  --grid-gutter: [value];
  --breakpoint-sm: 640px;   /* Tailwind default — adjust to match your framework */
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
}
```

---

## Shadows & Elevation

| Token | Value | Usage |
|---|---|---|
| **Shadow SM** | [value] | Subtle depth (cards at rest) |
| **Shadow MD** | [value] | Moderate depth (dropdowns, popovers) |
| **Shadow LG** | [value] | High depth (modals, dialogs) |
| **Shadow Inset** | [value] | Inset effects (pressed buttons, inputs) |

<!-- AI-extractable tokens: -->
```css
:root {
  --shadow-sm: [value];
  --shadow-md: [value];
  --shadow-lg: [value];
  --shadow-inset: [value];
}
```

---

## Borders & Radii

| Token | Value | Usage |
|---|---|---|
| **Border Width** | [value] | Default border width |
| **Border Color** | [#hex] | Default border color |
| **Radius SM** | [value] | Subtle rounding (buttons, inputs) |
| **Radius MD** | [value] | Moderate rounding (cards) |
| **Radius LG** | [value] | Large rounding (modals, panels) |
| **Radius Full** | 9999px | Fully round (avatars, pills) |

<!-- AI-extractable tokens: -->
```css
:root {
  --border-width: [value];
  --border-color: var(--color-border);
  --radius-sm: [value];
  --radius-md: [value];
  --radius-lg: [value];
  --radius-full: 9999px; /* Convention for full-round — use on circles and pills */
}
```

---

## Motion & Animation

| Token | Value | Usage |
|---|---|---|
| **Duration Fast** | [ms] | Micro-interactions (hover, focus) |
| **Duration Normal** | [ms] | Standard transitions (expand, collapse) |
| **Duration Slow** | [ms] | Complex animations (page transitions) |
| **Easing Default** | [curve] | General-purpose easing |
| **Easing In** | [curve] | Elements entering view |
| **Easing Out** | [curve] | Elements leaving view |

<!-- AI-extractable tokens: -->
```css
:root {
  --duration-fast: [ms];
  --duration-normal: [ms];
  --duration-slow: [ms];
  --ease-default: [curve];
  --ease-in: [curve];
  --ease-out: [curve];
}
```

---

## Component Patterns

Document each reusable UI pattern the AI should follow.

### [Pattern Name]

**When to use**: [One sentence]

**Anatomy**:
- [Element]: [description]
<!-- add one line per element in visual order -->

**States**: Default, Hover, Active, Disabled, Loading, Error

**Variants**: [List variants — e.g., Primary, Secondary, Outline, Ghost]

**Spacing**: [Internal padding, margins, gaps — use token references]

**Accessibility**: [Key a11y requirements for this pattern]

**Don'ts**:
- [Common misuse to avoid]

<!-- Copy the pattern block above for each component: Button, Input, Card, Modal, Table, Nav, etc. -->

---

## Cognitive Load Rules

Project-specific cognitive load guidelines (see Blueprint's Cognitive Load section for the universal principles).

- **Max items per view**: [number — e.g., "7 content groups max"]
- **Form field limit**: [number — e.g., "≤6 fields visible at once, paginate longer forms"]
- **Navigation depth**: [number — e.g., "≤3 levels deep"]
- **Primary actions per page**: [number — e.g., "1 primary action, ≤2 secondary"]
- **Custom rules**: [Any project-specific CL rules]
````

> **Usage**: Copy this template into `docs/design-system.md`. Fill in the placeholders with your project's actual values. AI agents load this file at the start of every UI session — it's their primary design context.

---

### Design Token Convention

Blueprint uses a **hybrid token format**: Markdown tables explain the *why* (human-readable context), CSS custom property blocks provide the *what* (AI-extractable values).

**Why hybrid?**
- Tables give humans context — what each token is for, when to use it
- CSS code blocks give AI agents copy-paste-ready values — no parsing ambiguity
- Both stay in sync in a single file — no separate token files to maintain

**Rule: Every token category must have both**:
1. A Markdown table with `Token | Value | Usage` columns
2. A `css` code block with CSS custom properties immediately after

**Naming convention**: `--[category]-[name]` (e.g., `--color-primary`, `--space-lg`, `--shadow-md`)

**Token categories** (all included in the Design System Template):

| Category | Prefix | Example |
|---|---|---|
| Colors | `--color-` | `--color-primary`, `--color-bg` |
| Typography | `--font-`, `--font-size-`, `--line-height-` | `--font-body`, `--font-size-h1` |
| Spacing | `--space-` | `--space-sm`, `--space-xl` |
| Grid/Layout | `--grid-`, `--breakpoint-` | `--grid-columns`, `--breakpoint-lg` |
| Shadows | `--shadow-` | `--shadow-sm`, `--shadow-lg` |
| Borders | `--border-`, `--radius-` | `--border-width`, `--radius-md` |
| Motion | `--duration-`, `--ease-` | `--duration-fast`, `--ease-default` |

---

### Design Brief Template

The design brief is the feature-level input document for AI design generation. It captures what needs to be designed, at what fidelity, and why — giving the AI agent all the context it needs alongside the design system.

**File**: `docs/features/XX-name/design-brief.md`
**When to create**: During Stage 3 (Define) of the design lifecycle
**Who fills it in**: Human (with AI assistance during Discover/Explore)

````markdown
# Design Brief — [Feature Name]

> **Feature**: [XX — feature name]
> **Date**: YYYY-MM-DD
> **Target Fidelity**: [Wireframe / Mockup / Production UI]

---

## Overview

**What**: [One sentence — what is being designed]
**Why**: [One sentence — what problem it solves or what user need it addresses]
**Where**: [Where in the application — e.g., "Dashboard page", "Settings modal", "Onboarding flow"]

---

## Target Users

- [User type]: [What they need from this design]

---

## Requirements

### Must Have
- [ ] [Required element or behavior]

### Nice to Have
- [ ] [Optional enhancement]

### Out of Scope
- [What this design does NOT include]

---

## Layout

**Page type**: [Full page / Modal / Panel / Sidebar / Inline section]
**Primary layout**: [Single column / Two column / Grid / Dashboard grid]
**Key sections** (in order):
1. [Section name]: [What it contains]

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | [What the user sees on first load] |
| **Empty** | [What shows when there's no data] |
| **Loading** | [Loading indicator approach] |
| **Error** | [How errors are displayed] |
| **Success** | [Confirmation behavior] |

**Key interactions**:
- [Interaction]: [What happens — e.g., "Click 'Save' submits form and shows toast"]

---

## Responsive Behavior

- **Mobile**: [How the layout adapts — e.g., "Stack columns vertically, hide sidebar"]
- **Tablet**: [Adjustments for tablet — e.g., "Two columns, collapsible nav"]
- **Desktop**: [Full layout description]

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **[Heading]** | [Static / Dynamic] | [Example text or data source] |
| **[Body text]** | [Static / Dynamic] | [Example text or data source] |
| **[CTA]** | [Button label] | [Action it triggers] |

---

## Constraints

- [Technical constraint — e.g., "Must work without JavaScript for initial render"]
- [Design constraint — e.g., "Must match existing settings page style"]
- [Content constraint — e.g., "Max 3 navigation levels"]

---

## References

- [Link or description of inspiration/reference]
- [Existing page to match style with]
- [Competitor example to learn from]
````

> **Usage**: Create one design brief per feature that has UI work. The AI agent loads this alongside the design system before generating designs. Be specific — vague briefs produce vague designs.

---

### Design Specification Template

The design spec documents what was designed and why — the output of the Create and Refine stages. At production fidelity, the code itself is largely the spec, but rationale and decisions still need a record.

**File**: `docs/features/XX-name/design-spec.md`
**When to create**: During Stage 4 (Create) of the design lifecycle
**Who fills it in**: AI agent (reviewed by human)

````markdown
# Design Spec — [Feature Name]

> **Feature**: [XX — feature name]
> **Date**: YYYY-MM-DD
> **Fidelity**: [Wireframe / Mockup / Production UI]
> **Status**: [Draft / In Review / Approved]
> **Iterations**: [number — e.g., "3"]

---

## Overview

**What was designed**: [One sentence summary]
**Design brief**: [Link to design brief]
**Key decisions**: [The most important design choices made]

---

## Section Breakdown

### [Section Name]

**Purpose**: [What this section does for the user]
**Layout**: [How it's arranged — e.g., "Two-column grid: filters left, results right"]
**Key elements**:
- [Element]: [Description and token references]

**Rationale**: [Why this layout/approach was chosen]

<!-- Repeat for each major section of the design -->

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | [What the user sees] | [Any notable details] |
| **Empty** | [Empty state design] | [Message or illustration used] |
| **Loading** | [Loading approach] | [Skeleton / spinner / progressive] |
| **Error** | [Error display] | [How errors are surfaced] |
| **Success** | [Success feedback] | [Toast / inline / redirect] |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | [Layout changes — e.g., "Sidebar hidden, single column"] |
| **Tablet** (640–1024px) | [Layout changes — e.g., "Two columns, nav collapses"] |
| **Desktop** (> 1024px) | [Full layout as designed] |

---

## Cognitive Load Assessment

- **Information density**: [Low / Medium / High] — [justification]
- **Visual hierarchy**: [Clear / Needs work] — [what draws attention first]
- **Progressive disclosure**: [How complex information is layered]
- **Interaction complexity**: [Number of actions, steps required]

---

## Accessibility Notes

- **Contrast**: [Any contrast considerations]
- **Focus order**: [Tab order through interactive elements]
- **Screen reader**: [Key announcements or live regions]
- **Keyboard**: [Any keyboard-specific interactions]

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| [What was different] | [Why] | [Yes / No] |

<!-- Leave empty if the design follows the system perfectly -->

---

## Iteration Log

### Iteration [N] — YYYY-MM-DD
**Feedback**: [What the reviewer asked to change]
**Changes**: [What was modified]
**Status**: [Addressed / Deferred / Rejected with reason]
````

> **Usage**: The AI agent creates this spec while generating the design. Update it with each iteration. This becomes the permanent record of what was designed and why — future developers read this to understand design intent.

---

### Design Review Template

The design review structures human-to-AI feedback during the Refine stage. Each review iteration produces specific, actionable feedback — not vague impressions.

**File**: `docs/features/XX-name/design-review.md` (or appended to the design spec's iteration log)
**When to create**: During Stage 5 (Refine) of the design lifecycle
**Who fills it in**: Human reviewer

````markdown
# Design Review — [Feature Name]

> **Feature**: [XX — feature name]
> **Design Spec**: [Link to design-spec.md]
> **Design Brief**: [Link to design-brief.md]
> **Iteration**: [number]
> **Date**: YYYY-MM-DD
> **Reviewer**: [name]
> **Status**: [Changes Requested / Approved / Approved with Notes]

---

## Design System Compliance

- [ ] Colors match the design system palette
- [ ] Typography follows the type scale
- [ ] Spacing uses defined tokens
- [ ] Component patterns match documented anatomy
- [ ] No undocumented design system deviations

---

## Cognitive Load Check

- [ ] ≤7 content groups visible without scrolling
- [ ] Clear visual hierarchy — primary action is obvious
- [ ] No competing focal points
- [ ] Progressive disclosure used for complex information
- [ ] Labels and icons are immediately understandable

---

## Accessibility Check

- [ ] Text meets contrast requirements (4.5:1 normal, 3:1 large)
- [ ] Interactive elements are ≥44×44px
- [ ] Focus states are visible
- [ ] Color is not the sole information carrier
- [ ] Form inputs have visible labels
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] Error states include descriptive text
- [ ] Animations respect reduced-motion preferences
- [ ] Reading order matches visual order

---

## Responsive Check

- [ ] Mobile layout is usable (375px)
- [ ] No horizontal scrolling at any breakpoint
- [ ] Touch targets are appropriately sized on mobile
- [ ] Content priority is maintained across breakpoints

---

## States Check

- [ ] All states from the design brief are designed (Default, Empty, Loading, Error, Success)
- [ ] Empty state is helpful, not a dead end
- [ ] Loading state provides appropriate feedback
- [ ] Error states include actionable guidance

---

## Specific Feedback

| # | Element/Section | Issue | Priority | Suggestion |
|---|---|---|---|---|
| 1 | [What] | [What's wrong] | [Must fix / Should fix / Nice to have] | [How to fix] |

---

## What Works Well

- [Positive observation — reinforce good patterns]

---

## Decision

**Status**: [Changes Requested / Approved / Approved with Notes]
**Notes**: [Any conditions or followup items]
````

> **Usage**: Complete this template for each review iteration. Be specific — "the spacing feels off" is unhelpful; "the gap between the header and content should be `--space-lg` not `--space-xl`" is actionable. AI agents respond well to precise, token-referenced feedback.

---

### Design Handoff Checklist

The handoff marks the transition from design to production. What "handoff" means depends on fidelity.

**File**: Appended to the design spec, or standalone at `docs/features/XX-name/design-handoff.md`
**When to create**: During Stage 6 (Handoff) of the design lifecycle
**Who fills it in**: AI agent + human reviewer

#### Handoff by Fidelity Level

| Fidelity | What Gets Handed Off | Implementation Work Remaining |
|---|---|---|
| **Wireframe** | Layout structure, content hierarchy, interaction flows | Full visual design + development |
| **Mockup** | Visual design with real tokens, component usage | Development (translate design to production code) |
| **Production UI** | Production-ready HTML/CSS/Tailwind code | Integration into app (routing, data binding, state) |

#### Handoff Checklist

````markdown
## Design Handoff — [Feature Name]

> **Design Spec**: [Link to design-spec.md]
> **Fidelity**: [Wireframe / Mockup / Production UI]
> **Approved**: YYYY-MM-DD

### Pre-Handoff Verification

- [ ] Design review completed with "Approved" status
- [ ] All "Must fix" feedback items addressed
- [ ] Design system deviations documented and justified
- [ ] Responsive behavior verified at key breakpoints
- [ ] Accessibility checklist passed

### Implementation Notes

- [Key implementation detail — e.g., "Header uses sticky positioning"]
- [Data integration note — e.g., "Dashboard cards are data-driven, fetched from /api/stats"]
- [State management note — e.g., "Filter state persists across page navigation"]

### Design System Updates

- [ ] New patterns documented in design system
- [ ] New tokens added to design system
- [ ] No design system updates needed

### Verification Criteria

How to confirm the implementation matches the design:

- [ ] Visual comparison at 375px, 768px, 1280px
- [ ] Interactive states match spec (hover, focus, active, disabled)
- [ ] Empty, loading, and error states implemented
- [ ] Typography and spacing match design tokens
- [ ] Accessibility requirements met
````

---

## 📱 Responsive Design

Blueprint generates a **single responsive design** — not separate mockups per breakpoint. AI agents write mobile-first CSS/Tailwind and layer breakpoint-specific overrides.

### Strategy: Mobile-First

1. **Design for mobile first** — the default styles target the smallest screen
2. **Layer up with breakpoints** — add complexity as viewport grows
3. **One HTML structure** — the same markup adapts via CSS, don't duplicate content

### Breakpoint Reference

| Breakpoint | Tailwind | Width | Typical Behavior |
|---|---|---|---|
| **Default** | (none) | < 640px | Single column, stacked, full-width |
| **sm** | `sm:` | ≥ 640px | Minor adjustments, wider touch targets |
| **md** | `md:` | ≥ 768px | Two-column layouts emerge |
| **lg** | `lg:` | ≥ 1024px | Full multi-column, sidebars visible |
| **xl** | `xl:` | ≥ 1280px | Max-width containers, extra whitespace |

> These match Tailwind's default breakpoints. Override in your Design System if needed.

### Common Responsive Patterns

| Pattern | Mobile | Desktop | When to Use |
|---|---|---|---|
| **Stack → Grid** | Vertically stacked | Side-by-side grid | Cards, feature sections, dashboards |
| **Hide → Show** | Hidden (hamburger/accordion) | Visible (sidebar/nav) | Navigation, secondary panels |
| **Full → Constrained** | Full-width | Max-width container | Page content, forms |
| **Tabs → Columns** | Tabbed interface | All visible in columns | Settings, multi-section views |
| **Bottom → Side** | Bottom sheet/bar | Sidebar | Actions, filters, navigation |
| **Simplified → Full** | Essential info only | Full detail view | Tables, data-heavy views |

### AI Instructions for Responsive Output

When generating responsive designs:
- **Always start with mobile layout** — write base styles first, then `sm:`, `md:`, `lg:` overrides
- **Test mentally at 3 widths**: 375px (phone), 768px (tablet), 1280px (desktop)
- **Don't hide critical content** — progressive enhancement, not progressive subtraction
- **Use relative units** — `rem`, `%`, `min()`, `max()`, `clamp()` over fixed `px`
- **Stack, don't shrink** — when elements don't fit, stack vertically rather than cramming horizontally
- **Touch targets on mobile** — minimum 44×44px for interactive elements

---

## ♿ Accessibility

Design-level accessibility requirements. These are checked during design review (Stage 5: Refine), not during implementation — they shape how designs are created, not how ARIA attributes are coded.

### Contrast & Color

- **Text contrast**: Minimum 4.5:1 for normal text, 3:1 for large text (≥18px bold or ≥24px)
- **UI contrast**: Interactive elements and meaningful graphics need 3:1 against adjacent colors
- **Don't rely on color alone** — use icons, patterns, or text alongside color to convey meaning
- **Test grayscale** — the design should be understandable in grayscale

### Touch & Click Targets

- **Minimum size**: 44×44px for all interactive elements (buttons, links, inputs)
- **Spacing**: At least 8px between adjacent targets to prevent mis-taps
- **Hit area**: If the visual element is smaller, expand the clickable area with padding

### Focus States

- **Every interactive element must have a visible focus indicator**
- **Focus style**: 2px solid outline with at least 3:1 contrast against the background
- **Never use `outline: none` without a replacement** — keyboard users depend on focus visibility
- **Focus order**: Follows visual reading order (top-to-bottom, left-to-right)

### Structure & Semantics

- **Heading hierarchy**: Use h1 → h2 → h3 in order — never skip levels for visual styling
- **One h1 per page** — the primary page title
- **Landmarks**: Design with semantic regions in mind (header, nav, main, footer)
- **Lists**: Group related items as lists, not just styled divs
- **Tables**: Use tables for tabular data only, never for layout

### Forms

- **Every input must have a visible label** — placeholder text is not a label
- **Error messages**: Display adjacent to the field, with descriptive text (not just "Invalid")
- **Required fields**: Mark clearly with text (not just color or asterisk without legend)
- **Group related fields**: Use fieldset/legend semantics for radio groups and related inputs

### Motion & Animation

- **Respect `prefers-reduced-motion`** — provide reduced or no-motion alternatives
- **No auto-playing animation** longer than 5 seconds without pause/stop controls
- **Avoid flashing content** — nothing should flash more than 3 times per second

### Design Review Accessibility Checklist

When reviewing designs, verify:

- [ ] Text meets minimum contrast ratios
- [ ] Interactive elements are ≥44×44px
- [ ] Focus states are visible for all interactive elements
- [ ] Color is not the only way information is conveyed
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skips)
- [ ] Form inputs have visible labels
- [ ] Error states include descriptive text
- [ ] Animations respect reduced-motion preferences
- [ ] Reading order matches visual order

---

## 🧩 Component Patterns

The Design System Template includes a skeleton for documenting component patterns. This section explains **how** to document them so AI agents reproduce them consistently.

### Why Document Patterns?

Without documented patterns, AI agents reinvent components every session — buttons look different on each page, cards have inconsistent spacing, modals behave unpredictably. Documented patterns are the AI's memory.

### Pattern Documentation Format

Every component pattern in your design system should follow this structure:

| Section | Purpose | Required? |
|---|---|---|
| **When to use** | One sentence — prevents misuse | Yes |
| **Anatomy** | List of elements that compose the component | Yes |
| **States** | All visual states the component can be in | Yes |
| **Variants** | Named variations (e.g., Primary, Ghost, Destructive) | If applicable |
| **Spacing** | Internal padding, margins, gaps between elements | Yes |
| **Accessibility** | Key a11y requirements specific to this pattern | Yes |
| **Don'ts** | Common misuses to avoid | Recommended |

### Example: Button Pattern

```markdown
### Button

**When to use**: For actions that change state or navigate — not for links within text.

**Anatomy**:
- Icon (optional, leading): 16×16, aligned to label
- Label: Font size body, font-weight 600
- Icon (optional, trailing): 16×16, aligned to label

**States**: Default, Hover (+darken 10%), Active (+darken 15%), Disabled (50% opacity), Loading (spinner replaces label)

**Variants**:
- **Primary**: Background `--color-primary`, text white — 1 per page max
- **Secondary**: Background `--color-surface`, border `--color-border`, text `--color-text`
- **Ghost**: No background, text `--color-primary` — for tertiary actions
- **Destructive**: Background `--color-error`, text white — for delete/remove actions

**Spacing**: Padding `--space-sm` vertical, `--space-md` horizontal. Gap `--space-xs` between icon and label.

**Accessibility**: Minimum 44×44px touch target. Disabled buttons remain visible (not removed from DOM). Loading state provides feedback to all users.

**Don'ts**:
- Don't use more than one Primary button per page section
- Don't use a button when a link (`<a>`) is semantically correct
- Don't disable without explaining why (use tooltip or adjacent text)
```

### Example: Card Pattern

```markdown
### Card

**When to use**: For grouping related content into a distinct, scannable unit.

**Anatomy**:
- Container: Background `--color-surface`, border `--color-border`, radius `--radius-md`
- Header (optional): Title + subtitle or metadata
- Body: Primary content area
- Footer (optional): Actions or secondary info

**States**: Default, Hover (if clickable — subtle shadow increase), Selected (border `--color-primary`), Loading (skeleton placeholder)

**Variants**:
- **Default**: Standard card with border
- **Elevated**: No border, uses `--shadow-sm`
- **Interactive**: Clickable — cursor pointer, hover state, focus ring

**Spacing**: Padding `--space-md` all sides. Gap `--space-sm` between header/body/footer.

**Accessibility**: If interactive, must be keyboard-focusable with visible focus ring. Card title should be a heading at the appropriate level.

**Don'ts**:
- Don't nest cards inside cards
- Don't make the entire card clickable if it contains other interactive elements
- Don't exceed 3 content groups inside a single card
```

### Pattern Documentation Tips

- **Be specific with token references** — say `--color-primary` not "the primary color"
- **Document states exhaustively** — AI agents only generate states you've listed
- **Include "Don'ts"** — AI agents follow positive instructions well but also need boundaries
- **Keep anatomy ordered** — list elements in their visual top-to-bottom, left-to-right order
- **One pattern per heading** — makes it easy for AI agents to find and reference

---

## 🚀 Project Setup

When adding Blueprint to a project for the first time, follow these steps. For projects that already have UI and want to adopt Blueprint retroactively, see [Adopting Blueprint Mid-Project](#-adopting-blueprint-mid-project) instead.

### Step 1 — Copy the Framework

Add Blueprint to your docs folder:

```
docs/
├── blueprint.mastery.md           # Copy the full framework file (read-only)
├── blueprint-compact.mastery.md   # Copy the compact variant (for AI agent context efficiency)
└── design-system.md               # Create from the Design System Template (Step 3)
```

### Step 2 — Discuss Your Design Direction

Before filling in the design system template, have a conversation with the developer, stakeholder, or team to make **intentional design decisions**. This is the design equivalent of Mastery's project discussion — the decisions made here shape every wireframe, mockup, and UI screen in the project.

Walk through these questions:

**Brand & Tone**
- What personality should the UI convey? (clean/minimal, playful/friendly, corporate/professional, bold/expressive)
- Are there existing brand assets? (logo, brand colors, guidelines)
- Name 1–3 reference apps or sites that feel like what you want

**Color**
- What's the primary action color? (buttons, links, active states)
- How many accent colors do you need? (1–2 is typical)
- Do you need dark mode support?
- What should error, warning, and success look like?

**Typography**
- Serif, sans-serif, or a mix?
- How many font families? (1–2 is ideal — one for headings, one for body, or the same for both)
- Dense or readable? (smaller text with tight spacing, or larger text with generous spacing)

**Layout & Density**
- Dense (data-heavy dashboards, admin tools) or spacious (consumer apps, marketing)?
- Sidebar navigation, top navigation, or both?
- What's the dominant screen size of your users? (mobile-first? desktop-heavy?)

**Constraints**
- Any existing CSS framework? (Tailwind, Bootstrap, plain CSS)
- Any existing styles that must be preserved?
- Any accessibility requirements beyond the baseline? (WCAG AA is the default)

> **Discuss until confident, then fill in the template.** The design system template in Step 3 is where these decisions become concrete — guidelines at the top capture the *why* (personality, principles, do's/don'ts), tokens below capture the *what* (hex codes, font names, pixel sizes). Don't fill in the template with guesses — discuss first, document second.

### Step 3 — Create Your Design System

Copy the Design System Template from this file into `docs/design-system.md`. Fill in your project's tokens:

- Colors (brand, semantic, neutral)
- Typography (fonts, scale, weights)
- Spacing (scale, grid, breakpoints)
- Shadows, borders, radii
- Motion (durations, easing)

> **Start minimal.** You don't need every token filled in on day one. Fill in what you know — colors, fonts, basic spacing — and expand as features require more tokens.

### Step 4 — Make Blueprint Discoverable

Add a note to your project's `AGENTS.md` (or equivalent agent configuration) so AI agents know to load the design system before UI work:

```markdown
## Design Framework

This project uses Blueprint for UI design.
- Load `docs/blueprint.mastery.md` (or the compact variant) before any UI work
- Load `docs/design-system.md` at the start of every UI session
- For each UI feature, create a design brief at `docs/features/XX-name/design-brief.md`
```

### Step 5 — Start Designing

For each feature with UI, follow the [Design Lifecycle](#-the-design-lifecycle):
1. **Discover** — capture design requirements during feature discussion
2. **Define** — create a design brief at `docs/features/XX-name/design-brief.md`
3. **Create** — AI generates the design using the brief + design system
4. **Refine** — review, iterate, approve
5. **Handoff** — document decisions in a design spec

### Setup Flow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐
│  1. COPY         │    │  2. DISCUSS      │    │  3. CREATE       │    │  4. SET UP       │    │  5. DESIGN   │
│  framework files │───▶│  design          │───▶│  design system   │───▶│  discoverability │───▶│  first       │
│                  │    │  direction       │    │                  │    │                  │    │  feature     │
│ blueprint.       │    │ Brand, color,    │    │ design-          │    │ Update AGENTS.md │    │ Design       │
│ mastery.md       │    │ typography, tone │    │ system.md        │    │ for AI agents    │    │ Lifecycle    │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────┘
```

---

## 🔀 Adopting Blueprint Mid-Project

If your project already has UI — built pages, established patterns, existing styles — and you want to start using Blueprint going forward, this section is for you. Instead of starting from scratch, you'll **reconstruct** your design system from what already exists.

> **When to use this**: Your project has existing UI and you want to bring structure to future design work. For brand-new projects, use [Project Setup](#-project-setup) instead.

### Step 1 — Copy the Framework

Same as new project setup — add `blueprint.mastery.md` and `blueprint-compact.mastery.md` to your `docs/` folder.

### Step 2 — Discuss Your Existing Design Direction

Before extracting tokens, clarify the design intent behind what already exists. Answering these questions helps you document the *why* alongside the *what*:

- What design personality did the existing UI establish? Was it intentional or accidental?
- Are there inconsistencies you want to fix going forward? (e.g., 5 different blues used where 2 would do)
- Are there patterns that work well and should become official?
- Is the current visual direction what you want going forward, or does it need to evolve?

> **If the existing design was accidental**, this is your chance to make intentional choices. Use the full discussion questions from [Project Setup Step 2](#step-2--discuss-your-design-direction) to decide what to keep, what to standardize, and what to change.

### Step 3 — Create Your Design System

Create `docs/design-system.md` from the Design System Template, but instead of choosing tokens from scratch, **extract them from your existing UI**:

- Inspect your CSS/stylesheets for colors, fonts, spacing values already in use
- Identify patterns in your existing components (buttons, cards, forms, etc.)
- Document the responsive breakpoints your app already uses
- Note any conventions that emerged organically (spacing rhythm, color usage, etc.)

> **Don't invent — discover.** The goal is to document what you already have, not redesign everything. If your existing UI uses `#3B82F6` for primary buttons, that's your `--color-primary`.

### Step 4 — Document Existing Patterns

For each reusable UI component your project already has, create a component pattern entry in the design system using the [Component Pattern Documentation Format](#pattern-documentation-format):

- Document the anatomy, states, variants, and spacing of existing components
- Reference the actual token values extracted in Step 2
- Include "Don'ts" based on mistakes you've already encountered

> **Granularity tip**: Don't document every component on day one. Start with the 3–5 most-used components (buttons, forms, cards, navigation). Add more as future features need them.

### Step 5 — Make Blueprint Discoverable

Same as new project setup — update your `AGENTS.md` so AI agents know to load the design system.

### Step 6 — Start the Next Design Normally

From here on, the full [Design Lifecycle](#-the-design-lifecycle) applies. The next feature with UI follows Discover → Explore → Define → Create → Refine → Handoff → Reflect.

### Mid-Project Adoption Flow

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐
│  1. COPY         │    │  2. DISCUSS      │    │  3. RECONSTRUCT  │    │  4. DOCUMENT     │    │  5. DESIGN   │
│  framework files │───▶│  design          │───▶│  design system   │───▶│  existing        │───▶│  next feature│
│                  │    │  direction       │    │  from existing UI │    │  patterns        │    │  (full cycle)│
│ blueprint.       │    │ Keep, fix, or    │    │ design-          │    │ Component        │    │ Design       │
│ mastery.md       │    │ evolve?          │    │ system.md        │    │ patterns in      │    │ Lifecycle    │
│                  │    │                  │    │                  │    │ design-system.md │    │              │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────┘
```

---

## 🔁 Resuming Design Work

Whether you're a human returning after a break or an AI agent starting a new session, follow this protocol to pick up where design work left off.

### For AI Agents

1. Read `docs/blueprint-compact.mastery.md` — reload framework rules (mandatory every UI session)
2. Read `docs/design-system.md` — reload the project's design tokens and patterns
3. Find the active feature's design docs:
   - `design-review.md` — check for outstanding feedback
   - `design-spec.md` — check what's been designed so far
   - `design-brief.md` — refresh on requirements
4. Continue from where design work stopped (the review feedback, or the next section of the brief)
5. Self-review against Cognitive Load + Accessibility checklists before presenting

### For Humans

1. Check the active feature's `design-review.md` — see latest feedback and status
2. Check `design-spec.md` — see what was designed
3. Compare implementation against spec — is anything drifting?
4. Continue refining or move to the next design task

---

## ✅ Definition of Done

A design is considered DONE when ALL of the following are true:

### Design Level

- [ ] Design brief is complete and approved
- [ ] Design artifact matches the brief requirements (layout, states, interactions)
- [ ] Cognitive Load checklist passes (all 4 principles verified)
- [ ] Accessibility checklist passes (contrast, targets, focus, structure, forms, motion, color)
- [ ] Responsive behavior works at all specified breakpoints
- [ ] All specified states are designed (default, empty, loading, error, success)
- [ ] Design spec is written (or code IS the spec at production fidelity)

### Design System Level

- [ ] All tokens used are from the design system (no hardcoded values)
- [ ] Any new patterns are documented in the design system
- [ ] Component patterns follow the documented format
- [ ] Design system gaps discovered during the feature are logged

### Handoff Level

- [ ] Design handoff checklist is complete
- [ ] Implementation can begin from the spec alone — no tribal knowledge required
- [ ] Design review feedback is resolved (all "Must fix" items addressed)

---

## 🤖 AI Design Protocol

How AI coding agents use Blueprint to generate consistent, high-quality designs. This section is written **for the AI agent** — load it at the start of any UI design session.

### Context Loading Order

Before generating any design, load these documents in order:

| Step | Document | Purpose |
|---|---|---|
| 1 | `docs/blueprint.mastery.md` | Framework rules (this file) — or the compact variant |
| 2 | `docs/design-system.md` | Design guidelines (personality, principles, rules) + tokens + patterns |
| 3 | `docs/features/XX-name/design-brief.md` | Feature-specific requirements and layout |
| 4 | Previous design specs (if iterating) | What was already approved or needs revision |

> **Rule**: Never generate UI without loading the design system first. Every session starts fresh — the design system is your memory.

### Generation Workflow

```
Load Design System → Read Design Brief → Generate at Requested Fidelity → Self-Review → Present to Human
```

1. **Load context** — read the design system and design brief
2. **Identify fidelity** — the brief specifies wireframe, mockup, or production UI
3. **Generate HTML + Tailwind/CSS** — one responsive design, mobile-first
4. **Self-review** — check against the Cognitive Load checklist and Accessibility checklist before presenting
5. **Present** — show the design to the human for review
6. **Iterate** — apply feedback from design review, repeat steps 3–5

### Cross-Page Consistency Rules

When generating designs across multiple features:
- **Always reference the design system** — don't invent new colors, spacing, or patterns
- **Use the same component patterns** — a "Card" looks the same everywhere
- **Match existing page layouts** — check previous design specs for layout conventions
- **Maintain heading hierarchy** — consistent h1/h2/h3 usage across pages
- **Preserve navigation patterns** — sidebar/header/footer remain consistent

### Handling Design System Gaps

When the design brief requires something not in the design system:

1. **Flag the gap** — tell the human: "The design system doesn't define [X]. I'll use [Y] for now."
2. **Make a reasonable choice** — use existing tokens to derive new values (e.g., darker shade of primary)
3. **Document it** — note the gap in the design spec so the design system can be updated
4. **Never silently invent** — every deviation from the system must be visible

### Output Format

All design output is **HTML + CSS/Tailwind**:
- **Wireframe**: Grayscale, system fonts, basic layout — structure only
- **Mockup**: Full color, real typography, component patterns — visual design without production polish
- **Production UI**: Production-ready code, complete interactions, responsive, accessible

> See the [Fidelity Levels](#-fidelity-levels) section for what each level includes and excludes.

### Communication Style

When presenting designs to humans:
- **Lead with what you built** — show the design, then explain
- **Highlight decisions** — "I chose [X] because the design system specifies [Y]"
- **Flag uncertainties** — "The brief didn't specify [X], so I assumed [Y]"
- **Ask specific questions** — "Should the sidebar collapse on tablet, or use an overlay?"
- **Never present without self-review** — run the Cognitive Load and Accessibility checklists first

### Making Blueprint Discoverable

For AI agents to find and use Blueprint in your project, add this to your project's `AGENTS.md`:

```markdown
## Design Framework

This project uses Blueprint for UI design.
- Load `docs/blueprint.mastery.md` (or the compact variant) before any UI work
- Load `docs/design-system.md` at the start of every UI session
- For each UI feature, create a design brief at `docs/features/XX-name/design-brief.md`
```

Without this, AI agents may not know to look for `blueprint.mastery.md` in the `docs/` folder.

---

## ⚡ Quick Reference

### Project Setup (One Time)

```
1.  Copy  blueprint.mastery.md  → docs/                  (framework — read-only)
2.  Copy  blueprint-compact.mastery.md  → docs/           (compact variant — optional)
3.  Discuss design direction with team                     (brand, colors, typography, tone)
4.  Create  docs/design-system.md                         (guidelines + tokens from template)
5.  Update  AGENTS.md  to reference Blueprint              (make discoverable)
6.  Start designing                                       (Design Lifecycle)
```

### Mid-Project Adoption (Existing UI)

```
1.  Copy  blueprint.mastery.md  → docs/                  (framework — read-only)
2.  Copy  blueprint-compact.mastery.md  → docs/           (compact variant — optional)
3.  Discuss: keep, fix, or evolve existing design?         (clarify intent)
4.  Create  docs/design-system.md                         (extract tokens from existing UI)
5.  Document 3–5 existing component patterns               (in design-system.md)
6.  Update  AGENTS.md  to reference Blueprint              (make discoverable)
7.  Start next feature with full Design Lifecycle
```

### Starting a New Design (Step by Step)

```
1.  Identify feature needs UI                             (Discover)
2.  Capture design requirements                           (Discover)
3.  Research existing patterns and references              (Explore — skip if simple)
4.  Create  docs/features/XX-name/design-brief.md         (Define)
5.  AI loads design system + brief                         (Create)
6.  AI generates design at chosen fidelity                 (Create)
7.  Human reviews against brief + checklists               (Refine)
8.  AI iterates based on feedback                          (Refine — loop until approved)
9.  Create  docs/features/XX-name/design-spec.md           (Handoff)
10. Complete  docs/features/XX-name/design-handoff.md      (Handoff)
11. Note design learnings, update design system            (Reflect)
```

### Document Quick Reference

| Need to... | Open this doc |
|---|---|
| Understand the design process (full + templates) | `docs/blueprint.mastery.md` (this file) |
| Get framework rules (compact) | `docs/blueprint-compact.mastery.md` |
| See the project's design tokens and patterns | `docs/design-system.md` |
| Start a new design | `docs/features/XX-name/design-brief.md` |
| See what was designed | `docs/features/XX-name/design-spec.md` |
| Review a design | `docs/features/XX-name/design-review.md` |
| Check handoff status | `docs/features/XX-name/design-handoff.md` |
| See AI-generated UI files | `docs/features/XX-name/mockups/` |

### AI Agent Quick Start

```
1. Read blueprint-compact.mastery.md       (mandatory every UI session — compact rules)
2. Read design-system.md                   (project tokens + patterns)
3. Find the active feature's design brief  (what to design)
4. Check for existing design-spec.md       (if iterating)
5. Check for design-review.md              (outstanding feedback)
6. Generate or iterate on the design
7. Self-review: Cognitive Load + Accessibility checklists
8. Present to human for review
```

---

> *"Discover. Explore. Define. Create. Refine. Handoff. Reflect."*

---

## 📋 Changelog

### v1.1 — March 2026

- **Design System Discussion**: Added guided conversation step to Project Setup and Mid-Project Adoption for establishing design direction before filling in tokens
- **Design Guidelines section**: Added Brand Personality, Design Principles, Color/Typography/Layout Usage, Do's/Don'ts, and Project Constraints to the Design System Template
- **Standalone positioning**: Blueprint works independently — Mastery integration is now optional
- **Project Setup**: Step-by-step guide for adding Blueprint to new projects
- **Mid-Project Adoption**: Guide for existing projects to reconstruct their design system
- **Resuming Design Work**: Protocol for AI agents and humans picking up where design stopped
- **Definition of Done**: 3-level checklist (Design, Design System, Handoff)
- **Quick Reference**: Expanded with step-by-step workflows and document reference table
- **Direction Exploration Flow**: New flow pattern for exploring multiple visual directions before committing
- **Interactive Mockups**: Vanilla JS in mockups when interactions are central to the design
- **Creative Delegation**: Guidance for when humans hand creative authority to the AI
- **AI reference limitations**: Practical note about web scraping limitations in Stage 2
- **Mockup file naming convention**: Page-vN-direction pattern for versioned mockup files
- **Philosophy #8**: "Direction before detail" — explore directions before polishing one
- **Version in header**: Version number visible at top of file for quick identification

### v1.0 — March 2026

- Initial release: 7-stage design lifecycle, 3 fidelity levels, cognitive load guidelines
- Design System Template with hybrid token format (Markdown tables + CSS custom properties)
- Design Brief, Specification, Review, and Handoff templates
- Responsive design strategy (mobile-first, Tailwind breakpoints)
- Accessibility checklist (design-level, not implementation-level)
- Component Pattern documentation format with Button and Card examples
- AI Design Protocol (context loading, generation workflow, consistency rules)
- Compact variant for AI context efficiency

---

*Blueprint Framework v1.1*
*Works with any UI project. Any styling approach. Any AI coding agent.*

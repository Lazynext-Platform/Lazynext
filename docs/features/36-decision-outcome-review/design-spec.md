# Design Spec — Decision Outcome Review

> **Feature**: 36 — Decision Outcome Review
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A centered modal showing the original decision context, a 3-option outcome selector (Good/Neutral/Bad), optional notes and key learning fields, a LazyMind AI insight, and a multi-review progress indicator — representing the critical "outcome loop" of Decision DNA.
**Design brief**: [design-brief.md](design-brief.md)
**Key decisions**: Emoji-based outcome buttons for universal recognition; decision context shown prominently to refresh memory; LazyMind suggestion adds AI value to the review; progress dots indicate review queue length to set expectations; "Remind me later" respects user time without losing the review.

---

## Section Breakdown

### Decision Context Card
**Purpose**: Refresh user's memory of the original decision
**Layout**: bg-slate-800 rounded-xl p-4 within modal header
**Key elements**: DECISION badge (orange), decided date, title (font-semibold), rationale paragraph, quality score (84, emerald), decided-by avatar with name
**Rationale**: Users review decisions weeks/months later — full context prevents uninformed outcome tagging.

### Outcome Selector
**Purpose**: Tag the decision outcome
**Layout**: grid grid-cols-3 gap-3
**Key elements**: Three buttons — Good (thumbs up emoji, "Achieved goals", emerald border on select), Neutral (neutral emoji, "Mixed results", slate border), Bad (thumbs down emoji, "Caused problems", red border). Each: bg-slate-800 border-2 rounded-xl p-4.
**Rationale**: Emoji provides instant emotional recognition. Three options balance simplicity with meaningful categorization.

### Notes & Learning
**Purpose**: Capture qualitative outcome data
**Layout**: Stacked inputs below outcome selector
**Key elements**: "What happened?" textarea (h-24), "Key learning" single-line input — both optional
**Rationale**: Optional fields encourage but don't force reflection. One-sentence learning constraint encourages distillation.

### LazyMind Suggestion
**Purpose**: AI-powered insight based on decision context
**Layout**: bg-[#4F6EF7]/5 border border-[#4F6EF7]/20 rounded-xl p-3, flex with icon
**Key elements**: Lightning icon in branded blue, "LazyMind Suggestion" label, contextual insight text
**Rationale**: AI adds value by identifying patterns and suggesting actionable next steps.

### Review Progress
**Purpose**: Show position in multi-decision review queue
**Layout**: Below modal, centered, flex with dots
**Key elements**: "2 more decisions to review" text, 3 progress dots (active: bg-[#4F6EF7], inactive: bg-slate-700)
**Rationale**: Sets expectations for review session length without overwhelming.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **No outcome selected** | Save button disabled (opacity-40) | Default state |
| **Good selected** | Emerald border on Good button, Save enabled | |
| **Neutral selected** | Slate border on Neutral button, Save enabled | |
| **Bad selected** | Red border on Bad button, Save enabled | |
| **Saving** | Button shows loading state | Brief |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile (< 640px)** | Full-width bottom sheet, outcome buttons stack vertically |
| **Tablet (640–1024px)** | Centered modal w-[540px] |
| **Desktop (> 1024px)** | Centered modal as designed |

---

## Accessibility Notes

- **Contrast**: Emoji buttons on slate-800 meet contrast requirements. Selected borders provide clear visual feedback.
- **Focus order**: Outcome buttons → textarea → learning input → LazyMind → action buttons
- **Screen reader**: Outcome buttons need aria-pressed state. Modal needs focus trap and aria-labelledby.
- **Keyboard**: Arrow keys between outcome buttons. Tab to inputs. Enter to save. Esc to close.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Emoji-based selector | Unique to decision outcome flow | No — specialized pattern |

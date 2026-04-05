# Design Brief — Decision Outcome Review

> **Feature**: 36 — Decision Outcome Review
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A modal for reviewing decision outcomes after a time period (e.g., 30 days), with the original decision context, 3-option outcome selector (Good/Neutral/Bad with emoji), outcome notes textarea, key learning input, LazyMind AI suggestion, and a multi-decision review indicator.
**Why**: Decision DNA's core value loop — decisions are logged, then outcomes are reviewed to build organizational learning. Without outcome tagging, decisions remain theoretical.
**Where**: Triggered by time-based prompts (30/60/90 days after decision) or manually from decision detail view.

---

## Target Users
- **Decision makers**: Reviewing their own past decisions
- **Team leads**: Reviewing team decisions for patterns
- **All users**: Prompted when a decision's review date arrives

---

## Requirements

### Must Have
- [x] Decision context card: type badge, date decided, title, rationale summary, quality score, decided-by avatar
- [x] 3 outcome buttons: Good (thumbs up, emerald), Neutral (neutral face, slate), Bad (thumbs down, red) — with descriptions
- [x] Outcome notes textarea (optional)
- [x] Key learning input (optional, one sentence)
- [x] Save outcome button (disabled until outcome selected)
- [x] "Remind me later" and "Skip" options

### Nice to Have
- [x] LazyMind AI suggestion based on context
- [x] Multi-decision review progress indicator (dots showing position in queue)
- [x] Selected outcome border highlighting with color
- [x] Slide-up modal animation

### Out of Scope
- Outcome analytics/trends (covered in Decision Health Dashboard, Feature 08)
- Editing the original decision from this modal
- Team vote on outcomes

---

## Layout

**Page type**: Modal overlay (centered, backdrop blur)
**Primary layout**: w-[540px] with header (decision context) + body (outcome selection + notes) + footer (actions)
**Key sections**: Decision reminder card → Outcome selector grid → Notes/learning inputs → LazyMind suggestion → Action buttons

---

## Responsive Behavior
- **Mobile**: Modal goes full-width with bottom sheet behavior
- **Tablet**: Centered modal as designed
- **Desktop**: Centered modal as designed

---

## Constraints
- Outcome selection is required before saving (button disabled until selected)
- LazyMind suggestion depends on AI availability
- Review prompts are per-user (each team member reviews decisions they participated in)

---

## References
- Feature 07 (Decision DNA View) — decision list and logging
- Feature 08 (Decision Health Dashboard) — outcome analytics
- Feature 09 (Node Detail Panels) — decision detail view

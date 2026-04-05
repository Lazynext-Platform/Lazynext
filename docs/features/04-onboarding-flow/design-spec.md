# Design Spec — Onboarding Flow

> **Feature**: 04 — Onboarding Flow
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: A 3-step onboarding wizard on a dark background with animated progress indicators, workspace setup, setup method selection, and a first decision log that reveals a quality score with confetti celebration.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Decision DNA introduced in onboarding (Step 3) to demonstrate the unique value prop immediately; "Use a Template" marked as recommended to guide most users; quality score reveal creates a memorable "aha moment"; dark theme signals transition from marketing to app.

---

## Section Breakdown

### Logo + Progress Indicator

**Purpose**: Brand presence and clear step progress communication.
**Layout**: Centered column. Logo (icon + text) with mb-8, then progress indicator with mb-10.
**Key elements**:
- Logo: w-8 h-8 blue rounded-lg with lightning bolt SVG + "Lazynext" white text lg bold
- Progress: 3 circles (w-9 h-9 rounded-full) connected by 2 lines (w-16 h-0.5)
- Active circle: bg-[#4F6EF7] text-white
- Completed circle: bg-emerald-500 text-white with checkmark SVG
- Future circle: border-2 border-slate-600 text-slate-500
- Completed line: bg-emerald-500
- Future line: bg-slate-700

**Rationale**: Numbered circles with color coding give instant clarity on progress. Emerald for completed steps provides positive reinforcement. Compact horizontal layout works across all screen sizes.

---

### Step 1: Workspace Setup

**Purpose**: Name the workspace and generate the URL slug -- the minimum viable setup action.
**Layout**: Single column within card. Heading + subtitle + input + slug preview + button.
**Key elements**:
- Heading: "Let's set up your workspace" in xl bold white
- Subtitle: "This is where your team will collaborate." in slate-400 sm
- Input: Full-width, slate-800 bg, slate-700 border, white text, blue focus ring, placeholder "e.g. Acme Corp"
- Slug preview: "lazynext.com/ws/" in slate-600 + dynamic slug in slate-400 (updates on input via JS)
- Continue button: Full-width primary button, disabled state with opacity-40

**Rationale**: Single field minimizes friction. Live slug preview gives immediate feedback and makes the workspace feel real. URL format communicates the workspace concept.

---

### Step 2: Setup Choice

**Purpose**: Let users choose their starting method -- import, template, or blank.
**Layout**: 3 stacked option cards within the card container, plus back button.
**Key elements**:
- 3 option cards (w-full, border-slate-700, rounded-xl, p-4):
  - Import: Upload icon, "Bring your data from Notion, Linear, Trello, or CSV"
  - Use a Template: Grid icon, "Start with a pre-built workflow for your team type", emerald "Recommended" badge
  - Blank Canvas: Square icon, "Start from scratch with an empty workflow"
- Each card: Icon box (w-11 h-11 bg-slate-800) + title (white semibold) + description (slate-400 xs) + right chevron
- Selection state: Primary border, primary/8 background, box-shadow ring
- Auto-advance: 400ms delay after selection before transitioning to Step 3
- Back button: "< Back" text link in slate-500

**Rationale**: Three options cover all user types: data-rich teams (import), structured starters (template), and explorers (blank). "Recommended" badge on template gently guides without forcing. Auto-advance after selection reduces clicks.

---

### Step 3: First Decision (Form)

**Purpose**: Introduce Decision DNA by having the user log their first real decision.
**Layout**: Form with 3 fields + submit button + back link.
**Key elements**:
- Heading: "Log your first decision" in xl bold white
- Subtitle: "Decision DNA is what makes Lazynext unique..." in slate-400 sm
- Question field: Pre-filled "Which database should we use?" (text input)
- Resolution field: Textarea, placeholder "What was decided?"
- Rationale field: Textarea, placeholder "Why was this the right choice?"
- Submit: "Log Decision" full-width primary button
- Back link below

**Rationale**: Pre-filled question field lowers cognitive load and demonstrates expected input format. Three fields mirror the real decision structure without overwhelming. This step teaches the core concept by doing.

---

### Step 3: Success State

**Purpose**: Celebrate the first decision and reveal the quality score -- the "aha moment."
**Layout**: Centered text block replacing the form. Score badge + heading + subtitle + CTA.
**Key elements**:
- Score badge: w-24 h-24 rounded-full, emerald/15 bg, emerald-500 border-2, "84/100" text inside
- Badge animation: scale from 0.6 to 1.1 to 1.0, opacity 0 to 1, 0.6s ease-out
- "Quality Score" label in emerald-400 uppercase xs
- Heading: "Your workspace is ready!" in 2xl bold white
- Subtitle: "Great first decision. Your team is going to love this."
- CTA: "Go to Workspace" full-width primary button
- Confetti: 40 absolutely-positioned colored dots (6 colors) with translateY + rotate keyframe animation, 1.5s duration, staggered delays

**Rationale**: The score reveal is the emotional peak of onboarding. Animation builds anticipation. Confetti creates a celebratory moment that associates positive emotion with Decision DNA. The score (84/100) is intentionally good but not perfect -- suggesting room for improvement encourages continued use.

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Step 1 active** | Workspace name input visible. Circle 1 blue, 2-3 gray outlines. Lines gray. | Default on load |
| **Step 1 -> Step 2** | Step 1 fades out (opacity 0, translateY 12px). Step 2 fades in. Circle 1 turns green with checkmark. Line 1-2 turns green. Circle 2 turns blue. | 0.35s transition |
| **Option hover** | Card border turns primary, subtle primary/5 background tint | CSS transition 0.15s |
| **Option selected** | Card gets primary border, primary/8 background, primary box-shadow ring. Others reset. | JS class toggle |
| **Step 2 -> Step 3** | Same fade transition. Circle 2 turns green. Line 2-3 turns green. Circle 3 turns blue. | 400ms delay after selection |
| **Form -> Success** | Form div gets hidden class. Success div removes hidden class. Score badge animates in after 200ms. Confetti spawns after 600ms. | JS class toggles + setTimeout |
| **Confetti** | 40 dots spawn at random x positions (0-100%) and y positions (0-40%) with random colors, staggered delays (0-0.8s), random durations (1-2s). Auto-cleanup after 3s. | JS-generated DOM elements |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Card container takes full width minus p-4 body padding. All content stacks naturally. Option cards full width. |
| **Tablet** (640-1024px) | Same centered card layout. Comfortable sizing. |
| **Desktop** (> 1024px) | Centered card at max-w-lg (512px). Generous surrounding whitespace on dark background. |

---

## Cognitive Load Assessment

- **Information density**: Low -- each step shows only 1-3 inputs. Progressive disclosure across steps keeps each view focused.
- **Visual hierarchy**: Clear -- step heading is primary, form inputs are secondary, progress indicator provides orientation. Score badge in success state is the dominant element.
- **Progressive disclosure**: 3-step wizard reveals complexity gradually. Step 1 = 1 field. Step 2 = 3 choices. Step 3 = 3 fields. Success = celebration.
- **Interaction complexity**: Very low per step -- Step 1 has 1 input + 1 button, Step 2 has 3 clickable cards, Step 3 has 3 inputs + 1 button. Total onboarding: ~7 interactions.

---

## Accessibility Notes

- **Contrast**: White text on slate-900/950 backgrounds (~15:1). Primary blue on slate-900 (~3.5:1 for small text -- may need verification). Emerald-400 on slate-950 for score text.
- **Focus order**: Step 1: input -> continue button. Step 2: option cards -> back button. Step 3: question -> resolution -> rationale -> log decision -> back.
- **Screen reader**: Step transitions should announce the new step heading. Progress indicator circles contain step numbers as text. Confetti is decorative (pointer-events none). Score badge should be announced.
- **Keyboard**: All option cards are buttons. All form inputs are standard. Back links are buttons. Enter should submit forms.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Dark theme (first dark-themed screen) | Signals transition from marketing (light) to app (dark) | No -- intentional theme boundary |
| Confetti animation | Celebration pattern specific to onboarding success moment | No -- one-off use |
| Pre-filled form field | Onboarding-specific to reduce friction and demonstrate expected input | No -- contextual pattern |
| Hardcoded score (84/100) | Mockup fidelity -- real score will be AI-calculated | Yes -- document scoring algorithm |

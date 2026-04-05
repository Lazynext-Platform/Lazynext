# Design Brief — Onboarding Flow

> **Feature**: 04 — Onboarding Flow
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A 3-step onboarding wizard that guides new users through workspace creation, setup method selection, and their first decision log with quality score reveal.
**Why**: Reduce time-to-value by getting users to a working workspace fast while demonstrating the platform's unique Decision DNA feature in the very first session.
**Where**: Post-authentication flow, before the user reaches the main Workflow Canvas.

---

## Target Users

- **Brand new users**: Just created an account, need to set up their first workspace and understand the platform's value.
- **Team leads setting up for their team**: Need workspace naming and a clear starting point (import, template, or blank).

---

## Requirements

### Must Have
- [x] 3-step progress indicator with numbered circles, connector lines, and completed/active/future states
- [x] Centered card container on dark background (slate-950) with Lazynext logo above
- [x] Step 1 -- Workspace Setup: Text input for workspace name, live URL slug preview (lazynext.com/ws/slug), Continue button
- [x] Step 2 -- Setup Choice: 3 option cards (Import, Use a Template with "Recommended" badge, Blank Canvas), each with icon, title, description, and right chevron
- [x] Step 3 -- First Decision: Form with Question, Resolution, and Rationale fields, pre-filled example ("Which database should we use?"), "Log Decision" button
- [x] Success state: Animated quality score badge (84/100) with pulse animation, "Your workspace is ready!" message, confetti effect, "Go to Workspace" CTA
- [x] Back navigation on Steps 2 and 3

### Nice to Have
- [x] Smooth step transitions with opacity + translateY animation (0.35s ease)
- [x] Score badge entrance animation (scale from 0.6 to 1.1 to 1.0 with opacity)
- [x] Confetti particles (40 colored dots) with fall + rotate animation
- [x] Option card selection state with primary border and background tint
- [x] Auto-advance from Step 2 to Step 3 after selecting an option (400ms delay)
- [x] Progress line color changes to emerald for completed steps

### Out of Scope
- Actual data import flow (Notion/Linear/Trello)
- Template gallery/selection
- Workspace settings configuration
- Team invite flow
- Real quality score calculation

---

## Layout

**Page type**: Full page (centered card wizard)
**Primary layout**: Single centered column, max-width 512px (max-w-lg)
**Key sections** (in order):
1. **Logo**: Centered Lazynext logo with lightning bolt icon + text
2. **Progress Indicator**: 3 numbered circles connected by lines, horizontally centered
3. **Card Container**: Rounded dark card (bg-slate-900, border-slate-800, p-8) containing the active step

---

## States & Interactions

| State | Description |
|---|---|
| **Step 1 (Default)** | Workspace name input focused. Progress: circle 1 active (blue), circles 2-3 future (outline). |
| **Step 2** | 3 option cards displayed. Progress: circle 1 completed (green checkmark), circle 2 active (blue), circle 3 future. Line 1-2 turns green. |
| **Step 3 - Form** | Decision form with 3 fields. Progress: circles 1-2 completed, circle 3 active. Both lines green. |
| **Step 3 - Success** | Form hidden, score badge animates in, confetti spawns. "Go to Workspace" button shown. |
| **Option selected** | Selected card gets primary border, primary/8 background, and box-shadow. Other cards remain default. |
| **Empty** | N/A -- form fields have placeholders and pre-filled example |
| **Loading** | Not designed -- would show button loading state |
| **Error** | Not designed -- would show inline field errors |

**Key interactions**:
- **Step navigation**: Continue button or option selection advances to next step. Back button returns to previous step.
- **Slug preview**: Typing in workspace name live-updates the URL slug below the input (lowercased, hyphenated).
- **Option selection**: Clicking an option card highlights it, then auto-advances to Step 3 after 400ms.
- **Log Decision**: Submit button hides form, shows success state with animated score and confetti.
- **Go to Workspace**: Final CTA (alerts in mockup, would navigate to canvas in production).

---

## Responsive Behavior

- **Mobile**: Card container takes full width minus p-4 body padding. All elements stack naturally. Option cards remain full-width.
- **Tablet**: Same layout, generous whitespace.
- **Desktop**: Centered card at max-w-lg (512px). Comfortable reading width.

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Step 1 heading** | Static | "Let's set up your workspace" |
| **Step 1 subtitle** | Static | "This is where your team will collaborate." |
| **Workspace name label** | Static | "Workspace name" |
| **Workspace placeholder** | Static | "e.g. Acme Corp" |
| **Slug preview** | Dynamic | "lazynext.com/ws/acme-corp" |
| **Step 2 heading** | Static | "How would you like to start?" |
| **Step 2 subtitle** | Static | "Pick the setup that works best for your team." |
| **Option 1** | Static | "Import -- Bring your data from Notion, Linear, Trello, or CSV" |
| **Option 2** | Static | "Use a Template -- Start with a pre-built workflow for your team type" (Recommended badge) |
| **Option 3** | Static | "Blank Canvas -- Start from scratch with an empty workflow" |
| **Step 3 heading** | Static | "Log your first decision" |
| **Step 3 subtitle** | Static | "Decision DNA is what makes Lazynext unique. Try logging a decision your team recently made." |
| **Question field** | Pre-filled | "Which database should we use?" |
| **Resolution field** | Placeholder | "What was decided?" |
| **Rationale field** | Placeholder | "Why was this the right choice?" |
| **Score** | Static | 84/100 |
| **Success heading** | Static | "Your workspace is ready!" |
| **Success subtitle** | Static | "Great first decision. Your team is going to love this." |

---

## Constraints

- Dark theme (bg-slate-950 body, bg-slate-900 card) -- first app-themed screen after light marketing/auth pages
- Inter font family from Google Fonts
- Tailwind CSS via CDN
- Primary color: #4F6EF7 for active states, emerald-500 for completed states
- Step transitions use CSS opacity + transform with 0.35s ease
- Confetti uses JS to create 40 absolutely-positioned colored dots with CSS animation
- Quality score is hardcoded to 84/100 in mockup
- No actual data persistence

---

## References

- Onboarding wizard patterns: Notion, Linear, Slack workspace setup
- Decision DNA concept from Lazynext platform architecture
- Confetti/celebration pattern: Stripe checkout success, GitHub achievements

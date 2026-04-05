# Design Spec — Auth Pages

> **Feature**: 03 — Auth Pages
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview

**What was designed**: Sign Up and Sign In pages with a two-panel split layout, social login (Google/GitHub), email/password forms, and animated view toggling.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Split-panel layout with brand storytelling on left; social login placed above email form to encourage lowest-friction path; white background for form panel (matching marketing theme, not app dark theme); single-page view toggle instead of separate routes.

---

## Section Breakdown

### Left Brand Panel (Desktop Only)

**Purpose**: Reinforce brand value during the sign-up/in moment when users are deciding to commit.
**Layout**: Full-height left half (lg:w-1/2) with blue gradient background, flex column with justify-between. Content block at top, copyright at bottom.
**Key elements**:
- Logo: Lightning bolt icon in white/20 rounded box + "Lazynext" text in white 2xl bold
- Headline: "The operating system for work" in white 4xl bold
- Subtitle: "Everything your team needs to move fast and stay aligned." in blue-100
- 3 feature cards: Each with white/15 icon box, title in white semibold, description in blue-100 sm
  - Decision DNA: checkmark-circle icon
  - Unified Workflows: users icon
  - AI-Powered Insights: trending-up icon
- Footer: copyright text in blue-200 sm

**Rationale**: The left panel serves as a "last pitch" during account creation. Three feature highlights mirror the key selling points without overwhelming. Blue gradient creates visual separation from the functional form panel.

---

### Right Form Panel

**Purpose**: Primary interaction area for account creation or sign-in.
**Layout**: Full-height right half (lg:w-1/2, full width on mobile). Flexbox centered. Max-width 448px (max-w-md) form container.
**Key elements**:

**Mobile logo** (lg:hidden):
- Smaller logo centered above form on mobile/tablet

**Sign Up View** (default visible):
- Heading: "Create your account" in 2xl bold
- Subtitle: "Get started for free. No credit card required." in slate-500
- Social buttons: Google (with colored G logo SVG) and GitHub (with GitHub logo SVG), full-width outline buttons
- "OR" divider: Horizontal lines with centered text
- Email field: Label "Email", placeholder "you@company.com", focus ring blue-500
- Password field: Label "Password", placeholder "Create a password", eye toggle button
- Submit: "Create Account" full-width primary button (py-3)
- Toggle: "Already have an account? Sign in" centered text
- Legal: ToS and Privacy Policy links in xs slate-400

**Sign In View** (hidden by default):
- Heading: "Welcome back" in 2xl bold
- Subtitle: "Sign in to your Lazynext workspace." in slate-500
- Social buttons: Same as sign-up but "Sign in with" labels
- "OR" divider
- Email field: Same as sign-up
- Password field: Label row has "Password" left + "Forgot password?" link right, placeholder "Enter your password"
- Submit: "Sign In" full-width primary button
- Toggle: "Don't have an account? Sign up" centered text

**Rationale**: Social login buttons placed first (above email form) to encourage the fastest registration path. "OR" divider clearly separates methods. Password visibility toggle is a standard UX pattern. Legal text only on sign-up (where consent is needed).

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Sign Up (default)** | Sign Up form visible (opacity 1, position relative). Sign In hidden (opacity 0, position absolute, pointer-events none). | Initial page load state |
| **Sign In** | Sign In form visible. Sign Up hidden. | Toggled via JS showView() |
| **Password hidden** | Input type="password". Eye-off SVG visible, eye-on SVG hidden. | Default for both forms |
| **Password visible** | Input type="text". Eye-on SVG visible, eye-off SVG hidden. | Toggled via togglePassword() |
| **Focus on input** | Ring-2 ring-blue-500, border transparent. | Tailwind focus: classes |
| **Button hover** | Background darkens to #3D5BD4. | Tailwind hover: class |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Left panel hidden. Mobile logo shown centered. Form panel full width. Padding p-6. |
| **Tablet** (640-1023px) | Same as mobile. Left panel still hidden (requires lg). Padding sm:p-12. |
| **Desktop** (>= 1024px) | Split layout: left panel lg:w-1/2 visible with blue gradient, right panel lg:w-1/2. Mobile logo hidden. |

---

## Cognitive Load Assessment

- **Information density**: Low -- single form with 2-3 fields and 2 social buttons. Clean whitespace-heavy layout.
- **Visual hierarchy**: Clear -- heading is primary focus, social buttons are secondary (larger tap targets), email form is tertiary, legal text is minimal.
- **Progressive disclosure**: View toggle hides sign-in until needed. Password visibility is opt-in. Legal text is de-emphasized.
- **Interaction complexity**: Very low -- 2-3 form fields, 2 social buttons, 1 submit button. No multi-step flow.

---

## Accessibility Notes

- **Contrast**: Slate-900 text on white background (21:1). Primary blue buttons with white text. Left panel white text on blue gradient (~4.5:1 for headings). Blue-100 body text on blue gradient may need verification.
- **Focus order**: Social buttons (Google, GitHub) -> email input -> password input -> submit button -> toggle link -> legal links
- **Screen reader**: Form labels are explicit `<label>` elements associated by proximity. Social buttons have descriptive text ("Sign up with Google"). Password toggle button has no aria-label in mockup -- needs one.
- **Keyboard**: All interactive elements are buttons or inputs. Password toggle is a button. View toggle links are buttons. Tab order follows visual order.

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| White background (not dark theme) | Auth pages bridge marketing (light) and app (dark) -- chose light for consistency with marketing flow | Consider -- could be dark to match app |
| No form validation states | Mockup fidelity -- validation will be added in implementation | Yes -- add error state patterns |
| Password toggle lacks aria-label | Oversight in mockup | Yes -- add to implementation spec |

# Design Spec — LazyMind AI Panel

> **Feature**: 10 — LazyMind AI Panel
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview
**What was designed**: A right-side AI chat panel with structured conversational responses, quick actions, typing indicator, query counter, and email digest capabilities. The panel demonstrates two conversation patterns: workflow analysis (structured data blocks) and weekly digest (section-based summary).
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: AI responses use structured content blocks (colored backgrounds, grids, numbered lists) rather than plain text to improve scanability. The panel is a fixed-width overlay rather than resizable to maintain consistent formatting. Amber sparkle icon establishes AI identity distinct from the primary blue brand.

---

## Section Breakdown

### Panel Header
**Purpose**: Identify the AI assistant and show usage context
**Layout**: Fixed height (h-14), flex row, border-bottom
**Key elements**:
- Sparkle avatar: w-8 h-8 rounded circle, amber-500/20 bg, amber sparkle icon
- Title: "LazyMind" (text-sm, font-semibold)
- Subtitle: "AI Assistant / Llama 3.3 70B" (text-[10px], slate-400)
- Query counter badge: "34/100 today" (text-[10px], slate-800 bg pill)
- Close button: X icon, hover state
**Rationale**: Model name and query counter set expectations about capabilities and limits; amber color differentiates AI from user and system elements

### Welcome Message
**Purpose**: Orient users when panel first opens
**Layout**: Centered content block with icon and text
**Key elements**:
- Large sparkle icon (text-2xl) in amber circle (w-12 h-12)
- "How can I help with your workflow?" (text-sm, font-medium)
- "I can analyze decisions, suggest tasks, and generate insights." (text-xs, slate-500)
**Rationale**: Welcoming tone with specific capability hints reduces blank-slate paralysis

### User Messages
**Purpose**: Display user queries
**Layout**: Right-aligned, max-width 80%
**Key elements**:
- Blue bubble (bg-[#4F6EF7], white text)
- Rounded corners with flat bottom-right (rounded-br-sm) for chat tail effect
**Rationale**: Right-aligned blue bubbles follow standard chat convention; flat corner indicates message direction

### AI Responses — Workflow Analysis
**Purpose**: Provide structured data analysis
**Layout**: Left-aligned with sparkle avatar, max-width 85%
**Key elements**:
- Avatar: small sparkle in amber circle (w-6 h-6)
- Response card: slate-800 bg, slate-700 border, rounded with flat bottom-left
- Intro text: "Here's my analysis of your Q2 Product Sprint"
- **Status Summary block**: slate-900/50 bg, grid layout with label-value pairs (Tasks: 12 total breakdown, Decisions: 8 logged avg 78, Docs: 3 in progress)
- **Observations block**: amber-400 warning header, bulleted list with bold highlights (blocked task, pending outcomes, workload imbalance)
- **Recommended Actions block**: green-400 header, numbered list (tag outcomes, create decision, rebalance tasks)
**Rationale**: Structured blocks make dense data scannable; color-coded section headers (amber for warnings, green for actions) create visual priority

### AI Responses — Weekly Digest
**Purpose**: Summarize weekly activity in a digestible format
**Layout**: Same avatar + card pattern as workflow analysis
**Key elements**:
- Header: "Weekly Digest / Mar 28 - Apr 4" (text-xs, slate-400)
- 4 sections with colored icons: Completed (green checkmark), In Progress (blue play), Decision Quality (amber star), Action Needed (red warning)
- Each section: bold title + detail line
- Action button: "Send as email digest" (full-width, slate-700 bg)
**Rationale**: Consistent icon + section pattern makes the digest quick to scan; email action turns the chat response into a shareable artifact

### Typing Indicator
**Purpose**: Show AI is processing a response
**Layout**: Left-aligned with sparkle avatar, small bubble with 3 dots
**Key elements**:
- 3 animated dots (w-1.5 h-1.5, slate-400) with staggered opacity animation (1.4s infinite)
- Hidden by default, shown during processing
**Rationale**: Animated dots are the universal "typing" signal; staggered animation adds polish

### Quick Actions Bar
**Purpose**: Provide one-click access to common queries
**Layout**: Horizontal scrollable row, border-top, py-2
**Key elements**:
- 4 pill buttons: "Analyze Workflow" (chart icon), "Weekly Digest" (mail icon), "Suggest Tasks" (lightbulb icon), "Find Decisions" (search icon)
- Style: slate-800 bg, slate-700 border, rounded-full, whitespace-nowrap
**Rationale**: Quick actions lower the barrier to using AI — users don't need to know what to ask

### Input Area
**Purpose**: Type and send messages to the AI
**Layout**: Fixed bottom area, border-top, flex row
**Key elements**:
- Text input: slate-800 bg, slate-700 border, focus ring with primary blue
- Send button: w-10 h-10, primary blue bg, up-arrow icon
- Attribution line: "Powered by Llama 3.3 70B via Groq" + Cmd+L shortcut hint
**Rationale**: Standard chat input pattern; attribution builds trust in the AI model; keyboard shortcut promotes power-user adoption

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Panel closed** | Not visible, canvas at full width | Default app state |
| **Panel opening** | Slide-in animation (translateX 100% to 0, 0.2s ease-out) | Triggered by button or Cmd+L |
| **Welcome** | Centered welcome message, empty chat history | First open or cleared history |
| **Active conversation** | User and AI messages alternating | Scrollable chat area |
| **Typing** | Typing indicator visible, input disabled | 1.5s simulated delay |
| **Response received** | Typing indicator hides, AI response fades in | Auto-scroll to bottom |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Panel takes full viewport width as overlay; quick actions wrap or scroll; input remains fixed bottom |
| **Tablet** (640-1024px) | Panel at w-96 as overlay; canvas dimmed behind |
| **Desktop** (> 1024px) | Panel docked right at w-96; canvas and sidebar visible but dimmed to 40% opacity |

---

## Cognitive Load Assessment
- **Information density**: Medium — structured AI responses contain multiple data points but visual blocks and color coding make them parseable
- **Visual hierarchy**: Strong — user messages (blue) vs AI messages (slate with avatar) are immediately distinguishable; colored section headers within responses create sub-hierarchy
- **Progressive disclosure**: Good — welcome message orients new users; quick actions provide guided entry; detailed responses only appear when requested
- **Interaction complexity**: Low — simple chat input with Enter to send; quick action buttons for common tasks; no complex forms or multi-step interactions

---

## Accessibility Notes
- **Contrast**: Blue user bubbles on dark background maintain contrast; amber sparkle icons meet decorative contrast requirements
- **Focus order**: Close button > chat messages (scrollable region) > quick action buttons > chat input > send button
- **Screen reader**: Chat messages should be in a live region (aria-live) for new message announcements; quick action buttons have descriptive text labels
- **Keyboard**: Enter to send message; Cmd+L to toggle panel; Tab to navigate between input, send button, and quick actions

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Chat bubble with flat corner (rounded-br-sm / rounded-bl-sm) | Chat-specific UI pattern for message direction | Yes — add chat bubble component |
| Amber sparkle AI avatar | AI identity distinct from brand blue | Yes — establish AI identity pattern |
| Structured response blocks | AI-specific content formatting | Yes — add AI response card patterns |
| Query counter badge | Usage limit indicator | No — feature-specific |

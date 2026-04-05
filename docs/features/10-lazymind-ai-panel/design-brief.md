# Design Brief — LazyMind AI Panel

> **Feature**: 10 — LazyMind AI Panel
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A right-side chat panel for the LazyMind AI assistant that provides workflow analysis, weekly digests, task suggestions, and decision insights in a conversational interface with structured response formatting.
**Why**: AI assistance reduces the effort needed to track, analyze, and improve team workflows — making Lazynext the "anti-software" platform that does the thinking for you.
**Where**: Right-side panel that slides in from the edge, accessible via the "LazyMind" button in the top bar or keyboard shortcut Cmd+L.

---

## Target Users
- **Team leads**: Need workflow analysis and weekly digests without manual reporting
- **Individual contributors**: Need quick answers about decisions, task suggestions, and workflow status
- **All users**: Benefit from AI-powered insights that surface relevant information proactively

---

## Requirements

### Must Have
- [x] Slide-in panel from right (w-96) with smooth animation
- [x] Panel header with sparkle icon, "LazyMind" title, model indicator (Llama 3.3 70B), query counter (34/100 today), and close button
- [x] Welcome message with sparkle icon and helpful prompt
- [x] User messages (right-aligned, primary blue bubbles)
- [x] AI responses (left-aligned, slate-800 bg with border, sparkle avatar)
- [x] Structured response blocks: Status Summary (grid layout), Observations (warning-colored list), Recommended Actions (numbered list)
- [x] Weekly digest response format: Completed, In Progress, Decision Quality, Action Needed sections
- [x] "Send as email digest" action button within AI response
- [x] Typing indicator with animated dots
- [x] Quick action buttons: Analyze Workflow, Weekly Digest, Suggest Tasks, Find Decisions
- [x] Chat input with placeholder text and send button
- [x] Keyboard shortcut indicator (Cmd+L to toggle)
- [x] Model/provider attribution ("Powered by Llama 3.3 70B via Groq")

### Nice to Have
- [x] Slide-in animation (translateX 100% to 0)
- [x] Fade-in animation on new messages
- [x] Typing dot animation with staggered delays
- [x] Simulated response after 1.5s delay on user input
- [x] Enter key to send messages

### Out of Scope
- Actual AI model integration
- Conversation history persistence
- Multi-turn context awareness
- File/image upload in chat
- Voice input

---

## Layout

**Page type**: Right-side panel overlay
**Primary layout**: Fixed-width column (w-96) with flex-col layout: header, scrollable chat area, quick actions bar, input area
**Key sections** (in order):
1. **Panel header** (h-14): Sparkle avatar, "LazyMind" title, "AI Assistant / Llama 3.3 70B" subtitle, query counter badge, close button
2. **Chat messages** (flex-1, overflow-y-auto): Alternating user/AI messages with structured content blocks
3. **Quick actions bar**: Horizontally scrollable pill buttons with emoji icons
4. **Input area**: Text input + send button, powered-by attribution with keyboard shortcut

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Panel open with welcome message + sample conversation showing workflow analysis and weekly digest |
| **Empty** | Welcome message only: sparkle icon + "How can I help with your workflow?" + capability description |
| **Loading** | Typing indicator (3 animated dots) shown while AI processes |
| **Error** | Not explicitly mocked |
| **Success** | AI response appears with fade-in animation after typing indicator hides |

**Key interactions**:
- **Open panel**: Click "LazyMind" button in top bar or press Cmd+L
- **Close panel**: Click X button in header
- **Send message**: Type in input + click send button or press Enter
- **Quick action**: Click a pill button to send pre-defined query
- **Typing indicator**: Shows for 1.5s while simulating AI response
- **Action buttons in responses**: "Send as email digest" button in weekly digest response

---

## Responsive Behavior
- **Mobile**: Panel takes full screen width as an overlay
- **Tablet**: Panel overlays at w-96 with dimmed canvas behind
- **Desktop**: Panel docked to right side (w-96), canvas dimmed at 40% opacity behind

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Welcome message** | Static text | "How can I help with your workflow?" |
| **User message** | User-typed text | "Analyze our Q2 sprint workflow" |
| **AI structured response** | Multi-section card | Status Summary grid, Observations list, Recommended Actions list |
| **Weekly digest** | Formatted sections | Completed (4 tasks, 3 decisions), In Progress (5 tasks), Decision Quality (78 to 82 trend), Action Needed (1 blocked, 2 untagged) |
| **Query counter** | Dynamic count | "34/100 today" |
| **Quick actions** | Button labels | "Analyze Workflow", "Weekly Digest", "Suggest Tasks", "Find Decisions" |
| **Attribution** | Static text | "Powered by Llama 3.3 70B via Groq" |
| **Keyboard shortcut** | Key combo | Cmd+L |

---

## Constraints
- Query counter implies a daily usage limit (100 queries/day shown)
- Panel width is fixed at w-96 (384px) — does not resize
- AI responses use structured formatting blocks (not raw text) for data-heavy answers
- Chat area scrolls to bottom automatically when new messages appear
- Canvas behind panel is dimmed to 40% opacity to maintain focus on the panel

---

## References
- Feature 08 (Decision Health Dashboard) for AI insight card pattern
- Feature 07 (Decision DNA View) for decision data referenced in AI responses
- Lazynext design system: panel slide-in pattern, chat bubble pattern, sparkle icon for AI

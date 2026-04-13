# Design Spec — Thread Comments Panel

> **Feature**: 11 — Thread Comments Panel
> **Date**: 2026-04-05
> **Fidelity**: Mockup
> **Status**: Draft
> **Iterations**: 1

---

## Overview
**What was designed**: A right-side thread panel attached to a DECISION node, featuring a 5-message conversation with comparison tables, @mentions, emoji reactions, a resolve toggle, and an @mention popover. The mockup demonstrates a real-world decision discussion about database provider selection.
**Design brief**: [design-brief.md](./design-brief.md)
**Key decisions**: Thread is permanently tied to its parent decision (not a standalone chat). @mention popover uses role labels to help users tag the right people. Reactions use a compact pill design rather than full emoji picker. Resolve toggle is at the thread level to indicate when discussion is complete.

---

## Section Breakdown

### Panel Header
**Purpose**: Identify context (DECISION node) and provide close action
**Layout**: Fixed height (h-12), flex row
**Key elements**:
- Orange dot (w-3 h-3 rounded-full) + "DECISION" label (uppercase, orange-400, tracking-wider)
- Close button (X character, hover state)
**Rationale**: Orange color immediately signals this thread belongs to a Decision node

### Decision Summary
**Purpose**: Show the decision this thread is attached to without requiring navigation away
**Layout**: Compact card (px-4, py-3), border-bottom, bg-slate-900/50
**Key elements**:
- Decision title: "Use Supabase for Auth + DB?" (text-sm, font-semibold)
- Status badge: "Decided" (green pill)
- Quality score: "84" in small green circle with "Quality" label
- Date: "Apr 2, 2026" (right-aligned)
**Rationale**: Compact summary keeps the decision context visible while maximizing space for the thread

### Thread Header
**Purpose**: Thread metadata and resolve action
**Layout**: Slim bar (py-2.5), bg-slate-800/30, flex between
**Key elements**:
- Chat bubble icon + "Thread" label + message count badge ("5" in slate-700 pill)
- Resolve button: "Mark Resolved" with circle/checkmark icon, toggles to green state
**Rationale**: Resolve toggle provides clear signal when a decision discussion is complete

### Message List
**Purpose**: Display threaded conversation
**Layout**: Scrollable area (flex-1, overflow-y-auto), p-4, space-y-4
**Key elements**:

**Message 1 (Avas Patel, 3 days ago)**:
- Text: Research summary recommending Supabase
- Embedded comparison table: 5 features across 3 providers (Supabase, Firebase, PlanetScale)
- Table uses checkmark (green), X (red), tilde (amber) indicators
- Features: Serverless, India Region, Branching, Free Tier, SQL Flavor

**Message 2 (Priya Sharma, 3 days ago)**:
- Text: Questions PlanetScale's larger free tier
- Reaction: thumbs up (1)

**Message 3 (Avas Patel, 2 days ago)**:
- Text: Explains PlanetScale's MySQL issue and Supabase's RLS advantage

**Message 4 (Raj Kumar, 2 days ago)**:
- Text: Agreement with Supabase choice + @mention of Priya Sharma
- @mention styled as blue pill (bg-[#4F6EF7]/10, text-[#4F6EF7])

**Message 5 (Priya Sharma, 1 day ago)**:
- Text: Consensus to go with Supabase + thumbs up emoji
- Reactions: thumbs up (3, active/blue state) + party (2)

**Rationale**: Real conversation demonstrates natural decision discussion flow — research, challenge, response, consensus. Embedded table shows rich content capability.

### @Mention Popover
**Purpose**: Select a teammate to mention in a comment
**Layout**: Floating card above input area (hidden by default), slate-800 bg, border, shadow
**Key elements**:
- Header: "Mention a teammate" label
- 4 teammate rows: avatar (colored circle with initials) + name + role label (right-aligned)
- Teammates: Avas Patel (Admin), Priya Sharma (Admin, highlighted), Raj Kumar (Member), Neha Kapoor (Guest)
**Rationale**: Role labels help users tag the right person; popover appears on "@" trigger for fast mention insertion

### Input Area
**Purpose**: Compose and send comments
**Layout**: Fixed bottom, border-top, flex row with textarea + buttons
**Key elements**:
- Auto-resize textarea: placeholder "Add a comment... (@ to mention)", max 120px height
- Attachment button: paperclip icon, slate-400
- Send button: w-9 h-9, primary blue bg, up-arrow icon
- Helper text: "Threads stay attached to this decision forever." (text-[10px], slate-600)
**Rationale**: Helper text reinforces the permanent nature of decision threads; attachment button provides path for file sharing

---

## States

| State | Behavior | Notes |
|---|---|---|
| **Default** | Thread with 5 messages, unresolved | Primary viewing state |
| **@mention popover visible** | Popover appears when "@" is typed | Hides when character is deleted or teammate selected |
| **Resolved** | Resolve button turns green with checkmark icon | Visual indicator thread is complete |
| **Unresolved** | Resolve button shows circle icon, default slate styling | Can be toggled back |
| **New message posted** | Message appears with fade-in animation, count increments | Auto-scroll to bottom |
| **Reaction toggled** | Reaction count updates, active state toggles blue/slate | User's own reaction highlighted |

---

## Responsive Behavior

| Breakpoint | Changes |
|---|---|
| **Mobile** (< 640px) | Panel takes full viewport width; comparison table may need horizontal scroll; input area stays fixed bottom |
| **Tablet** (640-1024px) | Panel at w-96 as overlay; all content fits within panel width |
| **Desktop** (> 1024px) | Panel docked right at w-96; canvas and sidebar visible with dimmed overlay behind |

---

## Cognitive Load Assessment
- **Information density**: Medium — 5 messages with varied content types (text, table, mentions, reactions) but each message is individually simple
- **Visual hierarchy**: Strong — avatar + author + timestamp pattern is consistent; embedded table stands out as rich content; reactions are subtle and unobtrusive
- **Progressive disclosure**: Good — @mention popover only appears on trigger; resolve state is a simple toggle; helper text is minimal
- **Interaction complexity**: Low-medium — primary interaction is typing and sending messages; @mentions and reactions are secondary; resolve is a one-click toggle

---

## Accessibility Notes
- **Contrast**: Message text (slate-300) on dark backgrounds meets AA; @mention highlights (blue on dark) meet contrast requirements
- **Focus order**: Panel header close button > thread header resolve button > message list (role="log", aria-label) > textarea > attachment button > send button
- **Screen reader**: Message list uses role="log" with aria-label="Thread messages" for live region behavior; @mention popover should announce when opened; reaction buttons should announce their state
- **Keyboard**: Enter to send (Shift+Enter for newline); Tab navigation through input area controls; Escape to dismiss @mention popover

---

## Design System Deviations

| Deviation | Reason | Update Design System? |
|---|---|---|
| Embedded comparison table in message | Rich content within chat messages | Yes — add embedded table pattern for threads |
| @mention inline styling (.mention class) | Thread-specific blue pill highlight for user references | Yes — add @mention component |
| Reaction pill buttons | Compact emoji + count format | Yes — add reaction component |
| Auto-resize textarea | Thread input UX pattern | No — standard form behavior |

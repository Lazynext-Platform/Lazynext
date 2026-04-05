# Design Brief — Thread Comments Panel

> **Feature**: 11 — Thread Comments Panel
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A right-side panel showing a threaded conversation attached to a DECISION node, with messages, @mentions, emoji reactions, resolve/unresolve toggle, comparison tables, and an @mention popover for tagging teammates.
**Why**: Threads keep contextual discussion permanently attached to the decisions they relate to, building an auditable decision-making trail that persists beyond chat messages.
**Where**: Right-side panel (w-96) that opens when viewing a decision node, showing the decision summary at top and thread below.

---

## Target Users
- **Decision participants**: Need to discuss and debate options before and after a decision is made
- **Team members**: Need to reference past discussion context when reviewing decisions
- **New team members**: Need to understand the reasoning and debate behind past decisions

---

## Requirements

### Must Have
- [x] Decision summary header: title, status badge (Decided), quality score (84), date
- [x] Thread section header with message count badge and resolve toggle button
- [x] Message list with avatar, author name, timestamp, and message body
- [x] Embedded comparison table within a message (Neon vs Supabase vs PlanetScale with feature rows)
- [x] @mention inline styling (blue highlight with @ prefix)
- [x] Emoji reactions on messages (thumbs up, party) with counts and active/inactive states
- [x] @mention popover triggered by typing "@" with teammate list (avatar, name, role)
- [x] Comment input with textarea, attachment button, and send button
- [x] Auto-resize textarea on multi-line input
- [x] Enter to send (Shift+Enter for new line)
- [x] "Threads stay attached to this decision forever" helper text

### Nice to Have
- [x] Fade-in animation on messages
- [x] Active reaction state (blue highlight for user's own reactions)
- [x] Dynamic message count update when posting new comments
- [x] Resolve/unresolve toggle with visual state change (green border + checkmark)

### Out of Scope
- File attachment upload flow
- Threaded replies (sub-threads)
- Message editing or deletion
- Real-time presence indicators in thread
- Rich text formatting in comments

---

## Layout

**Page type**: Right-side panel with decision context
**Primary layout**: Fixed-width column (w-96) with flex-col: decision header, thread header, scrollable messages, @mention popover, input area
**Key sections** (in order):
1. **Panel header** (h-12): Orange dot + "DECISION" label + close button
2. **Decision summary**: Title, status badge (Decided/green), quality score (84/green), date
3. **Thread header**: Chat icon + "Thread" label + message count badge + Resolve toggle
4. **Message list** (flex-1, scrollable): 5 sample messages from 3 participants
5. **@Mention popover** (hidden by default): Teammate list with avatars and roles
6. **Input area**: Auto-resize textarea + attachment button + send button + helper text

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Panel open with decision summary and 5 thread messages, unresolved state |
| **Empty** | Thread header shows count "0", empty message area (not explicitly mocked) |
| **Loading** | Not explicitly mocked |
| **Error** | Not explicitly mocked |
| **Success** | New message appears with fade-in animation, count updates |

**Key interactions**:
- **Post comment**: Type in textarea + click send or press Enter
- **@mention trigger**: Type "@" to show popover; click teammate name to insert mention
- **Emoji reaction**: Click reaction button to toggle; count updates
- **Resolve toggle**: Click to mark thread resolved (green state) or unresolve
- **Attach file**: Attachment button (functionality not wired in mockup)
- **Auto-resize textarea**: Textarea grows as user types, max height 120px
- **Close panel**: X button in panel header

---

## Responsive Behavior
- **Mobile**: Panel takes full screen width as overlay
- **Tablet**: Panel overlays at w-96
- **Desktop**: Panel docked right at w-96, canvas visible but dimmed behind

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Decision title** | User-generated | "Use Neon vs Supabase for DB?" |
| **Decision status** | Enum badge | "Decided" (green) |
| **Quality score** | Computed | "84" in green circle |
| **Messages** | User-generated | Discussion about Neon vs Supabase vs PlanetScale |
| **Comparison table** | Embedded rich content | Feature matrix: Serverless, India Region, Branching, Free Tier, SQL Flavor across 3 providers |
| **@Mentions** | User references | "@Priya Sharma" styled as blue pill |
| **Reactions** | Emoji + count | Thumbs up (1, 3), Party (2) |
| **Timestamps** | Relative time | "3 days ago", "2 days ago", "1 day ago" |
| **Team members** | Avatar + name + role | Avas Patel (Admin), Priya Sharma (Admin), Raj Kumar (Member), Neha Kapoor (Guest) |

---

## Constraints
- Threads are permanently attached to their parent decision node — "Threads stay attached to this decision forever"
- @mention popover only appears when the user types "@" as the last character
- Enter sends the message; Shift+Enter creates a new line
- Textarea auto-resizes up to max height of 120px, then scrolls
- Reactions show active state (blue highlight) when the current user has reacted
- Resolve toggle is a thread-level action, not per-message

---

## References
- Feature 09 (Node Detail Panels) for decision panel with collapsible thread section
- Feature 07 (Decision DNA View) for decision data structure
- Lazynext design system: panel pattern, chat message pattern, avatar system

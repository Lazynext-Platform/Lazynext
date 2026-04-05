# Design Spec — Command Palette & Search

> Feature: 14 — Command Palette & Search
> Date: 2026-04-05
> Fidelity: Mockup
> Status: Draft
> Iterations: 1

---

## Overview

**What was designed:** Two modal overlay interfaces — a compact Command Palette (max-w-lg) for keyboard-driven actions and navigation, and a wider Global Search panel (max-w-2xl) for full-text content search with tabbed filtering, highlighted matches, and a semantic search prompt.

**Design brief:** `docs/features/14-command-palette-search/design-brief.md`

**Key design decisions:**
1. Two separate overlays rather than one merged interface — keeps the palette fast and lightweight for actions, while search gets more screen real estate for rich result previews.
2. Grouped results in the palette (Quick Actions / Recent / Navigation) with visual dividers — mimics Linear's proven command palette pattern.
3. Highlighted keyword matches use `<mark>` with primary/30 background — ensures matches are visible without overwhelming the result text.
4. Semantic search hint at the bottom of results educates users about AI-powered natural language search without blocking the result flow.

---

## Section Breakdown

### 1. Command Palette — Search Input

**Purpose:** Entry point for typing commands or filter queries.

**Layout:** Full-width row (px-4 py-3) with bottom border. Flex row: magnifying glass SVG icon (slate-400) + text input (flex-1) + Cmd+K kbd badge.

**Key elements:**
- Search icon: w-5 h-5, slate-400 stroke
- Input: bg-transparent, sm text, placeholder "Type a command or search...", auto-focused
- kbd badge: 10px Inter, bg-slate-800, border slate-700, rounded-4px

**Rationale:** Minimal chrome keeps focus on the input. kbd badge reminds users of the shortcut without cluttering.

---

### 2. Command Palette — Quick Actions

**Purpose:** Provide one-keystroke access to the most common creation and navigation actions.

**Layout:** Section header (10px uppercase tracking-wider, slate-500) followed by 4 full-width button rows. Each row: colored icon container (w-7 h-7, rounded-md) + text block (title + description) + kbd shortcut badge.

**Key elements:**
- Create Task: blue icon, shortcut T
- Create Doc: green icon, shortcut D
- Log Decision: orange icon, shortcut X (active/selected state shown)
- Open LazyMind: amber sparkle icon, shortcut Cmd+L
- Active item: result-active class — primary/10 bg, primary/30 left border

**Rationale:** Four actions map to Lazynext's core primitives. Single-letter shortcuts reduce friction to near zero. Orange "Log Decision" shown as active demonstrates the selection state.

---

### 3. Command Palette — Recent Items

**Purpose:** Surface recently accessed entities for quick re-opening.

**Layout:** Section header + 3 button rows. Each row: entity-type icon + title + metadata line (type, status/detail, context) + relative timestamp.

**Key elements:**
- "Ship onboarding v2" — Task, In Progress, Q2 Sprint, 2h ago
- "Use Neon vs Supabase for DB?" — Decision, Decided, Score 84, 1d ago
- "Product Requirements Doc" — Doc, 1,240 words, Q2 Sprint, 3d ago
- Timestamps in 10px slate-600

**Rationale:** Recent items reduce the need to type — most returns to work involve the same few entities. Metadata provides enough context to differentiate items without opening them.

---

### 4. Command Palette — Navigation

**Purpose:** Allow quick jumping to key app sections.

**Layout:** Section header + 3 button rows. Each row: right-arrow icon (slate-400) + "Go to [Page]" text.

**Key elements:**
- Go to Decision DNA
- Go to Settings
- Go to Templates

**Rationale:** Navigation shortcuts complement the sidebar — users can reach any section without mousing to the sidebar.

---

### 5. Command Palette — Footer

**Purpose:** Teach keyboard navigation and offer a path to full search.

**Layout:** Full-width bar (px-4 py-2, border-t slate-800). Flex row of keyboard hint groups. "Cmd+Shift+F full search" aligned right.

**Key elements:**
- Arrow keys: navigate
- Enter: select
- Esc: close
- Cmd+Shift+F: full search (right-aligned)

**Rationale:** Footer serves as persistent keyboard cheat sheet. The "full search" shortcut makes the palette a gateway to deeper search.

---

### 6. Global Search — Input & Tabs

**Purpose:** Accept a typed query and allow filtering by entity type.

**Layout:** Search input row identical to palette but wider, with blue magnifying glass icon, pre-filled query, Clear button, and Cmd+Shift+F badge. Below: tab bar with 4 tabs.

**Key elements:**
- Input value: "neon database"
- Clear button: 10px text, slate-500
- Tabs: All (12), Tasks (3), Docs (4), Decisions (5)
- Active tab: primary text + 2px bottom border in primary
- Inactive tab: slate-400 text, no border

**Rationale:** Tabbed filtering lets users narrow results by type without modifying the query. Counts per tab give immediate signal about where matches live.

---

### 7. Global Search — Results List

**Purpose:** Display matching entities with highlighted keywords, snippets, and metadata.

**Layout:** Scrollable container (max-h-450px). Each result: flex row with entity icon (w-8 h-8), content block (title with marks, snippet with marks, metadata row), left border on hover colored by entity type.

**Key elements:**
- Decision results: orange icon, title with `<mark>` highlights, snippet text, metadata (type, quality score, workflow)
- Doc results: green icon, title, snippet with highlights, metadata (type, word count, workflow)
- Task results: blue icon, title with highlights, status badge, metadata (type, assignee, date)
- Status badges: green "Decided"/"Done", blue "In Progress", gray "Open"
- Left border on hover: orange for decisions, green for docs, blue for tasks

**Rationale:** Entity-type color coding carries over from the rest of the app. Mark highlights use primary/30 background — visible but not harsh on dark theme. Snippets show surrounding context to help users judge relevance.

---

### 8. Global Search — Semantic Search Hint

**Purpose:** Educate users about natural language / AI-powered search capabilities.

**Layout:** Bottom of results list, separated by border-t. Callout box with sparkle icon, text with bold "Semantic search" label in primary color, and example questions.

**Key elements:**
- Sparkle emoji icon
- "Semantic search" in primary bold
- Example queries: "Why did we choose Neon?" or "What decisions about pricing?"
- Box: primary/5 bg, primary/20 border, rounded-md

**Rationale:** Positioned at the end of keyword results to suggest AI search as a next step. Non-intrusive styling avoids competing with actual results.

---

## States

| Component | State | Visual Treatment |
|---|---|---|
| Backdrop | Visible | bg-black/60, backdrop-blur-sm, fade-in animation |
| Modal | Entry | scale-in animation (0.95 + translateY to 1.0, 150ms ease-out) |
| Palette input | Focused | No visible ring (bg-transparent), cursor active |
| Result item | Default | Transparent bg, no border |
| Result item | Hover | bg-slate-800 |
| Result item | Active/Selected | bg-primary/10, 2px left border primary/30 |
| Search tab | Active | text-primary, border-b-2 border-primary, font-medium |
| Search tab | Inactive | text-slate-400 |
| Search result | Hover | bg-slate-800, left border colored by entity type |
| Mark highlight | Static | bg-primary/30, text-slate-200, rounded 2px, px 2px |
| kbd badge | Static | 10px, bg-slate-800, border slate-700, rounded-4px |

---

## Responsive Behavior

| Breakpoint | Component | Behavior |
|---|---|---|
| lg+ | Command Palette | max-w-lg (512px), 15vh top offset |
| lg+ | Global Search | max-w-2xl (672px), 10vh top offset |
| md (768–1023px) | Both | Same widths, reduced top offset to 8vh |
| sm (<768px) | Both | Near full-width (mx-4), top offset 4vh, results max-height reduced |
| sm | kbd badges | Hidden (keyboard shortcuts not applicable on touch) |
| sm | Footer hints | Simplified to just "Tap to select" and "Swipe down to close" |

---

## Cognitive Load Assessment

**Information density:** Low for palette (10 items max in view), Moderate for search (6 rich result cards visible).

**Scanning pattern:** Linear vertical scan. Palette groups provide clear section boundaries. Search results use consistent card layout for predictable scanning.

**Interaction model:** Keyboard-first (arrows + enter) with mouse as fallback. Muscle-memory shortcuts (T, D, X) reduce cognitive overhead for repeat users.

**Learning curve:** Low — patterns borrowed from widely-adopted tools (VS Code, Linear, Raycast). Semantic search hint introduces the AI feature without requiring prior knowledge.

**Cognitive load rating:** 2/5 — intentionally minimal. Overlays show only what is needed, dismiss instantly, and never block the user's workflow context.

---

## Accessibility Notes

- Both overlays must implement focus trap — Tab cycles through results, Shift+Tab reverses
- Escape key closes the overlay and returns focus to the previously focused element
- Results should be an ARIA listbox with `role="option"` on each item
- Active/selected item must have `aria-selected="true"`
- Search input should have `aria-label="Search commands"` (palette) or `aria-label="Search workspace"` (global search)
- Mark highlights should not affect screen reader pronunciation — use `aria-label` on the result title with the full unhighlighted text
- Tab bar should use `role="tablist"` with `role="tab"` and `aria-selected`
- Backdrop should have `aria-hidden="true"`
- Minimum touch target size of 44x44px for mobile result items

---

## Design System Deviations

| Deviation | Reason |
|---|---|
| Mark highlight uses custom CSS (primary/30 bg, 2px radius) | Standard text highlighting does not exist in the design system; this is a search-specific pattern |
| kbd styling is custom inline CSS | Keyboard badges are unique to this feature; consider promoting to design system if reused |
| Palette uses emoji icons for entity types (clipboard, document, checkmark, sparkle) | Placeholder for proper icon set; should be replaced with SVG icons from the design system icon library |
| Global Search is wider (max-w-2xl) than the palette (max-w-lg) | Search results need more horizontal space for snippets and metadata; intentional asymmetry |

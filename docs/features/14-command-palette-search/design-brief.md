# Design Brief — Command Palette & Search

> Feature: 14 — Command Palette & Search
> Date: 2026-04-05
> Target Fidelity: Mockup

---

## Overview

**What:** Two complementary overlay interfaces — a Command Palette (triggered by Cmd+K) for quick actions and navigation, and a Global Search panel (triggered by Cmd+Shift+F) for full-text search across all workspace content with typed/tabbed results and semantic search hints.

**Why:** Power users expect keyboard-first navigation. The command palette reduces the number of clicks to perform common actions (create task, log decision, open LazyMind) to near zero. Global search lets users find any node — task, doc, or decision — by content, with highlighted keyword matches and contextual metadata. Together, these two overlays eliminate the need for deep navigation drilling.

**Where:** Modal overlays centered on screen (15vh from top for palette, 10vh for search), triggered from anywhere in the app via keyboard shortcuts. Both render over a dimmed/blurred backdrop.

---

## Target Users

| Persona | Goal |
|---|---|
| Power user / IC | Execute actions without leaving the keyboard |
| Any team member | Find a specific task, doc, or decision by keyword |
| Decision maker | Look up past decisions by topic using semantic search |

---

## Requirements

### Must Have
- [x] Command Palette overlay with search input, grouped result sections (Quick Actions, Recent, Navigation), and keyboard shortcut hints
- [x] Quick Actions: Create Task (T), Create Doc (D), Log Decision (X), Open LazyMind (Cmd+L)
- [x] Recent items showing entity type, title, status, and recency timestamp
- [x] Navigation shortcuts to key pages (Decision DNA, Settings, Templates)
- [x] Footer with keyboard navigation hints (arrows, enter, esc, Cmd+Shift+F to switch)
- [x] Global Search overlay with typed query input, tabbed results (All, Tasks, Docs, Decisions), and result count per tab
- [x] Search results with highlighted keyword matches (mark tags), entity icon, title, snippet, metadata row
- [x] Semantic search hint banner at the bottom of results

### Nice to Have
- [x] Active/selected state on one result item (blue highlight + left border)
- [x] Filtering by typing in the palette input (live client-side filter)
- [x] Clear button in search input
- [x] View toggle buttons for mockup demo (Command Palette / Global Search)

### Out of Scope
- Server-side search implementation
- Search indexing configuration
- Search result pagination
- Saved searches / search history

---

## Layout

| Attribute | Value |
|---|---|
| Page type | Modal overlay (not a page) |
| Backdrop | Fixed inset-0, black/60, backdrop-blur-sm |
| Command Palette | max-w-lg, centered horizontally, 15vh from top |
| Global Search | max-w-2xl, centered horizontally, 10vh from top |
| Chrome | bg-slate-900, border slate-700, rounded-xl, shadow-2xl |

### Command Palette Sections
1. **Search input** — magnifying glass icon, placeholder text, Cmd+K kbd badge
2. **Quick Actions group** — 4 action rows with colored icons, descriptions, and shortcut kbd badges
3. **Recent group** — 3 recent items with entity icons, titles, metadata, and timestamps
4. **Navigation group** — 3 navigation links with arrow icons
5. **Footer** — keyboard hint bar (arrows, enter, esc, Cmd+Shift+F)

### Global Search Sections
1. **Search input** — blue magnifying glass, pre-filled query, Clear button, Cmd+Shift+F badge
2. **Tab bar** — All (12), Tasks (3), Docs (4), Decisions (5)
3. **Results list** — scrollable list of result cards with icon, title (with highlights), snippet, metadata
4. **Semantic search hint** — callout banner suggesting natural language queries
5. **Footer** — keyboard hint bar with result count

---

## States & Interactions

| Element | State | Behavior |
|---|---|---|
| Backdrop | Visible | Black 60% opacity with backdrop blur; click to dismiss |
| Modal container | Entry | Scale-in animation (0.95 to 1.0 scale + translateY) over 150ms |
| Palette input | Focused | Auto-focused on open; typing filters results client-side |
| Result item | Default | Transparent background |
| Result item | Hover | bg-slate-800 |
| Result item | Active/Selected | Blue tinted bg (primary/10), left border primary/30 |
| Result item | Click / Enter | Navigates to the entity or executes the action |
| Quick Action kbd | Static | Styled as keyboard key (slate background, border, rounded) |
| Tab (Search) | Active | Primary color text, 2px bottom border in primary |
| Tab (Search) | Inactive | slate-400 text, no border |
| Search highlight | Static | mark element with primary/30 background, rounded 2px |
| Semantic hint | Static | Primary/5 background with primary/20 border, sparkle icon |
| Esc key | Press | Closes the overlay |
| Cmd+K | Press | Opens command palette (or focuses it if search is open) |
| Cmd+Shift+F | Press | Opens global search (or switches from palette) |

---

## Responsive Behavior

| Breakpoint | Adaptation |
|---|---|
| Desktop | Centered overlay at designed widths (lg: 512px palette, 672px search) |
| Tablet | Same overlay sizing, slightly reduced vertical offset |
| Mobile | Overlay expands to near-full-width with horizontal padding; keyboard shortcuts less relevant (touch-first) |

---

## Content

| Element | Copy / Data |
|---|---|
| Palette placeholder | "Type a command or search..." |
| Quick Actions | Create Task, Create Doc, Log Decision, Open LazyMind |
| Recent items | "Ship onboarding v2" (Task, In Progress, 2h ago), "Use Neon vs Supabase for DB?" (Decision, Decided, Score 84, 1d ago), "Product Requirements Doc" (Doc, 1,240 words, 3d ago) |
| Navigation items | Go to Decision DNA, Go to Settings, Go to Templates |
| Search query example | "neon database" |
| Tab counts | All: 12, Tasks: 3, Docs: 4, Decisions: 5 |
| Result examples | "Use Neon vs Supabase for DB?" (Decision, Quality 84), "Technical Architecture" (Doc, 3,450 words), "Set up Neon database" (Task, Done), "Database migration strategy?" (Decision, Quality 56, Open), "Cost Analysis" (Doc, 890 words), "Configure Neon branching for CI" (Task, In Progress) |
| Semantic hint | 'Try asking questions like "Why did we choose Neon?" or "What decisions about pricing?"' |

---

## Constraints

- Both overlays must be dismissible via Escape key and backdrop click
- Keyboard navigation (arrow keys + enter) must work for all result items
- Command palette must open in under 100ms (no server round-trip)
- Search results should render within 300ms of query input (debounced)
- Only one overlay can be active at a time — switching replaces the current
- Overlays must trap focus for accessibility

---

## References

- Mockup: `docs/features/14-command-palette-search/mockups/command-palette-search.html`
- Design system: Inter font, dark theme (slate-950 bg), primary #4F6EF7
- Inspiration: Linear Cmd+K, Raycast, VS Code command palette, Notion search
- kbd styling: 10px Inter, bg-slate-800, border slate-700, rounded 4px, text slate-400

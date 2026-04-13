# Design Brief — Mobile App View

> **Feature**: 06 — Mobile App View
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: A mobile-optimized NodeListView that replaces the spatial canvas with a scrollable card list, filter pills, bottom navigation, and a hamburger-triggered sidebar overlay.
**Why**: The spatial canvas is not practical on small screens -- mobile users need a touch-friendly list view to browse, filter, and access their workflow nodes while maintaining the same information architecture.
**Where**: Mobile web or PWA view of the Workflow Canvas, displayed when viewport <= 390px.

---

## Target Users

- **Team members on the go**: Need to check task statuses, review decisions, and scan docs from their phone.
- **Managers checking in**: Need quick project pulse -- what's in progress, what decisions are open, what's overdue.

---

## Requirements

### Must Have
- [x] Status bar / header (h-12, sticky): Hamburger menu button, workflow name ("Q2 Product Sprint"), user avatar, + add button
- [x] Filter bar (h-10, sticky below header): Horizontally scrollable filter pills (All, Tasks, Docs, Decisions, Threads) + sort button
- [x] Node card list: Scrollable main area with cards for each node, each showing type icon, type label, title, metadata (assignee, due date, status, score, word count)
- [x] Bottom navigation (h-16, fixed): 4 tabs -- Home (active, blue), Decisions, Threads, Pulse
- [x] Hamburger sidebar overlay (w-72): Workspace info (Acme Corp, Pro Plan), Workflows list (3 items), Settings, Sign Out, backdrop overlay
- [x] 8 node cards: 4 Tasks, 2 Decisions, 2 Docs with varied statuses

### Nice to Have
- [x] Filter pills color-coded by type (blue for Tasks, emerald for Docs, orange for Decisions, purple for Threads)
- [x] Active filter pill highlighted (bg-slate-700, white text, slate-600 border)
- [x] Node card left border color-coded by type (blue/emerald/orange)
- [x] Decision quality score badges with color coding (emerald for 84+, amber for 62)
- [x] Swipe hint text at bottom of list ("Swipe cards to see more actions") that fades after 4 seconds
- [x] Sidebar slide-in animation (translateX, 0.3s ease) with backdrop fade

### Out of Scope
- Node detail view (tapping a card)
- Node creation form
- Canvas/spatial view on mobile
- Push notifications
- Offline mode
- Swipe actions on cards

---

## Layout

**Page type**: Full page (mobile app shell)
**Primary layout**: Single column, max-width 390px
**Key sections** (in order):
1. **Header** (h-12, sticky top): Hamburger + workflow name + avatar + add button
2. **Filter Bar** (h-10, sticky top-12): Horizontally scrollable pills + sort icon
3. **Node List** (scrollable main): Vertical stack of node cards with 10px spacing
4. **Bottom Nav** (h-16, fixed bottom): 4 icon+label tab buttons

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | "All" filter active. 8 node cards visible. Home tab active in bottom nav. Sidebar closed. |
| **Filter active** | Selected pill gets bg-slate-700 + white text. Non-matching cards hidden via JS display toggle. |
| **Sidebar open** | Overlay slides in from left (translateX 0 -> visible). Backdrop fades in (opacity 0 -> 1). |
| **Sidebar closed** | Overlay slides out (translateX -100%). Backdrop fades out. |
| **Empty** | Not shown -- would display empty state with illustration |
| **Loading** | Not shown -- would display skeleton cards |
| **Error** | Not shown |

**Key interactions**:
- **Filter pills**: Tap to filter node list by type. "All" shows everything. Type filters show only matching cards.
- **Hamburger menu**: Tap to open sidebar overlay. Tap backdrop or links to close.
- **Node cards**: Tap card to navigate to detail view (not implemented, chevron suggests drilldown).
- **Bottom nav**: Tap to switch between Home, Decisions, Threads, Pulse views (not implemented).
- **Add button**: Blue circle button in header to create new node (not implemented).

---

## Responsive Behavior

- **Mobile** (390px): Full layout as designed. Max-width 390px centered. This is the target viewport.
- **Tablet**: Not designed -- would switch to desktop canvas view.
- **Desktop**: Not applicable -- desktop uses the Workflow Canvas (Feature 05).

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Header title** | Dynamic | "Q2 Product Sprint" (current workflow name) |
| **Filter pills** | Static | All, Tasks, Docs, Decisions, Threads |
| **Node 1** | Dynamic | TASK: "Ship onboarding v2", AP avatar, Due Apr 10, orange priority, "In Progress" |
| **Node 2** | Dynamic | DECISION: "Use Supabase for Auth + DB?", Score 84 (emerald), "Decided", "2d ago" |
| **Node 3** | Dynamic | DOC: "Product Requirements Doc", "1,240 words", "Updated 2h ago" |
| **Node 4** | Dynamic | TASK: "Fix auth redirect bug", RK avatar, Due Apr 5, red priority, "Done" |
| **Node 5** | Dynamic | DECISION: "Pricing model?", Score 62 (amber), "Open" |
| **Node 6** | Dynamic | TASK: "Design landing page", AP avatar, Due Apr 15, blue priority, "Todo" |
| **Node 7** | Dynamic | DOC: "Technical Architecture", "3,450 words", "Updated 1d ago" |
| **Node 8** | Dynamic | TASK: "Set up CI/CD", RK avatar, Due Apr 8, orange priority, "In Review" |
| **Sidebar workspace** | Dynamic | "Acme Corp", "Pro Plan" |
| **Sidebar workflows** | Dynamic | Q2 Product Sprint (active), Marketing Launch, Infrastructure |
| **Bottom nav** | Static | Home, Decisions, Threads, Pulse |

---

## Constraints

- Dark theme (bg-slate-950 body, bg-slate-900 sidebar/bottom nav, bg-slate-800 cards)
- Inter font family from Google Fonts
- Tailwind CSS via CDN
- Max viewport width: 390px (set via meta viewport and body max-width)
- Fixed bottom nav means main content needs pb-24 to prevent overlap
- Sticky header + filter bar means content starts below 88px (48 + 40)
- No scrollbar visible (custom CSS hides scrollbars on filter pill row)
- Filter pills use horizontal scroll (no-scrollbar class)
- Node cards use flex layout with left border-4 for type indication
- Sidebar uses fixed positioning with transform for slide animation

---

## References

- Mobile app patterns: Linear mobile, Notion mobile, Todoist mobile
- Bottom navigation: Material Design bottom navigation pattern
- Node list: Linear issue list, GitHub mobile issues
- Filter pills: iOS horizontal filter chips

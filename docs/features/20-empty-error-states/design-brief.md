# Design Brief — Empty & Error States

> Feature: 20 — Empty & Error States
> Date: 2026-04-05
> Target Fidelity: Mockup

## Overview

**What:** A comprehensive set of 12 empty, error, and system states covering every scenario where the user encounters no content or a disruption: 6 empty states (Canvas, Decisions, Search, Tasks, Thread, PULSE), 3 error states (General Error, 404, Maintenance), and 3 system states (Rate Limit, AI Unavailable, Loading Skeleton).

**Why:** Empty and error states are critical moments in user experience. A blank screen kills engagement; a well-designed empty state educates users about features and provides clear next actions. Error states build trust by being transparent, providing error details, and offering recovery paths.

**Where:** Each state appears inline within its respective feature context — empty canvas on the workflow canvas, empty decisions in the Decision DNA view, error pages as full-page replacements, loading skeletons as transitional states during data fetches.

## Target Users

- New users encountering features for the first time (empty states)
- All users experiencing system errors or outages (error states)
- Users hitting platform limits (rate limit, AI unavailable)
- All users during page transitions (loading skeleton)

## Requirements

**Must Have**
- [x] Empty Canvas: dashed border container, icon, heading, descriptive text, "Add First Node" primary CTA, "Use a Template" secondary CTA, keyboard shortcut hints (T/D/X)
- [x] Empty Decisions: orange-tinted icon, heading, explanation of Decision DNA value, "Log First Decision" CTA, quality score mention
- [x] Empty Search: search icon, dynamic heading showing search query, suggestion text, "Log a Past Decision" + "Clear Search" CTAs
- [x] Empty Tasks: blue task icon, heading, "Add Task" + "Import" CTAs
- [x] Empty Thread: purple chat icon, heading, inline text input for first comment
- [x] Empty PULSE: cyan chart icon, heading, explanation that PULSE auto-generates, "Go to Canvas" CTA
- [x] General Error: red warning icon, heading, auto-reported notice, error message + request ID in mono box, "Try Again" + "Go Home" CTAs, support link
- [x] 404: large "404" text (7xl), heading, description, "Go to Dashboard" + "Go Back" CTAs
- [x] Maintenance: wrench icon in large circle, heading, description, estimated downtime/start/return times, "Check Status Page" + "Follow @lazynext" links, brand footer
- [x] Rate Limit: clock icon, heading, request limit info (100/min), countdown timer, progress bar, "Try Again" CTA
- [x] AI Unavailable: sleeping face icon, heading "LazyMind is resting", provider status (Groq/Together AI), auto-reconnect notice
- [x] Loading Skeleton: canvas skeleton (top bar + sidebar + node placeholders) and decision list skeleton (3 rows with avatar + text placeholders), all with pulse animation

**Nice to Have**
- [x] Keyboard shortcut hints in Empty Canvas (T for Task, D for Doc, X for Decision)
- [x] Staggered animation delays on loading skeleton elements
- [x] Brand tagline on maintenance page

**Out of Scope**
- Animated illustrations or Lottie animations for empty states
- Custom error pages per error code (500, 502, 503 etc.)
- Offline mode detection and state

## Layout

- **Page type:** Inline states within their parent containers (empty states), full-page replacements (error/maintenance), panel-level (AI Unavailable, Loading Skeleton)
- **Primary layout:** Centered content block within max-w-2xl container
- **Key sections:**
  1. Empty Canvas: dashed border-2 border-slate-700 rounded-xl container, centered content with py-20
  2. Empty Decisions/Search/Tasks/PULSE: simple centered content with icon, text, CTAs, py-16–20
  3. Empty Thread: compact centered content with py-12, includes inline input field
  4. General Error: centered with error detail box (bg-slate-900, mono font)
  5. 404: oversized "404" number (text-7xl) as visual anchor
  6. Maintenance: large wrench circle, info card with time details, dual link buttons
  7. Rate Limit: centered with rate/timer info card (amber border accent)
  8. AI Unavailable: smaller panel (max-w-sm, bg-slate-900 border rounded-xl) with provider status line
  9. Loading Skeleton: two demos — canvas skeleton (sidebar + node grid) and decision list skeleton (3 rows)

## States & Interactions

| State | Description |
|-------|-------------|
| Empty Canvas | Dashed border container, 2 CTAs + keyboard shortcuts |
| Empty Decisions | Single CTA, educational copy about Decision DNA |
| Empty Search | Dynamic query in heading, 2 CTAs |
| Empty Tasks | 2 CTAs: Add Task + Import |
| Empty Thread | Inline autofocused text input for first comment |
| Empty PULSE | Single CTA linking to Canvas, educational copy |
| General Error | Error detail box + 2 CTAs + support link |
| 404 | Large number + 2 navigation CTAs |
| Maintenance | Time estimates + 2 external links |
| Rate Limit | Live countdown + progress bar + retry CTA |
| AI Unavailable | Provider status indicators + auto-reconnect notice |
| Loading Skeleton | Pulsing placeholder rectangles mimicking real layout |

**Key interactions:**
- Primary CTAs navigate to creation flows (Add Node, Log Decision, Add Task) or app sections (Dashboard, Canvas)
- "Try Again" reloads the current page/request
- "Go Back" uses browser history
- "Clear Search" resets the search input
- Empty Thread input is autofocused for immediate typing
- Rate Limit countdown auto-refreshes when timer expires

## Responsive Behavior

- **Mobile (< 768px):** All centered content containers go full-width with reduced padding; CTAs stack vertically; loading skeleton simplifies (sidebar hidden, fewer node placeholders)
- **Tablet (768px–1023px):** Content remains centered at comfortable reading width; loading skeleton shows sidebar + 2-column node grid
- **Desktop (1024px+):** Full max-w-2xl container; loading skeleton shows full sidebar + multi-row node grid

## Content

| Element | Content Type | Example |
|---------|-------------|---------|
| Empty Canvas heading | Static | "Your canvas is empty" |
| Empty Canvas description | Static | "Start by adding your first node. Drag a primitive from the sidebar or use keyboard shortcuts." |
| Empty Decisions heading | Static | "No decisions logged yet" |
| Empty Search heading | Dynamic (includes query) | 'No results for "microservices architecture"' |
| Empty Tasks heading | Static | "Nothing assigned yet" |
| Empty Thread heading | Static | "No messages yet" |
| Empty PULSE heading | Static | "PULSE shows you what your team built" |
| Error heading | Static | "Something went wrong" |
| Error detail | Dynamic | "Error: Failed to fetch workflow data" |
| Request ID | Dynamic | "req_a8f2k4j9x" |
| 404 number | Static | "404" |
| Maintenance times | Dynamic | "Estimated downtime: 30 minutes", "Started: Apr 4, 2026 at 2:00 AM IST" |
| Rate limit info | Dynamic | "Rate limit: 100 requests / minute", "Try again in 23 seconds" |
| AI provider status | Dynamic | "Groq API: unavailable", "Together AI: unavailable" |
| Keyboard hints | Static | T = Task, D = Doc, X = Decision |

## Constraints

- Empty states must always offer at least one actionable CTA — never a dead end
- Error states must include a recovery path (retry, go home, go back)
- Maintenance page must show time estimates when available
- Loading skeletons must match the spatial layout of the real content they replace
- Rate limit countdown must be accurate (server-provided reset time)
- AI Unavailable must clarify that non-AI features still work normally
- All states must work within the dark theme (#020617/slate-950 background)

## References

- Mockup: `mockups/empty-error-states.html`
- Related features: Feature 05 (Workflow Canvas), Feature 07 (Decision DNA), Feature 10 (LazyMind AI), Feature 11 (Thread Panel), Feature 16 (PULSE Dashboard)
- Design system: Dark theme, primary blue #4F6EF7, Inter font, slate color scale

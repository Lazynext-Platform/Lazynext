# Design Spec — Empty & Error States

> Feature: 20 / Date: 2026-04-05 / Fidelity: Mockup / Status: Draft / Iterations: 1

## Overview

**What was designed:** Twelve distinct states across three categories — empty content states (Canvas, Decisions, Search, Tasks, Thread, PULSE), error/system pages (General Error, 404, Maintenance), and limit/loading states (Rate Limit, AI Unavailable, Loading Skeleton). Each state is designed as a self-contained centered composition within the dark theme.

**Design brief link:** `design-brief.md`

**Key decisions:**
- Every empty state includes at least one primary CTA to prevent dead ends; most include a secondary action as well
- Empty Canvas uses a dashed border container to reinforce the "drop zone" mental model of the canvas
- Error states include technical details (error message, request ID) for transparency and support debugging
- Loading skeletons replicate the actual layout of the canvas and decision list for spatial continuity
- AI Unavailable is scoped to a small panel rather than a full page since the rest of the app still works

## Section Breakdown

### 1. Empty Canvas
- **Purpose:** Guide new users to create their first node on a blank workflow canvas
- **Layout:** Dashed border-2 border-slate-700 rounded-xl container, centered content with py-20 px-8
- **Key elements:**
  - Icon container (w-16 h-16 rounded-2xl bg-slate-800) with grid icon at 50% opacity
  - Heading: "Your canvas is empty" (text-lg font-semibold text-slate-300)
  - Description (text-sm text-slate-500, max-w-sm) referencing drag from sidebar and keyboard shortcuts
  - Two CTAs: "+ Add First Node" (primary blue) and "Use a Template" (secondary slate-800 with border)
  - Keyboard shortcut hints row: T=Task, D=Doc, X=Decision (using kbd elements with slate-800 bg and border)
- **Rationale:** Dashed border suggests "place something here." Dual CTAs serve both manual creators and template users. Keyboard hints promote power-user behavior early.

### 2. Empty Decisions
- **Purpose:** Explain Decision DNA and motivate logging the first decision
- **Layout:** Centered py-20 px-8, no border container (cleaner look for feature-education context)
- **Key elements:**
  - Orange-tinted icon container (bg-orange-500/10, checkmark in orange-400)
  - Heading: "No decisions logged yet" (text-lg font-semibold text-slate-300)
  - Educational description about Decision DNA uniqueness and avoiding repeated mistakes (max-w-sm)
  - Single CTA: "+ Log First Decision" (primary blue)
  - Footer note: "Every decision gets a quality score and becomes searchable forever." (text-[10px] text-slate-600)
- **Rationale:** Single CTA keeps focus on the one action. Educational copy explains the unique value of decisions in Lazynext vs. generic task tools.

### 3. Empty Search
- **Purpose:** Handle zero search results with actionable alternatives
- **Layout:** Centered py-16 px-8
- **Key elements:**
  - Search icon container (w-14 h-14 bg-slate-800, SVG magnifying glass in slate-500)
  - Dynamic heading: 'No results for "microservices architecture"' (text-lg font-semibold)
  - Suggestion text (text-sm text-slate-500) to try different keywords or log a past decision
  - Two CTAs: "Log a Past Decision" (primary blue) and "Clear Search" (secondary with border)
- **Rationale:** Including the search query in the heading confirms what was searched. "Log a Past Decision" turns a dead end into an onboarding moment.

### 4. Empty Tasks
- **Purpose:** Prompt task creation or import from external tools
- **Layout:** Centered py-16 px-8
- **Key elements:**
  - Blue task icon container (bg-blue-500/10, clipboard emoji in blue-400)
  - Heading: "Nothing assigned yet"
  - Description mentioning import from Notion, Linear, or Trello
  - Two CTAs: "+ Add Task" (primary blue) and "Import" (secondary with border)
- **Rationale:** Import CTA is critical for users migrating from other tools, reducing adoption friction.

### 5. Empty Thread
- **Purpose:** Encourage the first comment on a node's thread
- **Layout:** Compact centered py-12 px-8 (threads are panel-level, not full-page)
- **Key elements:**
  - Small purple icon container (w-12 h-12 bg-purple-500/10, speech bubble emoji)
  - Heading: "No messages yet" (text-sm font-semibold)
  - Context note: "Threads stay attached to this node forever." (text-xs text-slate-500)
  - Autofocused text input (max-w-xs, bg-slate-800 border, placeholder "Write the first comment...")
- **Rationale:** Smaller scale matches panel context. Inline input with autofocus reduces friction to zero — just start typing.

### 6. Empty PULSE
- **Purpose:** Explain that PULSE is auto-generated and direct users to create content first
- **Layout:** Centered py-16 px-8
- **Key elements:**
  - Cyan chart icon container (bg-cyan-500/10, chart emoji in cyan-400)
  - Heading: "PULSE shows you what your team built"
  - Educational description about auto-generation from workflow content, no setup required
  - Single CTA: "Go to Canvas" with right arrow (secondary style, slate-800 with border)
- **Rationale:** Secondary-style CTA (not primary blue) because this is a redirect, not a creation action. Messaging clarifies PULSE is passive/automatic.

### 7. General Error
- **Purpose:** Handle unexpected errors with transparency and recovery options
- **Layout:** Centered py-16 px-8
- **Key elements:**
  - Red warning icon container (w-16 h-16 bg-red-500/10, warning triangle in red-400)
  - Heading: "Something went wrong"
  - Auto-report notice (text-sm text-slate-500)
  - Error detail box (bg-slate-900 border border-slate-700 rounded-lg p-3): mono-font error message (text-red-400) and request ID (text-slate-600)
  - Two CTAs: "Try Again" (primary blue) and "Go Home" (secondary)
  - Support link: "If this keeps happening, contact support." with blue underlined link
- **Rationale:** Showing the error message and request ID builds trust and aids support interactions. Auto-report notice reduces user anxiety about needing to file a bug.

### 8. 404 Page
- **Purpose:** Handle missing pages with clear navigation back to the app
- **Layout:** Centered py-20 px-8
- **Key elements:**
  - "404" in text-7xl font-extrabold text-slate-800 (large decorative number)
  - Heading: "Page not found" (text-lg font-semibold, mt-4)
  - Description about page not existing or being moved
  - Two CTAs: "Go to Dashboard" (primary blue) and "Go Back" (secondary)
- **Rationale:** Oversized 404 number is instantly recognizable. Two navigation options cover both "start fresh" and "undo" mental models.

### 9. Maintenance Page
- **Purpose:** Inform users about scheduled downtime with time estimates and status channels
- **Layout:** Centered py-16 px-8
- **Key elements:**
  - Large wrench icon circle (w-20 h-20 bg-amber-500/10, wrench emoji)
  - Heading: "We'll be right back" (text-xl font-bold text-slate-200)
  - Description about scheduled maintenance for speed/reliability
  - Time info card (bg-slate-900 border rounded-lg p-4): estimated downtime (30 min), start time, expected return (all in IST)
  - Two link buttons: "Check Status Page" and "Follow @lazynext" (both secondary style)
  - Brand footer: Lazynext logo + "Built in India. Priced for humans."
- **Rationale:** Specific time estimates set expectations. External links (status page, social) keep communication open when the app is down. Brand footer reinforces identity during outage.

### 10. Rate Limit
- **Purpose:** Explain rate limiting and provide countdown to retry
- **Layout:** Centered py-16 px-8
- **Key elements:**
  - Clock icon container (bg-amber-500/10, stopwatch in amber-400)
  - Heading: "Slow down there" (conversational tone)
  - Explanation about server protection (text-sm text-slate-500)
  - Info card (bg-slate-900 border border-amber-500/20): rate limit details (100 requests/min), countdown timer (bold "23 seconds"), progress bar (amber-500 on slate-800, 60% width)
  - "Try Again" CTA (secondary style)
- **Rationale:** Conversational heading avoids blaming the user. Progress bar and countdown provide a clear sense of when they can resume.

### 11. AI Unavailable
- **Purpose:** Communicate AI service outage without alarming users about the rest of the platform
- **Layout:** Compact centered panel (max-w-sm, bg-slate-900 border rounded-xl, py-12 px-8)
- **Key elements:**
  - Sleeping face icon circle (bg-amber-500/10)
  - Heading: "LazyMind is resting" (text-sm font-semibold)
  - Reassurance: "Everything else works normally -- your data is safe." (text-xs text-slate-500)
  - Provider status line (bg-slate-800 rounded-md p-2): "Groq API: unavailable" (red) + "Together AI: unavailable" (red)
  - Auto-reconnect notice: "We'll automatically reconnect. No action needed."
- **Rationale:** Panel-level scope (not full page) correctly communicates that this is a partial degradation. Provider status gives technical transparency. "No action needed" reduces anxiety.

### 12. Loading Skeleton
- **Purpose:** Show spatial placeholders while content loads to prevent layout shift
- **Layout:** Two demos — canvas skeleton and decision list skeleton
- **Key elements (Canvas skeleton):**
  - Top bar: 3 placeholder rectangles (w-24, w-px divider, w-32) + right-aligned circles and button (all bg-slate-800 animate-pulse)
  - Sidebar column (w-40): 3px-height text placeholders + 8px-height item placeholders + divider
  - Canvas area: 3 rows of w-48 h-20 rounded-lg placeholders at increasing left margins, staggered animation-delay (0.1s increments)
- **Key elements (Decision list skeleton):**
  - 3 identical rows: w-8 h-8 circle + flex-1 text lines (3/4 width + 1/2 width) + w-8 h-8 circle (score placeholder)
  - Staggered animation-delay (0.1s, 0.2s)
- **Rationale:** Skeletons match the real layout dimensions so content loads in-place without jarring shifts. Staggered pulse animation creates a subtle wave effect that feels alive.

## States

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Empty Canvas | Dashed border, dual CTAs + keyboard hints | New workflow with 0 nodes |
| Empty Decisions | Orange icon, educational copy, single CTA | Decision DNA view with 0 decisions |
| Empty Search | Search icon, dynamic heading with query | Search returns 0 results |
| Empty Tasks | Blue icon, Add Task + Import CTAs | My Tasks view with 0 assignments |
| Empty Thread | Purple icon, autofocused inline input | Node thread panel with 0 comments |
| Empty PULSE | Cyan icon, educational copy, Canvas redirect | PULSE dashboard with no workflow data |
| General Error | Red icon, error box with mono text, dual CTAs | Unhandled API error (5xx) |
| 404 | Large "404" text, dual navigation CTAs | Route not found |
| Maintenance | Amber wrench, time card, external links | Scheduled maintenance mode flag |
| Rate Limit | Amber clock, countdown + progress bar | HTTP 429 response |
| AI Unavailable | Sleeping face, provider status indicators | AI provider health check fails |
| Loading Skeleton | Pulsing slate-800 rectangles mimicking layout | Data fetch in progress |

## Responsive Behavior

| Breakpoint | Layout | Key Changes |
|-----------|--------|-------------|
| < 768px (Mobile) | Full-width centered | CTA buttons stack vertically; keyboard hints row wraps; loading skeleton hides sidebar column; maintenance time card goes full-width |
| 768px–1023px (Tablet) | Centered at comfortable width | All content centered; loading skeleton shows simplified sidebar; error detail box stays inline |
| 1024px+ (Desktop) | Max-w-2xl centered | Full layout as designed; loading skeleton shows complete sidebar + multi-row canvas grid |

## Cognitive Load Assessment

- **Information density:** Low per state — each state has 1 heading, 1 description, 1-2 CTAs. Error states add a detail box but keep it minimal.
- **Visual hierarchy:** Clear — large icon draws attention, heading communicates the state, description provides context, CTAs provide the path forward
- **Progressive disclosure:** Appropriate — empty states show just enough to act; error detail (request ID) is secondary information shown in a subdued style
- **Interaction complexity:** Minimal — 0-2 clicks per state to recover or take action

## Accessibility Notes

- **Contrast:** Headings (slate-300 on slate-950) meet AA; descriptions (slate-500 on slate-950) should be verified — may need to lighten to slate-400 for body text compliance; error text (red-400 on slate-900) meets AA
- **Focus management:** Primary CTA should receive focus when empty/error state renders; autofocus on Empty Thread input is correct behavior
- **Screen reader:** Each state needs a descriptive heading (already present); error detail box should use role="alert"; loading skeletons need aria-busy="true" and aria-label="Loading content" on the container
- **Keyboard:** All CTAs are buttons and links, naturally focusable; Tab order follows visual order (heading > description > primary CTA > secondary CTA)

## Design System Deviations

| Element | Deviation | Reason |
|---------|-----------|--------|
| Dashed border (Empty Canvas) | border-2 border-dashed border-slate-700 | Unique to empty canvas to suggest a drop zone; not used elsewhere in the system |
| 404 oversized number | text-7xl font-extrabold text-slate-800 | Decorative element specific to 404 pages; much larger than any standard text size |
| Mono font in error box | font-mono text-[10px] | Technical information (error messages, request IDs) uses monospace to differentiate from UI text |
| Staggered animation delay | style="animation-delay: 0.1s" increments | Loading skeleton-specific; creates wave effect across placeholder elements |

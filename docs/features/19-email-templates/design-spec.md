# Design Spec — Email Templates

> Feature: 19 / Date: 2026-04-05 / Fidelity: Mockup / Status: Draft / Iterations: 1

## Overview

**What was designed:** Four branded email templates — Workspace Invite, Task Assignment, Weekly Digest, and Decision Digest — each following a consistent structure of branded header, white content body, and light footer. The mockup page includes a tab switcher for reviewing all templates.

**Design brief link:** `design-brief.md`

**Key decisions:**
- Used light backgrounds (white body, slate-50 footer) rather than dark theme to match email client conventions and maximize readability
- Weekly Digest groups tasks by status (Completed, In Progress, Blocked) with counts rather than a flat list, matching how teams think about progress
- Decision Digest includes quality score badges (colored circles with numbers) to reinforce Decision DNA's scoring system outside the app
- LazyMind observation is included in the Weekly Digest as a blue callout box to drive engagement with AI features

## Section Breakdown

### 1. Invite Email
- **Purpose:** First-touch email that brings new users into a workspace
- **Layout:** Centered blue header (px-8 py-6) with logo and brand name, white body (px-8 py-8), slate-50 footer
- **Key elements:**
  - Centered heading "You've been invited to join"
  - Workspace name in a rounded slate-100 badge (px-4 py-2, text-lg font-semibold)
  - Inviter name bolded in context sentence with "the operating system for work" tagline
  - "Accept Invitation" primary CTA button (px-8 py-3, bg-[#4F6EF7])
  - 7-day expiry notice in xs slate-400 text
  - Footer: tagline "Built in India. Priced for humans." + Unsubscribe + Privacy Policy links
- **Rationale:** Clean, focused layout with a single CTA. Workspace name is visually prominent to establish context immediately.

### 2. Task Assignment Email
- **Purpose:** Notify a team member of a newly assigned task with actionable context
- **Layout:** Compact blue header (px-8 py-4) with small logo, white body (px-8 py-6), slim footer
- **Key elements:**
  - Blue circle icon with clipboard emoji + "NEW TASK ASSIGNED" uppercase label (text-xs tracking-wider)
  - Task title as h1 (text-lg font-bold)
  - Assigner name + workflow name in context sentence
  - 2x2 metadata grid on slate-50 background (rounded-lg p-4 border): Priority (with orange dot for High), Due Date, Status, Workflow
  - "View Task" centered CTA button
  - Footer with Notification settings + Unsubscribe links
- **Rationale:** Metadata grid provides all context needed to decide urgency without opening the app. Priority gets a color-coded dot for quick scanning.

### 3. Weekly Digest Email
- **Purpose:** Weekly summary of workspace activity to keep all members informed
- **Layout:** Blue header with logo + "Weekly Digest" label (right-aligned), white body with stacked sections, footer
- **Key elements:**
  - Heading "Your week at Acme Corp" + date range (Mar 28 -- Apr 4, 2026)
  - **Completed section:** Green checkmark icon, count "(7)", bulleted task list with assignees, "+3 more tasks" overflow
  - **In Progress section:** Blue play icon, count "(5)", tasks with assignees and due dates
  - **Blocked section:** Red warning icon, count "(1)", red-colored blocked item text
  - **Decisions section:** Orange checkmark icon, count "(3)", decision cards with quality score circles (green=84, green=78, amber=62) and status labels (Decided/Open)
  - **LazyMind callout:** Blue-50 background with sparkle icon, "LazyMind Observation" bold label, AI insight text about team velocity
  - "Open Lazynext" main CTA
  - Footer with "Manage digest settings" link
- **Rationale:** Sectioned layout mirrors mental model of sprint status. Quality score circles from Decision DNA are carried into email to build familiarity. LazyMind callout drives curiosity about AI features.

### 4. Decision Digest Email
- **Purpose:** Weekly decision-specific digest focused on decision quality and outstanding items
- **Layout:** Gradient header (blue-to-purple from-[#4F6EF7] to-[#7C3AED]) with logo + "Decision DNA Digest" label, white body, footer
- **Key elements:**
  - Heading + date range + workspace name
  - 3-column stats row on slate-50 backgrounds: "3 Decisions", "75 Avg Quality" (green), "2 Need Outcomes" (amber)
  - Decision cards (border rounded-lg p-4): title, resolution summary, quality score circle (right-aligned, colored by score), metadata line (author, date, status)
  - Open decision card: amber border + amber-50/50 background, "Open -- needs resolution" status
  - "Tag Outcomes" amber CTA on amber-50 callout (for decisions older than 30 days without outcomes)
  - "View All Decisions" main CTA
  - Footer: "Decision DNA by Lazynext" + Manage settings + Unsubscribe
- **Rationale:** Gradient header visually distinguishes this from the Weekly Digest. Stats row gives instant health snapshot. Amber highlighting for open decisions creates urgency. Tag Outcomes CTA drives data completeness.

## States

| State | Visual Treatment | Trigger |
|-------|-----------------|---------|
| Invite — default | Full invite layout | New user invited to workspace |
| Task Assignment — default | Task details with metadata grid | Task assigned to user |
| Task Assignment — low priority | Green dot instead of orange | Priority field is "Low" |
| Weekly Digest — full | All sections visible including Blocked | Weekly cron with blocked tasks |
| Weekly Digest — no blocked | Blocked section omitted | No blocked tasks that week |
| Decision Digest — all resolved | No amber cards, no Tag Outcomes CTA | All decisions have outcomes |
| Decision Digest — has open | Amber-bordered cards, Tag Outcomes visible | Open decisions or missing outcomes |
| Tab switcher | Active tab: bg-[#4F6EF7] text-white; inactive: bg-white text-slate-600 border | Mockup page only |

## Responsive Behavior

| Breakpoint | Layout | Key Changes |
|-----------|--------|-------------|
| < 480px (Mobile) | Single column, full width | 2x2 task metadata grid may stack; decision stats row stacks to single column; buttons go full-width |
| 480px–600px (Tablet) | Max-width container | All grids maintain intended layout; email renders at designed proportions |
| 600px+ (Desktop) | Centered at max-width 600px | No layout changes; email is centered with surrounding whitespace |

## Cognitive Load Assessment

- **Information density:** Varies by template — Invite is minimal (1 CTA), Weekly Digest is dense but well-sectioned with counts and overflow ("+ 3 more tasks")
- **Visual hierarchy:** Strong — each template leads with the most important information (workspace name, task title, stats summary) and uses size/weight to guide the eye to CTAs
- **Progressive disclosure:** Weekly Digest shows top items per section with "+N more" overflow linking to the app; Decision Digest shows 3 cards with "View All" for the rest
- **Interaction complexity:** Minimal — emails have 1-2 CTA buttons each; all link to the app for deeper interaction

## Accessibility Notes

- **Contrast:** Dark text on white backgrounds (slate-900 on white) exceeds WCAG AA; CTA buttons (white on #4F6EF7) meet AA for large text
- **Focus management:** Not applicable for email (no interactive focus); CTA links should have descriptive text
- **Screen reader:** Alt text needed for logo images; quality score circles need aria-label or alt text (e.g., "Quality score: 84 out of 100"); section headings provide structure
- **Keyboard:** Standard email client link navigation; all CTAs are anchor elements

## Design System Deviations

| Element | Deviation | Reason |
|---------|-----------|--------|
| Light background | White body + slate-50 footer instead of dark theme | Email client convention; dark-mode emails have poor cross-client support |
| Gradient header (Decision Digest) | from-[#4F6EF7] to-[#7C3AED] purple gradient | Visually distinguishes Decision Digest from other emails; ties to Decision DNA branding |
| Quality score circles | Small colored circles (w-6/w-8) with numeric scores | Carries Decision DNA scoring into email context; compact representation for inline use |
| Font sizes below system minimum | 10px text used for metadata and footer | Email convention for secondary information and legal text (unsubscribe) |

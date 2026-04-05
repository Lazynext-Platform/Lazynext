# Design Brief — Email Templates

> Feature: 19 — Email Templates
> Date: 2026-04-05
> Target Fidelity: Mockup

## Overview

**What:** Four transactional and digest email templates rendered on a light background: Workspace Invite, Task Assignment, Weekly Digest, and Decision Digest. Each template follows a consistent branded structure with the Lazynext blue header, white body, and slate-50 footer.

**Why:** Emails are the primary re-engagement channel and the first branded touchpoint for invited users. Well-designed email templates reinforce the Lazynext brand, increase click-through rates to the app, and surface key data (task details, weekly stats, decision quality scores) without requiring users to open the platform.

**Where:** Delivered via transactional email service (e.g., Resend, Postmark). Designed at max-width 600px for email client compatibility. The mockup page uses tab switching to display all 4 templates.

## Target Users

- Invited collaborators receiving their first Lazynext email (Invite)
- Team members receiving task notifications (Task Assignment)
- All workspace members receiving periodic summaries (Weekly Digest)
- Decision stakeholders tracking team decision quality (Decision Digest)

## Requirements

**Must Have**
- [x] Invite Email: branded header with logo, workspace name highlight, inviter name, "Accept Invitation" CTA, 7-day expiry notice
- [x] Task Assignment Email: compact header, task title, assigner name, metadata grid (Priority, Due Date, Status, Workflow), "View Task" CTA
- [x] Weekly Digest Email: header with "Weekly Digest" label, date range, sections for Completed/In Progress/Blocked tasks with counts and assignees, Decisions section with quality scores, LazyMind observation callout, "Open Lazynext" CTA
- [x] Decision Digest Email: gradient header (blue-to-purple), stats row (Decisions count, Avg Quality, Needs Outcomes), decision cards with quality score badges, "Tag Outcomes" CTA for stale decisions, "View All Decisions" CTA
- [x] Footer with unsubscribe link and privacy policy on all templates
- [x] Tab switching UI in the mockup page for reviewing all 4 templates

**Nice to Have**
- [x] LazyMind AI observation in Weekly Digest with sparkle icon and team insight
- [x] Amber highlight for open/stale decisions in Decision Digest
- [x] Priority color dot in Task Assignment metadata

**Out of Scope**
- Email template editor/customizer for workspace admins
- Dark mode email variants
- Push notification equivalents
- A/B testing of subject lines or CTA copy

## Layout

- **Page type:** Email templates (max-width 600px, centered on light background)
- **Primary layout:** Single column, stacked sections, white card with rounded corners and shadow
- **Key sections per template:**
  - **Invite:** Blue header (logo + brand) > body (heading, workspace badge, invite text, CTA button, expiry note) > footer
  - **Task Assignment:** Compact blue header (logo) > body (task icon + "New Task Assigned" label, task title, assigner line, 2x2 metadata grid on slate-50 bg, CTA) > footer
  - **Weekly Digest:** Blue header (logo + "Weekly Digest" label) > body (heading, date range, Completed/In Progress/Blocked/Decisions sections, LazyMind callout on blue-50 bg, CTA) > footer
  - **Decision Digest:** Gradient header (blue-to-purple, logo + "Decision DNA Digest") > body (heading, date range, 3-col stats row, decision cards with quality score circles, Tag Outcomes CTA on amber bg, main CTA) > footer

## States & Interactions

| State | Description |
|-------|-------------|
| Invite — default | Full invite email with "Accept Invitation" button |
| Task Assignment — default | Single task notification with metadata grid |
| Weekly Digest — default | Full weekly summary with all sections populated |
| Weekly Digest — no blocked | Blocked section hidden when count is 0 |
| Decision Digest — all decided | No amber highlight cards; Tag Outcomes CTA hidden |
| Decision Digest — has open decisions | Open decisions shown with amber border/background and "needs resolution" label |

**Key interactions:**
- "Accept Invitation" links to workspace join flow
- "View Task" deep-links to specific task node
- "Open Lazynext" links to workspace dashboard
- "View All Decisions" links to Decision DNA view
- "Tag Outcomes" links to decisions needing outcome tagging
- Footer links: Unsubscribe, Privacy Policy, Notification settings, Manage digest settings

## Responsive Behavior

- **Mobile (< 480px):** Email naturally stacks within max-width container; 2x2 metadata grid in Task Assignment may stack to 1-column; stats row in Decision Digest stacks vertically
- **Tablet (480px–600px):** Renders at designed width; all grids maintain their columns
- **Desktop (600px+):** Email centered in viewport with max-width 600px; no layout changes beyond centering

## Content

| Element | Content Type | Example |
|---------|-------------|---------|
| Invite heading | Static text | "You've been invited to join" |
| Workspace name | Dynamic | "Acme Corp" |
| Inviter name | Dynamic | "Avas Patel" |
| Task title | Dynamic | "Ship onboarding v2" |
| Priority | Dynamic with color | "High" (orange dot) |
| Due date | Dynamic date | "Apr 10, 2026" |
| Weekly date range | Dynamic range | "Mar 28 -- Apr 4, 2026" |
| Completed tasks | Dynamic list with assignees | "Fix auth redirect bug -- Raj" |
| Decision quality score | Dynamic number in circle | "84" (green), "62" (amber) |
| LazyMind observation | AI-generated text | "Team velocity is up 40% this week..." |
| Stats row values | Dynamic numbers | "3 Decisions", "75 Avg Quality", "2 Need Outcomes" |
| Footer tagline | Static | "Built in India. Priced for humans." |

## Constraints

- Must render correctly in major email clients (Gmail, Outlook, Apple Mail) — avoid complex CSS
- Max width 600px to ensure readability across clients
- All CTA buttons must use inline styles for email client compatibility
- Quality score circles (green for 70+, amber for 50-69) must be visually distinct at small sizes
- Unsubscribe link is legally required on all templates
- Invite expiry is fixed at 7 days

## References

- Mockup: `mockups/email-templates.html`
- Related features: Feature 07 (Decision DNA View), Feature 16 (PULSE Dashboard)
- Brand: #4F6EF7 primary blue, white backgrounds for email, Inter font (with system fallbacks)

# Design Reflection — Lazynext

> **Date**: 2026-04-05
> **Stage**: 7 — Reflect
> **Scope**: Full platform design (38 features, 114 documents)

---

## Design System Discoveries

### Patterns Worth Formalizing

| Pattern | Used In | Recommendation |
|---|---|---|
| **FAB (Floating Action Button)** | #29 Node Creation Menu | Add to design system as reusable component — rounded-2xl, fixed position, pulse animation |
| **Context Menu** | #33 Canvas Context Controls | Standardize w-52, rounded-xl, section headers, keyboard shortcuts right-aligned |
| **Activity Timeline** | #38 Activity Feed | Formalize avatar + action-icon overlay + descriptive text pattern |
| **Kanban Column** | #37 Task Views | Add column header (dot + name + count) + card stack + add-button pattern |
| **Watermark/CTA Pill** | #35 Public Shared Canvas | Reusable for any shared/embedded content — backdrop-blur, rounded-full |
| **Outcome Selector** | #36 Decision Outcome Review | Emoji-based 3-option grid — could generalize to any sentiment capture |
| **Email chip input** | #34 Team Member Management | Multi-value input with removable tags — common pattern worth standardizing |

### Tokens That Emerged

| Token | Value | Context |
|---|---|---|
| Progress bar heights | h-1, h-1.5, h-2 | Used inconsistently — standardize to h-1.5 for inline, h-2 for standalone |
| Toast width | w-96 | Consistent across #28 — codify as `--toast-width` |
| Modal widths | w-[480px], w-[540px], w-[600px] | Three sizes emerged — standardize as sm/md/lg modal |
| Card padding | p-4, p-5, p-6 | p-4 for compact cards, p-5 for standard, p-6 for sections — document hierarchy |

---

## Patterns That Worked Well

- **Tab pill pattern**: Used consistently across settings (#12, #30), marketing (#32), and dashboards (#08, #16). Users get a familiar navigation pattern everywhere.
- **Color-coded node types**: The 7-color system (TASK blue, DOC emerald, etc.) creates instant recognition across all 38 features — from canvas to notifications to activity feed.
- **Progressive severity**: Security settings (#30) and context menus (#33) both escalate from safe to destructive top-to-bottom. Red border/text for danger zones is consistent.
- **Stat cards grid**: 3-4 stat cards in a row appears in Home (#26), Members (#34), Decision Health (#08), and Billing (#13) — established as a standard dashboard pattern.
- **Opacity reduction for completed/inactive**: Done tasks (opacity-60, strikethrough), pending invites (opacity-60, dashed border) — consistent visual language for "not active."

---

## Cognitive Load Issues to Watch

| Issue | Features Affected | Recommendation |
|---|---|---|
| **Notification center density** | #23 | 8 notifications in dropdown may be too many on mobile — consider 5-item limit with "See all" |
| **Keyboard shortcuts modal** | #24 | 23 shortcuts in 4 categories is a lot — consider progressive disclosure with search |
| **Marketing comparison table** | #32 | 9-row table requires scrolling — consider highlighting top 3 differentiators above the fold |
| **Audit log columns** | #38 | 6 columns on tablet may require horizontal scroll — consider hiding IP column on tablet |

---

## Cross-Feature Consistency Notes

- **Sidebar width**: Consistently w-60 across all app pages
- **Top bar height**: Consistently h-12 across all app pages
- **Content max-width**: max-w-3xl for forms/settings, max-w-4xl for tables/dashboards, max-w-5xl for marketing
- **Border radius**: rounded-xl for cards, rounded-2xl for modals/large containers, rounded-lg for inputs/buttons
- **Badge size**: text-[9px] or text-[10px] for status badges, consistent across all features

---

## Recommendations for Implementation Phase

1. **Build a shared layout component** — sidebar (w-60) + top bar (h-12) + content area is used in 20+ features
2. **Create a unified node card component** — the node representation (colored dot + type label + title + metadata) appears in canvas, lists, activity, notifications
3. **Standardize modal sizes** — sm (w-[400px]), md (w-[480px]), lg (w-[540px]), xl (w-[600px])
4. **Build a toast system early** — toasts appear across many features; a shared system prevents duplication
5. **Design system tokens file** — extract all repeated values (colors, spacing, shadows) into a Tailwind config extension

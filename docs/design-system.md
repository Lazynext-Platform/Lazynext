# Lazynext Design System

> The AI agent's design brain. Load this at the start of every UI design session.

---

## Project Identity

- **Project**: Lazynext — The Anti-Software Workflow Platform
- **Design Direction**: Dark, modern, premium SaaS. Clean lines, generous whitespace, confident typography.
- **Target Audience**: Remote-first teams, SaaS companies, agencies, indie hackers, operators drowning in tool-switching overhead.
- **Primary Platform**: Web (desktop-first canvas, mobile-responsive)
- **Brand Voice**: Direct, confident, anti-corporate, slightly irreverent.

---

## Design Guidelines

### Brand Personality
- **Confident**: We know what we built. No hedging.
- **Direct**: Say what it does. No fluff.
- **Anti-corporate**: Never say "synergy". Never say "leverage" as a verb.
- **Slightly irreverent**: We can be funny, but never at the user's expense.

### Design Principles
1. **Clarity over cleverness** — Every element earns its place. If it doesn't help the user, remove it.
2. **Graph-native feel** — The canvas IS the product. Everything connects. Everything flows.
3. **Progressive disclosure** — Show the minimum. Reveal depth on demand.
4. **Speed is a feature** — Animations are fast (150-200ms). Loading states are instant skeletons.
5. **Decision DNA is the hero** — Quality scores, outcomes, and decision cards get premium visual treatment.

### Color Usage Rules
- Dark backgrounds for the canvas/app shell. Light backgrounds for marketing pages.
- Node cards use soft pastel backgrounds with colored borders (per primitive type).
- Quality scores ALWAYS use the green/amber/red system. Never deviate.
- Primary blue for CTAs and interactive elements. Never use blue for decorative purposes.

### Typography Usage
- Inter for all UI text. JetBrains Mono for code and data.
- Headings are semibold (600) or bold (700). Body is regular (400).
- Never go below 12px for any text on desktop, 14px on mobile.

### Layout & Density
- Canvas view: Medium density. Nodes need breathing room.
- List views: Compact density. Maximize scannable information.
- Marketing pages: Low density. Generous whitespace. Let copy breathe.

### Do's
- Use consistent 4px/8px spacing grid
- Use shadows sparingly — only for elevation (modals, dropdowns, floating panels)
- Use border-radius consistently (8px for cards, 6px for inputs, 9999px for pills)
- Animate panel slides (200ms ease-out) and fades (150ms ease-out)

### Don'ts
- Don't use gradients on UI elements (only marketing hero if needed)
- Don't use more than 2 font weights on a single component
- Don't center-align body text in the app (left-align always)
- Don't use pure black (#000) — use slate-950 (#020617)

### Project Constraints
- Must work on Chrome, Firefox, Safari, Edge, Opera, Samsung Internet
- WCAG 2.1 AA compliance required
- Mobile: min 44x44px touch targets
- Canvas (ReactFlow) does NOT render below 640px — NodeListView instead
- Tailwind CSS utility classes only — no custom CSS unless absolutely necessary

---

## Color Palette

### Brand Colors
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#4F6EF7` | Primary buttons, links, active states |
| `--color-primary-hover` | `#3D5BD4` | Primary hover states |
| `--color-primary-light` | `#E0E9FF` | Primary backgrounds, selected states |
| `--color-primary-lighter` | `#F0F4FF` | Subtle primary tints |

### Neutral / Surface Colors
| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#020617` | App shell background (slate-950) |
| `--color-surface` | `#0F172A` | Canvas background, card backgrounds (slate-900) |
| `--color-surface-elevated` | `#1E293B` | Elevated cards, sidebars (slate-800) |
| `--color-surface-hover` | `#334155` | Hover states on dark surfaces (slate-700) |
| `--color-border` | `#334155` | Default borders (slate-700) |
| `--color-border-subtle` | `#1E293B` | Subtle dividers (slate-800) |

### Text Colors
| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#F8FAFC` | Primary text on dark bg (slate-50) |
| `--color-text-secondary` | `#94A3B8` | Secondary text, labels (slate-400) |
| `--color-text-tertiary` | `#64748B` | Placeholder text, disabled (slate-500) |
| `--color-text-inverse` | `#020617` | Text on light backgrounds (slate-950) |

### Node Type Colors
| Primitive | Background | Border | Text |
|---|---|---|---|
| TASK | `#EFF6FF` | `#BFDBFE` | `#1E40AF` |
| DOC | `#F0FDF4` | `#BBF7D0` | `#166534` |
| DECISION | `#FFF7ED` | `#FED7AA` | `#9A3412` |
| THREAD | `#FAF5FF` | `#E9D5FF` | `#6B21A8` |
| PULSE | `#F0F9FF` | `#BAE6FD` | `#0C4A6E` |
| AUTOMATION | `#F9FAFB` | `#E5E7EB` | `#374151` |
| TABLE | `#FFFBEB` | `#FDE68A` | `#92400E` |

### Semantic Colors
| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#16A34A` | Success states, good outcomes, high quality scores |
| `--color-warning` | `#CA8A04` | Warning states, mid quality scores |
| `--color-error` | `#DC2626` | Error states, bad outcomes, low quality scores |
| `--color-info` | `#2563EB` | Info banners, tooltips |

### Quality Score Colors
| Range | Color | Token |
|---|---|---|
| 70-100 (High) | `#16A34A` | `--color-quality-high` |
| 40-69 (Mid) | `#CA8A04` | `--color-quality-mid` |
| 0-39 (Low) | `#DC2626` | `--color-quality-low` |

### Outcome Colors
| State | Color | Token |
|---|---|---|
| Good | `#16A34A` | `--color-outcome-good` |
| Bad | `#DC2626` | `--color-outcome-bad` |
| Neutral | `#6B7280` | `--color-outcome-neutral` |
| Pending | `#9CA3AF` | `--color-outcome-pending` |

### Marketing / Light Theme (Landing Page only)
| Token | Value | Usage |
|---|---|---|
| `--color-marketing-bg` | `#FFFFFF` | Page background |
| `--color-marketing-surface` | `#F8FAFC` | Section backgrounds |
| `--color-marketing-text` | `#0F172A` | Primary text |
| `--color-marketing-text-secondary` | `#475569` | Body text |

---

## Typography

### Font Families
| Token | Value | Usage |
|---|---|---|
| `--font-body` | `'Inter', system-ui, sans-serif` | All UI text |
| `--font-heading` | `'Inter', system-ui, sans-serif` | Headings (same family, different weight) |
| `--font-mono` | `'JetBrains Mono', monospace` | Code, data values, IDs |

### Base Size
- Desktop: 14px
- Tablet: 15px
- Mobile: 16px

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| Display (marketing) | 48px / 3rem | 800 | 1.1 | -0.02em |
| H1 | 30px / 1.875rem | 700 | 1.2 | -0.01em |
| H2 | 24px / 1.5rem | 600 | 1.3 | -0.01em |
| H3 | 20px / 1.25rem | 600 | 1.4 | 0 |
| H4 | 16px / 1rem | 600 | 1.5 | 0 |
| Body | 14px / 0.875rem | 400 | 1.6 | 0 |
| Body Small | 13px / 0.8125rem | 400 | 1.5 | 0 |
| Caption | 12px / 0.75rem | 400 | 1.4 | 0.01em |
| Label | 12px / 0.75rem | 500 | 1.4 | 0.02em |
| Mono | 13px / 0.8125rem | 400 | 1.5 | 0 |

---

## Spacing & Layout

### Spacing Scale
| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Icon-label gaps, tight padding |
| `--space-sm` | 8px | Input padding, badge padding |
| `--space-md` | 12px | Card internal padding, section gaps |
| `--space-lg` | 16px | Component spacing, form field gaps |
| `--space-xl` | 24px | Section spacing |
| `--space-2xl` | 32px | Page section gaps |
| `--space-3xl` | 48px | Marketing section gaps |
| `--space-4xl` | 64px | Marketing major sections |

### Breakpoints
| Name | Width | Layout |
|---|---|---|
| Mobile | < 640px | Single column, bottom nav, NodeListView |
| Tablet | 640–1023px | Two column, collapsible sidebar |
| Desktop | >= 1024px | Full canvas, fixed sidebar, right panel |
| Wide | >= 1280px | Max-width container, extra whitespace |

### Grid
- App: CSS Grid — sidebar (240px fixed) + main (flex-1) + right panel (320-384px conditional)
- Marketing: max-w-7xl (1280px) centered container, 12-column grid
- Canvas: React Flow with 20px grid background

### Key Layout Dimensions
| Element | Size |
|---|---|
| Top bar height | 48px (h-12) |
| Left sidebar width | 240px (w-60) |
| Right panel width | 320-384px (w-80 to w-96) |
| Node card width (canvas) | 240px |
| Node card width (tablet) | 260px |
| Bottom nav height (mobile) | 64px (h-16) |
| Canvas grid spacing X | 280px |
| Canvas grid spacing Y | 160px |

---

## Shadows & Elevation

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle card elevation |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.4)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.5)` | Modals, floating panels |
| `--shadow-inset` | `inset 0 2px 4px rgba(0,0,0,0.2)` | Pressed states |

---

## Borders & Radii

| Token | Value | Usage |
|---|---|---|
| `--border-width` | 1px | Default border |
| `--border-color` | `#334155` (slate-700) | Default border color |
| `--radius-sm` | 4px | Small elements, badges |
| `--radius-md` | 6px | Inputs, buttons |
| `--radius-lg` | 8px | Cards, panels |
| `--radius-xl` | 12px | Modals, large containers |
| `--radius-full` | 9999px | Pills, avatars, toggles |

---

## Motion & Animation

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | 150ms | Fades, color transitions |
| `--duration-normal` | 200ms | Panel slides, transforms |
| `--duration-slow` | 300ms | Page transitions, complex animations |
| `--easing-default` | `ease-out` | Standard easing |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy interactions (score pulse) |

### Named Animations
- `slide-in-right`: translateX(100%) → translateX(0) at 200ms ease-out
- `fade-in`: opacity 0 → 1 at 150ms ease-out
- `score-pulse`: scale(1) → scale(1.1) → scale(1) at 500ms ease-out

---

## Component Patterns

### Button
- **When to use**: Actions that change state or navigate
- **Anatomy**: Leading icon (optional) → Label → Trailing icon (optional)
- **States**: Default, Hover (+darken), Active (+more darken), Disabled (50% opacity), Loading (spinner replaces icon)
- **Variants**: Primary (blue bg, white text), Secondary (slate-700 bg, slate-200 text), Ghost (transparent, slate-300 text), Destructive (red bg, white text)
- **Spacing**: py-2 px-4 (md), py-1.5 px-3 (sm), py-3 px-6 (lg); gap-2 icon-label
- **Accessibility**: min 44x44px touch target, disabled remains visible, loading announces state
- **Don'ts**: Max 1 Primary per view section, don't use button when `<a>` is correct

### Card (Node Card)
- **When to use**: Display a primitive node on canvas or in list
- **Anatomy**: Type icon + Type label → Title → Meta row (assignee, date, status) → Footer (tags, quality score)
- **States**: Default, Hover (border highlight), Selected (primary border + shadow), Dragging (slight scale + shadow-lg)
- **Variants**: Task (blue tint), Doc (green tint), Decision (orange tint), Thread (purple tint), Pulse (cyan tint), Automation (gray tint)
- **Spacing**: p-3 internal, gap-2 between rows
- **Accessibility**: Tab-focusable, Enter opens detail panel, role="button"
- **Don'ts**: Don't show more than 3 meta items. Don't nest cards.

### Input / Form Field
- **When to use**: User text entry
- **Anatomy**: Label → Input → Helper text (optional) → Error text (on error)
- **States**: Default (slate-800 bg, slate-700 border), Focused (primary border, ring), Error (red border, red helper text), Disabled (opacity-50)
- **Spacing**: py-2 px-3 internal; gap-1.5 label-to-input; gap-1 input-to-helper
- **Accessibility**: Always has visible label (never placeholder-only), error has aria-describedby
- **Don'ts**: Don't use placeholder as label, don't hide required indicator

### Badge / Status Pill
- **When to use**: Display categorical status, priority, quality score, tag
- **Anatomy**: Icon (optional) → Label
- **Variants**: Status (colored bg + text per status), Priority (colored dot + text), Quality (score number + colored bg), Tag (slate bg, slate text)
- **Spacing**: py-0.5 px-2, text-xs, rounded-full
- **Don'ts**: Don't use more than 3 badges on one element

### Modal / Dialog
- **When to use**: Focused interaction requiring user attention
- **Anatomy**: Overlay (black/50) → Container → Header (title + close X) → Body → Footer (actions)
- **States**: Opening (fade-in 150ms), Closing (fade-out 100ms)
- **Spacing**: p-6 internal, gap-4 between sections
- **Accessibility**: Focus trap, Escape closes, first focusable gets focus, aria-modal="true"
- **Don'ts**: Don't nest modals, don't use for simple confirmations (use toast instead)

### Sidebar Panel (Right Detail Panel)
- **When to use**: Editing node details, LazyMind chat, thread messages
- **Anatomy**: Header (type icon + title + close X) → Scrollable body → Fixed footer (if actions)
- **States**: Closed (off-screen), Opening (slide-in-right 200ms), Open
- **Spacing**: p-4 internal, w-80 to w-96
- **Accessibility**: Focus management on open/close, Escape closes
- **Don'ts**: Don't show two side panels simultaneously

### Toast / Notification
- **When to use**: Transient feedback after an action
- **Variants**: Success (green icon), Error (red icon), Info (blue icon), Warning (amber icon)
- **Spacing**: Bottom-right, p-4, gap-3 between stacked toasts
- **Accessibility**: role="status", aria-live="polite"
- **Don'ts**: Don't use for errors that require action — use inline error instead

---

## Cognitive Load Rules

- Max 7 content groups visible at once per view
- Max 5 form fields visible without scrolling
- Max 3 navigation depth levels
- Max 1 primary action per page section
- Progressive disclosure: advanced options hidden by default
- Empty states always include a single clear CTA

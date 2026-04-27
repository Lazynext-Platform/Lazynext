# 📋 Summary — Toast Notifications

> **Feature**: #28 — Toast Notifications
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

An ephemeral toast system with 6 variants — Success (green), Error (red with retry), Warning (amber with upgrade CTA), Info (blue), Decision (orange with `View decision` link), and Undo (slate with countdown timer). Toasts stack in the bottom-right, auto-dismiss after 5s (8s for Undo) with a colored progress bar, and slide in/out via CSS animations. Powered by **Sonner** with a thin wrapper that exposes a typed `toast.<variant>(...)` API.

## Key Decisions

- **Sonner over a hand-rolled stack** — Sonner handles stacking, accessibility, hover-to-pause, and reduced-motion preferences out of the box. Already a stack dependency.
- **Variants encode intent, not just color** — "Decision" is a separate variant (orange) because it consistently links to a decision; "Undo" is a separate variant because it carries a timer + reversible action.
- **Undo countdown is the toast's progress bar** — Same visual element as auto-dismiss but with explicit "Undo" button; expiry executes the action permanently.
- **Action buttons inline, not in a menu** — `Retry now`, `Upgrade plan`, `View decision`, `Undo` — one primary action per toast, in the toast itself, no overflow.

## Files & Components Affected

- `components/ui/toast.ts` — Typed wrapper over Sonner (`toast.success`, `toast.error`, `toast.warning`, `toast.info`, `toast.decision`, `toast.undo`)
- `app/layout.tsx` — `<Toaster />` mount with theme + position config
- `components/ui/toast-variants.tsx` — Custom render functions for non-default variants

## Dependencies

- **Depends on**: Sonner package; design tokens from `tailwind.config.ts`
- **Enables**: Immediate feedback affordance used by every feature that mutates state

## Notes

- All copy lives at the call site, not in the toast util — keeps the wrapper trivial.
- `toast.undo({ onUndo, label, ... })` returns a dismiss function; the action is committed when the timer expires unless the user clicks Undo.

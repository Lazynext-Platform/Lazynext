# 📋 Summary — Notification Center

> **Feature**: #23 — Notification Center
> **Status**: ✅ Complete (Retroactive — wired to real backend in v1.3.4.0; per-event prefs in v1.3.5.0)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A bell-icon dropdown in the top bar that shows real, persisted notifications from the `notifications` table (wired in v1.3.4.0 — replaced the previous fake demo dropdown). Includes a pulsing unread-count badge, All / Unread tabs, "Mark all read" action, time-grouped sections (Today / Yesterday / Earlier), and color-coded type badges for the 8 notification types: task assigned, decision logged, @mention, LazyMind insight, automation triggered, task completed, outcome tagged, weekly digest. Per-event preferences from #12 Workspace Settings (v1.3.5.0) gate which events generate notifications.

## Key Decisions

- **Real `notifications` table from day one of wiring** — No fake "you have 5 new things" badge ever in production. Was part of the demo-data eradication push.
- **Notification = a row, not an event** — Each row stores `{ user_id, workspace_id, type, payload, read_at }` so the dropdown is a paginated query against the table, not an event-stream replay.
- **Per-event preferences** — A user can mute "task assigned" without muting "@mention." Preferences live in `notification_preferences` (#12) and are checked at write time, not at render time, so muted events never enter the table.
- **Inserts piggyback on real actions** — Assigning a task inserts an `'assigned'` notification in the same transaction; mentioning a user in a thread inserts a `'mention'` row. No periodic scanner.

## Files & Components Affected

- `components/layout/NotificationBell.tsx` — Bell icon + badge
- `components/layout/NotificationDropdown.tsx` — Dropdown body
- `lib/db/schema/notifications.ts`, `notification_preferences.ts`
- `app/api/v1/notifications/route.ts` — List + mark-read endpoints
- `lib/data/notifications.ts` — Insert helper checked by every action that emits a notification
- `lib/realtime/notification-channel.ts` — Supabase Realtime subscription for live badge updates

## Dependencies

- **Depends on**: #03 Auth, #12 Workspace Settings (preferences), #34 Team Member Management (mention resolution)
- **Enables**: User awareness loop across every feature that emits an event

## Notes

- "Earlier" group bucket exists in the design; current implementation paginates `Today` / `Yesterday` and uses an "older" load-more for everything else.
- Mark-all-read is a single `UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`.

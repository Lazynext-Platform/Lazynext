# 📋 Summary — Real-time Collaboration

> **Feature**: #27 — Real-time Collaboration
> **Status**: ✅ Complete (Retroactive — wired in v1.3.6.0)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

Live presence on the canvas powered by **Supabase Realtime** (presence channel). Renders live colored cursors with name labels, pulsing selection rings around nodes that another user has selected with an "is editing" / "is viewing" pill, a top-bar presence indicator (green dot + count + stacked avatars), thread typing indicators (animated dots), and join/leave toast notifications.

## Key Decisions

- **Supabase Realtime over Liveblocks** — The original brief listed Liveblocks; we switched to Supabase Realtime to keep the stack count low (already a Supabase shop) and avoid a second auth model. Presence + broadcast cover the v1.0 need; Liveblocks-style CRDTs are not necessary because Lazynext does not have collaborative text-editing on the same field.
- **Presence channel per workspace, broadcast per node selection** — One channel handles "who's online"; node-selection updates broadcast on the same channel keyed by `node_id`. Scales to dozens of concurrent editors without sharding.
- **Cursor color is deterministic from `user_id`** — Hash-to-hue ensures a user always has the same color across sessions, building muscle memory.
- **No CRDT, last-write-wins on fields** — Per-field autosave with optimistic updates; conflicts are rare because users edit different nodes in practice. CRDT was deemed over-engineered for v1.0.

## Files & Components Affected

- `lib/realtime/presence.ts` — Channel join/leave + presence state
- `components/canvas/CursorOverlay.tsx`, `SelectionRings.tsx`, `PresenceAvatars.tsx`
- `components/canvas/panels/ThreadTypingIndicator.tsx`
- `lib/realtime/broadcast.ts` — Selection + typing broadcast
- `stores/canvas.store.ts` — Local presence/selection mirror

## Dependencies

- **Depends on**: #05 Workflow Canvas, #11 Thread Comments Panel, #34 Team Member Management
- **Enables**: Multi-user collaborative workflows; foundational for future co-editing features

## Notes

- Presence heartbeat is 30s; cursor broadcast is throttled to 60ms (~16Hz).
- Free plan has a 3-concurrent-editor cap; gated by `lib/wms.ts`.

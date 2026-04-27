# 📋 Summary — Thread Comments Panel

> **Feature**: #11 — Thread Comments Panel
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

A right-side thread panel (w-96) that attaches a permanent, auditable conversation to any node — most prominently to DECISION nodes. Includes a decision summary header, message list with avatars/timestamps/reactions, embedded comparison-table message support, `@mention` inline pills with a teammate popover, resolve/unresolve toggle, and an autoresizing comment input with attachment + send actions.

## Key Decisions

- **Threads are first-class node primitives** — A THREAD node can be created on its own or attached to another node; it's not a chat-on-the-side feature. Reuses the same node table with `type = 'thread'`.
- **Decision-attached threads show the decision summary** — When a thread belongs to a decision, the panel header shows title + status badge + quality score so the conversation never loses context.
- **Comparison tables are a message type** — `message.kind = 'comparison-table'` with a structured payload. Renders as a styled table inline, not a markdown approximation.
- **Mentions are typed references** — `@user` resolves to a workspace member; clicking the pill opens their profile; mentioning sends a notification (#23) to the mentioned user.
- **Resolved threads collapse, not delete** — Resolution is a state, not a destructive action; resolved threads still surface in search and audit (#38).

## Files & Components Affected

- `components/canvas/panels/ThreadPanel.tsx` — Panel body
- `components/canvas/panels/ThreadMessage.tsx` — Single message renderer (handles `text` + `comparison-table` kinds)
- `components/canvas/editor/MentionPopover.tsx` — Member picker on `@`
- `lib/db/schema/threads.ts` — `threads` and `thread_messages` tables
- `app/api/v1/threads/[id]/messages/route.ts` — Post + list messages
- `lib/realtime/thread-channel.ts` — Supabase Realtime subscription for live updates

## Dependencies

- **Depends on**: #05 Workflow Canvas, #09 Node Detail Panels, #34 Team Member Management (for mention resolution), #23 Notification Center (for mention notifications)
- **Enables**: #27 Real-time Collaboration (presence on the same thread channel)

## Notes

- Reactions are a fixed set (`👍`, `🎉`, `❤️`, `😅`, `👀`) stored as `{ emoji, user_id }` rows on the message; counts are computed.
- Attachment uploads use Supabase Storage; size cap is 10MB, gated by plan in `wms.ts`.

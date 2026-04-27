# 📋 Summary — Team Member Management

> **Feature**: #34 — Team Member Management
> **Status**: ✅ Complete (Retroactive)
> **Approximate Date Range**: 2026-04 (designed) → shipped to `main`

## What Was Built

The Members tab (#12) page in expanded form. **Stats bar** (total members, pending invites, seat limit + plan). **Search + role filter** over the member table. **Member table** (avatar, name, email, role badge — Owner / Admin / Member / Guest, last-active with online indicator, Edit / Remove actions). Current user marked with `You` badge and disabled remove. **Pending invitations** section with Resend / Revoke. **Invite modal** with email-chip input (multiple invitees in one flow), role select, optional message, real-time seat-usage info, copy-invite-link footer.

## Key Decisions

- **Email chips for batch invite** — Inviting 5 people at once is the common case; the chip input handles paste-from-spreadsheet naturally.
- **4 roles, no custom roles** — Owner / Admin / Member / Guest covers v1.0. Custom RBAC is a Phase 4+ concern.
- **Seat limit enforced at invite time, not at acceptance** — Prevents the racing-acceptance overage problem.
- **Pending invites are first-class rows** — Not just an email log; pending invites can be resent or revoked, and surface in the table.
- **Online indicator uses Supabase Realtime presence** — Reuses #27's presence channel; no extra polling.

## Files & Components Affected

- `components/settings/Members.tsx` — Table + stats bar + filters
- `components/settings/InviteModal.tsx` — Email-chip input + role select
- `lib/db/schema/memberships.ts`, `invitations.ts`
- `app/api/v1/workspaces/[slug]/members/route.ts`
- `app/api/v1/workspaces/[slug]/invitations/route.ts` — Send / resend / revoke
- `lib/email/templates/Invite.tsx` — From #19

## Dependencies

- **Depends on**: #03 Auth Pages, #12 Workspace Settings, #19 Email Templates, #13 Billing & Subscription (seat limits)
- **Enables**: #11 Thread mentions, #23 Notification routing, #27 Real-time presence — every feature that lists "team members" reads the same `memberships` table

## Notes

- Invite links are signed JWTs valid for 7 days; clicking creates the user (or signs them in) and adds the membership in a single transaction.
- "Copy invite link" exposes the same JWT; useful for sending via Slack rather than email.

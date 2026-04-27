-- ─────────────────────────────────────────────────────────────
-- Public canvas sharing.
--
-- A workflow with a non-null `share_token` can be viewed read-only
-- at /shared/[token] without authentication. The token is a UUID
-- separate from `id` so revoking a share doesn't break the
-- workflow itself.
--
-- Read access for anonymous viewers is handled by the public viewer
-- route using the service-role admin client filtered by token.
-- We do NOT add an anonymous-readable RLS policy on workflows/
-- nodes/edges because that would widen access globally; instead
-- the route is the single chokepoint.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS share_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS workflows_share_token_idx
  ON workflows(share_token)
  WHERE share_token IS NOT NULL;

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

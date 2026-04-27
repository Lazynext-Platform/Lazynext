-- ─────────────────────────────────────────────────────────────
-- AI usage ledger.
--
-- The Lazynext pricing surface promises Free = 20 AI queries/day,
-- Starter = 100/day/seat, Pro = 500/day/seat, Business = unlimited.
-- Until v1.3.22.0 the only enforcement was a per-minute burst cap
-- (20 req/min in `RATE_LIMITS.ai`) plus a client-side counter in
-- `LazyMindPanel` that resets on every page load. That gave Free
-- accounts effectively ~28,800 queries/day — the marketing was
-- nominal, not enforced.
--
-- This migration introduces a per-(user, workspace, UTC day) counter
-- so the API can enforce the real per-day cap. Counts are written
-- by the service-role admin client only; users never see this table.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  day          DATE NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id, day)
);

-- Targeted lookup for "today's usage for this user in this workspace".
CREATE INDEX IF NOT EXISTS ai_usage_lookup_idx
  ON ai_usage (user_id, workspace_id, day);

-- Service-role writes only. Users never read this directly — the API
-- exposes their remaining-quota via a derived response field. RLS is
-- still enabled to deny anon/authenticated reads.
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

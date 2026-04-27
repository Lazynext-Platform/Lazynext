-- ─────────────────────────────────────────────────────────────
-- API keys — workspace-scoped tokens for the Lazynext REST API.
--
-- Keys are issued by an Enterprise-plan workspace owner from
-- Settings → Integrations → API Access. The plaintext key is shown
-- to the user exactly once at creation time; the DB stores only a
-- SHA-256 hash and an 8-char prefix for display ("lzx_a1b2c3d4…").
-- The hash column is the lookup key for inbound API requests.
--
-- Why hash instead of encrypt: API keys are bearer tokens — if a
-- request arrives with one, we only need to know "is this hash in
-- the table?", never to recover the original string. Hashing means
-- a leaked DB dump is useless to an attacker; encryption with a
-- recoverable key isn't.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Creator. Useful for audit ("who issued this key?") and for
  -- showing per-user key lists in admin views down the line.
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Human-friendly label set at creation. Required so a workspace
  -- owner can tell "CI runner" from "personal laptop" at a glance.
  name          TEXT NOT NULL,
  -- SHA-256 of the plaintext key, hex-encoded. UNIQUE so a successful
  -- inbound lookup is one indexed equality check.
  key_hash      TEXT NOT NULL UNIQUE,
  -- First 8 chars of the plaintext (after the `lzx_` namespace) so the
  -- UI can show "lzx_a1b2c3d4…" without exposing the full key. NEVER
  -- enough to reconstruct the key — pure display affordance.
  key_prefix    TEXT NOT NULL,
  -- Updated by the API middleware on every successful auth so the UI
  -- can flag stale keys (and later, expire them automatically).
  last_used_at  TIMESTAMPTZ,
  -- Optional self-imposed expiry. NULL means "never expires"; the
  -- workspace owner can set a date at creation time.
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup: "list all keys for this workspace" (Settings page query).
CREATE INDEX IF NOT EXISTS api_keys_workspace_idx
  ON api_keys (workspace_id, created_at DESC);

-- Service-role writes only. Inbound API auth runs through the same
-- service-role client because RLS would otherwise need a bearer-token
-- → user-id mapping that doesn't exist for machine clients.
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

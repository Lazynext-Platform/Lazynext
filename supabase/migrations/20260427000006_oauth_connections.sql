-- ─────────────────────────────────────────────────────────────
-- OAuth connections — third-party integration tokens.
--
-- Lazynext's roadmap has carried "Slack/Notion/GitHub" integrations
-- and the Import Modal's OAuth connectors (Notion/Linear/Trello/Asana/
-- Jira) as honest empty states since v1.0. They've stayed that way
-- because each provider needs a developer-portal app registration
-- (client_id + client_secret) that no AI agent can do — only the
-- human owner with credentials at each vendor can.
--
-- This migration ships the *infrastructure* those features will use.
-- The tokens column stores AES-256-GCM-encrypted JSON containing the
-- access + refresh tokens. The encryption key is held in
-- OAUTH_TOKEN_ENCRYPTION_KEY (32-byte hex) — without it, decryption
-- fails closed.
--
-- No provider adapter ships in this migration; provider rows will be
-- created when each vendor is wired (one Mastery cycle per provider).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS oauth_connections (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Identity who installed the connection. Useful for audit (who
  -- connected Slack to this workspace?) and for revocation flows that
  -- want to confirm the actor.
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Lowercase slug: 'slack', 'notion', 'github', 'linear', 'trello',
  -- 'asana', 'jira'. Validated against `lib/oauth/registry.ts`'s
  -- known providers at the API layer; the DB stays permissive so
  -- adding a new provider is one code change, not a migration.
  provider      TEXT NOT NULL,
  -- Provider-specific external account identifier. For Slack: team_id;
  -- for Notion: workspace_id; for GitHub: installation_id; etc.
  -- Lets us de-dupe re-installs (UNIQUE composite below) without
  -- querying the provider's API.
  external_id   TEXT NOT NULL,
  -- Provider-issued display name. NEVER write secrets here.
  display_name  TEXT,
  -- AES-256-GCM-encrypted JSON: { access_token, refresh_token?,
  -- expires_at? }. See lib/oauth/crypto.ts. The DB never sees plaintext
  -- tokens. Format is `iv:authTag:ciphertext`, all base64url.
  encrypted_tokens TEXT NOT NULL,
  -- Provider-issued scopes, space-separated. Used by the UI to show
  -- "this connection can read/write X" without trying to decrypt.
  scopes        TEXT,
  -- Last successful refresh. NULL until the first refresh fires.
  last_refreshed_at TIMESTAMPTZ,
  -- When the access token expires according to the provider. Used by
  -- the proactive refresh job. NULL means non-expiring (rare, mostly
  -- legacy Notion-style integration tokens).
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One workspace can connect multiple providers, but only one
  -- connection per (workspace, provider, external_id). Re-installing
  -- the same Slack workspace updates rather than duplicates.
  UNIQUE (workspace_id, provider, external_id)
);

-- Lookup: "all connections for this workspace, grouped by provider"
-- (the Settings → Integrations page query).
CREATE INDEX IF NOT EXISTS oauth_connections_workspace_idx
  ON oauth_connections (workspace_id, provider);

-- Lookup for the proactive token-refresh worker: "every connection
-- expiring in the next N minutes."
CREATE INDEX IF NOT EXISTS oauth_connections_expires_idx
  ON oauth_connections (expires_at)
  WHERE expires_at IS NOT NULL;

-- Service-role writes only. Application code reads via the workspace
-- membership check at the API layer; RLS denies anon/authenticated
-- direct reads so a leaked anon key never exposes encrypted tokens
-- (defense in depth — the tokens are encrypted regardless).
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

-- updated_at maintenance.
CREATE OR REPLACE FUNCTION oauth_connections_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS oauth_connections_updated_at ON oauth_connections;
CREATE TRIGGER oauth_connections_updated_at
  BEFORE UPDATE ON oauth_connections
  FOR EACH ROW EXECUTE FUNCTION oauth_connections_set_updated_at();

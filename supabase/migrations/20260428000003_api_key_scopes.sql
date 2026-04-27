-- ─────────────────────────────────────────────────────────────
-- API key scopes — minimum-privilege per-key access control.
--
-- v1.3.31.0 introduced bearer auth on read endpoints. v1.3.32.0
-- added per-keyId rate-limit + lifecycle audit. This migration
-- closes the third half of the security model: a key minted for
-- "CSV export from a CI runner" should NOT be able to mutate
-- decisions if it leaks.
--
-- Scopes are a TEXT[] of stable string tokens. v1 tokens:
--   'read'  → may call GET endpoints
--   'write' → may call POST/PATCH/DELETE endpoints (implies read)
--
-- Default is `ARRAY['read']` — least-privilege. Existing keys
-- (issued before this migration) are also defaulted to read-only,
-- which is a tightening: any caller using a pre-scope key for a
-- mutation route would have to be re-issued with 'write'. The
-- mutation routes don't go bearer-aware until v1.3.34.0, so this
-- is forward-compatible — no live mutation client breaks.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS scopes TEXT[] NOT NULL DEFAULT ARRAY['read'];

-- Light shape check: every element must be one of the known tokens.
-- A future migration can extend this CHECK to add new scopes; the
-- application layer also validates the whitelist before insert.
ALTER TABLE api_keys
  ADD CONSTRAINT api_keys_scopes_valid
  CHECK (
    scopes <@ ARRAY['read', 'write']::TEXT[]
    AND array_length(scopes, 1) >= 1
  );

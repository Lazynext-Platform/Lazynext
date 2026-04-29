-- ─────────────────────────────────────────────────────────────
-- Per-device sessions — exposed via SECURITY DEFINER RPC.
--
-- Background: feature #30 (Profile → Sessions tab) shipped with an
-- honest empty state because the comment in ProfileClient.tsx said
-- "Supabase Auth doesn't expose a per-device session list to the
-- client." Modern Supabase actually does store this in
-- `auth.sessions` (id, user_id, user_agent, ip, created_at,
-- updated_at, refreshed_at, not_after, factor_id, aal). The schema
-- is not part of any public API though — direct reads from
-- application code couple us to internal Supabase changes.
--
-- This migration creates two stable RPC functions on the public
-- schema. The functions run with `SECURITY DEFINER` so the caller
-- doesn't need any auth-schema privileges. Authorization is
-- explicit: each function takes the user_id and only acts on rows
-- matching it. The service-role client (which is the only caller —
-- API route handlers running server-side) is responsible for
-- supplying the authenticated user_id; never trust a user-supplied
-- id from the request body.
--
-- Why not a view? A view returning auth.sessions to authenticated
-- callers would expose every column to RLS-by-default, including
-- internal fields that Supabase may add later. Functions with
-- explicit return signatures cap our blast radius.
--
-- Stability: if Supabase changes the auth.sessions column set,
-- only this file needs to update. Application code keeps the same
-- contract.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- list_user_sessions — returns the caller's active sessions.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_user_sessions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ,
  not_after TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
-- Lock the search_path so a malicious schema in the caller's
-- search_path can't shadow `auth.sessions`. Standard hardening
-- for SECURITY DEFINER on Supabase.
SET search_path = pg_catalog, public
AS $$
  SELECT
    s.id,
    s.user_agent,
    -- inet → text so the JS client gets a string. NULL passes through.
    host(s.ip)::TEXT AS ip,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    s.not_after
  FROM auth.sessions s
  WHERE s.user_id = p_user_id
    -- Filter expired sessions even if the auth-cleanup job is
    -- behind. `not_after IS NULL` means "no explicit expiry" —
    -- treat as active.
    AND (s.not_after IS NULL OR s.not_after > now())
  ORDER BY s.refreshed_at DESC NULLS LAST, s.created_at DESC;
$$;

-- Service role uses this server-side only. Revoking from
-- anon/authenticated keeps the function inaccessible if anyone
-- ever points the public-key client at it by accident.
REVOKE ALL ON FUNCTION public.list_user_sessions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_user_sessions(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_sessions(UUID) TO service_role;

COMMENT ON FUNCTION public.list_user_sessions(UUID) IS
  'Lists active auth.sessions rows for the given user_id. Service role only; called by /api/v1/sessions.';

-- ─────────────────────────────────────────────────────────────
-- revoke_user_session — deletes one session row, scoped to user.
--
-- Returns the number of rows deleted (0 = not found / not yours,
-- 1 = revoked). Caller treats 0 as a 404. Deleting the row is
-- the documented Supabase mechanism for revoking a refresh-token
-- chain — subsequent `refreshSession()` calls fail with
-- "Invalid Refresh Token: Already Used" and the device is logged
-- out as soon as its access token expires (default 1 hour).
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_user_session(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM auth.sessions
  WHERE id = p_session_id
    AND user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_session(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_user_session(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_session(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.revoke_user_session(UUID, UUID) IS
  'Deletes a single auth.sessions row scoped to user_id. Returns rows deleted (0 or 1). Service role only; called by /api/v1/sessions/[id] DELETE.';

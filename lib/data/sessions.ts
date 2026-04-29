// ─────────────────────────────────────────────────────────────
// Per-device session data layer.
//
// Backed by two SECURITY DEFINER RPCs in
// `supabase/migrations/20260429000001_user_sessions.sql`:
//   - public.list_user_sessions(p_user_id uuid)
//   - public.revoke_user_session(p_session_id uuid, p_user_id uuid)
//
// Why RPC instead of querying auth.sessions directly: the auth
// schema is internal Supabase; columns have changed before. An
// RPC pins us to a stable contract we own.
//
// Authorization rule baked in here: the caller (an /api/v1/*
// route handler) MUST have already verified the request is
// authenticated and pass `userId` from the resolved session.
// Never accept `userId` from the request body.
// ─────────────────────────────────────────────────────────────

import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { parseUserAgent, type ParsedUserAgent } from '@/lib/utils/user-agent'

export interface UserSession {
  id: string
  userAgent: string | null
  ip: string | null
  createdAt: string
  updatedAt: string | null
  refreshedAt: string | null
  notAfter: string | null
  /** Parsed user-agent, ready for the UI to render without re-parsing. */
  device: ParsedUserAgent
}

/**
 * Service-role RPC return shape. Mirrors the function signature
 * in the migration. Kept narrow — adding fields here without also
 * extending the SQL function would silently return undefined.
 */
interface RpcSessionRow {
  id: string
  user_agent: string | null
  ip: string | null
  created_at: string
  updated_at: string | null
  refreshed_at: string | null
  not_after: string | null
}

/**
 * List the active sessions for a user. Returns `[]` when the DB
 * is not configured (so the UI can render an empty state without
 * surfacing config errors to the end user).
 */
export async function listUserSessions(userId: string): Promise<UserSession[]> {
  if (!hasValidDatabaseUrl) return []
  const { data, error } = await db.rpc('list_user_sessions', { p_user_id: userId })
  if (error) {
    // Caller (API route) wraps with reportApiError; bubble up.
    throw error
  }
  const rows = (data ?? []) as RpcSessionRow[]
  return rows.map((r) => ({
    id: r.id,
    userAgent: r.user_agent,
    ip: r.ip,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    refreshedAt: r.refreshed_at,
    notAfter: r.not_after,
    device: parseUserAgent(r.user_agent),
  }))
}

/**
 * Revoke a specific session. The RPC scopes the delete by both
 * session id AND user id, so this can never delete another user's
 * session even if `userId` were spoofed (it isn't — see the file
 * header). Returns `true` if a row was deleted, `false` if no
 * matching row existed.
 */
export async function revokeUserSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const { data, error } = await db.rpc('revoke_user_session', {
    p_session_id: sessionId,
    p_user_id: userId,
  })
  if (error) throw error
  // The RPC returns INTEGER (rows deleted). supabase-js wraps single-int
  // returns as the raw value in `data`.
  return typeof data === 'number' && data > 0
}

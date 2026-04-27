import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { authenticateApiKey } from '@/lib/utils/api-key-auth'

/**
 * Resolves a v1 request to either a session user or an API-key bearer.
 *
 * Returns one of:
 *  - `{ ok: true, userId, workspaceId, viaApiKey, keyId }` \u2014 happy path.
 *    `workspaceId` is null when the caller will pull it from the URL/body
 *    and is guaranteed bound when `viaApiKey` is true (the key itself is
 *    the workspace grant).
 *  - `{ ok: false, response }` \u2014 prebuilt 401/403/400/503 NextResponse.
 *
 * Behaviour:
 *  - If a bearer token is present and resolves, membership is implied
 *    by the key. The caller does NOT need to call `verifyWorkspaceMember`.
 *  - If a bearer is present and the caller passes `workspaceId` via
 *    query/body, that workspaceId MUST equal the bearer's workspace
 *    \u2014 mismatched ids return 403 `WORKSPACE_MISMATCH`.
 *  - If no bearer is present, falls through to cookie-session auth.
 *    Membership is NOT auto-checked here \u2014 the caller decides per-route
 *    when to call `verifyWorkspaceMember`.
 *
 * Use `requireWorkspaceAuth(req, workspaceId)` for the common case
 * "I have a workspace id; tell me if this caller is authorised."
 */
export interface AuthOk {
  ok: true
  userId: string
  // Set when the bearer token resolved; null on cookie-session auth
  // (caller pulls workspaceId from the URL).
  bearerWorkspaceId: string | null
  viaApiKey: boolean
  keyId: string | null
  // Stable identifier for rate-limit buckets. For bearer requests this
  // is the keyId so a leaked key can't burn a human user's budget; for
  // cookie-session requests it falls back to the userId.
  rateLimitId: string
}

export interface AuthFail {
  ok: false
  response: NextResponse
}

export type AuthResult = AuthOk | AuthFail

/**
 * Resolve the caller. Does NOT verify workspace membership \u2014 use
 * `requireWorkspaceAuth` for that.
 */
export async function resolveAuth(req: Request): Promise<AuthResult> {
  const apiKey = await authenticateApiKey(req)
  if (apiKey) {
    return {
      ok: true,
      userId: apiKey.userId,
      bearerWorkspaceId: apiKey.workspaceId,
      viaApiKey: true,
      keyId: apiKey.keyId,
      rateLimitId: `key:${apiKey.keyId}`,
    }
  }
  const session = await safeAuth()
  if (!session.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    }
  }
  return {
    ok: true,
    userId: session.userId,
    bearerWorkspaceId: null,
    viaApiKey: false,
    keyId: null,
    rateLimitId: `user:${session.userId}`,
  }
}

/**
 * Resolve the caller AND verify they're authorised for `workspaceId`.
 * Bearer requests are auto-authorised if their key is bound to that
 * workspace. Cookie-session requests run through `verifyWorkspaceMember`.
 *
 * Returns either an `AuthOk` with `userId` (caller authorised), or an
 * `AuthFail` with a prebuilt 401/403 response.
 */
export async function requireWorkspaceAuth(
  req: Request,
  workspaceId: string,
): Promise<AuthResult> {
  const auth = await resolveAuth(req)
  if (!auth.ok) return auth

  if (auth.viaApiKey) {
    if (auth.bearerWorkspaceId !== workspaceId) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'WORKSPACE_MISMATCH' }, { status: 403 }),
      }
    }
    return auth
  }

  const member = await verifyWorkspaceMember(auth.userId, workspaceId)
  if (!member) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }),
    }
  }
  return auth
}

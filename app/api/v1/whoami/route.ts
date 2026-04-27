import { NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/utils/route-auth'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

/**
 * GET /api/v1/whoami
 *
 * Returns the resolved identity for the inbound credentials. Used by
 * SDK consumers and CI scripts to verify their key is wired correctly
 * BEFORE calling a real endpoint and burning a mutation budget on a
 * misconfigured workspace.
 *
 * Response (cookie session):
 *   { authType: 'session', userId, workspaceId: null, scopes: ['read','write'] }
 *
 * Response (bearer):
 *   { authType: 'apiKey', userId, workspaceId, keyId, keyPrefix, keyName, scopes }
 *
 * 401 on no/invalid creds. Rate-limited on the api bucket.
 *
 * Auth-introspection is read-only and intentionally has NO scope
 * requirement — a read-only key needs to be able to call this
 * endpoint to verify itself.
 */
export async function GET(req: Request) {
  const auth = await resolveAuth(req)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  if (!auth.viaApiKey) {
    return NextResponse.json({
      authType: 'session',
      userId: auth.userId,
      workspaceId: null,
      scopes: auth.scopes,
    })
  }

  // Bearer path. Pull key metadata for a nicer payload. The key id is
  // already known from auth resolution; we just need the prefix +
  // human-readable name. If the DB lookup fails for any reason, we
  // still return a useful response — the key is provably valid (it
  // resolved already), the metadata is just less rich.
  let keyPrefix: string | null = null
  let keyName: string | null = null
  if (hasValidDatabaseUrl && auth.keyId) {
    const { data } = await db
      .from('api_keys')
      .select('key_prefix, name')
      .eq('id', auth.keyId)
      .maybeSingle()
    const row = data as { key_prefix?: string; name?: string } | null
    keyPrefix = row?.key_prefix ?? null
    keyName = row?.name ?? null
  }

  return NextResponse.json({
    authType: 'apiKey',
    userId: auth.userId,
    workspaceId: auth.bearerWorkspaceId,
    keyId: auth.keyId,
    keyPrefix,
    keyName,
    scopes: auth.scopes,
  })
}

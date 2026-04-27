import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { hashApiKey, normalizeScopes, type ApiKeyScope } from '@/lib/data/api-keys'

/**
 * Inbound API-key authentication. Given an `Authorization: Bearer
 * lzx_...` header value (or an `X-Api-Key` header — both accepted),
 * resolves it to a workspace + creator user via SHA-256 lookup against
 * `api_keys.key_hash`.
 *
 * Returns null on any failure mode:
 *  - missing/empty header
 *  - non-`lzx_` prefix
 *  - no matching hash
 *  - expired key (`expires_at < now()`)
 *  - DB unavailable
 *
 * Side effect: when a key successfully resolves, `last_used_at` is
 * bumped to `now()`. This is fire-and-forget — the auth result is
 * already in hand and an update failure should NOT fail the request.
 */
export interface ApiKeyAuthResult {
  workspaceId: string
  // The user who originally minted the key. Useful for audit logging
  // ("which human's key did this machine request use?") even though
  // the request itself isn't strictly that user's session.
  userId: string
  keyId: string
  scopes: ApiKeyScope[]
}

const BEARER_RE = /^Bearer\s+(.+)$/i

function extractBearer(header: string | null | undefined): string | null {
  if (!header) return null
  const trimmed = header.trim()
  if (!trimmed) return null
  // Accept `Bearer <token>` (RFC 6750) or a raw token. Other auth
  // schemes (Basic, Digest) explicitly NOT accepted — anything that
  // isn't `Bearer` should fail closed.
  const match = trimmed.match(BEARER_RE)
  if (match) return match[1].trim()
  // Lowercase `bearer` is matched by the /i flag above. A raw token
  // with no scheme is rejected here unless it looks like `lzx_...`,
  // which keeps an accidental cookie-style header from leaking past
  // the gate.
  return null
}

/**
 * Resolves an inbound bearer token to a workspace + user. Returns
 * null on any failure mode (no header, malformed, no DB, no match,
 * expired). Callers MUST treat null as 401 without leaking which of
 * the failure modes triggered \u2014 a leak there is a username-enumeration
 * primitive.
 */
export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyAuthResult | null> {
  if (!hasValidDatabaseUrl) return null

  const headerValue =
    extractBearer(request.headers.get('authorization')) ??
    request.headers.get('x-api-key')?.trim() ??
    null
  if (!headerValue) return null
  // Cheap shape check before hashing \u2014 saves a CPU hash on
  // garbage tokens. The hash is fast, but a 1KB cookie blob
  // accidentally pasted into a header isn't worth the cycle.
  if (!headerValue.startsWith('lzx_') || headerValue.length < 12) {
    return null
  }

  const keyHash = hashApiKey(headerValue)
  const { data, error } = await db
    .from('api_keys')
    .select('id, workspace_id, user_id, expires_at, scopes')
    .eq('key_hash', keyHash)
    .maybeSingle()
  if (error || !data) return null

  const row = data as {
    id: string
    workspace_id: string
    user_id: string
    expires_at: string | null
    scopes: string[] | null
  }

  if (row.expires_at) {
    // Expiry is server-side wall clock. The DB stores a UTC timestamp;
    // Date parsing handles both `Z`-suffixed and offset-suffixed strings.
    const expiresMs = Date.parse(row.expires_at)
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      return null
    }
  }

  // Fire-and-forget last_used_at bump. We don't await: a successful
  // auth shouldn't be slowed by a stat-tracking write, and a failed
  // write shouldn't fail the request.
  void db
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)
    .then(
      () => undefined,
      () => undefined,
    )

  return {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    keyId: row.id,
    scopes: normalizeScopes(row.scopes ?? undefined),
  }
}

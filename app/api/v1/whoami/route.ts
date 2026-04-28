import { NextResponse } from 'next/server'
import { resolveAuth } from '@/lib/utils/route-auth'
import {
  rateLimit,
  rateLimitResponse,
  RATE_LIMITS,
  checkApiRateLimit,
} from '@/lib/utils/rate-limit'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { getWorkspacePlan } from '@/lib/data/ai-usage'
import {
  buildResponseHeaders,
  newRequestId,
  headersToObject,
} from '@/lib/utils/api-headers'

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
 * 401 on no/invalid creds. Rate-limited:
 *  - Bearer: two-tier per-key + workspace ceiling, plan-aware.
 *  - Session: single api bucket on `user:{userId}`.
 *
 * All responses carry the public-API contract headers — `X-Request-Id`,
 * `X-API-Version`, `X-RateLimit-*`. This route is the **canary** for
 * the feature #40 rollout; the rest of `/api/v1/*` follows once this
 * pattern is reviewed.
 *
 * Auth-introspection is read-only and intentionally has NO scope
 * requirement — a read-only key needs to be able to call this
 * endpoint to verify itself.
 */
export async function GET(req: Request) {
  const requestId = newRequestId()

  const auth = await resolveAuth(req)
  if (!auth.ok) {
    // Auth failures are pre-built NextResponses; we still want to add
    // request-id so the customer can quote it in support tickets.
    auth.response.headers.set('X-Request-Id', requestId)
    auth.response.headers.set('X-API-Version', 'v1')
    return auth.response
  }

  // ─── Rate limit ───────────────────────────────────────────────
  // Bearer requests get the two-tier plan-aware check. Cookie sessions
  // (dashboard) keep the simple single-bucket — they're not the threat
  // model the workspace ceiling is designed to defend against.
  if (auth.viaApiKey && auth.keyId && auth.bearerWorkspaceId) {
    const plan = await getWorkspacePlan(auth.bearerWorkspaceId)
    const decision = checkApiRateLimit({
      keyId: auth.keyId,
      workspaceId: auth.bearerWorkspaceId,
      plan,
    })

    if (!decision.allowed) {
      const headers = buildResponseHeaders({
        requestId,
        rateLimit: decision.headers,
        retryAfterSec: decision.retryAfterSec,
      })
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', bucket: decision.bindingBucket },
        { status: 429, headers: headersToObject(headers) }
      )
    }

    return whoamiResponse(auth, requestId, decision.headers)
  }

  // Session path — single bucket.
  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) {
    const baseResp = rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
    baseResp.headers.set('X-Request-Id', requestId)
    baseResp.headers.set('X-API-Version', 'v1')
    return baseResp
  }

  return whoamiResponse(auth, requestId, {
    limit: RATE_LIMITS.api.limit,
    remaining: rl.remaining,
    resetAtSec: Math.ceil(rl.resetAt / 1000),
  })
}

async function whoamiResponse(
  auth: Extract<Awaited<ReturnType<typeof resolveAuth>>, { ok: true }>,
  requestId: string,
  rateLimitInfo: { limit: number; remaining: number; resetAtSec: number }
): Promise<NextResponse> {
  const headers = buildResponseHeaders({
    requestId,
    rateLimit: rateLimitInfo,
  })
  const headerObj = headersToObject(headers)

  if (!auth.viaApiKey) {
    return NextResponse.json(
      {
        authType: 'session',
        userId: auth.userId,
        workspaceId: null,
        scopes: auth.scopes,
      },
      { headers: headerObj }
    )
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

  return NextResponse.json(
    {
      authType: 'apiKey',
      userId: auth.userId,
      workspaceId: auth.bearerWorkspaceId,
      keyId: auth.keyId,
      keyPrefix,
      keyName,
      scopes: auth.scopes,
    },
    { headers: headerObj }
  )
}

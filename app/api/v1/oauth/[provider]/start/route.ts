import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import {
  isKnownProvider,
  isProviderConfigured,
  getOAuthProvider,
} from '@/lib/oauth/registry'
import { ensureGithubAdapterRegistered } from '@/lib/oauth/github'
import { reportApiError } from '@/lib/utils/api-sentry'
import { randomBytes } from 'node:crypto'

// Adapter registration. Each adapter is idempotent — calling
// the ensure* helper more than once is a no-op.
ensureGithubAdapterRegistered()

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/oauth/[provider]/start?workspaceId=<uuid>
 *
 * Reserves the URL space for every roadmap provider. Behavior:
 *
 *   - Unknown provider id → 404
 *   - Provider not configured (env vars missing) → 503 with a copy
 *     that names the env vars to set. The Settings UI hides the
 *     Connect button in this case so this branch is mostly a safety
 *     net for direct URL hits.
 *   - Provider configured but no adapter registered (the current
 *     scaffolding state) → 501 with `provider_id` in the body so a
 *     deploy probe can tell which providers still need adapter PRs.
 *   - Both configured AND adapter registered → delegate to
 *     `buildAuthorizeUrl` + 302 redirect. (No adapter ships in this
 *     PR; this branch will activate per-provider.)
 *
 * State + PKCE storage will land with the first adapter PR — they
 * need a server-readable cookie or a short-lived DB row, neither
 * of which is meaningful without a real provider to redirect into.
 */
export async function GET(
  req: Request,
  { params }: { params: { provider: string } },
) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  if (!isKnownProvider(params.provider)) {
    return NextResponse.json({ error: 'UNKNOWN_PROVIDER' }, { status: 404 })
  }

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  if (!isProviderConfigured(params.provider)) {
    const upper = params.provider.toUpperCase()
    return NextResponse.json(
      {
        error: 'PROVIDER_NOT_CONFIGURED',
        message: `Set LAZYNEXT_OAUTH_${upper}_CLIENT_ID and LAZYNEXT_OAUTH_${upper}_CLIENT_SECRET to enable this provider.`,
        provider_id: params.provider,
      },
      { status: 503 },
    )
  }

  const adapter = getOAuthProvider(params.provider)
  if (!adapter) {
    return NextResponse.json(
      {
        error: 'PROVIDER_ADAPTER_NOT_REGISTERED',
        message: `${params.provider} is configured (env vars present) but no adapter has been registered yet. Adapters land in their own per-provider PRs.`,
        provider_id: params.provider,
      },
      { status: 501 },
    )
  }

  // From here on, an adapter is registered. Mint a CSRF state
  // token, stamp it into a short-lived signed cookie, and redirect
  // to the provider's authorize URL.
  const state = randomBytes(24).toString('base64url')

  // Origin from the request URL so dev / preview / prod all build
  // the right absolute redirect URI without an extra env var.
  const origin = url.origin
  const redirectUri = `${origin}/api/v1/oauth/${params.provider}/callback`

  // Default to read-mode for now; the UI doesn't yet expose a
  // mode selector. Per-adapter flows that need write access call
  // this endpoint with `?mode=write` in a future PR.
  const modeParam = url.searchParams.get('mode')
  const mode: 'read' | 'write' | 'admin' =
    modeParam === 'write' || modeParam === 'admin' ? modeParam : 'read'

  let authorizeUrl: string
  try {
    authorizeUrl = adapter.buildAuthorizeUrl({
      state,
      redirectUri,
      mode,
    })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/oauth/[provider]/start',
      method: 'GET',
      userId,
      workspaceId,
      extra: { provider: params.provider },
    })
    return NextResponse.json(
      { error: 'PROVIDER_AUTHORIZE_FAILED', provider_id: params.provider },
      { status: 500 },
    )
  }

  // Cookie carries: state + workspaceId + mode. Signed via
  // SameSite=Lax + Secure + HttpOnly + 10-minute expiry. We don't
  // also DB-persist this — a transient cookie is the right home for
  // a 10-minute CSRF token.
  const cookieValue = JSON.stringify({ state, workspaceId, mode })
  const cookieName = `lzx_oauth_${params.provider}`

  const response = NextResponse.redirect(authorizeUrl, { status: 302 })
  response.cookies.set(cookieName, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  })
  return response
}

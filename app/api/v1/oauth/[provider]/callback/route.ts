import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { hasValidDatabaseUrl, db } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import {
  isKnownProvider,
  isProviderConfigured,
  getOAuthProvider,
} from '@/lib/oauth/registry'
import { ensureGithubAdapterRegistered } from '@/lib/oauth/github'
import { sealTokenEnvelope } from '@/lib/oauth/crypto'
import { reportApiError } from '@/lib/utils/api-sentry'

ensureGithubAdapterRegistered()

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/oauth/[provider]/callback
 *
 * The provider redirects here with `?code=...&state=...`. We:
 *   1. Look up the start-cookie to recover the original state +
 *      workspaceId + mode.
 *   2. Verify the state matches (CSRF defense).
 *   3. Confirm the caller's session and that they're still a
 *      member of the original workspace.
 *   4. Exchange the code for tokens via the provider's adapter.
 *   5. Encrypt the token envelope and upsert into oauth_connections.
 *   6. Redirect back to Settings → Integrations with a status flag.
 *
 * Errors are NEVER surfaced as raw stack traces to the user. We
 * redirect with `?oauth_error=...` so the UI can show a friendly
 * inline message; the underlying exception is reported to Sentry.
 */
export async function GET(
  req: Request,
  { params }: { params: { provider: string } },
) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  // Provider-side cancel: GitHub redirects with ?error=access_denied
  // if the user clicks "Cancel" on the consent screen. Treat as a
  // benign redirect home.
  const providerError = url.searchParams.get('error')

  const { userId } = await safeAuth()
  if (!userId) {
    return redirectError(req, params.provider, null, 'unauthorized')
  }

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) {
    return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  }

  if (!isKnownProvider(params.provider)) {
    return NextResponse.json({ error: 'UNKNOWN_PROVIDER' }, { status: 404 })
  }
  if (!isProviderConfigured(params.provider)) {
    return redirectError(req, params.provider, null, 'not_configured')
  }
  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  // Pull the start-cookie BEFORE checking provider error so we can
  // route back to a sane workspace slug even on cancellation.
  const cookieName = `lzx_oauth_${params.provider}`
  const cookieRaw = req.headers.get('cookie') ?? ''
  const cookieValue = parseCookie(cookieRaw, cookieName)
  let cookieState: string | null = null
  let cookieWorkspaceId: string | null = null
  try {
    if (cookieValue) {
      const parsed = JSON.parse(cookieValue) as {
        state?: string
        workspaceId?: string
      }
      cookieState = parsed.state ?? null
      cookieWorkspaceId = parsed.workspaceId ?? null
    }
  } catch {
    // Malformed cookie — treat as missing.
  }

  if (providerError) {
    return redirectError(req, params.provider, cookieWorkspaceId, providerError)
  }

  if (!code || !state) {
    return redirectError(req, params.provider, cookieWorkspaceId, 'missing_params')
  }

  if (!cookieState || cookieState !== state || !cookieWorkspaceId) {
    // CSRF / replay / cookie-eviction. Always redirect to error;
    // never proceed with exchange.
    return redirectError(req, params.provider, cookieWorkspaceId, 'state_mismatch')
  }

  // Re-verify workspace membership at callback time — between
  // redirect and callback the user could have lost access.
  const { data: member } = await db
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', cookieWorkspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!member) {
    return redirectError(req, params.provider, cookieWorkspaceId, 'forbidden')
  }

  const adapter = getOAuthProvider(params.provider)
  if (!adapter) {
    return redirectError(req, params.provider, cookieWorkspaceId, 'no_adapter')
  }

  const redirectUri = `${url.origin}/api/v1/oauth/${params.provider}/callback`

  let tokens: Awaited<ReturnType<typeof adapter.exchangeCode>>
  try {
    tokens = await adapter.exchangeCode({ code, redirectUri })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/oauth/[provider]/callback',
      method: 'GET',
      userId,
      workspaceId: cookieWorkspaceId,
      extra: { provider: params.provider, phase: 'exchange' },
    })
    return redirectError(req, params.provider, cookieWorkspaceId, 'exchange_failed')
  }

  // Encrypt the token envelope. If the encryption key is missing
  // or wrong-length, this throws — we report and redirect with a
  // distinct error code so deploy probes can detect the misconfig.
  let encrypted: string
  try {
    encrypted = sealTokenEnvelope({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
    })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/oauth/[provider]/callback',
      method: 'GET',
      userId,
      workspaceId: cookieWorkspaceId,
      extra: { provider: params.provider, phase: 'seal' },
    })
    return redirectError(req, params.provider, cookieWorkspaceId, 'encryption_unavailable')
  }

  // Upsert by the (workspace_id, provider, external_id) unique
  // index — a re-connect of the same GitHub user replaces the
  // previous row's tokens / scopes / expiry.
  const { error: upsertError } = await db.from('oauth_connections').upsert(
    {
      workspace_id: cookieWorkspaceId,
      user_id: userId,
      provider: params.provider,
      external_id: tokens.externalId,
      display_name: tokens.displayName ?? null,
      encrypted_tokens: encrypted,
      scopes: tokens.scopes ?? null,
      expires_at: tokens.expiresAt ?? null,
      last_refreshed_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,provider,external_id' },
  )

  if (upsertError) {
    reportApiError(upsertError, {
      route: '/api/v1/oauth/[provider]/callback',
      method: 'GET',
      userId,
      workspaceId: cookieWorkspaceId,
      extra: { provider: params.provider, phase: 'upsert' },
    })
    return redirectError(req, params.provider, cookieWorkspaceId, 'persist_failed')
  }

  // Success: redirect back to Settings → Integrations with the
  // start-cookie cleared.
  const slug = await safeWorkspaceSlug(cookieWorkspaceId)
  const successUrl = slug
    ? `${url.origin}/workspace/${encodeURIComponent(slug)}/integrations?oauth_connected=${encodeURIComponent(params.provider)}`
    : `${url.origin}/?oauth_connected=${encodeURIComponent(params.provider)}`

  const response = NextResponse.redirect(successUrl, { status: 302 })
  // Clear the cookie either way.
  response.cookies.set(cookieName, '', { path: '/', maxAge: 0 })
  return response
}

// ─── helpers ────────────────────────────────────────────────────

function parseCookie(cookieHeader: string, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return null
}

async function safeWorkspaceSlug(workspaceId: string | null): Promise<string | null> {
  if (!workspaceId) return null
  const { data } = await db
    .from('workspaces')
    .select('slug')
    .eq('id', workspaceId)
    .maybeSingle()
  return (data as { slug?: string } | null)?.slug ?? null
}

function redirectError(
  req: Request,
  provider: string,
  workspaceId: string | null,
  code: string,
): NextResponse {
  const url = new URL(req.url)
  // Best-effort slug recovery — if we don't know the workspace, go
  // to the homepage with the error flag.
  const target = workspaceId
    ? `${url.origin}/?oauth_error=${encodeURIComponent(code)}&provider=${encodeURIComponent(provider)}`
    : `${url.origin}/?oauth_error=${encodeURIComponent(code)}&provider=${encodeURIComponent(provider)}`
  const response = NextResponse.redirect(target, { status: 302 })
  // Clear any lingering start-cookie even on error so a stale
  // state doesn't poison the next attempt.
  response.cookies.set(`lzx_oauth_${provider}`, '', { path: '/', maxAge: 0 })
  return response
}

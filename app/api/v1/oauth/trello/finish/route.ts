import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { hasValidDatabaseUrl, db } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import {
  isProviderConfigured,
  getOAuthProvider,
} from '@/lib/oauth/registry'
import { ensureTrelloAdapterRegistered } from '@/lib/oauth/trello'
import { sealTokenEnvelope } from '@/lib/oauth/crypto'
import { reportApiError } from '@/lib/utils/api-sentry'

ensureTrelloAdapterRegistered()

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────
// Trello fragment-flow finish endpoint.
//
// The Trello bridge page extracts the access token from the URL
// fragment and POSTs it here. We do exactly the same set of
// security + persistence steps the standard
// /api/v1/oauth/[provider]/callback route does, just with the
// token coming from a JSON body instead of a query parameter:
//
//   1. Rate-limit + auth.
//   2. Read the start-cookie to recover the original CSRF state +
//      workspaceId. Verify the state in the body matches the
//      cookie (CSRF defense).
//   3. Re-verify workspace membership.
//   4. Delegate to the Trello adapter's `exchangeCode`, which for
//      a fragment-flow adapter performs the identity lookup
//      against the token directly (no code-exchange step).
//   5. Encrypt the token envelope and upsert into oauth_connections.
//   6. Return JSON { ok: true, redirect: '/workspace/.../integrations?oauth_connected=trello' }
//      so the bridge page can window.location.replace() to it.
//
// The error model is symmetric with the code-flow callback —
// 4xx with `{ ok: false, error: '<code>' }` so the bridge page
// can route to /?oauth_error=<code>&provider=trello and reuse
// the existing OAuthStatusBanner copy.
// ─────────────────────────────────────────────────────────────

const PROVIDER = 'trello' as const

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) {
    return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })
  }

  if (!isProviderConfigured(PROVIDER)) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }
  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ ok: false, error: 'database_not_configured' }, { status: 503 })
  }

  // Body validation. Both fields are required and must be plain
  // strings of plausible length.
  let token: string
  let state: string
  try {
    const body = (await req.json()) as { token?: unknown; state?: unknown }
    if (
      typeof body.token !== 'string' ||
      body.token.length < 8 ||
      body.token.length > 4096 ||
      typeof body.state !== 'string' ||
      body.state.length < 8 ||
      body.state.length > 256
    ) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
    }
    token = body.token
    state = body.state
  } catch {
    return NextResponse.json({ ok: false, error: 'malformed_body' }, { status: 400 })
  }

  // Read + parse the start-cookie. Symmetric with how the
  // code-flow callback recovers it from the cookie header.
  const cookieRaw = req.headers.get('cookie') ?? ''
  const cookieValue = parseCookie(cookieRaw, `lzx_oauth_${PROVIDER}`)
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

  if (!cookieState || cookieState !== state || !cookieWorkspaceId) {
    const res = NextResponse.json({ ok: false, error: 'state_mismatch' }, { status: 400 })
    clearStartCookie(res)
    return res
  }

  // Re-verify workspace membership at finish time — the user's
  // permissions could have changed between start and finish.
  const { data: member } = await db
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', cookieWorkspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!member) {
    const res = NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    clearStartCookie(res)
    return res
  }

  const adapter = getOAuthProvider(PROVIDER)
  if (!adapter) {
    return NextResponse.json({ ok: false, error: 'no_adapter' }, { status: 500 })
  }

  // Identity lookup — for a fragment-flow adapter, `code` carries
  // the access token directly. The Trello adapter calls /members/me
  // with it and returns the standard envelope shape.
  let tokens: Awaited<ReturnType<typeof adapter.exchangeCode>>
  try {
    tokens = await adapter.exchangeCode({ code: token, redirectUri: '' })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/oauth/trello/finish',
      method: 'POST',
      userId,
      workspaceId: cookieWorkspaceId,
      extra: { provider: PROVIDER, phase: 'identity' },
    })
    const res = NextResponse.json({ ok: false, error: 'exchange_failed' }, { status: 502 })
    clearStartCookie(res)
    return res
  }

  let encrypted: string
  try {
    encrypted = sealTokenEnvelope({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
    })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/oauth/trello/finish',
      method: 'POST',
      userId,
      workspaceId: cookieWorkspaceId,
      extra: { provider: PROVIDER, phase: 'seal' },
    })
    const res = NextResponse.json(
      { ok: false, error: 'encryption_unavailable' },
      { status: 500 },
    )
    clearStartCookie(res)
    return res
  }

  const { error: upsertError } = await db.from('oauth_connections').upsert(
    {
      workspace_id: cookieWorkspaceId,
      user_id: userId,
      provider: PROVIDER,
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
      route: '/api/v1/oauth/trello/finish',
      method: 'POST',
      userId,
      workspaceId: cookieWorkspaceId,
      extra: { provider: PROVIDER, phase: 'upsert' },
    })
    const res = NextResponse.json({ ok: false, error: 'persist_failed' }, { status: 500 })
    clearStartCookie(res)
    return res
  }

  // Success: build the redirect target and clear the start-cookie.
  const slug = await safeWorkspaceSlug(cookieWorkspaceId)
  const redirect = slug
    ? `/workspace/${encodeURIComponent(slug)}/integrations?oauth_connected=${PROVIDER}`
    : `/?oauth_connected=${PROVIDER}`

  const response = NextResponse.json({ ok: true, redirect })
  clearStartCookie(response)
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

function clearStartCookie(res: NextResponse): void {
  res.cookies.set(`lzx_oauth_${PROVIDER}`, '', { path: '/', maxAge: 0 })
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

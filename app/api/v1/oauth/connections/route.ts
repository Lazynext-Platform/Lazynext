import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { listOAuthConnections } from '@/lib/data/oauth-connections'
import {
  KNOWN_PROVIDER_IDS,
  isProviderConfigured,
  type OAuthProviderId,
} from '@/lib/oauth/registry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/oauth/connections?workspaceId=<uuid>
 *
 * Returns:
 *   - `connections`: every OAuth connection installed in the workspace
 *     (provider, external_id, display_name, scopes, expires_at, etc.).
 *     Tokens are NEVER included in this response — the encrypted blob
 *     stays in the DB; only the adapter that needs to make a provider
 *     call ever decrypts it.
 *   - `providers`: the seven roadmap providers and whether each is
 *     `configured` on this deployment (env vars present). The Settings
 *     UI uses this to render "Connect" vs "Configure to enable" without
 *     pretending an integration will work when its credentials are
 *     missing.
 */
export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse(rl.resetAt)

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }

  // Provider configuration is independent of DB availability — even on
  // dev-without-Supabase, the UI can still see which providers would
  // work if a workspace existed.
  const providers = KNOWN_PROVIDER_IDS.map((id: OAuthProviderId) => ({
    id,
    configured: isProviderConfigured(id),
  }))

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ data: { connections: [], providers }, error: null })
  }

  const authorized = await verifyWorkspaceMember(userId, workspaceId)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const connections = await listOAuthConnections(workspaceId)
  return NextResponse.json({ data: { connections, providers }, error: null })
}

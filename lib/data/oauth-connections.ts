// ─── OAuth connections data layer ───────────────────────────────
// Read + delete operations for the `oauth_connections` table.
// Inserts are written directly by the OAuth callback handler at the
// moment of provider exchange; that path will land per-adapter and
// is not in this module.
//
// Tokens stay encrypted in the DB. This module never decrypts them
// — decryption happens only when an outbound provider call needs
// the access token, in the adapter that owns that call. Keeping
// decryption out of read-list code paths means a Settings page
// load can't accidentally surface a plaintext token even via a
// log line.

import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import type { OAuthProviderId } from '@/lib/oauth/registry'

export interface OAuthConnectionRow {
  id: string
  provider: OAuthProviderId
  externalId: string
  displayName: string | null
  scopes: string | null
  expiresAt: string | null
  lastRefreshedAt: string | null
  createdAt: string
  // Intentionally omitted: encrypted_tokens. Callers that need the
  // token must use a separate, narrowly-scoped helper.
}

interface DbRow {
  id: string
  provider: string
  external_id: string
  display_name: string | null
  scopes: string | null
  expires_at: string | null
  last_refreshed_at: string | null
  created_at: string
}

function toRow(r: DbRow): OAuthConnectionRow {
  return {
    id: r.id,
    provider: r.provider as OAuthProviderId,
    externalId: r.external_id,
    displayName: r.display_name,
    scopes: r.scopes,
    expiresAt: r.expires_at,
    lastRefreshedAt: r.last_refreshed_at,
    createdAt: r.created_at,
  }
}

/**
 * List every OAuth connection for a workspace, ordered by provider
 * then created_at DESC so the Settings UI gets a stable shape.
 * Returns `[]` when the DB isn't configured — never throws on the
 * dev-without-Supabase path.
 */
export async function listOAuthConnections(workspaceId: string): Promise<OAuthConnectionRow[]> {
  if (!hasValidDatabaseUrl) return []
  const { data, error } = await db
    .from('oauth_connections')
    .select(
      'id, provider, external_id, display_name, scopes, expires_at, last_refreshed_at, created_at',
    )
    .eq('workspace_id', workspaceId)
    .order('provider', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) return []
  return (data as DbRow[] | null)?.map(toRow) ?? []
}

/**
 * Delete a single connection by id, scoped to a workspace so a stale
 * id from another workspace can never delete this one's row. Returns
 * the number of rows deleted (0 means not found / not in this
 * workspace).
 */
export async function deleteOAuthConnection(opts: {
  workspaceId: string
  connectionId: string
}): Promise<number> {
  if (!hasValidDatabaseUrl) return 0
  const { error, count } = await db
    .from('oauth_connections')
    .delete({ count: 'exact' })
    .eq('workspace_id', opts.workspaceId)
    .eq('id', opts.connectionId)
  if (error) return 0
  return count ?? 0
}

/**
 * Count connections grouped by provider for a workspace. Used by the
 * Settings UI to render "Slack ✓" badges next to the configured
 * provider rows without fetching individual rows.
 */
export async function getProviderConnectionCounts(
  workspaceId: string,
): Promise<Record<string, number>> {
  if (!hasValidDatabaseUrl) return {}
  const { data, error } = await db
    .from('oauth_connections')
    .select('provider')
    .eq('workspace_id', workspaceId)
  if (error) return {}
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as Array<{ provider: string }>) {
    counts[row.provider] = (counts[row.provider] ?? 0) + 1
  }
  return counts
}

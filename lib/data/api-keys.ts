import { randomBytes, createHash } from 'node:crypto'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

// API keys are namespaced with `lzx_` so a leaked key is identifiable
// in logs / GitHub-secret-scanning even when stripped of context.
// 32 random bytes → 43 base64url chars; total length is 47 — fits in
// any reasonable header without truncation.
const KEY_PREFIX_NAMESPACE = 'lzx_'
const KEY_RANDOM_BYTES = 32
const PREFIX_DISPLAY_LENGTH = 8

export const API_KEY_SCOPES = ['read', 'write'] as const
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export function normalizeScopes(input: readonly string[] | undefined | null): ApiKeyScope[] {
  // Whitelist + dedupe + stable order. Empty input falls back to
  // least-privilege ['read'] so callers can't accidentally mint a
  // zero-scope key (the CHECK constraint would reject it anyway).
  const allowed = new Set<ApiKeyScope>()
  for (const raw of input ?? []) {
    if ((API_KEY_SCOPES as readonly string[]).includes(raw)) {
      allowed.add(raw as ApiKeyScope)
    }
  }
  if (allowed.size === 0) return ['read']
  // Stable order matches API_KEY_SCOPES so audit metadata is
  // deterministic across requests.
  return API_KEY_SCOPES.filter((s) => allowed.has(s))
}

export interface ApiKeyRow {
  id: string
  workspaceId: string
  userId: string
  name: string
  keyPrefix: string // first 8 chars of the random part (no `lzx_` namespace)
  scopes: ApiKeyScope[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

/**
 * Generates a fresh API key. Returns BOTH the plaintext (shown to the
 * user once and discarded) and the storage-safe row. Callers MUST
 * persist `row` and surface `plaintext` exactly once — the DB never
 * sees `plaintext` directly.
 */
export function mintApiKey(): { plaintext: string; keyHash: string; keyPrefix: string } {
  const random = randomBytes(KEY_RANDOM_BYTES).toString('base64url')
  const plaintext = `${KEY_PREFIX_NAMESPACE}${random}`
  // SHA-256 is fine for high-entropy random tokens — no need for a
  // slow KDF (bcrypt/argon2) because there's no low-entropy human
  // input to brute-force. The full 256-bit search space is the wall.
  const keyHash = createHash('sha256').update(plaintext).digest('hex')
  const keyPrefix = random.slice(0, PREFIX_DISPLAY_LENGTH)
  return { plaintext, keyHash, keyPrefix }
}

/**
 * Hashes an inbound bearer token for lookup. Constant-time comparison
 * isn't needed here because the DB equality check happens on the
 * indexed hash column — there's no comparison loop in JS to time.
 */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

interface ApiKeyDbRow {
  id: string
  workspace_id: string
  user_id: string
  name: string
  key_prefix: string
  scopes: string[] | null
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

function mapRow(row: ApiKeyDbRow): ApiKeyRow {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: normalizeScopes(row.scopes ?? undefined),
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }
}

/**
 * Lists keys for a workspace. Note: row shape deliberately omits
 * `key_hash` so a Settings render can never accidentally surface the
 * lookup hash (which would be enough for a rainbow-table attack on
 * any key that ever leaked).
 */
export async function listApiKeys(workspaceId: string): Promise<ApiKeyRow[]> {
  if (!hasValidDatabaseUrl) return []
  const { data, error } = await db
    .from('api_keys')
    .select('id, workspace_id, user_id, name, key_prefix, scopes, last_used_at, expires_at, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as unknown as ApiKeyDbRow[]).map(mapRow)
}

export interface CreateApiKeyInput {
  workspaceId: string
  userId: string
  name: string
  scopes?: readonly string[]
  expiresAt?: string | null
}

/**
 * Creates an API key. Returns the storage row and the plaintext —
 * the caller is responsible for showing the plaintext exactly once.
 * Returns null on DB errors so the caller can render an honest
 * error rather than a half-success.
 */
export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<{ row: ApiKeyRow; plaintext: string } | null> {
  if (!hasValidDatabaseUrl) return null
  const { plaintext, keyHash, keyPrefix } = mintApiKey()
  const scopes = normalizeScopes(input.scopes)
  const { data, error } = await db
    .from('api_keys')
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      name: input.name.trim().slice(0, 100),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      expires_at: input.expiresAt ?? null,
    })
    .select('id, workspace_id, user_id, name, key_prefix, scopes, last_used_at, expires_at, created_at')
    .single()
  if (error || !data) return null
  return { row: mapRow(data as unknown as ApiKeyDbRow), plaintext }
}

export interface DeleteApiKeyInput {
  workspaceId: string
  keyId: string
}

/**
 * Revokes a key. Composite-key delete (workspace_id + id) so a stale
 * id from another workspace can't leak across tenants if a request is
 * crafted against the wrong workspaceId.
 */
export async function deleteApiKey(input: DeleteApiKeyInput): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  const { error, count } = await db
    .from('api_keys')
    .delete({ count: 'exact' })
    .eq('workspace_id', input.workspaceId)
    .eq('id', input.keyId)
  if (error) return false
  return (count ?? 0) > 0
}

export interface RotateApiKeyInput {
  workspaceId: string
  keyId: string
}

/**
 * Rotates a key in-place. The row keeps its id (so the audit-log
 * resourceId continues to reference the same key lifecycle), but the
 * `key_hash` and `key_prefix` are regenerated and `last_used_at` is
 * cleared. The OLD plaintext stops working immediately on the next
 * request because the hash no longer matches.
 *
 * Returns the new plaintext + updated row, or null if the key wasn't
 * found in the workspace.
 */
export async function rotateApiKey(
  input: RotateApiKeyInput,
): Promise<{ row: ApiKeyRow; plaintext: string } | null> {
  if (!hasValidDatabaseUrl) return null
  const { plaintext, keyHash, keyPrefix } = mintApiKey()
  const { data, error } = await db
    .from('api_keys')
    .update({
      key_hash: keyHash,
      key_prefix: keyPrefix,
      // Reset usage stats so the operator knows whether anyone has
      // started using the new key. Old `last_used_at` referred to the
      // now-invalid hash and would be misleading.
      last_used_at: null,
    })
    .eq('workspace_id', input.workspaceId)
    .eq('id', input.keyId)
    .select('id, workspace_id, user_id, name, key_prefix, scopes, last_used_at, expires_at, created_at')
    .single()
  if (error || !data) return null
  return { row: mapRow(data as unknown as ApiKeyDbRow), plaintext }
}

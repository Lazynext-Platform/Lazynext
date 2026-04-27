// ─────────────────────────────────────────────────────────────
// OAuth token encryption.
//
// The `oauth_connections` table stores access + refresh tokens for
// third-party integrations (Slack, Notion, GitHub, etc.). The DB
// never sees plaintext: tokens are AES-256-GCM encrypted with a
// per-deployment key held in `OAUTH_TOKEN_ENCRYPTION_KEY`.
//
// Format: `iv:authTag:ciphertext`, all base64url. We use base64url
// (not standard base64) so the value is safe to log or store in
// URLs without needing escaping.
//
// Key handling:
//   - Required to be 32 bytes, hex-encoded (64 chars). Reject
//     anything else loudly so misconfiguration is caught at boot,
//     not at runtime when a Slack token comes back from the
//     provider and we can't store it.
//   - In dev/test the key can be a known fixture; in production
//     it must be a random per-deployment value.
// ─────────────────────────────────────────────────────────────

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm' as const
const KEY_BYTES = 32
const IV_BYTES = 12 // GCM standard
const AUTH_TAG_BYTES = 16

function b64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromB64url(s: string): Buffer {
  // Restore standard base64 padding before decoding.
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  return Buffer.from(padded, 'base64')
}

/**
 * Resolve the encryption key from `OAUTH_TOKEN_ENCRYPTION_KEY` or
 * an explicit override (used by tests). Throws if missing or wrong
 * length so misconfiguration surfaces at the call site, not at the
 * provider callback when it's already too late.
 */
export function resolveOAuthKey(override?: string | null): Buffer {
  const raw = override ?? process.env.OAUTH_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'OAUTH_TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32`.',
    )
  }
  if (!/^[0-9a-fA-F]+$/.test(raw)) {
    throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY must be hex-encoded.')
  }
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `OAUTH_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}).`,
    )
  }
  return buf
}

/**
 * Encrypt a plaintext payload (typically a JSON-stringified token
 * envelope: `{ access_token, refresh_token?, expires_at? }`).
 * Returns `iv:authTag:ciphertext`, all base64url.
 */
export function encryptOAuthTokens(plaintext: string, keyOverride?: string | null): string {
  const key = resolveOAuthKey(keyOverride)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv) as CipherGCM
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [b64url(iv), b64url(authTag), b64url(ciphertext)].join(':')
}

/**
 * Decrypt the inverse of `encryptOAuthTokens`. Throws on:
 *   - malformed payload (not `a:b:c`)
 *   - wrong key (auth tag verification fails)
 *   - tampered ciphertext (auth tag verification fails)
 * Callers MUST treat decryption failures as security events, not
 * data errors. Don't swallow.
 */
export function decryptOAuthTokens(encoded: string, keyOverride?: string | null): string {
  const key = resolveOAuthKey(keyOverride)
  const parts = encoded.split(':')
  if (parts.length !== 3) {
    throw new Error('Encrypted token payload is malformed (expected `iv:authTag:ciphertext`).')
  }
  const [ivB64, tagB64, ctB64] = parts
  const iv = fromB64url(ivB64)
  const authTag = fromB64url(tagB64)
  const ciphertext = fromB64url(ctB64)
  if (iv.length !== IV_BYTES) {
    throw new Error(`Encrypted token IV has wrong length (expected ${IV_BYTES} bytes).`)
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(`Encrypted token auth tag has wrong length (expected ${AUTH_TAG_BYTES} bytes).`)
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv) as DecipherGCM
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/**
 * Convenience: stringify-then-encrypt a token envelope.
 */
export interface TokenEnvelope {
  access_token: string
  refresh_token?: string | null
  // Provider-issued absolute expiration (ISO string). NULL means
  // non-expiring (rare; primarily legacy Notion integration tokens).
  expires_at?: string | null
}

export function sealTokenEnvelope(env: TokenEnvelope, keyOverride?: string | null): string {
  return encryptOAuthTokens(JSON.stringify(env), keyOverride)
}

export function openTokenEnvelope(encoded: string, keyOverride?: string | null): TokenEnvelope {
  const json = decryptOAuthTokens(encoded, keyOverride)
  const parsed = JSON.parse(json) as TokenEnvelope
  if (typeof parsed.access_token !== 'string' || parsed.access_token.length === 0) {
    throw new Error('Decrypted token envelope is missing `access_token`.')
  }
  return parsed
}

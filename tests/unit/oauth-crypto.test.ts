import { describe, it, expect } from 'vitest'
import {
  encryptOAuthTokens,
  decryptOAuthTokens,
  sealTokenEnvelope,
  openTokenEnvelope,
  resolveOAuthKey,
} from '@/lib/oauth/crypto'

// 32 random bytes, hex. Fixed for deterministic tests.
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const OTHER_KEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'

describe('resolveOAuthKey', () => {
  it('returns 32 bytes for a valid hex key', () => {
    expect(resolveOAuthKey(TEST_KEY).length).toBe(32)
  })
  it('throws when the env var is missing and no override', () => {
    const original = process.env.OAUTH_TOKEN_ENCRYPTION_KEY
    delete process.env.OAUTH_TOKEN_ENCRYPTION_KEY
    try {
      expect(() => resolveOAuthKey()).toThrow(/OAUTH_TOKEN_ENCRYPTION_KEY is not set/)
    } finally {
      if (original !== undefined) process.env.OAUTH_TOKEN_ENCRYPTION_KEY = original
    }
  })
  it('throws on non-hex input', () => {
    expect(() => resolveOAuthKey('not-hex!!')).toThrow(/hex-encoded/)
  })
  it('throws on wrong-length key', () => {
    expect(() => resolveOAuthKey('abcdef')).toThrow(/32 bytes/)
  })
})

describe('encryptOAuthTokens / decryptOAuthTokens', () => {
  it('round-trips a plaintext payload', () => {
    const plaintext = 'xoxb-1234567890-abcdef'
    const sealed = encryptOAuthTokens(plaintext, TEST_KEY)
    expect(decryptOAuthTokens(sealed, TEST_KEY)).toBe(plaintext)
  })

  it('produces a different ciphertext on each call (random IV)', () => {
    const a = encryptOAuthTokens('same plaintext', TEST_KEY)
    const b = encryptOAuthTokens('same plaintext', TEST_KEY)
    expect(a).not.toBe(b)
  })

  it('uses three colon-separated base64url segments', () => {
    const sealed = encryptOAuthTokens('hello', TEST_KEY)
    const parts = sealed.split(':')
    expect(parts).toHaveLength(3)
    // base64url has no `+`, `/`, or `=` characters.
    for (const p of parts) {
      expect(p).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('rejects a payload encrypted with a different key', () => {
    const sealed = encryptOAuthTokens('secret', TEST_KEY)
    expect(() => decryptOAuthTokens(sealed, OTHER_KEY)).toThrow()
  })

  it('rejects a tampered ciphertext', () => {
    const sealed = encryptOAuthTokens('secret', TEST_KEY)
    const [iv, tag, ct] = sealed.split(':')
    // Flip a character in the ciphertext segment.
    const bad = `${iv}:${tag}:${ct.slice(0, -1)}${ct.endsWith('A') ? 'B' : 'A'}`
    expect(() => decryptOAuthTokens(bad, TEST_KEY)).toThrow()
  })

  it('rejects a malformed payload', () => {
    expect(() => decryptOAuthTokens('not-a-valid-payload', TEST_KEY)).toThrow(/malformed/)
    expect(() => decryptOAuthTokens('only:two', TEST_KEY)).toThrow(/malformed/)
  })
})

describe('sealTokenEnvelope / openTokenEnvelope', () => {
  it('round-trips a full envelope', () => {
    const env = {
      access_token: 'xoxb-AAAA',
      refresh_token: 'xoxe-BBBB',
      expires_at: '2026-12-31T00:00:00.000Z',
    }
    const sealed = sealTokenEnvelope(env, TEST_KEY)
    expect(openTokenEnvelope(sealed, TEST_KEY)).toEqual(env)
  })

  it('round-trips a minimal envelope (access_token only)', () => {
    const env = { access_token: 'xoxb-only' }
    const sealed = sealTokenEnvelope(env, TEST_KEY)
    expect(openTokenEnvelope(sealed, TEST_KEY)).toEqual(env)
  })

  it('throws when the decrypted envelope is missing access_token', () => {
    // Encrypt a JSON payload that won't pass shape validation.
    const sealed = encryptOAuthTokens(JSON.stringify({ foo: 'bar' }), TEST_KEY)
    expect(() => openTokenEnvelope(sealed, TEST_KEY)).toThrow(/access_token/)
  })
})

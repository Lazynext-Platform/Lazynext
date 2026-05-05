import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  KNOWN_PROVIDER_IDS,
  isKnownProvider,
  getOAuthProvider,
  listOAuthProviders,
  isProviderConfigured,
} from '@/lib/oauth/registry'

describe('KNOWN_PROVIDER_IDS', () => {
  it('contains the seven roadmap providers', () => {
    expect([...KNOWN_PROVIDER_IDS].sort()).toEqual([
      'asana',
      'github',
      'jira',
      'linear',
      'notion',
      'slack',
      'trello',
    ])
  })

  it('isKnownProvider accepts every listed id', () => {
    for (const id of KNOWN_PROVIDER_IDS) {
      expect(isKnownProvider(id)).toBe(true)
    }
  })

  it('isKnownProvider rejects unknown strings', () => {
    expect(isKnownProvider('discord')).toBe(false)
    expect(isKnownProvider('')).toBe(false)
    expect(isKnownProvider('SLACK')).toBe(false)
  })
})

describe('registry — empty until adapters are wired', () => {
  it('listOAuthProviders is empty (no adapters ship in scaffolding)', () => {
    expect(listOAuthProviders()).toEqual([])
  })

  it('getOAuthProvider returns null for every roadmap id', () => {
    for (const id of KNOWN_PROVIDER_IDS) {
      expect(getOAuthProvider(id)).toBeNull()
    }
  })

  it('getOAuthProvider returns null for unknown ids', () => {
    expect(getOAuthProvider('discord')).toBeNull()
  })
})

describe('isProviderConfigured', () => {
  const VARS = ['LAZYNEXT_OAUTH_SLACK_CLIENT_ID', 'LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET'] as const
  let original: Record<string, string | undefined>

  beforeEach(() => {
    original = Object.fromEntries(VARS.map((v) => [v, process.env[v]]))
    for (const v of VARS) delete process.env[v]
  })

  afterEach(() => {
    for (const v of VARS) {
      if (original[v] === undefined) delete process.env[v]
      else process.env[v] = original[v]
    }
  })

  it('returns false when neither var is set', () => {
    expect(isProviderConfigured('slack')).toBe(false)
  })

  it('returns false when only one var is set', () => {
    process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_ID = 'cid'
    expect(isProviderConfigured('slack')).toBe(false)
    delete process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_ID
    process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET = 'sec'
    expect(isProviderConfigured('slack')).toBe(false)
  })

  it('returns true when both vars are non-empty', () => {
    process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_ID = 'cid'
    process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET = 'sec'
    expect(isProviderConfigured('slack')).toBe(true)
  })

  it('treats empty-string env vars as unconfigured', () => {
    process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_ID = ''
    process.env.LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET = ''
    expect(isProviderConfigured('slack')).toBe(false)
  })
})

describe('isProviderConfigured — Trello (API key only)', () => {
  // Trello is the lone exception to the CLIENT_ID/CLIENT_SECRET
  // convention — its legacy "Authorize" flow uses an API key only.
  const KEY = 'LAZYNEXT_OAUTH_TRELLO_API_KEY'
  let original: string | undefined

  beforeEach(() => {
    original = process.env[KEY]
    delete process.env[KEY]
  })

  afterEach(() => {
    if (original === undefined) delete process.env[KEY]
    else process.env[KEY] = original
  })

  it('returns false when the API key is absent', () => {
    expect(isProviderConfigured('trello')).toBe(false)
  })

  it('returns false on an empty-string API key', () => {
    process.env[KEY] = ''
    expect(isProviderConfigured('trello')).toBe(false)
  })

  it('returns true when the API key is set', () => {
    process.env[KEY] = 'trello-key-123'
    expect(isProviderConfigured('trello')).toBe(true)
  })

  it('does NOT require CLIENT_ID/CLIENT_SECRET for Trello', () => {
    process.env[KEY] = 'k'
    delete process.env.LAZYNEXT_OAUTH_TRELLO_CLIENT_ID
    delete process.env.LAZYNEXT_OAUTH_TRELLO_CLIENT_SECRET
    expect(isProviderConfigured('trello')).toBe(true)
  })
})

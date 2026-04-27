// ─────────────────────────────────────────────────────────────
// OAuth provider registry.
//
// Every third-party integration Lazynext supports (or will support)
// declares itself here. The registry is the single source of truth
// for:
//   - Whether a provider is *configured* (env vars present) — drives
//     the Settings → Integrations UI showing "Connect" vs "Configure
//     to enable" states without lying about availability.
//   - Authorize-URL construction (PKCE-where-supported).
//   - Token-exchange call shape.
//   - Scope strings.
//
// This file ships with ZERO providers wired. Each provider adapter
// will be added in its own Mastery cycle as credentials become
// available — one PR per provider, never a batch. The shape below
// is the contract those adapters must satisfy.
//
// Why this is empty on purpose: the AGENTS.md autonomy boundary
// explicitly disallows adding dependencies / adopting external
// services without human approval. Each provider IS such a
// dependency. So the scaffolding lands; the provider rows wait
// for credentials.
// ─────────────────────────────────────────────────────────────

export type OAuthProviderId =
  // Roadmap remaining-work targets:
  | 'slack'
  | 'notion'
  | 'github'
  // Import-modal connectors:
  | 'linear'
  | 'trello'
  | 'asana'
  | 'jira'

export type OAuthScopeMode = 'read' | 'write' | 'admin'

export interface OAuthProviderConfig {
  /** Provider id used in DB rows + URL paths (`/api/v1/oauth/[provider]/...`). */
  id: OAuthProviderId
  /** Human-readable display name for the UI. */
  displayName: string
  /** Whether this provider supports PKCE (RFC 7636). Slack does not; most modern providers do. */
  pkce: boolean
  /** Scope strings for each access mode. Provider-specific. */
  scopes: Record<OAuthScopeMode, string[]>
  /** Build the authorize URL. Implementation will be added with the adapter. */
  buildAuthorizeUrl(input: {
    state: string
    redirectUri: string
    pkceChallenge?: string
    mode: OAuthScopeMode
  }): string
  /** Exchange the auth code for tokens. Implementation added with the adapter. */
  exchangeCode(input: {
    code: string
    redirectUri: string
    pkceVerifier?: string
  }): Promise<{
    accessToken: string
    refreshToken?: string | null
    expiresAt?: string | null
    externalId: string
    displayName?: string | null
    scopes?: string | null
  }>
}

/**
 * Registry of provider adapters. Empty by design — see file header.
 * Adapters land one-by-one in their own feature branches.
 */
const REGISTRY: Partial<Record<OAuthProviderId, OAuthProviderConfig>> = {}

export function registerOAuthProvider(config: OAuthProviderConfig): void {
  if (REGISTRY[config.id]) {
    throw new Error(`OAuth provider already registered: ${config.id}`)
  }
  REGISTRY[config.id] = config
}

export function getOAuthProvider(id: string): OAuthProviderConfig | null {
  return (REGISTRY as Record<string, OAuthProviderConfig | undefined>)[id] ?? null
}

export function listOAuthProviders(): OAuthProviderConfig[] {
  return Object.values(REGISTRY).filter(
    (v): v is OAuthProviderConfig => typeof v !== 'undefined',
  )
}

/**
 * Provider-id allow-list. Used at the API layer to validate the
 * `[provider]` route segment before doing any work. Intentionally
 * a constant (not derived from REGISTRY) so an unconfigured provider
 * still 404s rather than 400s — the URL space is reserved.
 */
export const KNOWN_PROVIDER_IDS: readonly OAuthProviderId[] = [
  'slack',
  'notion',
  'github',
  'linear',
  'trello',
  'asana',
  'jira',
] as const

export function isKnownProvider(id: string): id is OAuthProviderId {
  return (KNOWN_PROVIDER_IDS as readonly string[]).includes(id)
}

/**
 * `true` when the env vars for a provider's OAuth app are present.
 * Used by the UI to render "Connect" vs "Configure to enable" without
 * lying about whether the integration will actually work if clicked.
 *
 * Convention: `LAZYNEXT_OAUTH_<PROVIDER>_CLIENT_ID` and
 * `LAZYNEXT_OAUTH_<PROVIDER>_CLIENT_SECRET`. Each provider adapter
 * will check for additional vars (signing secrets, app IDs) when
 * those exist; this is the floor.
 */
export function isProviderConfigured(id: OAuthProviderId): boolean {
  const upper = id.toUpperCase()
  const cid = process.env[`LAZYNEXT_OAUTH_${upper}_CLIENT_ID`]
  const sec = process.env[`LAZYNEXT_OAUTH_${upper}_CLIENT_SECRET`]
  return typeof cid === 'string' && cid.length > 0 && typeof sec === 'string' && sec.length > 0
}

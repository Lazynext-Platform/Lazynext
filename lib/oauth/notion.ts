// ─────────────────────────────────────────────────────────────
// Notion OAuth adapter.
//
// Second adapter on the OAuth scaffolding. Notion was prioritised
// because it is the most-requested Import source on the roadmap
// (#15) — Notion users tend to have a lot of decision-shaped
// pages already that map cleanly onto Lazynext nodes.
//
// Notion's OAuth is structurally different from GitHub's in two
// ways that matter for this adapter:
//
//   1. Scopes are NOT specified at the OAuth-flow level. Notion
//      decides what the integration can read/write based on the
//      capabilities the owner ticked when creating the public
//      integration in their settings, plus the per-page access
//      that the user grants in the consent screen. Our `scopes`
//      record is therefore a documentation-only artefact.
//
//   2. The token response includes the user identity (owner.user)
//      and the workspace identity (workspace_id, workspace_name).
//      No second `/users/me` round-trip is required. We use
//      `bot_id` as the `external_id` because it's the stable
//      identifier of the connection — Notion will reuse the same
//      bot id on a re-authorize, which lets our upsert
//      (workspace_id, provider, external_id) collapse correctly.
//
// Env vars required:
//   - LAZYNEXT_OAUTH_NOTION_CLIENT_ID
//   - LAZYNEXT_OAUTH_NOTION_CLIENT_SECRET
//
// Notion docs: https://developers.notion.com/docs/authorization
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://api.notion.com/v1/oauth/authorize'
const TOKEN_URL = 'https://api.notion.com/v1/oauth/token'

// All three modes map to the same empty scope list — Notion does
// not honour scope strings on the flow URL. Kept as a record to
// satisfy the `OAuthProviderConfig` contract and to leave room
// for a future Notion-version that does support scopes.
const NOTION_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: [],
  write: [],
  admin: [],
}

export const notionAdapter: OAuthProviderConfig = {
  id: 'notion',
  displayName: 'Notion',
  // Notion's public-integration OAuth requires PKCE for new
  // integrations created after Aug 2024. Older integrations grandfather
  // in without it. We always send a challenge — Notion ignores it on
  // legacy integrations and requires it on new ones, so always-on is
  // the safe default.
  pkce: true,
  scopes: NOTION_SCOPES,

  buildAuthorizeUrl({ state, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_ID')
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      // `owner=user` is the only documented value. `owner=workspace`
      // is reserved for an unreleased flow.
      owner: 'user',
      state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_ID')
    const clientSecret = requireEnv('LAZYNEXT_OAUTH_NOTION_CLIENT_SECRET')

    // Notion's token endpoint REQUIRES Basic auth in the header
    // and a JSON body. This is the one place where our adapter
    // shape differs from a generic OAuth2 implementation.
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        authorization: `Basic ${basic}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      throw new Error(`Notion token exchange failed: HTTP ${tokenRes.status}`)
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string
      token_type?: string
      bot_id?: string
      workspace_id?: string
      workspace_name?: string | null
      workspace_icon?: string | null
      owner?: {
        type?: string
        user?: {
          id?: string
          name?: string | null
          person?: { email?: string }
        }
      }
      error?: string
      error_description?: string
    }

    if (tokenJson.error || !tokenJson.access_token || !tokenJson.bot_id) {
      throw new Error(
        `Notion token exchange returned error: ${tokenJson.error ?? 'no_access_token_or_bot_id'}`,
      )
    }

    // Use `bot_id` as the external id — it's the stable identifier
    // for THIS install of THIS integration. The user.id can be
    // null in some workspace-flow edge cases; bot_id is always
    // present on a successful response.
    const externalId = tokenJson.bot_id

    // Display name preference order: workspace_name (most useful
    // in the UI when a user has multiple workspaces) → owner
    // user name → bot id. Never undefined.
    const displayName =
      tokenJson.workspace_name ??
      tokenJson.owner?.user?.name ??
      tokenJson.bot_id

    return {
      accessToken: tokenJson.access_token,
      // Notion's standard OAuth flow does NOT issue refresh tokens
      // — access tokens are long-lived and revoked by the user
      // through the Notion connections UI.
      refreshToken: null,
      expiresAt: null,
      externalId,
      displayName,
      // No granular scope info to surface; the per-page access set
      // is shown by Notion itself.
      scopes: null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`${name} is not set; cannot build Notion OAuth URL.`)
  }
  return v
}

let _registered = false
export function ensureNotionAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(notionAdapter)
  } catch {
    // Already registered (hot reload). Treat as success.
  }
}

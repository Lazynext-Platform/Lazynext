// ─────────────────────────────────────────────────────────────
// Slack OAuth adapter (Slack OAuth v2 / bot token flow).
//
// Fourth adapter, completing the priority three-plus-one set
// targeted by the Integrations Settings page (#31): Slack,
// Notion, GitHub, plus Linear from #15. Slack's primary use
// case in Lazynext is decision-summary delivery and pulse
// posts — both of which require a BOT token, not a user
// token, so this adapter requests bot scopes via `scope=` and
// stores the bot access token as the canonical credential.
//
// Slack OAuth v2 differs from the other adapters in three
// places that matter:
//
//   1. The token response includes the team identity (team.id,
//      team.name) and the bot user id. No /users.identity
//      round-trip is needed at connect time. We use team.id
//      as the external_id because each Slack workspace is a
//      distinct install — re-installing into the same workspace
//      will collide on (lazynext_workspace_id, 'slack', team.id)
//      and overwrite the older row, which is what we want.
//
//   2. There are TWO scope axes: `scope` (bot scopes) and
//      `user_scope` (user-token scopes). We default to bot
//      scopes only — user scopes invite end-of-pipeline
//      surprises ("which user is this acting as?") and aren't
//      needed for the Lazynext use case.
//
//   3. Slack does NOT issue refresh tokens by default. Bot
//      tokens are long-lived. Token rotation is opt-in via the
//      `token_rotation` Slack feature; we leave it off and let
//      tokens be revoked through the Slack admin UI.
//
// Env vars required:
//   - LAZYNEXT_OAUTH_SLACK_CLIENT_ID
//   - LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET
//
// Slack docs: https://api.slack.com/authentication/oauth-v2
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize'
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access'

// Bot scope strategy (space-separated in the URL):
//   read  — passive observation: list channels, read membership.
//   write — read + post messages: the realistic Lazynext use
//           case (post decision summaries, pulse digests).
//   admin — write + workspace admin endpoints. Rarely needed;
//           kept as a tier so a future "post to private
//           channels we weren't invited to" flow has a place
//           to land.
const SLACK_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: ['channels:read', 'team:read'],
  write: ['channels:read', 'team:read', 'chat:write', 'chat:write.public'],
  admin: [
    'channels:read',
    'team:read',
    'chat:write',
    'chat:write.public',
    'channels:manage',
    'groups:write',
  ],
}

export const slackAdapter: OAuthProviderConfig = {
  id: 'slack',
  displayName: 'Slack',
  // Slack OAuth v2 does NOT support PKCE.
  pkce: false,
  scopes: SLACK_SCOPES,

  buildAuthorizeUrl({ state, redirectUri, mode }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_ID')
    const params = new URLSearchParams({
      client_id: clientId,
      // Slack uses SPACE-separated bot scopes (URL-encoded as
      // `+` or `%20`). URLSearchParams handles the encoding.
      scope: SLACK_SCOPES[mode].join(' '),
      // No user-token scopes by default. Empty string is
      // explicitly accepted by Slack and signals "bot only".
      user_scope: '',
      redirect_uri: redirectUri,
      state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = requireEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_ID')
    const clientSecret = requireEnv('LAZYNEXT_OAUTH_SLACK_CLIENT_SECRET')

    // Slack's oauth.v2.access takes form-encoded creds in the
    // body. Basic auth in the header is also accepted but the
    // form-body shape is what every Slack example uses.
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    })

    if (!tokenRes.ok) {
      throw new Error(`Slack token exchange failed: HTTP ${tokenRes.status}`)
    }

    // Slack's API ALWAYS returns 200 — errors are encoded as
    // `{ ok: false, error: '...' }` in the body. The `ok` field
    // is the only reliable signal of success.
    const tokenJson = (await tokenRes.json()) as {
      ok?: boolean
      error?: string
      access_token?: string
      token_type?: string
      scope?: string
      bot_user_id?: string
      app_id?: string
      team?: { id?: string; name?: string }
      enterprise?: { id?: string; name?: string } | null
      authed_user?: { id?: string; access_token?: string; scope?: string }
    }

    if (!tokenJson.ok || !tokenJson.access_token) {
      throw new Error(`Slack token exchange returned error: ${tokenJson.error ?? 'no_access_token'}`)
    }

    if (!tokenJson.team?.id) {
      throw new Error('Slack token exchange missing team.id')
    }

    return {
      accessToken: tokenJson.access_token,
      // Slack does not issue refresh tokens unless token rotation
      // is enabled at the app level. We don't enable it.
      refreshToken: null,
      // Bot tokens are long-lived; no expiry.
      expiresAt: null,
      // External id is the SLACK WORKSPACE id, not the user id.
      // Re-install into the same workspace upserts the same row.
      externalId: tokenJson.team.id,
      displayName: tokenJson.team.name ?? tokenJson.team.id,
      scopes: tokenJson.scope ?? null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`${name} is not set; cannot build Slack OAuth URL.`)
  }
  return v
}

let _registered = false
export function ensureSlackAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(slackAdapter)
  } catch {
    // Already registered (hot reload). Treat as success.
  }
}

// ─────────────────────────────────────────────────────────────
// Trello OAuth adapter (legacy "Authorize" / fragment flow).
//
// Seventh and final adapter in the priority roster. Trello is
// structurally different from the other six because it uses
// Trello's legacy client-side "Authorize" flow, NOT OAuth 2.0
// authorization-code:
//
//   1. The user is redirected to https://trello.com/1/authorize
//      with the app's API key, scopes, and a `return_url`.
//   2. After consent, Trello redirects to `return_url#token=<TOKEN>`
//      — the token is in the URL FRAGMENT, not a query string.
//   3. The server can't read fragments. A small client-side bridge
//      page (`app/(marketing)/oauth/trello/bridge/page.tsx`)
//      extracts `window.location.hash`, then POSTs the token to a
//      dedicated finish endpoint
//      (`app/api/v1/oauth/trello/finish/route.ts`).
//   4. The finish endpoint validates the CSRF state cookie, then
//      delegates to `trelloAdapter.exchangeCode({ code: <token> })`
//      where `code` carries the actual access token. The adapter
//      performs the /1/members/me identity lookup and returns the
//      same envelope shape as a code-flow adapter.
//
// There is no "exchange a code for a token" step — Trello's
// authorize endpoint short-circuits straight to the token. Hence
// the `flowType: 'fragment'` discriminator on this config.
//
// Auth model:
//   - Trello uses an API KEY only — there is no client secret.
//     The token IS the credential. This is documented and
//     long-standing.
//   - We persist `expiration=never` tokens by default, matching
//     the "long-lived integration token" convention every Trello
//     bot uses today. A future tightening can pass a shorter
//     expiration via the start route's `?mode=` if real use cases
//     emerge.
//   - Refresh tokens do not exist in this flow; tokens are
//     revoked by the user through Trello's account settings.
//
// Env vars required:
//   - LAZYNEXT_OAUTH_TRELLO_API_KEY
//
// (NOTE the deviation from the CLIENT_ID/CLIENT_SECRET convention.
// `isProviderConfigured('trello')` in `registry.ts` special-cases
// this lookup.)
//
// Trello docs: https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/
// ─────────────────────────────────────────────────────────────

import {
  registerOAuthProvider,
  type OAuthProviderConfig,
  type OAuthScopeMode,
} from './registry'

const AUTHORIZE_URL = 'https://trello.com/1/authorize'
const ME_URL = 'https://api.trello.com/1/members/me'

// Trello scope strings are comma-separated and limited to:
//   read   — pull boards, lists, cards (the Import use case)
//   write  — read + create/edit cards, comments
//   account — read user profile (always on; included for symmetry)
// `admin` (org-wide) is reserved for a future surface — Trello
// admin scopes only meaningfully apply to Trello Workspaces.
const TRELLO_SCOPES: Record<OAuthScopeMode, string[]> = {
  read: ['read'],
  write: ['read', 'write'],
  admin: ['read', 'write', 'account'],
}

export const trelloAdapter: OAuthProviderConfig = {
  id: 'trello',
  displayName: 'Trello',
  flowType: 'fragment',
  // Trello's flow has no PKCE concept — the token is returned
  // directly without an exchange step.
  pkce: false,
  scopes: TRELLO_SCOPES,

  buildAuthorizeUrl({ state, redirectUri, mode }) {
    const apiKey = requireEnv('LAZYNEXT_OAUTH_TRELLO_API_KEY')
    const params = new URLSearchParams({
      // Trello calls these `key` and `name` rather than
      // `client_id` and a separate display field.
      key: apiKey,
      name: 'Lazynext',
      // Trello wants COMMA-separated scopes.
      scope: TRELLO_SCOPES[mode].join(','),
      // `expiration=never` matches the long-lived integration
      // pattern. Other valid values: '1hour', '1day', '30days'.
      expiration: 'never',
      // `response_type=token` triggers the fragment-flow.
      response_type: 'token',
      // `return_url` is where Trello redirects after consent. We
      // point at the bridge page; the page extracts the token
      // and POSTs to /finish.
      return_url: redirectUri,
      // `callback_method=fragment` is Trello's explicit signal
      // that we want the token in the URL fragment. Documented
      // since 2019; included for clarity.
      callback_method: 'fragment',
      // Plain string state — Trello will pass it back as a query
      // param on the `return_url` (NOT in the fragment, which is
      // a Trello quirk). The bridge page reads it from search.
      state,
    })
    return `${AUTHORIZE_URL}?${params.toString()}`
  },

  /**
   * For Trello's fragment flow, `code` carries the access TOKEN
   * (not an auth code). The finish endpoint receives the token
   * via POST from the bridge page and passes it here so the
   * adapter shape stays uniform with the other six.
   */
  async exchangeCode({ code }) {
    const apiKey = requireEnv('LAZYNEXT_OAUTH_TRELLO_API_KEY')
    const accessToken = code

    // Identity lookup — Trello requires both `key` and `token`
    // on every authenticated call. We ask only for the four
    // fields we store; Trello returns more by default.
    const meUrl = `${ME_URL}?key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(accessToken)}&fields=id,fullName,username,email`
    const meRes = await fetch(meUrl, {
      headers: { accept: 'application/json' },
    })
    if (!meRes.ok) {
      throw new Error(`Trello /members/me lookup failed: HTTP ${meRes.status}`)
    }
    const meJson = (await meRes.json()) as {
      id?: string
      fullName?: string | null
      username?: string | null
      email?: string | null
    }
    if (typeof meJson.id !== 'string' || meJson.id.length === 0) {
      throw new Error('Trello /members/me returned unexpected shape')
    }

    return {
      accessToken,
      refreshToken: null, // Trello has no refresh-token concept on this flow.
      expiresAt: null, // expiration=never
      externalId: meJson.id,
      displayName: meJson.fullName ?? meJson.username ?? meJson.email ?? meJson.id,
      // Granted scopes aren't echoed by Trello on this flow; the
      // user's choice on the consent screen is what's persisted.
      scopes: null,
    }
  },
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    throw new Error(`${name} is not set; cannot build Trello OAuth URL.`)
  }
  return v
}

let _registered = false
export function ensureTrelloAdapterRegistered(): void {
  if (_registered) return
  _registered = true
  try {
    registerOAuthProvider(trelloAdapter)
  } catch {
    // Already registered (hot reload). Treat as success.
  }
}

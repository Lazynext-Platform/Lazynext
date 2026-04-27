# 🏗️ Feature Architecture — Auth Pages

> **Feature**: 03 — Auth Pages
> **Status**: 🟢 FINALIZED (retroactive — authored during documentation pass)
> **Date**: 2026-04-06
> **Last verified against code**: 2026-04-28

---

## Overview

Two routes — `/sign-in` and `/sign-up` — sharing a split-panel layout. Left panel: branded section (gradient, logo, taglines). Right panel: client form with email/password + OAuth, calling Supabase Auth directly. Left panel is hidden below `lg`; a compact logo replaces it on mobile.

Both pages use **Next.js catch-all routes** (`[[...sign-in]]` / `[[...sign-up]]`) — a legacy from the Clerk → Supabase migration that was kept rather than refactored, since it works without behavioral change.

## File Structure

```text
app/(auth)/
├── layout.tsx                              # Split-panel shell wrapper (server)
├── error.tsx                               # Auth-route error boundary
├── loading.tsx                             # Skeleton during route transition
├── sign-in/
│   ├── layout.tsx                          # Sign-in nested layout
│   └── [[...sign-in]]/
│       └── page.tsx                        # Sign-in form (client) — inline component
└── sign-up/
    ├── layout.tsx                          # Sign-up nested layout
    └── [[...sign-up]]/
        └── page.tsx                        # Sign-up form (client) — inline component

app/auth/
└── callback/
    └── route.ts                            # OAuth callback — exchange code → session

lib/db/supabase/
├── client.ts                               # Browser Supabase client
├── server.ts                               # Server Supabase client (RSC, route handlers)
└── middleware.ts                           # Edge session refresh helper
```

> **No** `components/auth/` directory — auth UI lives inline in the page files. No `app/auth/confirm/` or `app/auth/reset-password/` routes; email confirmation links are handled by Supabase directly and land on `/onboarding/create-workspace`. Password reset goes through Supabase's hosted flow.

## Component Design

### Sign-in / Sign-up pages (client components, inline)

Each page is a single `'use client'` file containing:
- Local `useState` for `email`, `password`, `loading`, `error`
- `handleSubmit` calling `supabase.auth.signInWithPassword()` / `supabase.auth.signUp()`
- `handleOAuth(provider)` calling `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: '/auth/callback' } })`
- On success — `window.location.href = '/onboarding/create-workspace'` (full page transition; ensures cookies are picked up by middleware)

### Layout (`app/(auth)/layout.tsx`)

Server component. Renders the split panel: brand gradient on the left (hidden `<lg`), `{children}` on the right.

## Data Flow

### Email/password sign-in
```
[sign-in page] → supabase.auth.signInWithPassword()
              → Supabase sets cookies (access + refresh)
              → window.location.href = '/onboarding/create-workspace'
              → middleware.ts hydrates session on next request
              → onboarding gate decides: existing workspace → /workspace/<slug>, else create flow
```

### OAuth
```
[OAuth button] → supabase.auth.signInWithOAuth({ provider })
              → Provider consent screen
              → /auth/callback (route handler) — exchanges `code` for session cookies
              → redirect to /onboarding/create-workspace
```

### Email confirmation (Supabase-hosted)
```
User clicks link in Supabase email → confirmation handled on Supabase side
                                  → redirect URL configured in Supabase dashboard
                                  → user lands on /onboarding/create-workspace
```

## Configuration

| Key | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — used by middleware + admin paths |

OAuth providers (Google, GitHub) are configured in the Supabase dashboard, not via env vars in this app. The buttons render unconditionally; if a provider isn't enabled in Supabase, the OAuth call returns an error which surfaces in the form's error state.

## Security Considerations

- **Cookie-based sessions** via `@supabase/ssr` — `httpOnly`, `secure`, `sameSite=lax`
- **CSRF**: not separately required because Supabase tokens are cookie-bound and the auth endpoints are state-changing only via the Supabase SDK with the user's own cookies
- **Rate limiting**: handled by Supabase Auth (built-in throttling on sign-in attempts)
- **Password rules**: enforced by Supabase server-side
- **Catch-all paths**: `[[...sign-in]]` accepts arbitrary suffixes — but the page ignores them, so there's no path-based attack surface

## Trade-offs & Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Inline pages + Supabase SDK | Simple; one file per route; no extra abstraction | Some duplication between sign-in / sign-up | ✅ Selected (current) |
| Extracted `components/auth/` form components | Less duplication | Indirection for ~80 lines of code; not worth it at this scale | ❌ Rejected |
| `@supabase/auth-ui` | Faster | Hard to brand; vendored styling fights | ❌ Rejected |
| Removing the `[[...x]]` catch-all wrappers | Cleaner routing | Net-zero behavioral change; risks breaking any external links from the Clerk era | ❌ Deferred |
| NextAuth.js | Provider-agnostic | Duplicates Supabase Auth; two session models | ❌ Rejected |

## Known Tech-Debt

- The `[[...sign-{in,up}]]` catch-all wrappers are a Clerk-migration artifact and could be flattened to plain `app/(auth)/sign-in/page.tsx` once we're confident no external link still points at a sub-path.
- Email-confirmation and password-reset flows are routed via Supabase's hosted screens rather than first-party pages. Acceptable for v1.0; revisit when we want a fully branded confirmation experience.

## Architecture Finalized ✅

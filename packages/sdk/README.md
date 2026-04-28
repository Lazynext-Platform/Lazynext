# `@lazynext/sdk`

Typed REST client for the [Lazynext](https://lazynext.com) public API.

Zero runtime dependencies. Mirrors `/api/v1/openapi.json` 1:1.

## Status

> ⚠️ Pre-release. Package is `private: true` in the registry until the
> `@lazynext` org is reserved on npm and the SDK passes a public review.
> The source is stable and used internally.

## Install

```bash
npm install @lazynext/sdk
# or
pnpm add @lazynext/sdk
# or
yarn add @lazynext/sdk
```

## Quickstart

```ts
import { LazynextClient, LazynextApiError } from '@lazynext/sdk'

const lzx = new LazynextClient({
  apiKey: process.env.LAZYNEXT_API_KEY!,
  workspaceId: process.env.LAZYNEXT_WORKSPACE_ID!,
})

// Verify your key is wired correctly:
const me = await lzx.whoami()
console.log(me.scopes) // ['read', 'write']

// List decisions:
const decisions = await lzx.decisions.list()

// Log a new decision from CI:
const created = await lzx.decisions.create({
  title: 'Adopted Postgres 16',
  status: 'accepted',
})
```

## Error handling

Every non-2xx response throws a `LazynextApiError` with a stable
machine-readable `code`. Branch on the code, not the prose message.

```ts
try {
  await lzx.decisions.list()
} catch (err) {
  if (err instanceof LazynextApiError) {
    switch (err.code) {
      case 'UNAUTHORIZED':       // bad / missing key
      case 'INSUFFICIENT_SCOPE': // key lacks the required scope
      case 'NOT_FOUND':
      case 'BAD_REQUEST':
      case 'RATE_LIMITED':       // honour Retry-After from response.headers
      case 'SERVER_ERROR':
      case 'UNKNOWN':
        // ...
    }
  }
}
```

## Configuration

```ts
new LazynextClient({
  apiKey: 'ln_live_...',         // required — workspace-scoped bearer key
  workspaceId: 'ws_...',         // required — must match the key's binding
  baseUrl: 'https://lazynext.com/api/v1',  // optional — override for self-host
  fetch: customFetch,            // optional — for testing or custom adapters
})
```

## Compatibility

- **Runtime**: Node 18+, Bun, Deno, modern browsers, edge runtimes.
  Uses global `fetch`.
- **TypeScript**: 4.5+ (uses `Awaited`, satisfies operator). Types are
  bundled — no separate `@types/` package.
- **Bundle size**: ~3 KB gzipped (no transitive deps).

## Endpoints covered

| Resource | Methods |
|---|---|
| `whoami` | `GET` |
| `decisions` | `list`, `get`, `create`, `update`, `delete` |

More endpoints will be added as routes are bearer-authenticated. Track
progress in the [API changelog](https://lazynext.com/docs/api/changelog).

## Versioning

Follows [Stripe-style additive versioning](https://lazynext.com/docs/api/versioning).
The SDK major version pins to the API major. We will publish `@lazynext/sdk@2.x`
when `/api/v2/` ships, with a 6-month overlap window so you can run both
side-by-side during migration.

## Links

- **API reference**: https://lazynext.com/docs/api
- **OpenAPI spec**: https://lazynext.com/api/v1/openapi.json
- **Changelog**: https://lazynext.com/docs/api/changelog
- **Issues**: https://github.com/Lazynext-Platform/Lazynext/issues

## License

MIT

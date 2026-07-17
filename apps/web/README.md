# @lazynext/web

Next.js 16 web application — the primary user-facing shell for the Lazynext
AI-native video editor. All business logic lives in `rust/`; this app is a
dumb rendering shell that consumes the WASM bridge and API Gateway.

## Quick Start

```bash
cd apps/web
bun install
bun run dev          # Next.js dev server
bun run test         # Jest unit tests
bun run test:e2e     # Playwright E2E tests
bun run typecheck    # tsc --noEmit
bun run lint         # ESLint
```

## Architecture

```
apps/web/src/
├── app/            # Next.js App Router pages and layouts
├── auth/           # Better Auth client/server integration
├── components/     # Shared UI components (Radix, Tailwind)
├── editor/         # Editor shell (consumes @lazynext/core)
├── media/          # Audio pipeline, media-utils, processing
├── seo/            # SEO metadata, Schema.org JSON-LD, social cards
├── services/       # Storage, Dodo Payments, API clients
└── wasm/           # WASM bridge bindings
```

## Scripts

| Script          | Description                                |
|-----------------|--------------------------------------------|
| `dev`           | Start Next.js dev server                   |
| `build`         | Prebuild WASM + Next.js production build   |
| `test`          | Run Jest unit tests                        |
| `test:e2e`      | Run Playwright end-to-end tests            |
| `lint`          | ESLint static analysis                     |
| `typecheck`     | TypeScript type checking                   |
| `db:generate`   | Generate Drizzle ORM migrations            |
| `db:migrate`    | Run Drizzle migrations                     |
| `deploy`        | Build and deploy to Cloudflare Workers     |

## Environment Variables

- `RUST_API_GATEWAY_URL` — Rust API Gateway base URL (defaults to `http://127.0.0.1:8005`)
- `NEXT_PUBLIC_DODO_PRO_PRICE_ID` — Dodo Payments price ID for Pro plan
- `NEXT_PUBLIC_DODO_STUDIO_PRICE_ID` — Dodo Payments price ID for Studio plan
- `DODO_API_KEY` — Dodo Payments API secret key

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack
- **Styling**: Tailwind CSS 4, Radix UI primitives
- **State**: Zustand, React hooks
- **Auth**: Better Auth
- **Database**: Drizzle ORM (Turso/LibSQL, PostgreSQL)
- **Testing**: Jest, Playwright, Testing Library
- **Deployment**: Cloudflare Workers (OpenNext)

## License

MIT

# 🧭 Motto: Production Hardening — Web App

> **Feature**: `09` — Production Hardening — Web App
> **Branch**: `feature/09-production-hardening-web`
> **Last Updated**: 2026-06-30

---

## North Star

Make the web app a working video editor — auth is secure, data is real, preview renders GPU frames, collaboration syncs bidirectionally, and export produces actual video files.

---

## DO ✅

- Modify files listed in architecture.md only — no scope creep into other features
- Replace mocks with real implementations, not new mocks
- Graceful degradation: show empty states, not fake data, when services are unavailable
- Follow existing patterns: command pattern for mutations, Drizzle for DB, WASM bridge for Rust calls
- Test at every checkpoint — cargo test, bun test, E2E
- Log all changes in changelog.md same-session

## DON'T ❌

- Do NOT touch rust/crates/compositor/ core rendering — it already works; only wire the WASM bridge
- Do NOT refactor the CRDT engine — only wire the sync loop
- Do NOT touch temporal-versioning — that's a separate Rust Core feature
- Do NOT change the GPUI desktop app or React Native mobile app
- Do NOT add new dependencies without documenting in architecture.md
- Do NOT leave hardcoded URLs or tokens behind

## Boundaries 🚧

- Only modify files in: rust/api-gateway/, apps/web/, services/render-service/
- Only remove dependencies: kysely, @better-auth/kysely-adapter
- Only add dependencies: jsonwebtoken (Rust, if not present)
- API Gateway port 8005 must remain unchanged
- Web app port 3000 must remain unchanged

## Success Looks Like 🎯

- `cargo test -p lazynext_api_gateway` — all real tests pass, no fake sleep+assert tests
- `bun test` — GPU renderer + CRDT sync + DB schema tests pass
- `bun run test:e2e` — auth → create → edit → export passes on Chromium/Firefox/WebKit
- Admin dashboard at `/admin` shows real user/project counts from PostgreSQL
- Export button produces a downloadable video file
- Two browser tabs editing the same project show identical timelines

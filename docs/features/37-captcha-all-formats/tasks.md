# ✅ Tasks: CAPTCHA Across All 7 Formats

> **Feature**: `37` — CAPTCHA All Formats
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/37-captcha-all-formats` (merged to main)
> **Status**: 🟢 COMPLETE
> **Progress**: 22/22 tasks complete

---

## Pre-Flight

- [x] Discussion doc is marked COMPLETE
- [x] Architecture doc is FINALIZED
- [x] Feature branch created from main (`feature/37-captcha-all-formats`)
- [x] Dependent features are merged to main

---

## Phase A — API Gateway Central Verification ✅

- [x] **A.1** — Create `rust/api-gateway/src/captcha.rs` module (551 lines)
- [x] **A.2** — Implement `POST /api/v1/captcha/verify-turnstile` — Cloudflare Turnstile verification
- [x] **A.3** — Implement `GET /api/v1/captcha/challenge` — PoW challenge generation
- [x] **A.4** — Implement `POST /api/v1/captcha/verify-pow` — PoW solution verification
- [x] **A.5** — Create in-memory challenge store with single-use + 5-min expiry
- [x] **A.6** — Implement `captcha_middleware` for `X-Captcha-Token` header enforcement
- [x] **A.7** — Wire middleware into 21 POST mutation routes (captcha_protected_routes)
- [x] **A.8** — Add 9 unit tests (SHA-256 difficulty, PoW solve/verify, store, token format)
- [x] 📍 **Checkpoint A** — API Gateway compiles, 18/18 tests pass

## Phase B — Web App Turnstile ✅

- [x] **B.1** — Install `react-turnstile` dependency
- [x] **B.2** — Create `CaptchaWidget.tsx` React component
- [x] **B.3** — Create `captcha-verify.ts` verification utility
- [x] **B.4** — Add Turnstile to `SignInForm.tsx` (password + magic link modes)
- [x] **B.5** — Add Turnstile to `SignUpForm.tsx`
- [x] **B.6** — Add Turnstile to `LoginModal.tsx`
- [x] **B.7** — Add Turnstile to `forgot-password/page.tsx`
- [x] **B.8** — Add Turnstile to `reset-password/page.tsx`
- [x] **B.9** — Add server-side verification to `[...all]/route.ts` (Better Auth handler)
- [x] **B.10** — Add Turnstile + server verification to feedback form + route
- [x] 📍 **Checkpoint B** — Web app typecheck clean, all forms protected

## Phase C — Programmatic Client PoW ✅

- [x] **C.1** — CLI: PoW solver using Node `crypto.createHash("sha256")` (+297 lines)
- [x] **C.2** — CLI: Update `login`, `register`, `login-magic`, `forgot-password` commands
- [x] **C.3** — Desktop: Multi-threaded Rust PoW solver (`apps/desktop/src/captcha.rs`, 193 lines)
- [x] **C.4** — Desktop: Integrate into editor's autonomous_edit API call
- [x] **C.5** — Mobile: Pure-JS SHA-256 + PoW solver (205 lines, zero native deps)
- [x] **C.6** — Mobile: Integrate into `signIn`, `signUp`, `signInWithMagicLink`, `requestPasswordReset`
- [x] **C.7** — Extension: Web Crypto API PoW solver (96 lines)
- [x] **C.8** — Extension: Integrate into video import and AI prompt flows
- [x] 📍 **Checkpoint C** — All clients typecheck/compile, PoW solving verified

## Phase D — MCP Server Verification ✅

- [x] **D.1** — Node MCP: Create captcha verification module with caching (101 lines)
- [x] **D.2** — Node MCP: Add optional PoW check in `CallToolRequestSchema` handler
- [x] **D.3** — Rust MCP: Add `_pow_token` param check in `process_mcp_request`
- [x] 📍 **Checkpoint D** — Both MCP servers compile, PoW gated behind `MCP_REQUIRE_POW`

## Phase E — Testing & Verification ✅

- [x] **E.1** — API Gateway integration tests: 5 new HTTP tests (challenge, PoW flow, invalid, single-use)
- [x] **E.2** — Mobile captcha unit tests: 11 tests (SHA-256 vectors, difficulty, UTF-8, PoW solve)
- [x] **E.3** — Standardize token format to `challenge_id:nonce` across all clients
- [x] **E.4** — CLI token passing: return token from `performCaptcha()`, pass to `authFetch()`
- [x] 📍 **Checkpoint E** — 23 API Gateway + 11 mobile tests pass, all types clean

## Phase F — Documentation ✅

- [x] **F.1** — Add CAPTCHA env vars to `.env.example`
- [x] **F.2** — Write discussion.md
- [x] **F.3** — Write architecture.md
- [x] **F.4** — Write tasks.md (this file)
- [x] **F.5** — Write changelog.md
- [x] 📍 **Checkpoint F** — All docs complete

## Phase G — Deploy & Ship ✅

- [x] **G.1** — Create PR #220 from feature branch
- [x] **G.2** — Review and merge to main
- [x] **G.3** — Deploy to Linode production (API Gateway + Web App)
- [x] **G.4** — Verify captcha endpoints live on production
- [x] 📍 **Checkpoint G** — Deployed and verified

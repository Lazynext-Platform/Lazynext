# 📝 Changelog: CAPTCHA Across All 7 Formats

> **Feature**: `37` — CAPTCHA All Formats
> **Branch**: `feature/37-captcha-all-formats` (merged to main)
> **Started**: 2026-07-15
> **Completed**: 2026-07-15

---

## Session Notes

### Session Note — 2026-07-15
- **Who**: AI Agent (opencode)
- **Duration**: Active
- **Worked On**: Complete CAPTCHA implementation across all 7 formats. API Gateway central verification (Turnstile + PoW), Web App Turnstile widgets on 6 forms, Mobile pure-JS PoW solver, Desktop multi-threaded Rust PoW, CLI Node crypto PoW, Extension Web Crypto PoW, MCP Server optional PoW layer.
- **Stopped At**: Phase G — Deployed to Linode production, verified live. All docs created.
- **Blockers**: None.
- **Next Steps**: Monitor production captcha metrics; add Turnstile site key + secret key for production use; consider adding biometric/WebAuthn verification.

---

## Log

### 2026-07-15

### Phase A — API Gateway Central Verification
- **[New]** `rust/api-gateway/src/captcha.rs` — Full captcha module (551 lines): Turnstile verification endpoint, PoW challenge generation, PoW solution verification, captcha middleware for header enforcement, in-memory challenge store with single-use + 5-min expiry, 9 unit tests
- **[Changed]** `rust/api-gateway/src/main.rs` — Added `pub mod captcha`; 3 new public routes (`/api/v1/captcha/verify-turnstile`, `/challenge`, `/verify-pow`); split routes into `authenticated_routes` (GET, read-only) and `captcha_protected_routes` (POST, mutation) with captcha middleware layer; merged via `all_authenticated`
- **[Changed]** `rust/api-gateway/tests/integration_test.rs` — Added 5 HTTP integration tests: challenge field validation, challenge uniqueness, full PoW solve/verify flow, invalid nonce rejection, single-use enforcement (288 lines)
- **[Test]** 23/23 API Gateway tests pass (18 unit + 5 integration)

### Phase B — Web App Turnstile
- **[New]** `apps/web/src/components/auth/CaptchaWidget.tsx` — React Turnstile wrapper using `react-turnstile` package; renders only when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set; auto theme, auto refresh on expiry
- **[New]** `apps/web/src/components/auth/captcha-verify.ts` — Client-side utility verifying Turnstile tokens against API Gateway
- **[Changed]** `apps/web/src/components/auth/SignInForm.tsx` — Added `CaptchaWidget` to both password and magic link modes; `captchaTokenRef` stores token; `verifyCaptcha()` helper before auth calls; passes `X-Captcha-Token` via Better Auth `fetchOptions.headers`
- **[Changed]** `apps/web/src/components/auth/SignUpForm.tsx` — Same pattern: widget + ref + verification + header passthrough
- **[Changed]** `apps/web/src/components/auth/LoginModal.tsx` — Same pattern on all 3 auth paths (signIn.email, signIn.magicLink, signUp.email)
- **[Changed]** `apps/web/src/app/(auth)/forgot-password/page.tsx` — Turnstile widget + token passthrough on `requestPasswordReset`
- **[Changed]** `apps/web/src/app/(auth)/reset-password/page.tsx` — Turnstile widget on password reset form
- **[Changed]** `apps/web/src/app/api/auth/[...all]/route.ts` — Server-side captcha enforcement for email-based auth paths (`sign-in/email`, `sign-up/email`, `sign-in/magic-link`, `request-password-reset`); verifies `X-Captcha-Token` header against API Gateway; OAuth callbacks exempt
- **[Changed]** `apps/web/src/app/api/feedback/route.ts` — Server-side captcha verification on feedback submission
- **[Changed]** `apps/web/src/feedback/components/feedback-popover.tsx` — Added `CaptchaWidget` + token in submit headers
- **[Changed]** `apps/web/package.json` — Added `react-turnstile` dependency

### Phase C — Programmatic Client PoW
- **[New]** `apps/desktop/src/captcha.rs` — Multi-threaded Rust PoW solver (193 lines): fetches challenge from API Gateway, solves using all CPU cores with `AtomicBool` signal, verifies solution, returns token for `X-Captcha-Token` header
- **[Changed]** `apps/desktop/src/main.rs` — Added `mod captcha`
- **[Changed]** `apps/desktop/src/editor.rs` — `perform_captcha()` called before autonomous_edit API request; token added to request headers
- **[Changed]** `apps/desktop/Cargo.toml` — Added `sha2 = "0.11"` dependency
- **[New]** `apps/mobile/src/services/captcha.ts` — Pure-JS implementation (205 lines): self-contained UTF-8 encoder, minimal SHA-256 (no native deps), PoW solver with difficulty checking, exports for testing
- **[Changed]** `apps/mobile/src/services/auth.ts` — `performCaptcha()` integrated into `signIn`, `signUp`, `signInWithMagicLink`, `requestPasswordReset`; token passed via `authFetch` header; `captchaRequired` error field
- **[New]** `apps/browser-extension/src/captcha.ts` — Web Crypto API PoW solver (96 lines) using `crypto.subtle.digest("SHA-256")`
- **[Changed]** `apps/browser-extension/src/App.tsx` — `performCaptcha()` before video import; token in headers
- **[Changed]** `apps/browser-extension/src/overlay.tsx` — `performCaptcha()` before AI prompt submission; status message "Verifying..."
- **[Changed]** `apps/cli/src/index.ts` — Added 5 functions (+297 lines): `getPowChallenge`, `solvePowChallenge` (Node `createHash`), `verifyPowSolution`, `checkDifficulty`, `performCaptcha` (returns token); updated `login`, `register`, `login-magic`, `forgot-password` commands to pass token to `authFetch`

### Phase D — MCP Server Verification
- **[New]** `services/mcp-server/src/captcha.ts` — PoW token verification with 30-min caching (101 lines); gated behind `MCP_REQUIRE_POW=true` env var
- **[Changed]** `services/mcp-server/src/index.ts` — Optional PoW check in `CallToolRequestSchema` handler; reads `_pow_token` from tool arguments
- **[Changed]** `rust/mcp-server/src/main.rs` — Optional `_pow_token` param check in `process_mcp_request`; after existing `_api_key` validation; gated behind `MCP_REQUIRE_POW=true`

### Phase E — Testing & Verification
- **[New]** `apps/mobile/src/__tests__/captcha.test.ts` — 11 unit tests: SHA-256 test vectors (empty, "abc", "hello world"), difficulty checking (full bytes, partial byte, non-zero), UTF-8 (ASCII, 2-byte, 3-byte, 4-byte emoji), end-to-end PoW solving; all pass with `bun` runner
- **[Changed]** `apps/mobile/src/services/captcha.ts` — Exported `stringToUtf8Bytes`, `sha256Bytes`, `checkDifficulty` for testing
- **[Fix]** Standardized captcha token format to `challenge_id:nonce` across all 7 formats (was inconsistent: mobile had 3-part, extension 2-part)
- **[Fix]** CLI: `performCaptcha()` now returns `string | null` token (was `boolean`); `authFetch` accepts captcha token parameter; all 4 commands pass token

### Phase F — Documentation & Config
- **[Changed]** `.env.example` — Added CAPTCHA section with `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `POW_DIFFICULTY`, `CAPTCHA_DISABLED`, `MCP_REQUIRE_POW`
- **[New]** `docs/features/37-captcha-all-formats/discussion.md` — Feature discussion (why, decisions, scope)
- **[New]** `docs/features/37-captcha-all-formats/architecture.md` — Architecture doc (data flow, file structure, implementation details)
- **[New]** `docs/features/37-captcha-all-formats/tasks.md` — Task checklist (22 tasks across 7 phases)
- **[New]** `docs/features/37-captcha-all-formats/changelog.md` — This file

### Phase G — Deploy & Ship
- **[Deploy]** Built API Gateway for Linux x86_64 on Linode server; deployed new binary at `/usr/local/bin/lazynext_api_gateway`; service restarted and active
- **[Deploy]** Built Next.js web app on Linode server; created `.env` with captcha vars; service restarted and active
- **[Verify]** Confirmed captcha challenge endpoint returns valid challenges on production (`curl localhost:8005/api/v1/captcha/challenge`)
- **[Verify]** Confirmed all services active: `lazynext-api-gateway`, `lazynext-web`
- **[PR]** Created PR #220, reviewed and merged to main
- **[Commit]** 4 commits: feat (c480d331), fix/standardize (4da684f7), test/mobile (55331451), test/mobile-v2 (4cc79a66)

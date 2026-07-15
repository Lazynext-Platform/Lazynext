# 💬 Discussion: I Am Not a Robot — CAPTCHA Across All 7 Formats

> **Feature**: `37` — CAPTCHA All Formats
> **Status**: 🟢 COMPLETE
> **Branch**: `feature/37-captcha-all-formats` (merged to main)
> **Depends On**: #36 (E2E Launch Readiness)
> **Date Started**: 2026-07-15
> **Date Completed**: 2026-07-15

---

## Summary

All 7 Lazynext delivery formats are now protected against automated bot abuse
through "I am not a robot" verification. Two strategies are employed:

1. **Cloudflare Turnstile** — invisible CAPTCHA widget for web-based UIs
   (Web App, visible on auth forms and feedback). Server-side verification
   in both the Next.js API routes and the API Gateway.

2. **Proof-of-Work (hashcash)** — SHA-256 based challenge/response for
   programmatic clients (CLI, Desktop, Mobile, Browser Extension, MCP).
   Clients request a challenge from the API Gateway, find a nonce that
   produces a hash with N leading zero bits, and submit the solution.
   Single-use with 5-minute expiry.

The API Gateway is the central verification point — all formats ultimately
validate through it, ensuring consistent enforcement.

---

## Why This Feature

Prior to this feature, all 7 formats had **zero bot protection** beyond basic
rate limiting (3 of 22 API routes). Auth forms were unprotected against
automated account creation and credential stuffing. AI generation endpoints
had no abuse prevention.

- **Web**: Auth forms had rate limiting (10/min) but no CAPTCHA — bots could
  still make 10 attempts per minute per IP.
- **Desktop/CLI/Mobile/Extension**: No bot detection at all on API calls.
- **MCP Server**: API key existed but no challenge mechanism for leaked keys.
- **API Gateway**: Only 3 of 22+ routes rate-limited.

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Turnstile over reCAPTCHA | Free, privacy-friendly, no Google dependency, invisible by default |
| PoW over device attestation | Works universally (CLI, desktop, mobile, extension) without platform-specific APIs |
| Central verification at API Gateway | Single source of truth — all formats validate through the same endpoint |
| Client-side + server-side double check | Defense in depth — client verifies before auth call, server re-verifies |
| Difficulty 20 (≈1s) default | Balanced UX/security; configurable via `POW_DIFFICULTY` env var |
| Single-use challenges | Prevents replay attacks; 5-minute TTL prevents hoarding |
| Dev mode bypass (`CAPTCHA_DISABLED`) | Development convenience without mocking; falls open when not configured |

---

## Scope

### In Scope
- Turnstile on all web auth forms (sign-in, sign-up, forgot-password, reset-password, login modal)
- Turnstile on feedback form
- PoW on CLI login/register/magic-link/forgot-password commands
- PoW on Desktop autonomous edit API calls
- PoW on Mobile sign-in/sign-up/magic-link/reset flows
- PoW on Browser Extension import and AI prompt flows
- API Gateway captcha middleware on 21 POST routes
- Server-side verification in Better Auth route handler
- Integration tests (5 tests for challenge/PoW/single-use)

### Out of Scope
- Turnstile on OAuth flows (redirects go through browser which has Turnstile on origin page)
- Biometric/WebAuthn-based verification
- Per-user captcha quotas (covered by rate limiting)
- IP reputation scoring (separate feature)
- Honeypot fields (can be added separately)

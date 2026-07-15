# 🏗️ Architecture: CAPTCHA Across All 7 Formats

> **Feature**: `37` — CAPTCHA All Formats
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟢 FINALIZED
> **Date**: 2026-07-15

---

## Overview

Two captcha strategies flow through a central API Gateway verification layer.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT FORMATS                             │
│                                                                   │
│  Web App          Desktop          Mobile          Extension      │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐   │
│  │Turnstile│     │Rust PoW │     │ JS PoW  │     │Crypto PoW│   │
│  │ widget  │     │parallel │     │pure JS  │     │Web Crypto│   │
│  └────┬────┘     └────┬────┘     └────┬────┘     └────┬─────┘   │
│       │               │               │               │          │
│  CLI                MCP Server                                  │
│  ┌─────────┐        ┌──────────────────┐                       │
│  │Node PoW │        │API Key + opt PoW │                       │
│  │crypto   │        │_api_key param    │                       │
│  └────┬────┘        └────────┬─────────┘                       │
│       │                      │                                  │
├───────┼──────────────────────┼──────────────────────────────────┤
│       │         X-Captcha-Token / _pow_token                    │
│       ▼                      ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   API GATEWAY                             │   │
│  │                                                           │   │
│  │  POST /api/v1/captcha/verify-turnstile → Cloudflare API   │   │
│  │  GET  /api/v1/captcha/challenge        → Generate PoW     │   │
│  │  POST /api/v1/captcha/verify-pow       → Validate PoW     │   │
│  │                                                           │   │
│  │  captcha_middleware → X-Captcha-Token header check        │   │
│  │  (applied to 21 POST mutation routes)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Structure

### New Files (9)

```
rust/api-gateway/src/captcha.rs                  # Turnstile + PoW endpoints, middleware, challenge store
apps/web/src/components/auth/CaptchaWidget.tsx    # React Turnstile wrapper component
apps/web/src/components/auth/captcha-verify.ts    # Client-side verification utility
apps/mobile/src/services/captcha.ts               # Pure-JS SHA-256 + PoW solver (205 lines)
apps/browser-extension/src/captcha.ts             # Web Crypto PoW solver (96 lines)
apps/desktop/src/captcha.rs                       # Multi-threaded Rust PoW solver (193 lines)
services/mcp-server/src/captcha.ts                # PoW verification + caching (101 lines)
apps/mobile/src/__tests__/captcha.test.ts         # 11 captcha unit tests
```

### Modified Files (19)

```
# API Gateway
rust/api-gateway/src/main.rs                      # +captcha module, 3 new routes, middleware wiring

# Web App
apps/web/src/components/auth/SignInForm.tsx       # Turnstile on password + magic link
apps/web/src/components/auth/SignUpForm.tsx       # Turnstile on signup
apps/web/src/components/auth/LoginModal.tsx       # Turnstile on modal
apps/web/src/app/(auth)/forgot-password/page.tsx  # Turnstile on reset request
apps/web/src/app/(auth)/reset-password/page.tsx   # Turnstile on password reset
apps/web/src/app/api/auth/[...all]/route.ts        # Server-side header verification
apps/web/src/app/api/feedback/route.ts             # Server-side captcha on feedback
apps/web/src/feedback/components/feedback-popover.tsx # CaptchaWidget + header
apps/web/package.json                             # +react-turnstile dependency

# Mobile App
apps/mobile/src/services/auth.ts                  # PoW integration in signIn/signUp/etc.

# Browser Extension
apps/browser-extension/src/App.tsx                 # PoW before video import
apps/browser-extension/src/overlay.tsx             # PoW before AI prompt

# CLI
apps/cli/src/index.ts                             # +297 lines PoW solver + 4 command updates

# Desktop App
apps/desktop/src/main.rs                          # +mod captcha
apps/desktop/src/editor.rs                        # PoW before autonomous_edit
apps/desktop/Cargo.toml                           # +sha2 dependency

# MCP Server
rust/mcp-server/src/main.rs                       # +_pow_token param check
services/mcp-server/src/index.ts                  # Optional PoW in tool call handler

# Config
.env.example                                      # CAPTCHA env vars section
```

---

## Data Flow

### Turnstile Flow (Web App)
```
1. User opens sign-in page
2. Turnstile widget loads → user implicitly verified
3. Widget generates token → stored in React ref
4. User clicks submit
5. verifyCaptchaToken() calls POST /api/v1/captcha/verify-turnstile
6. API Gateway validates with Cloudflare API
7. If valid → captcha token added as X-Captcha-Token header
8. Better Auth signIn.email() called with header
9. Next.js route handler re-verifies header server-side
10. Auth proceeds
```

### PoW Flow (CLI, Desktop, Mobile, Extension)
```
1. Client calls GET /api/v1/captcha/challenge
2. Receives: { challenge_id, prefix, difficulty, expires_at }
3. Client finds nonce s.t. SHA-256(prefix + nonce) has N leading zero bits
4. Client calls POST /api/v1/captcha/verify-pow
5. Server validates: checks hash, removes challenge from store
6. If valid → returns { success: true }
7. Client includes token (challenge_id:nonce) in X-Captcha-Token header
8. API Gateway captcha_middleware verifies header on mutation routes
```

### MCP Server Flow
```
1. MCP client includes _api_key in every request (required)
2. If MCP_REQUIRE_POW=true, also includes _pow_token
3. Server verifies API key first
4. Then optionally verifies PoW token via API Gateway
5. Tool executes only if both pass
```

---

## Key Implementation Details

### Challenge Store
- In-memory `HashMap<String, PowChallenge>` protected by `Mutex`
- Single-use: challenges removed on first verification attempt
- 5-minute TTL: automatic cleanup on access
- Shared via `LazyLock` static — all handlers share the same store

### Difficulty Checking
```rust
fn check_difficulty(hash: &[u8; 32], difficulty: u32) -> bool {
    // difficulty = N leading zero bits
    // full_bytes = N / 8  (complete zero bytes)
    // remaining_bits = N % 8  (zero bits in next byte)
}
```

### Multi-threaded PoW (Desktop)
- Uses `std::thread::available_parallelism()` cores
- Each thread searches a slice of the nonce space:
  - Thread 0: 0, 4, 8, 12...
  - Thread 1: 1, 5, 9, 13...
- `AtomicBool` signal stops all threads when solution found
- Typically < 1 second for difficulty 20 on modern hardware

### Pure-JS SHA-256 (Mobile)
- No native module dependencies (no `crypto.subtle`, no `TextEncoder`)
- Self-contained UTF-8 encoder + SHA-256 implementation
- Works on Hermes (iOS) and JavaScriptCore (Android)
- Tested against NIST SHA-256 test vectors (11 tests pass)

### Captcha Middleware (API Gateway)
- Applied as Axum middleware layer on `captcha_protected_routes`
- 21 POST routes require `X-Captcha-Token` header
- GET routes (timeline, profile, projects, credits) exempt
- Disabled when `CAPTCHA_DISABLED=true` or Turnstile not configured

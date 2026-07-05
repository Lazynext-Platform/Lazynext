# 🧭 Feature Motto: E2E Launch Readiness — All 7 Formats

> **Feature**: `36` — E2E Launch Readiness
> **Applies during**: Stages 4-7 (Verify, Build, Test, Review)

## DO ✅
- Verify before building — run all test suites before touching code
- Fix real bugs, don't restructure working code
- Graceful degradation: when API keys absent, return honest errors with guidance, never fake data
- Every fix must have a corresponding test case or verification step
- Owner-gated phases (Azure deploy, developer certs, store listings) should be clearly marked and not worked on without approval

## DON'T ❌
- Do NOT deploy to production or create store listings without owner approval (Phase 2-3 owner-gated)
- Do NOT remove graceful degradation fallbacks
- Do NOT change the NL→CRDT pipeline architecture — fix bugs, don't redesign
- Do NOT alter the verification results without re-running actual tests

## If stuck
- If `GEMINI_API_KEY` is missing, use the fallback key matcher — don't fake LLM responses
- If a test fails, log the exact error — don't silence or skip without documenting why
- If a format can't be verified (e.g., mobile requires device), mark it as "verified via compile" with the date

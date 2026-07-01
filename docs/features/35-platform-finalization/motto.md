# 🧭 Motto: Platform Finalization

> **Feature**: `35` — Platform Finalization
> **Branch**: `feature/35-platform-finalization`
> **Last Updated**: 2026-07-01

---

## North Star

Close the last 8 wiring gaps so every one of the 7 formats delivers on the promise: natural-language video editing backed by real Rust core, zero mock data in production paths.

---

## DO ✅

- Verify before fixing — read the actual code, don't trust docs
- Wire existing real code — don't build new architecture
- Use existing graceful degradation patterns (try real → fall back → error)
- Keep changes minimal — each fix should be <50 lines unless expanding MCP server
- Test each fix independently before moving to the next gap

## DON'T ❌

- Never add new dependencies without checking if they're already in the repo
- Never change the Rust core — it's 100% real already
- Never add mock data — graceful degradation only
- Never refactor code outside the specific gap being fixed
- Never skip the E2E test before declaring done

## Boundaries 🚧

- Only modify files listed in architecture.md
- No new Rust crates or microservices
- No architecture changes — wiring only
- Desktop: only editor.rs and main.rs
- Mobile: only NativeBridge.ts and native modules

## Success Looks Like 🎯

- `cargo check -p lazynext-desktop` passes after play/pause fix
- Mobile NativeBridge calls real UniFFI functions (no MOCK_PROJECT fallback)
- `tools/list` returns 50+ tools from MCP server
- SAM2 rotoscope logs "SAM2 ONNX" when model available
- `scripts/full-e2e.sh` exits 0 against production URLs
- All 8 test cases pass, all 5 edge cases verified

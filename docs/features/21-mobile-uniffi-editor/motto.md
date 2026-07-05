# 🧭 Feature Motto: Mobile App — Wire NativeBridge to Editor

> **Feature**: `21` — Mobile App Completion
> **Applies during**: Stage 5 (Build)

## DO ✅
- Wire the existing NativeBridge to EditorScreen — don't rewrite what already works
- Use `useEffect` for async data fetching (React Native lifecycle)
- Maintain graceful degradation when native modules are unavailable
- Keep UniFFI `.udl` as the single source of truth for the Rust↔native interface

## DON'T ❌
- Do NOT rewrite NativeBridge.ts — it's already real (51 lines of UniFFI calls)
- Do NOT add new UniFFI methods unless required by EditorScreen wiring
- Do NOT remove the existing UI (EditorScreen, Timeline, App) — only fix the data source
- Do NOT add platform-specific code — UniFFI handles the abstraction

## If stuck
- If UniFFI bindings fail to generate, check `rust/core/uniffi/lazynext.udl` for syntax errors
- If NativeBridge throws at runtime, ensure the native module is linked in Podfile (iOS) / build.gradle (Android)

# 📝 Changelog: E2E Launch Readiness

### Session Note — 2026-07-01 (Phase 0 + Phase 1 complete)
- **Who**: AI Agent (opencode / glm-5.2)
- **Owner decisions**: Gemini LLM (no key yet — graceful fallback) · Azure · all 7 formats · "plan then build".

#### Phase 1 — bugs fixed (all committed, all tests green)
1. **`rust/cli/src/main.rs` `test_pattern_fallback`** — uploaded a static texture but never
   called `clear_asset_loader()`, so `render_frame` kept invoking `RingBufferDecoder` per
   frame. For synthetic clips (no real file) ffmpeg failed → 500ms timeout/frame → render
   truncated to 0.375s/2s at ~2fps. **Fix**: take `&mut CoreEngine`, call `clear_asset_loader()`.
   **Verified**: 48 frames, 2.000s, **49.5 fps**.
2. **`rust/core/src/autonomous.rs` `check_job_status`** — returned a fake
   `cdn.lazynext.ai/videos/{id}.mp4` URL. These async methods had ZERO callers (all real
   callers use `process_intent_with_llm`). **Fix**: `process_intent` errors w/ guidance;
   `check_job_status` returns `Failed` w/ guidance instead of fabricating a URL.
3. **`rust/crates/neural_engine/src/lib.rs` `detect_faces_onnx`** — pushed a hardcoded
   `Actor_ONNX 0.95` dummy detection (mock data) that bypassed the real heuristic fallback.
   **Fix**: return empty + log (SCRFD anchor-decode+NMS not yet implemented) → falls back
   to real `detect_faces_heuristic` per graceful-degradation policy.

#### Phase 0 — verification (all 7 formats)
| Format | Verification | Result |
|---|---|---|
| Rust core | `cargo test --workspace` | **210 pass / 0 fail** |
| Web | `tsc --noEmit` + `bun test src` | typecheck clean; **352 pass / 1 env-fail** (admin-data needs DATABASE_URL) |
| Desktop | `cargo build -p lazynext_desktop` | compiles; real GPUI (Application::new, Dashboard, Editor, decklink) |
| Mobile | structure + bindings | full RN + UniFFI (`lazynext_mobile.swift`/`.kt`); needs Xcode/Android SDK to build |
| Extension | manifest audit | valid MV3 (perms, host_permissions :3000/:8005), dist+src+tests |
| CLI | live `edit` + `render` | edit: graceful AI degrade ✓; render: **full 2.000s H.264 MP4 @ 49.5fps** ✓ |
| API Gateway | live `/health` + `/swagger-ui` | 200 + OpenAPI 3.1.0 valid + graceful DB degrade ✓ |
| MCP Server | live JSON-RPC | `initialize` ✓ + auth enforced ✓ |

#### Known follow-ups (not blockers)
- Mobile/desktop/extension full live smoke needs native SDKs / Chrome (shells verified over the green Rust core).
- admin-data test should mock DATABASE_URL (test-harness nit).
- SCRFD anchor-decode + NMS for real ONNX face detections (currently graceful heuristic fallback).
- Real `GEMINI_API_KEY` for the live AI demo (graceful-degrade verified without it).
- Web Playwright E2E not run this session (shell typechecks + 352 unit tests pass).

- **Stopped At**: Phase 0 + Phase 1 substantively complete. 3 commits on `feature/36-e2e-launch-readiness`.
- **Blockers**: None for launch-readiness. Real Gemini key needed only for the live AI sign-off demo.
- **Next Steps**: Owner decides — provide Gemini key for live demo, or proceed to Phase 2 (per-format store listings / signed builds / public deploy).

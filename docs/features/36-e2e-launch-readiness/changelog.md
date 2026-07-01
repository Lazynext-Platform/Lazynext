# 📝 Changelog: E2E Launch Readiness

### Session Note — 2026-07-01 (Phase 0 — live verification)
- **Who**: AI Agent (opencode / glm-5.2)
- **Worked On**: Phase 0 live verification of all formats against real binaries.
- **Environment**: Rust 1.96, bun 1.3.14, node 25, ffmpeg 8.1.2 (homebrew). Branch `feature/36-e2e-launch-readiness`.

#### ✅ Verified PASS (live)
| TC | Format | Result |
|---|---|---|
| TC1 | Rust core | `cargo test --workspace` → **0 failures** (210+ tests). Entire workspace compiles. |
| TC3a | CLI `edit` | Real AI routing (gemini), detected no key, **graceful-degraded to local plan**, produced real track. No crash. |
| TC3b | CLI `render` | Produced **valid H.264 MP4** (640×360, h264, ffprobe-valid). See bug below. |
| TC4 | API Gateway | `/health` ok (graceful DB degrade), `/swagger-ui/` **HTTP 200**, valid OpenAPI 3.1.0 spec. |
| TC5 | MCP Server | JSON-RPC `initialize` handshake ok; **auth genuinely enforced** (`Unauthorized` on `tools/list`). |
| — | Web shell | `tsc --noEmit` → **no type errors** (compiles against WASM core). |

#### ⚠️ Real bugs/gaps found (Phase-1 fixes)
1. **`rust/core/src/ring_buffer_decoder.rs:147`** — CLI `render` of a *synthetic/default test-pattern* clip times out (500ms/frame) because the `RingBufferDecoder` decodes real **files** via ffmpeg, but test-pattern clips have no file → ring buffer never fills → output truncates (0.375s instead of 2s). **Fix**: synthetic clips should bypass the file-decoder and generate frames directly (or CLI should require real media).
2. **`autonomous.rs:68`** — `check_job_status` still returns fake CDN URL `cdn.lazynext.ai` (carryover).
3. **`neural_engine/lib.rs:219`** — "dummy detection" face path (carryover).
4. **`autonomous.rs:56`** — async `process_intent` thin vs sync path (carryover).

#### ⏳ Not yet live-smoked (need native runtimes)
- **Desktop (TC6)**: GPUI needs a display; `cargo run -p lazynext-desktop` next.
- **Mobile (TC8)**: needs Android SDK / Xcode.
- **Extension (TC9)**: needs Chrome `--load-extension`.
- **Web Playwright (TC7)**: shell typechecks; full E2E next.

- **Stopped At**: Phase 0 substantively complete (4 of 7 formats live + web typecheck + all Rust tests green). Branch has planning docs committed.
- **Blockers**: Real `GEMINI_API_KEY` pending for the live AI demo (graceful-degrade verified working without it).
- **Next Steps**: Owner decision — (A) fix the 4 Phase-1 bugs now, or (B) finish live-smoking desktop/mobile/extension first.

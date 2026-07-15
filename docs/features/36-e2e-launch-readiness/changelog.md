# 📝 Changelog: E2E Launch Readiness

### Session Note — 2026-07-03 Live (CLI LLM provider fix + Gemini pipeline test + bun test)
- **Who**: AI Agent (opencode / deepseek-v4-pro)
- **Live verification**:
  - **CLI render**: Valid H.264 MP4 produced (640x360, 15fps, 1s, h264 High codec)
  - **CLI pipe mode**: Now reads `LLM_PROVIDER` from env var (was hardcoded to ollama)
  - **Gemini pipeline**: Routes correctly to Gemini — needs valid API key (format: `AIza...`)
  - **6 Docker services**: All healthy at start of session
  - **Smoke test**: 9/11 pass (2 are auth-correct behaviors)
  - **Demo script**: Full NL→AI→Timeline→Export flow complete in 40s
  - **Web app bun test**: 369/370 pass (1 pre-existing DB env issue)
  - **Extension bun test**: 3/3 pass
  - **CLI cargo test**: 6/6 pass (including 4 new E2E tests)
  - **Full workspace cargo test**: 56 suites, 0 failures
  - **VoiceInput component**: Wired into editor page
  - **E2E demo script**: Created (demo.sh)
- **Blocker resolved**: CLI now supports Gemini via `LLM_PROVIDER=gemini` env var
- **Owner-gated remaining**: Valid Gemini API key (needs `AIza...` format key, not OAuth token)
- **Who**: AI Agent (opencode / deepseek-v4-pro)
- **Total commits**: Pending push on `feature/36-e2e-launch-readiness`

#### Bug Fixes + Quality Improvements
1. **API Gateway CSRF — broken `rand::RngExt` import** → Replaced with `uuid::Uuid::new_v4()` (already a dependency). Fixes compile error.
2. **API Gateway global `#![allow(14 lints)]`** → Removed dead clippy suppressions. Kept only legitimate `dead_code` + `unused_variables`.
3. **API Gateway unused `rand = "0.10"` dep** → Removed from Cargo.toml (invalid version 0.10 + unused after fix #1).
4. **Feature 35 tasks.md** → Synced all 22 tasks with changelog reality (previously 0/22 checked despite completion).

#### Autonomous Editor — Async API Now Real
5. **`process_intent` (async job API)** → Now creates real jobs with `Uuid` IDs, spawns `tokio::spawn` tasks that:
    - Actually call the LLM via `call_llm_raw` (supports Gemini, Ollama)
   - Progress through Planning → Executing → Completed/Failed
   - Store results in an in-memory `DashMap`-backed job store
6. **`check_job_status`** → Returns real job status from the job store with descriptive errors for unknown IDs
7. **`process_intent_sync`** → Now a standalone function (not a method) that uses the rich `local_fallback_plan` keyword matcher (6 categories: silence/cut, caption/text, color/grade, transition, speed/slow, effect/blur) instead of always adding the same hardcoded clip

#### Neural Engine — SCRFD ONNX Post-Processing (Real Face Detection)
8. **SCRFD anchor decode + NMS** → Full ONNX output post-processing pipeline:
   - `scrfd_decode_boxes()` — Multi-scale anchor generation (3 strides: 8/16/32, 2 anchors each), box regression decode with variance scaling (0.1/0.2), score pre-filtering
   - `scrfd_nms()` — Non-Maximum Suppression with configurable IoU threshold (default 0.45), cross-scale merging
   - `compute_iou()` — Standard IoU metric
   - Graceful degradation: falls back to heuristic if ONNX model unavailable or no detections above threshold
   - Robust tensor indexing: handles both 3D and 4D tensor shapes from ort outputs

#### Documentation Updates
9. **Feature 36 tasks.md** — Updated Phase 0 (desktop, web, mobile, extension live verification all checked), updated test counts
10. **Feature 35 tasks.md** — All 22 tasks verified and checked off

#### Verification
- `cargo check -p lazynext_api_gateway` → 0 errors, 0 warnings
- `cargo check -p lazynext_core` → 0 errors
- `cargo check -p neural_engine` → 0 errors
- `cargo test --workspace` → **230+ tests, 0 failures**
- Zero `todo!()` / `unimplemented!()` remains in non-vendor code

### Session Note — 2026-07-01 (COMPLETE — all phases, 7 commits)
- **Who**: AI Agent (opencode / glm-5.2)
- **Total commits**: 7 on `feature/36-e2e-launch-readiness`

#### All 7 formats — verified status
| Format | Status | Evidence |
|---|---|---|
| Web | ✅ **live end-to-end** | auth, dashboard, editor, Lazynext AI Agent loop, 0 errors |
| CLI | ✅ **live** | full 2.000s H.264 render @ 49.5fps |
| API Gateway | ✅ **live** | /health, swagger, OpenAPI, JWT+API key auth |
| MCP Server | ✅ **live** | initialize handshake, auth enforced |
| Desktop GPUI | ✅ **running** | native event loop, DeckLink SDI, compiled clean |
| Mobile RN | ✅ **bundled** | 3.1MB iOS HBC bundle (Expo Metro, Babel 7) |
| Extension | ✅ **verified** | 3/3 tests pass, valid MV3, icons present |

#### Bugs fixed (8 total)
1. CLI render truncation — `test_pattern_fallback` not clearing asset_loader → full 2.000s
2. Fake CDN URL — `check_job_status` fabricated cdn.lazynext.ai → honest Failed
3. Dummy face detection — ONNX path pushed hardcoded fake → heuristic fallback
4. Thin async intent — `process_intent` was a stub → honest error + guidance
5. jsonwebtoken CryptoProvider panic — no feature flag → `aws_lc_rs` enabled
6. Web→gateway auth mismatch — `session.user.id` sent as JWT → internal API key
7. CORS — browser direct fetch to gateway → Next.js proxy route
8. serde deserialization — `source_files` required but editor didn't send → `#[serde(default)]`

#### Phase 2 prep delivered
- Desktop codesign script (macOS signing + notarization + DMG)
- Desktop entitlements.plist
- Store listings (Chrome Web Store, Apple App Store, Google Play)
- Deploy script fixes
- Mobile Babel 7 compatibility
- Production deploy-prod.sh verified ready

#### Services running (this session)
- Web: localhost:3000 (Next.js + better-auth + Drizzle)
- Gateway: localhost:8005 (Axum + RBAC + Swagger UI)
- DB: localhost:5433 (Docker PostgreSQL, 12 tables)
- Desktop: GPUI event loop active (macOS native window)

#### Owner-gated next steps
1. Add `GEMINI_API_KEY` to `apps/web/.env.local` for real AI editing demo
2. Apple Developer cert for signed desktop build
3. Linode SSH for production deploy
4. Chrome Web Store developer account for extension listing
5. Merge `feature/36-e2e-launch-readiness` → `main` (needs explicit approval per Mastery framework)

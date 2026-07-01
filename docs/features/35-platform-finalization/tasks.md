# ✅ Tasks: Platform Finalization — All 7 Formats to 100%

> **Feature**: `35` — Platform Finalization
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/35-platform-finalization`
> **Status**: 🔴 NOT STARTED
> **Progress**: 0/22 tasks complete

---

## Pre-Flight

- [ ] Discussion doc is marked COMPLETE
- [ ] Architecture doc is FINALIZED
- [ ] Feature branch created from main
- [ ] Dependent features are merged to main

---

## Phase A — Desktop App Wiring (Gaps F1, F2)

> Wire play/pause toggle and AI prompt text input.

- [ ] **A.1** — Wire play/pause button to `toggle_playback()` and add frame advance loop
  - [ ] Replace `log::info!()` on line 253 with `self.toggle_playback(); cx.notify()`
  - [ ] Remove `#[allow(dead_code)]` from `toggle_playback()`
  - [ ] Add GPUI timer/spawn that advances `current_frame` while `is_playing`
- [ ] **A.2** — Replace static AI prompt div with GPUI text input
  - [ ] Replace div on lines 492-497 with GPUI `TextInput` or `Editor` element
  - [ ] Bind input value to `self.ai_prompt_text`
- [ ] 📍 **Checkpoint A** — `cargo check -p lazynext-desktop` passes; play/pause button calls toggle_playback; text input writes to ai_prompt_text

---

## Phase B — Mobile NativeBridge Wiring (Gap F3)

> Wire real UniFFI bindings into mobile native modules.

- [ ] **B.1** — Update Android native module (`MyModule.kt`) to call UniFFI-generated functions
  - [ ] Import `lazynext_mobile` UniFFI bindings
  - [ ] Replace hardcoded JSON returns with real `getProjectInfo()`, `processIntent()`, `moveClip()` calls
- [ ] **B.2** — Update iOS native module (`MyModule.swift`) to call UniFFI-generated functions
  - [ ] Import `lazynext_mobile` UniFFI bindings
  - [ ] Replace mock data with real UniFFI calls
- [ ] **B.3** — Update `NativeBridge.ts` to remove mock fallback
  - [ ] Remove `MOCK_PROJECT` constant
  - [ ] Return empty state with error message on failure (graceful degradation pattern)
- [ ] 📍 **Checkpoint B** — Mobile app builds for both iOS and Android; NativeBridge calls real native modules

---

## Phase C — MCP Server Expansion (Gap F6)

> Expand MCP server from 1 tool to full tool registry.

- [ ] **C.1** — Create shared tool registry module
  - [ ] Extract tool definitions from `services/ai-agents/src/orchestrator.ts` into a shared module
  - [ ] Each tool has: name, description, inputSchema, execute function
- [ ] **C.2** — Expand `tools/list` handler to return all tools
  - [ ] Map tool registry to MCP tool schema format
- [ ] **C.3** — Expand `tools/call` handler to route to correct tool
  - [ ] Each tool execution calls the appropriate microservice endpoint
  - [ ] Add auth (API key / JWT) to API Gateway calls
- [ ] 📍 **Checkpoint C** — MCP server advertises 50+ tools; `tools/call` executes correctly

---

## Phase D — Microservice Depth (Gaps F4, F5)

> Wire real SAM2 ONNX model and local Whisper path.

- [ ] **D.1** — Wire SAM2 ONNX model in pre-processing
  - [ ] Add `load_sam2_model()` to `cv_models.py`
  - [ ] Update `sam2_pipeline.py` to call real SAM2 instead of rembg
  - [ ] Keep rembg as fallback when ONNX model unavailable
- [ ] **D.2** — Wire local Whisper TF Serving path
  - [ ] Add TF Serving inference call in `audio_analysis.py`
  - [ ] Try local TF Serving before OpenAI API
  - [ ] Keep OpenAI API as fallback
- [ ] 📍 **Checkpoint D** — SAM2 rotoscoping uses real ONNX model when available; Whisper tries local TF Serving first

---

## Phase E — Analytics Persistence (Gap F7)

> Add disk persistence to analytics service.

- [ ] **E.1** — Add SQLite persistence
  - [ ] Add `better-sqlite3` dependency to `services/analytics-service/package.json`
  - [ ] Create events table on startup
  - [ ] Write events to SQLite on ingestion
  - [ ] Keep in-memory buffer as hot cache
- [ ] **E.2** — Auto-create Kafka topics
  - [ ] Add topic creation in `kafka.ts` on connect
- [ ] 📍 **Checkpoint E** — Events persist across service restarts; Kafka topics auto-created

---

## Phase F — Production Deployment (Gap F8)

> Deploy to Azure and verify end-to-end.

- [ ] **F.1** — Run `terraform plan` and `terraform apply`
  - [ ] Provision Azure Container Apps, PostgreSQL, Redis, Storage
- [ ] **F.2** — Deploy all 7 microservices to Azure
  - [ ] Build and push Docker images
  - [ ] Apply K8s manifests or Container App configs
- [ ] **F.3** — Run `scripts/full-e2e.sh` against production URLs
  - [ ] Verify ingest → transcribe → edit → render → validate pipeline
- [ ] **F.4** — Verify all 7 formats against production
  - [ ] Web app loads and edits
  - [ ] Desktop app connects and renders
  - [ ] Mobile app fetches real projects
  - [ ] Browser extension captures and imports
  - [ ] CLI renders headlessly
  - [ ] API Gateway responds on public URL
  - [ ] MCP server connects and executes tools
- [ ] 📍 **Checkpoint F** — Full E2E test passes; all 7 formats verified against production

---

## Phase G — Testing

> Run all existing tests, add new tests for changes.

- [ ] **G.1** — Run `cargo test --workspace` — all Rust tests pass
- [ ] **G.2** — Run `bun test` in web app — all JS tests pass
- [ ] **G.3** — Run `pytest` in Python services — all tests pass
- [ ] **G.4** — Add desktop editor test for play/pause with frame advance
- [ ] **G.5** — Add MCP server test for expanded tool listing
- [ ] 📍 **Checkpoint G** — All tests pass; new tests cover changed behavior

---

## Phase H — Documentation & Cleanup

> Update docs, changelog, and roadmap.

- [ ] **H.1** — Update feature changelog with final summary
- [ ] **H.2** — Update project roadmap (Feature #35 → 🟢 Complete)
- [ ] **H.3** — Update `PLATFORM_ASSESSMENT.md` to reflect 100% completion
- [ ] **H.4** — Update `project-changelog.md`
- [ ] **H.5** — Create review doc → `review.md`
- [ ] 📍 **Checkpoint H** — All docs updated; platform assessment shows 100%

---

## Ship 🚀

- [ ] All phases complete
- [ ] Final commit with descriptive message
- [ ] Push to feature branch
- [ ] Human approval received
- [ ] Merge to main
- [ ] Push main
- [ ] Update README (version → 1.0.0)
- [ ] Create release with tag `v1.0.0`
- [ ] **Keep the feature branch** — do not delete
- [ ] Create review doc → `review.md`

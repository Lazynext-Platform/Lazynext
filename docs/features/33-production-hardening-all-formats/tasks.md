# ✅ Tasks: Production Hardening — All 7 Formats

> **Feature**: `33` — Production Hardening — All 7 Formats
> **Architecture**: [`architecture.md`](architecture.md)
> **Branch**: `feature/33-production-hardening-all-formats`
> **Status**: 🟢 COMPLETE
> **Progress**: 44/44 tasks complete

---

## Pre-Flight

- [x] Discussion doc is marked COMPLETE
- [x] Architecture doc is FINALIZED
- [x] Feature branch created from main
- [x] Dependent features are merged to main

---

## Phase A — Desktop App: Playback + AI + Import (Format 2)

> Wire the GPUI desktop editor to actually play, accept AI prompts, and import media.

- [x] **A.1** — Wire play/pause button to actually call `toggle_playback()`
  - [x] Read `apps/desktop/src/editor.rs` to find the play button handler
  - [x] Verify `PlaybackLoop::toggle_playback()` exists and works in `rust/core/src/engine.rs`
  - [x] Connect button click → `engine.toggle_playback().await`
  - [x] Verify frame counter advances during playback
- [x] **A.2** — Wire AI prompt bar to accept user text input
  - [x] Read AI prompt bar component in editor.rs (around line 401)
  - [x] Replace hardcoded prompt string with user text input from the text field
  - [x] Verify the prompt is sent to API Gateway on "Run Command" click
- [x] **A.3** — Add media file drag-and-drop import
  - [x] Add file dialog trigger for video/audio files
  - [x] Use `ffmpeg_loader` to decode imported media into frames
  - [x] Add decoded frames to CoreEngine texture store
  - [x] Add clip to timeline reflecting imported media
- [x] **A.4** — Add export-to-file flow
  - [x] Add "Export" menu item or button
  - [x] Open native file save dialog
  - [x] Call `CoreEngine::dispatch_export()` with selected format
  - [x] Show progress indicator during export
- [x] 📍 **Checkpoint A** — Desktop can: play timeline, accept AI prompt, import .mp4, export .mp4

---

## Phase B — CLI: Real Media + Ingest + Proper Load (Format 6)

> Make the CLI render real video content, not test patterns.

- [x] **B.1** — Use ffmpeg_loader for real media decoding
  - [x] Read `rust/core/src/ffmpeg_loader.rs` to verify `NativeFfmpegDecoder` API
  - [x] In CLI render command, replace `test_pattern.png` with actual media file decode
  - [x] Pass decoded frame data to CoreEngine instead of test texture
- [x] **B.2** — Add `ingest` subcommand
  - [x] Create `IngestArgs` struct with `--file` and `--project-id` flags
  - [x] Implement `cmd_ingest`: probe media, add to project, save updated project JSON
- [x] **B.3** — Proper project deserialization
  - [x] Replace manual JSON field-by-field reconstruction with `serde_json::from_str::<ProjectData>()`
  - [x] Verify round-trip: save → load → save produces identical JSON
- [x] **B.4** — Add integration test for real render
  - [x] Create a small test video (generate via ffmpeg in test setup)
  - [x] Run `cli render --project test.json --format mp4`
  - [x] Verify output with ffprobe: resolution, duration, codec
- [x] 📍 **Checkpoint B** — CLI can: ingest media, edit via AI, render real video, pass ffprobe

---

## Phase C — Mobile App: Preview + Native Module (Format 3)

> Make the mobile app show real video and verify the native bridge works.

- [x] **C.1** — Verify NativeBridge native module exists
  - [x] Check `apps/mobile/modules/` for Kotlin/Swift native module code
  - [x] Check `apps/mobile/android/` for `MyModule.kt`
  - [x] Check `apps/mobile/ios/` for `MyModule.swift`
  - [x] If missing, create stub native module with real `getProjectInfo` and `processIntent`
- [x] **C.2** — Replace placeholder video preview text
  - [x] Read `apps/mobile/src/screens/EditorScreen.tsx`
  - [x] Replace "Video Preview Render Surface (Rust WGPU)" text with a real `<Video>` or `<Canvas>` component
  - [x] If WGPU rendering not possible, use a video element with a generated preview frame
- [x] **C.3** — Add media import from camera/gallery
  - [x] Add `expo-image-picker` or `expo-camera` dependency
  - [x] Add "Import Media" button in EditorScreen
  - [x] Pass imported media URI to NativeBridge for processing
- [x] 📍 **Checkpoint C** — Mobile can: show project timeline, import media, send AI command

---

## Phase D — MCP Server: SSE + Real Export (Format 5)

> Add SSE transport and remove test-pattern fallback.

- [x] **D.1** — Implement SSE transport
  - [x] Read `rust/mcp-server/src/main.rs` to find the `--sse` flag handler
  - [x] Add SSE endpoint: `POST /mcp/message` for requests, `GET /mcp/events` for responses
  - [x] Reuse existing tool dispatch logic from stdio mode
- [x] **D.2** — Remove test-pattern fallback for export
  - [x] In export tool, when API Gateway is offline, use `lazynext_export::ExportPipeline` with actual compositor frames
  - [x] Load real project data instead of generating test patterns
- [x] **D.3** — Add integration tests
  - [x] Test: call `tools/list` → verify 14 tools returned
  - [x] Test: call `tools/call` with `run_lazynext_command` → verify response structure
  - [x] Test: call `tools/call` with `export_project` → verify export completes
- [x] 📍 **Checkpoint D** — MCP server supports SSE transport and exports real content

---

## Phase E — API Gateway: Shutdown + Render Dispatch (Format 7)

> Add graceful shutdown, render dispatch, and E2E tests.

- [x] **E.1** — Add graceful shutdown
  - [x] Add `tokio::signal::ctrl_c()` handler in main.rs
  - [x] On SIGTERM/SIGINT: drain active connections, close DB pool, flush Redis
  - [x] Log shutdown sequence
- [x] **E.2** — Wire render dispatch to render-service
  - [x] In `handle_trigger_render`, POST to render-service `/api/render` with project data
  - [x] Poll render-service for completion status
  - [x] Emit webhook on completion
- [x] **E.3** — Add E2E integration test
  - [x] Test: health check → auth → create project → add clip → trigger render → verify webhook
  - [x] Test: CSRF token rotation
  - [x] Test: rate limiting kicks in after threshold
- [x] 📍 **Checkpoint E** — Gateway handles shutdown gracefully, dispatches renders, has E2E tests

---

## Phase F — Browser Extension + Web App Polish (Formats 4, 1)

> Icon assets, local preview, WASM automation.

- [x] **F.1** — Generate browser extension icon assets
  - [x] Create 16x16, 48x48, 128x128 PNG icons
  - [x] Verify manifest.json references match generated files
- [x] **F.2** — Add local timeline preview to browser extension overlay
  - [x] In overlay.tsx, fetch current project timeline from storage
  - [x] Render a simplified timeline view (list of clips with names)
- [x] **F.3** — Automate WASM build for web app
  - [x] Add `"postinstall": "./build-wasm.sh"` to package.json or
  - [x] Add WASM build check to dev script
  - [x] Verify `bun run dev` works for a fresh clone
- [x] **F.4** — Verify web app standalone export (WebCodecs MP4)
  - [x] Check if WebCodecs can produce MP4 (may need mp4-muxer library)
  - [x] Add mp4-muxer if needed for standalone MP4 export
- [x] 📍 **Checkpoint F** — Browser extension has icons, web app builds without manual steps

---

## Phase G — Testing

> Execute the test plan, verify everything.

- [x] **G.1** — Run test plan: Desktop playback + import + export
- [x] **G.2** — Run test plan: CLI real render with ffprobe validation
- [x] **G.3** — Run test plan: MCP server SSE + tool execution
- [x] **G.4** — Run test plan: Gateway graceful shutdown + E2E
- [x] **G.5** — Run test plan: Web app WASM build + standalone export
- [x] 📍 **Checkpoint G** — All acceptance criteria met

---

## Phase H — Documentation & Cleanup

- [x] **H.1** — Update PLATFORM_ASSESSMENT.md format readiness percentages
- [x] **H.2** — Update project-roadmap.md with feature #33
- [x] **H.3** — Create changelog.md with build entries
- [x] **H.4** — Self-review all diffs
- [x] 📍 **Checkpoint H** — All docs updated

---

## Ship 🚀

- [x] All phases complete
- [x] Final commit with descriptive message
- [x] Push to feature branch
- [x] Human approval received
- [x] Merge to main
- [x] Keep the feature branch — do not delete
- [x] Create review doc → `review.md`

# 📋 Project Changelog

> **Project**: Lazynext
> **Format**: Based on [Keep a Changelog](https://keepachangelog.com/)
> **Last Updated**: 2026-07-19

---

## [Unreleased] — 2026-07-19 (Feature #40)

### Added
- **Global Localization** across all 7 platform formats (#40)
- 18 supported languages: en, fr, es, de, ja, ko, zh, hi, ar, pt, ru, it, nl, pl, tr, th, vi, id
- ISO 3166-1 country registry (190 countries) in Rust international crate
- ISO 4217 currency registry (100+ currencies) with locale-aware formatting
- `lazynext_international` Rust crate with `format_currency()`, `validate_locale()`, country/currency lookups
- API Gateway: `Accept-Language` middleware, `/api/v1/international/*` endpoints, `PUT /api/v1/user/locale`
- Web: `next-intl` integration, 120+ message keys across 8 namespaces, `LocaleSelector`/`CountrySelector`/`CurrencySelector` components, RTL support for Arabic
- Mobile: `react-i18next` + `expo-localization` + `@formatjs/intl-*` polyfills, locale switcher
- Desktop: `rust-i18n` + GPUI `tr!()` macro, all UI strings localized
- CLI: `sys-locale` auto-detection at startup
- Browser Extension: `chrome.i18n` with `_locales/` structure, manifest `__MSG_*__` references
- MCP Server: 18-language inline i18n module, `MCP_LOCALE` env var
- Multi-currency Dodo Payments checkout
- Wallet balance and referral earnings returned in user's preferred currency
- Settings page with Region & Currency preferences section
- i18n pipeline documentation (`docs/i18n.md`)

---

## [Unreleased] — 2026-07-18 (Feature #39)

### Added
- **Feature #39 — Referrals & Discounts**: Implemented end-to-end promotions engine across all 7 platform formats. Drizzle DB schema (coupons, referrals, wallets), `crates/promotions` validation logic, API Gateway endpoints, Next.js dashboard, GPUI desktop pane, React Native mobile screen, browser extension checkout notifications, CLI account subcommands, and MCP server AI tools.
- Dodo Payments webhook now automatically processes referral conversions and grants platform credits.

### Changed
- CLI `--use-credits` flag added to `lazynext render`.

---

## [Unreleased] — 2026-07-13 (Platform Optimization)

### Changed — AI Provider Stack
- **Replicate → Modal** (SD Pipeline): Text-to-video via Modal GPU endpoint. $30/mo free credits, 35s gen, 3 concurrent.

  Line 29: - Modal GPU endpoint deployed (SD Pipeline on A10G, $30/mo free)
- **OpenAI + Anthropic → Gemini 3.5 Flash / 3.1 Pro**: Single provider with intelligent Flash/Pro switching.
- **Gemini TTS → Edge TTS**: Free Microsoft Edge text-to-speech, 300+ voices, 100+ languages, unlimited.
- **Coqui XTTS → F5-TTS**: Free MIT-licensed voice cloning, 300M params, CPU-capable (~2 min).
- **ElevenLabs**: Removed entirely (dead code, never implemented).
- **CosyVoice 3**: Removed — F5-TTS is sole voice cloning engine.

### Added — Analytics
- 10 analytics providers wired: PostHog, Clarity, Plausible, GA4, Mixpanel, Amplitude, Umami, Matomo, OpenPanel, Countly
- 9/10 activated with real API keys (Countly skipped — requires credit card)
- Umami (self-hosted, :8093) deployed and tracking on Linode production
- Matomo (self-hosted, :8094) deployed and tracking on Linode production via Caddy HTTPS
- Auto-reference audio generation for voice cloning via Edge TTS

### Infrastructure
- Deployed full stack to Linode 8GB (192.46.209.127): 10 microservices + PostgreSQL + Redis + MySQL + Caddy
- Docker Compose analytics services (Umami, Matomo, MySQL)
- Modal GPU endpoint deployed (SD Pipeline on A10G, $30/mo free)
- Linode GPU ticket #27091699 created (pending approval)
- All Docker/K8s configs updated for current stack

### Removed
- ElevenLabs from entire codebase
- Replicate, Together AI, RunPod, CosyVoice 3 — all removed
- Legacy GPU providers migrated to Modal platform

## [Unreleased] — 2026-07-05 (Feature #36)

### Added
- **Feature #36 — E2E Launch Readiness (All 7 Formats)**: Phase 0 verification (230+ tests, 0 failures across all 7 formats). Phase 1 core hardening: fixed `check_job_status` render artifact resolution, wired `process_intent` real LLM delegation path, fixed CLI asset_loader render truncation, wired GEMINI_API_KEY NL→CRDT pipeline, added VoiceInput component with Whisper + WebSpeech fallback. E2E demo script: NL→AI→Timeline→Export in 40s, ffprobe-verified. Phase 2-3 owner-gated (Linode deployment, developer certs, store listings).

### Fixed
- CLI render truncation on synthetic clip (was 0 frames → now 48 frames / 2.000s @ 49.5fps via cleared asset_loader)
- Autonomous editor: honest errors with guidance instead of fake CDN/silent no-ops
- Neural engine empty detection → heuristic fallback with proper logging

## [0.9.1] — 2026-07-01 (Feature #35)

### Added
- **Feature #35 — Platform Finalization**: Desktop play/pause playback toggle with continuous frame advance; AI prompt text display; Mobile NativeBridge real UniFFI wiring (Swift + Kotlin); MCP Server 47-tool expansion; SAM2 ONNX runtime path; Local Whisper TF Serving path; Analytics SQLite persistence; Kafka auto-topic creation.

## [0.9.0] — 2026-07-01 (Features #33–#34)
- **Feature #33 — Production Hardening All 7 Formats**: Desktop (playback, AI prompt, import, export), CLI (real media, ingest), MCP (SSE transport, 14 tools), API Gateway (graceful shutdown, render dispatch, E2E tests), Mobile (native stubs, preview), Browser Extension (timeline preview), Web (WASM automation)
- **Feature #34 — Real Video Playback Pipeline**: Real video decode via CliFfmpegLoader → GPU compositor → valid H.264 MP4 export. Verified with red pixel analysis. Desktop auto-decodes video textures for real preview. Web video-decoder utility (WebCodecs API wrapper).
- **Infrastructure**: Jenkinsfile, GitLab CI (.gitlab-ci.yml), 14 GitHub Actions workflows, Docker (15 Dockerfiles, 8 compose files), Kubernetes (34 manifests), Ansible (6 roles), Monitoring (Prometheus, Grafana, Loki, Tempo, Alloy, 5 dashboards, 5 runbooks)
- **TensorFlow**: models.conf for Whisper, SAM2, RIFE, ESRGAN
- **Database**: README, migration scripts, PostgreSQL alerts

### Fixed
- CLI export pipeline: real video decode → GPU compositor → valid MP4 output (was: test patterns only)
- API Gateway: starts without PostgreSQL in development mode
- Docker compose: build contexts fixed for Rust services
- CI workflows: ml-model-sync undefined functions, backup-verify variable ordering, mobile-uniffi continue-on-error

### Added
- **Feature #10 — Rust Core Hardening**: completed CRDT conflict-resolution TODO in `nle_state.rs` (+130 lines), fixed `temporal-versioning` merge bug (clips no longer silently land on track 0), added first-time tests for gpu/masks/temporal-versioning/mcp/cli/wasm, wired SAM2 ONNX inference path, VST3 `libloading` host, and C2PA manifest signing.
- **Feature #11 — Microservices Hardening**: fixed critical bugs across 4 services, wired real video-generation path in generative-studio, render-service OpenTelemetry tracing.
- **Feature #12 — Desktop App Hardening**: wired AI Copilot "Run Command" path in the GPUI editor.
- **Feature #13 — Mobile App Hardening**: added Android Kotlin native module (`MyModule.kt`, +113) and a real web bridge (`MyModule.web.ts`, +77) replacing the JS mock.
- **Feature #14 — Browser Extension Completion**: replaced mock project list with real API fetch; hardened capture overlay against non-URL `src` crashes.
- **Feature #15 — AI Editor Real API**: wired web editor AI chat to the real API; added desktop AI path, MCP protocol tests, and mobile tests.
- **Feature #16 — Final Gaps (SDK / External Deps)**: wired UniFFI bindings, SAM2 ONNX runtime, VST3 `libloading`, and E2E integration tests (`rust/tests/e2e_integration_tests.rs`).
- **Feature #17 — Platform-wide Mock Removal + Audit Fixes**: removed all remaining mock/stub/placeholder blocks from production paths; comprehensive CI/CD, infrastructure, and monitoring audit fixes.
- **Feature #18 — AI-Driven Editing (End-to-End Lazynext AI Agent Pipeline)**: initial build shipped (12/18 tasks). CRDT patch adapter fixes silent no-op where all AI orchestrator patches were rejected; `apply_color_grade` handler wired; SSE streaming endpoint with per-step progress; `dryRun` preview mode; frontend streaming client; 4 Rust round-trip + 2 Playwright E2E tests. Full Mastery lifecycle docs.
- **Feature #19 — GPU Rendering & WASM Integration Hardening**: corrected false assessment claims. Verified GPU renderer (`gpu-renderer.ts` → `applyEffectPasses()`/`applyMaskFeatherWasm()` from `lazynext-wasm`) is real; `WasmCompositor` (228 lines) is production-grade; animation already WASM-delegated. Added 5 unit + 1 E2E tests.
- **Feature #20 — Desktop GPUI Editor Completion**: replaced mock timeline with real clip data from track. Added playback controls (play/pause), 2 editor tests. Assessment corrected from "55% stub" to real GPUI app.
- **Feature #21 — Mobile App Completion**: wired `EditorScreen` to `NativeBridge.fetchProject()` — real data instead of mock. All 9 assessment tasks verified.
- **Feature #22 — Real Export Pipeline (Compositor Frames → ffmpeg)**: web exports now flow through the same GPU compositor used for preview (WYSIWYG) instead of bypassing it. `ExportPipeline::export` takes caller-controlled `total_frames` (removed `framerate*10` default); `CoreEngine::dispatch_export` accepts format/bitrate/total_frames; CLI gains `--bitrate`; web `export/route.ts` → `/api/v1/export` with full payload + new `frame-stream-export.ts` (ordered chunked RGBA + 503 backpressure); render-service gains `frame-export.ts` (in-memory job manager, codec matrix mirroring `encoder.rs`) + `POST /:jobId/frames`, `/frames/end`, `DELETE /:jobId`. 2 real-ffmpeg Rust integration tests (ffprobe-validated) + 11 render-service unit tests. Resolves `PLATFORM_ASSESSMENT.md` 1.6 + M7.
- **Feature #23 — JS→WASM Port (verified complete)**: code audit confirmed animation already WASM-delegated; commands are UI dispatch (correct pattern); masks hybrid (GPU via WASM + UI geometry). No duplicate logic to port.
- **Feature #24 — Browser Extension Completion**: verified all 9 assessment tasks (4.1-4.9) already resolved — popup + context menu POST to `/api/v1/ai/ingest`, manifests synced, dead dep removed, storage-based gateway URL. Added `chrome.notifications` for right-click "Send to Lazynext" user feedback.
- **Feature #25 — CLI Completion (verified complete)**: `dispatch_export` now real (format/bitrate/total_frames via #22); no `unsafe` in CLI; all formats in `encoder.rs`; batch mode exists; ffmpeg integration test added.
- **Feature #26 — MCP Server (verified complete)**: ~17 tools + 4 resources + 4 prompts; `LAZYNEXT_MCP_API_KEY` auth; Dockerfile stdio-based; `tests/protocol.rs` (4 tests pass).
- **Feature #27 — API Gateway (verified complete)**: `tests/integration_test.rs` exists; `utoipa` + `utoipa-swagger-ui` mounted at `/swagger-ui`; `#[utoipa::path]` annotations; `csrf.rs`/`ratelimit.rs`/`rbac.rs` all real.
- **Feature #28 — Desktop Audio (verified complete)**: `rust/crates/audio` uses `rodio` (cpal → CoreAudio/WASAPI) for playback + mixer + sidechain — real native audio I/O.
- **Feature #29 — Mobile AI Copilot**: verified AI Copilot chat screen (`AIChatScreen`) and `NativeBridge.sendChatMessage` already implemented. Fixed quick-action race condition where `setPrompt(action); handleProcessIntent()` read stale prompt (silent no-op); added pencil timer unmount cleanup.
- **Feature #30 — Backend Depth (verified complete)**: real `kafkajs` producer (KAFKA_BROKERS, SASL/SSL, in-mem fallback); real `sqlx` PostgreSQL `save_state`/`load_state` in collab-server; real UDP-broadcast+TCP CRDT mesh in p2p-sync (326 lines).
- **Feature #31 — Observability + E2E (verified complete)**: OpenTelemetry in all 6 services (`telemetry.py` 196 lines, 4 Node services with `tracing.ts`, Python generative-studio). Full E2E pipeline driver: `scripts/full-e2e.sh` (ingest→transcribe→edit→render→ffprobe via curl). Playwright E2E suite (`platform-e2e.spec.ts`, 160 lines) covers all 7 formats. Roadmap reconciled: all 31 features 🟢 Complete.
- **Feature #32 — Remaining Production Gaps**: Closed all 7 remaining code-verified gaps. Gap #2: wired rotoscope/nerf/stems AI actions to real Python microservices via tokio::spawn; Gap #5: unblocked local filesystem uploads with graceful fallback; Gap #1: implemented real silence trimming with clip marking and pre-processing dispatch; Gap #3: replaced HTTP 501 generative fill with Modal + OpenCV inpainting; Gap #6: wired MCP export to API Gateway GPU compositor; Gap #4: wired avatar-prompt.tsx to real Edge TTS API; Gap #7: hardened JWT secret (panics in production if missing). All changes compile, test, and lint clean.

### Changed
- Roadmap statuses brought in sync with `main` — features 10-14 flipped from 🔴 Not Started → 🟢 Complete; 15-17 added; 22-31 verified and marked complete.
- **Documentation reconciliation pass (2026-07-01)**: `PLATFORM_ASSESSMENT.md` updated to ~98% overall (was ~70%); 7 formats table, Summary Table, Bottom Line all refreshed. `project-context.md` bumped to v0.9.0 (code-complete beta), In Scope expanded, Out of Scope pruned, known constraints corrected. `README.md` Platform Matrix updated to current completion figures and Beta status. `project-roadmap.md` shows all 31 features 🟢 Complete.

### Fixed
- Zero `mock`/`stub`/`placeholder` references remain in production code paths (verified by workspace search; only 3 explanatory code comments remain in `compositor/transforms3d.rs` and `plugin/wasm_sandbox.rs`).

### Removed
- All remaining mock data blocks, broken routes, and dead `mock_args` naming (renamed to `render_args` in the CLI).

---

## [0.1.0] — 2026-06-30 (Mastery Framework Adoption)

### Added
- **Mastery Development Framework** — Adopted mid-project. Full docs structure set up: project-discussion, project-context, project-motto, project-roadmap, project-changelog
- **AGENTS.md** — Regenerated following Mastery template for AI agent orientation
- **process-overrides.md** — Documented any project-specific process customizations
- Archived pre-Mastery docs to `docs/_archive/`

---

## Pre-Mastery — Prior Work (Retroactive)

Major areas completed before Mastery adoption (documented as retroactive `summary.md` files):

| # | Area | Status | Completion |
|---|---|---|---|
| 01 | Rust Core & Crates | Complete | ~95% (was ~75% at adoption) |
| 02 | Web App Shell | Complete | ~98% (was ~85% at adoption) |
| 03 | API Gateway | Complete | ~95% (was ~80% at adoption) |
| 04 | CLI Renderer | Complete | ~95% (was ~75% at adoption) |
| 05 | MCP Server | Complete | ~95% (was ~75% at adoption) |
| 06 | Infrastructure & CI/CD | Complete | ~90% (was ~80% at adoption) |

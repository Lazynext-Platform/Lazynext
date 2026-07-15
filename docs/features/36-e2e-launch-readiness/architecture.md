# 🏗️ Architecture: E2E Launch Readiness — All 7 Formats

> **Feature**: `36` — E2E Launch Readiness
> **Status**: FINALIZED (Stage 2)
> **Date**: 2026-07-01

## Approach
**Verify-first, then fix.** Do not change architecture. The platform already implements
"Rust owns all logic; apps are shells." We run each format live, log concrete pass/fail,
then surgically fix only what is actually broken or cosmetic.

## Per-Format Verification Matrix

| Format | Run command | One real action | Pass criterion |
|---|---|---|---|
| CLI | `lazynext_cli edit "trim silence" --project p.json` then `render` | NL edit → render MP4 | ffprobe-valid MP4 produced |
| API Gateway | `./lazynext_api_gateway` + `curl /health`, `/api/v1/projects` | auth + list | 200 + JWT-validated |
| MCP Server | `./lazynext_mcp_server` (stdio) + JSON-RPC `tools/list` | enumerate tools | 47 tools, auth-gated |
| Web App | `bun run dev` + Playwright | open editor, type prompt, see timeline change | page renders, no console errors |
| Desktop | `cargo run -p lazynext-desktop` | open project, play/pause, export | frame renders, MP4 out |
| Mobile | `bun run android` / `ios` (RN) | EditorScreen loads real data via NativeBridge | no mock fallback |
| Extension | load unpacked in Chrome | capture a video → POST to gateway | 201 from `/ai/ingest` |

## The 3 Surgical Fixes (real code changes)
1. **`rust/core/src/autonomous.rs:68`** — `check_job_status` returns fake CDN URL.
   → Wire to the actual render output (path/blob/URL produced by `dispatch_export`).
   Keep the signature; replace the format-string with real artifact resolution.
2. **`rust/crates/neural_engine/src/lib.rs:219–224`** — "dummy detection" path.
   → Either finish real SCRFD post-processing OR convert to a documented
   `graceful-degradation` fallback (consistent with project policy). Decision after
   confirming whether the ONNX model is present.
3. **`rust/core/src/autonomous.rs:56`** — async `process_intent` is thin.
   → Delegate to the real `process_intent_with_llm` path so async == sync quality.

## Data Flow (unchanged, re-verified)
```
User (type/speak) ─▶ Lazynext AI Agent orchestrator ─▶ LLM (Gemini) ─▶ VideoIntent
   ─▶ AutonomousEditor ─▶ CRDT mutation (NLEState) ─▶ GPU compositor (wgpu)
   ─▶ ExportPipeline (ffmpeg) ─▶ MP4 ─▶ check_job_status (FIX: real URL)
```

## Config / Env Deltas
- Add real `GEMINI_API_KEY` to `.env.local` (owner-provided; until then graceful-degrade).
- Confirm `DATABASE_URL` (PostgreSQL) for gateway/collab live runs.
- Linode deploy uses existing Docker Compose; no infra changes this feature.

## Test Strategy
- Re-run 490 Rust tests; must stay green.
- Add 1 regression test: `check_job_status` returns a resolvable artifact (no `cdn.lazynext.ai`).
- Add 1 E2E: CLI `edit` → `render` → ffprobe, on a tiny sample clip.

## Risks / Trade-offs
- **No real Gemini key** ⇒ AI demo uses local fallback (lower quality). Acceptable for
  Phase 0; owner provides key before Phase 1 sign-off demo.
- cargo test/workspace may be slow (~minutes) — run once, cache.
- Mobile/desktop live builds need SDKs (Xcode/Android) — may not be available; if so,
  verify via unit tests + build target only, and flag.

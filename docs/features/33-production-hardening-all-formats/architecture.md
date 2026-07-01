# 🏗️ Architecture: Production Hardening — All 7 Formats

> **Feature**: `33` — Production Hardening — All 7 Formats
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟡 DRAFT
> **Date**: 2026-07-01

---

## Overview

Wire existing infrastructure to close integration gaps across all 7 formats. No new pipelines — all gaps are disconnected or hardcoded paths that need real data flow. The approach is: read → verify what's real → wire → test.

---

## File Structure

```
# Desktop (Format 2) — Playback + AI + Import/Export
apps/desktop/src/editor.rs              # MODIFY: Wire play/pause to toggle_playback
apps/desktop/src/editor.rs              # MODIFY: Wire AI prompt bar to user input
apps/desktop/src/editor.rs              # MODIFY: Add media file drag-drop handler
apps/desktop/src/editor.rs              # MODIFY: Add export-to-file flow via lazynext_export
apps/desktop/src/main.rs                # MODIFY: Wire DeckLink output to render loop

# CLI (Format 6) — Real media decode + ingest + proper load
rust/cli/src/main.rs                    # MODIFY: Use ffmpeg_loader for real media decode
rust/cli/src/main.rs                    # MODIFY: Replace manual JSON → proper ProjectData deser
rust/cli/src/main.rs                    # ADD: ingest subcommand for adding media to project

# Desktop + CLI shared
rust/core/src/ffmpeg_loader.rs          # VERIFY: Ensure ffmpeg_loader can decode frames
rust/core/src/engine.rs                 # VERIFY: PlaybackLoop::toggle_playback is functional

# Mobile (Format 3) — Real video preview + native module + import/export
apps/mobile/src/screens/EditorScreen.tsx  # MODIFY: Replace placeholder text with real preview
apps/mobile/src/NativeBridge.ts           # VERIFY: Check if native module is real

# MCP Server (Format 5) — SSE transport + real export
rust/mcp-server/src/main.rs               # ADD: SSE transport handler
rust/mcp-server/src/main.rs               # MODIFY: Remove test-pattern fallback
rust/mcp-server/tests/protocol.rs         # MODIFY: Add integration tests

# API Gateway (Format 7) — Graceful shutdown + render dispatch + E2E
rust/api-gateway/src/main.rs              # MODIFY: Add signal handling for graceful shutdown
rust/api-gateway/src/main.rs              # MODIFY: Wire render dispatch to render-service
rust/api-gateway/tests/integration_test.rs # MODIFY: Add E2E request flow tests

# Browser Extension (Format 4) — Icons + local preview
apps/browser-extension/                   # ADD: Generate icon assets
apps/browser-extension/src/overlay.tsx    # MODIFY: Add local timeline preview

# Web App (Format 1) — WASM automation + standalone export
apps/web/package.json                     # MODIFY: Add WASM build to postinstall
build-wasm.sh                             # VERIFY: Ensure script works in CI

# Assessment update
PLATFORM_ASSESSMENT.md                    # MODIFY: Update format readiness percentages
docs/project-roadmap.md                   # MODIFY: Add feature #33
```

---

## Data Flow

### Desktop Playback + Export
```
User clicks Play → toggle_playback() → PlaybackLoop::tick()
  → CoreEngine::render_frame(frame) → GPU compositor → GPUI Image
User clicks Export → file dialog → CoreEngine::dispatch_export()
  → ExportPipeline → FFmpeg → output.mp4
```

### Desktop AI Prompt
```
User types "add color grade" in prompt bar → button handler reads text input
  → POST /api/v1/autonomous_edit → AutonomousEditor::process_intent()
  → CRDT mutations → NLEState → timeline refresh
```

### CLI Real Render
```
cli ingest video.mp4 → ffmpeg_loader::NativeFfmpegDecoder::decode_frame(idx)
  → CoreEngine → compositor frame → ExportPipeline → output.mp4
```

### MCP SSE Transport
```
MCP Client connects via HTTP → SSE endpoint upgrades
  → POST /mcp/message for requests, GET /mcp/events for SSE responses
  → Same tool dispatch logic as stdio, different transport encoding
```

### Gateway Graceful Shutdown
```
SIGTERM → tokio::signal handler → drain active connections
  → close database pool → flush Redis → exit(0)
```

---

## Configuration

| Key | Value/Type | Description |
|---|---|---|
| `LAZYNEXT_MCP_API_KEY` | string | MCP server auth (already exists) |
| `RENDER_SERVICE_URL` | string | Gateway → render-service dispatch URL |
| `LLM_PROVIDER` | string | AI provider for CLI/desktop/mcp |

---

## Security Considerations

- AI prompt bar input must be sanitized before sending to LLM
- Desktop file dialogs use native OS dialogs (safe)
- Gateway graceful shutdown must not drop in-flight requests

---

## Trade-offs & Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Wire existing pipelines | Fast, low risk, reuses tested code | May expose edge cases in existing paths | ✅ Selected |
| Build new pipelines | Clean, purpose-built | High effort, duplicates logic | ❌ Too much work |
| Skip mobile native module | Acknowledges reality | Mobile stays non-functional | ❌ User wants all 7 formats |

---

## Next

Create tasks doc → `tasks.md`

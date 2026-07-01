# 🧪 Test Plan: Production Hardening — All 7 Formats

> **Feature**: `33` — Production Hardening — All 7 Formats
> **Tasks**: [`tasks.md`](tasks.md)
> **Date**: 2026-07-01

---

## Acceptance Criteria

- [ ] Desktop: play/pause toggles frame rendering, AI prompt bar accepts user text, drag-drop imports .mp4, export saves .mp4
- [ ] CLI: `ingest` subcommand works, `render` uses real media not test pattern, output passes ffprobe
- [ ] Mobile: video preview is not placeholder text, NativeBridge module exists, media import from gallery works
- [ ] MCP Server: SSE transport responds to requests, export produces real content not test pattern
- [ ] API Gateway: SIGTERM triggers graceful shutdown, render dispatch reaches render-service, E2E test passes
- [ ] Browser Extension: icons exist, local timeline preview renders
- [ ] Web App: `bun install` + `bun run dev` works without manual WASM build, standalone export produces MP4

---

## Test Cases

### TC-01: Desktop Playback Toggle

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Desktop app built, project loaded with at least 1 clip |
| **Steps** | 1. Click Play button → 2. Wait 2 seconds → 3. Click Pause button |
| **Expected Result** | Frame counter advances during play, stops on pause |
| **Status** | ⬜ Not Run |

### TC-02: Desktop AI Prompt

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Desktop app running, API Gateway on :8005, LLM provider available |
| **Steps** | 1. Type "add vignette effect to all clips" in prompt bar → 2. Click Run Command |
| **Expected Result** | Timeline updates with vignette effect applied |
| **Status** | ⬜ Not Run |

### TC-03: Desktop Media Import

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Desktop app built, test .mp4 file on disk |
| **Steps** | 1. Click File → Import or drag .mp4 onto editor → 2. Select file in dialog |
| **Expected Result** | New clip appears in timeline, media decoded and visible in canvas |
| **Status** | ⬜ Not Run |

### TC-04: Desktop Export

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Desktop app with timeline containing clips |
| **Steps** | 1. Click File → Export → 2. Select MP4 format → 3. Choose save location |
| **Expected Result** | MP4 file created, ffprobe validates codec/duration/resolution |
| **Status** | ⬜ Not Run |

### TC-05: CLI Real Render

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | CLI built, test project JSON with media reference, test .mp4 on disk |
| **Steps** | 1. Run `cli render --project test.json --format mp4 --output out.mp4` |
| **Expected Result** | out.mp4 contains real video frames (not solid color), ffprobe validates |
| **Status** | ⬜ Not Run |

### TC-06: CLI Ingest Subcommand

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | CLI built, test .mp4 on disk |
| **Steps** | 1. Run `cli ingest --file video.mp4 --project-id test` |
| **Expected Result** | Project JSON updated with new clip entry, media probed (duration, resolution) |
| **Status** | ⬜ Not Run |

### TC-07: Mobile Native Bridge

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Mobile app built, native module compiled |
| **Steps** | 1. Open app → 2. Navigate to Editor tab → 3. Verify timeline renders clips |
| **Expected Result** | Timeline shows real clip data from NativeBridge.getProjectInfo(), not placeholder |
| **Status** | ⬜ Not Run |

### TC-08: MCP SSE Transport

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | MCP server running with `--sse --port 9000` |
| **Steps** | 1. GET /mcp/events → receive SSE stream → 2. POST /mcp/message with `tools/list` request |
| **Expected Result** | SSE response received with tool list JSON |
| **Status** | ⬜ Not Run |

### TC-09: MCP Real Export

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | MCP server running, valid project data available |
| **Steps** | 1. Call `tools/call` with `export_project` → 2. Verify output file |
| **Expected Result** | Output file contains rendered video frames, not test pattern solid color |
| **Status** | ⬜ Not Run |

### TC-10: Gateway Graceful Shutdown

| Property | Value |
|---|---|
| **Category** | Error Case |
| **Precondition** | API Gateway running with active connections |
| **Steps** | 1. Send SIGTERM → 2. Send new request during shutdown window |
| **Expected Result** | Existing connections drain, new connections rejected gracefully, process exits 0 |
| **Status** | ⬜ Not Run |

### TC-11: Gateway Render Dispatch

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | API Gateway on :8005, render-service on :8003 |
| **Steps** | 1. POST /api/v1/render with project data → 2. Poll /api/v1/render/status |
| **Expected Result** | Render job created on render-service, status returns progress, webhook fires on completion |
| **Status** | ⬜ Not Run |

### TC-12: WASM Build Automation

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Fresh clone, no prior WASM build |
| **Steps** | 1. Run `bun install` → 2. Run `bun run dev` |
| **Expected Result** | WASM builds automatically (or clear error if Rust not installed), dev server starts |
| **Status** | ⬜ Not Run |

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| 1 | Desktop import of corrupted .mp4 | Error dialog shown, no crash |
| 2 | CLI render with non-existent media file | Clear error message, exit code 1 |
| 3 | MCP SSE client disconnects mid-response | Server cleans up, does not leak memory |
| 4 | Gateway SIGTERM during active render | Render completes or is cancelled cleanly |
| 5 | Web app export with no render-service | Falls back to WebCodecs in-browser |

---

## Test Summary

| Category | Total | Pass | Fail | Skip |
|---|---|---|---|---|
| Happy Path | 10 | — | — | — |
| Error Cases | 1 | — | — | — |
| Edge Cases | 5 | — | — | — |
| **Total** | 16 | — | — | — |

**Result**: ⬜ NOT RUN

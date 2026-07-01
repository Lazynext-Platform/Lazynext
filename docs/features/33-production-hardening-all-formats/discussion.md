# 💬 Discussion: Production Hardening — All 7 Formats

> **Feature**: `33` — Production Hardening — All 7 Formats
> **Status**: 🟡 IN PROGRESS
> **Branch**: `feature/33-production-hardening-all-formats`
> **Depends On**: #32, #31, #30, #22
> **Date Started**: 2026-07-01
> **Date Completed**: —

---

## Summary

Make every one of the 7 delivery formats capable of completing the full ingest-media → AI-edit → render → output loop without manual intervention. The platform is architecturally sound and code-complete at the framework level, but no single format can run end-to-end today. This feature closes the remaining integration and wiring gaps so that each format is independently production-capable.

---

## Lessons from Previous Features

- **From #22**: Always grep/read the actual code before scoping — the assessment overstates gaps; focus on wiring existing pipelines rather than building new ones. Graceful-degradation-first for risky integrations.
- **From #20**: Replace hardcoded test data with real data flow — the GPUI editor had mock timelines; the same pattern recurs in mobile and CLI.
- **From #18**: CRDT patch format mismatches cause silent no-ops — verify the data contract end-to-end before declaring a feature complete.

---

## Functional Requirements

### Web App (Format 1)
- [ ] WASM build must be automated and verified — no manual `build-wasm.sh` required for contributors
- [ ] Media ingest: direct file upload drag-and-drop in the web editor, not just browser-extension import
- [ ] Export must work without render-service dependency (WebCodecs path must produce MP4, not just WebM)

### Desktop App (Format 2)
- [ ] Playback loop must be wired — play/pause button must actually toggle frame rendering, not just log
- [ ] AI prompt bar must accept user text input, not hardcoded string
- [ ] Media file import: drag-and-drop video/audio files into the editor
- [ ] Export-to-file: render → save MP4/ProRes/MOV from desktop

### Mobile App (Format 3)
- [ ] Real video preview — replace "Video Preview Render Surface (Rust WGPU)" placeholder text
- [ ] Native module must be verifiably real — not `@ts-ignore` stub
- [ ] Media import: camera capture or gallery picker
- [ ] Export-to-file: render and save from mobile

### Browser Extension (Format 4)
- [ ] Verify icon assets exist or generate them
- [ ] Reduce gateway dependency — local timeline preview without port 8005

### MCP Server (Format 5)
- [ ] Implement SSE transport for MCP clients that require it
- [ ] Remove test-pattern fallback for export — use real GPU composited frames
- [ ] Add integration tests for tool execution (not just JSON structure)

### CLI (Format 6)
- [ ] Real media decoding — use ffmpeg_loader to decode actual video files, not test_pattern.png
- [ ] Proper project deserialization — use a standard load method, not manual JSON reconstruction
- [ ] Add video ingest subcommand to import media into a project

### API Gateway (Format 7)
- [ ] Graceful shutdown with signal handling (SIGTERM/SIGINT)
- [ ] Add E2E integration tests for the full request flow
- [ ] Wire real rendering pipeline — gateway should dispatch renders to render-service or local ffmpeg

---

## Current State / Reference

Deep audit (2026-07-01) of all 7 formats confirmed:

| Format | Compiles | Core Function | E2E? | Key Gap |
|--------|----------|---------------|------|---------|
| Web | Yes | Editor + AI + CRDT | Partial | WASM build manual, render-service dependency |
| Desktop | Yes | GPUI NLE shell | Partial | Playback dead, AI hardcoded, no import/export |
| Mobile | Yes | RN shell with tabs | No | Placeholder preview, unverifiable native module |
| Browser Ext | Yes | Video detection + ingest | Partial | Gateway-dependent |
| MCP Server | Yes | 14 tools + protocol | Partial | No SSE, test-pattern export fallback |
| CLI | Yes | Headless render | Partial | Test-pattern only, no real media decode |
| API Gateway | Yes | 18 routes + auth | Partial | No rendering pipeline, no E2E tests |

---

## Proposed Approach

**Fix the real gaps, don't build new pipelines.** Most of the infrastructure already exists — the gaps are wiring and integration issues, not missing components. Pattern from #22: verify what's real, then wire what's disconnected.

For each format:
1. Fix the blocking wiring issue (playback loop, AI prompt, media decode)
2. Add the missing import/export path
3. Verify end-to-end with a real test
4. Update PLATFORM_ASSESSMENT to reflect new state

---

## Dependencies

| Dependency | Type | Status |
|---|---|---|
| Feature #22 — Real Export Pipeline | Feature | ✅ Complete |
| Feature #30 — Backend Depth | Feature | ✅ Complete |
| Feature #31 — Observability + E2E | Feature | ✅ Complete |
| Feature #32 — Remaining Production Gaps | Feature | ✅ Complete |
| rust/crates/export | Crate | ✅ Available |
| rust/core (ffmpeg_loader) | Crate | ✅ Available |
| render-service | Microservice | ✅ Available |

---

## Open Questions

- [ ] Can we use ffmpeg_loader in the WASM build for browser-side media decoding, or does it require native-only paths?
- [ ] Is the mobile NativeBridge.ts actually backed by real Kotlin/Swift native modules, or does it need to be built?
- [ ] Should the gateway's render dispatch go to render-service via HTTP or via a message queue?

---

## Decisions Made

| Date | Decision | Rationale |
|---|---|---|
| 2026-07-01 | Wire existing pipelines, don't build new ones | Audit confirms most infrastructure exists; gaps are integration |
| 2026-07-01 | Prioritize Desktop and CLI first | They share the native Rust compositor path; fixing one helps both |
| 2026-07-01 | Mobile needs native module verification before code changes | Cannot fix what can't be verified |

## Discussion Complete ✅

**Summary**: The platform needs integration wiring across all 7 formats to achieve end-to-end capability. Desktop and CLI share the native compositor path and should be fixed first. Mobile needs native module verification. The MCP server needs SSE transport. The gateway needs graceful shutdown and render dispatch.

**Completed**: 2026-07-01
**Next**: Create architecture doc → `architecture.md`

# 📝 Changelog: Real Video Playback Pipeline

> **Feature**: `34` — Real Video Playback Pipeline
> **Branch**: `feature/34-real-video-playback-pipeline`
> **Started**: 2026-07-01
> **Completed**: —

---

## Session Notes

### Session Note — 2026-07-01
- **Who**: AI Agent (opencode)
- **Duration**: Active
- **Worked On**: Phase A (CLI real video render) complete. Phase B+C pending.
- **Stopped At**: Merged to main — Phase A done. Real video decode + export verified with ffprobe (red pixels confirmed).
- **Blockers**: None
- **Next Steps**: Phase B (Desktop real preview), Phase C (Web video decode)

---

## Log

### 2026-07-01

- **[Added]**: Feature #34 full lifecycle docs (discussion, architecture, tasks, motto, testplan)
- **[Added]**: `CliFfmpegLoader` import to CLI — real video frame decode
- **[Added]**: `clear_asset_loader()` method on CoreEngine — bypass slow per-frame decode
- **[Fixed]**: `render_frame` media path resolution — reads from media_pool instead of using clip.id
- **[Fixed]**: Ingest command now links clips to media assets via `clip.media_id`
- **[Fixed]**: CLI output path — extracts project stem from full path (`/tmp/red_proj.json` → `./out/red_proj.mp4`)
- **[Verified]**: Real video export — red.mp4 input → red_pixel output confirmed by pixel analysis
- **[Verified]**: Pipeline performance — 133 fps at 320x240, GPU-accelerated

### 2026-07-07 (Agent: opencode)

- **[Added]**: Integration test `rust/core/tests/video_decode.rs` — 2 tests (real frame decode + error handling). Both pass.
- **[Added]**: `VideoFrameDecoder` class to `apps/web/src/media/video-decoder.ts` — per-frame decode with sync/async methods.
- **[Added]**: Pipeline integration test `rust/cli/tests/pipeline.rs` — generates test video, verifies with ffprobe. 1 test passing.
- **[Audited]**: Phase A (CLI) already functional; Phase C (Web) already fully implemented in `wasm-player.tsx` (video element seek → canvas → uploadTexture → renderProjectFrame).
- **[Verified]**: Full test suite — 494 tests passing (118 Rust + 373 web + 3 new).
- **[Checked]**: 17/20 tasks complete. Remaining: B.1 (desktop import UI), D.3-D.4 (desktop/web verification), E.2 (web E2E).

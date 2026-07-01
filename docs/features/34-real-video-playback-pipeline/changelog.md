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

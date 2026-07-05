# 🪞 Review: Real Video Playback Pipeline (Feature #34)

> **Feature**: `34` — Real Video Playback Pipeline
> **Merged**: 2026-07-01 → `main`
> **Branch**: `feature/34-real-video-playback-pipeline` (retained)

## Summary

Wired real video decode via `CliFfmpegLoader` → GPU compositor → valid H.264 MP4 export. Verified with red pixel analysis. Desktop auto-decodes video textures for real preview. Web video-decoder utility (WebCodecs API wrapper) added.

## What Went Well
- **Phase A (CLI) complete and verified**: Real video decode + export confirmed with ffprobe (red pixels)
- **Clear separation**: `clear_asset_loader()` bypassed slow per-frame decode during export
- **Media pool integration**: Ingest command now correctly links clips to media assets via `clip.media_id`

## What Needs Work
- **Phase B (Desktop real preview)**: ring_buffer_decoder spawns on import, but full preview loop not yet verified end-to-end
- **Phase C (Web video decode)**: WebCodecs decoder utility exists but browser-dependent; needs browser-specific testing

## Key Lessons
1. **FFMPEG decode reliable**: Real H.264 decode works correctly via `CliFfmpegLoader` with `get_frame()` returning valid RGBA
2. **Ingest→media_pool linking critical**: Without `clip.media_id` → file path resolution, clips can't be decoded

## Follow-ups
- Phase B+C completion (desktop preview loop + web decode)
- Audio muxing for the frame-stream export path

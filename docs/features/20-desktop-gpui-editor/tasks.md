# 📋 Tasks: Desktop GPUI Editor Completion

> **Feature**: `20` — Desktop GPUI Editor Completion
> **Branch**: `feature/20-desktop-gpui-editor`
> **Status**: 🟢 COMPLETE (shipped in commit `9f007dba`)

## Phase A — Timeline

- [x] A.1 Replace hardcoded mock clip positions in `editor.rs` with real `track.clips` data. Derive clip left/width from `start`/`duration` frames and timeline zoom scale.
- [x] A.2 Fix playhead to use `current_frame` scaled against the visible timeline range, not the hardcoded `* 2.0`.

## Phase B — Playback

- [x] B.1 Add Play/Pause buttons in the editor toolbar. Play triggers a loop that increments `current_frame` and calls `engine.render_frame()` each tick.
- [ ] B.2 Add a seek bar / scrub interaction on the timeline ruler. *(playhead visible but not interactive — deferred to GPUI interactive model refactor)*

## Phase C — Tests + Docs

- [x] C.1 Add a unit test for `EditorShell` — instantiate with mock NLEState, verify frame data renders.
- [x] C.2 Update `PLATFORM_ASSESSMENT.md` FORMAT 2 section: correct the false "1% / 25-line stub" claim. Replace with current state (real GPUI app, Dashboard + Editor, DeckLink wired).
- [x] C.3 Update roadmap: mark Feature #20 🟢 Complete, remove #07 from On Hold.

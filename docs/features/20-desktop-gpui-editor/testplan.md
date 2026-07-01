# 🧪 Test Plan: Desktop GPUI Editor Completion

> **Feature**: `20` — Desktop GPUI Editor Completion
> **Tasks**: [`tasks.md`](tasks.md)
> **Date**: 2026-06-30

---

## Acceptance Criteria

- [ ] AC1: Timeline clips render at positions derived from `track.clips[].start`/`duration`, not hardcoded mock offsets
- [ ] AC2: Playhead position scales correctly relative to the visible timeline range and current frame
- [ ] AC3: Play button starts a frame-advance loop that calls `engine.render_frame()` on each tick and updates the canvas
- [ ] AC4: Pause button stops the playback loop without crashing or leaking
- [ ] AC5: Seek bar / timeline ruler click moves `current_frame` to the corresponding position
- [ ] AC6: `EditorShell` unit test instantiates with mock `NLEState`, verifies frame rendering populates the canvas
- [ ] AC7: `PLATFORM_ASSESSMENT.md` FORMAT 2 section no longer claims the desktop app is a "1% / 25-line stub"
- [ ] AC8: `cargo test -p lazynext-desktop` passes; `cargo clippy` and `cargo fmt` clean
- [ ] AC9: Existing GPUI features (Dashboard, AI Copilot, DeckLink init, Inspector) continue to work without regression

---

## Test Cases

### TC-01: Timeline renders real clip positions

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Project loaded with 2 tracks: Track 1 with 3 clips (start 0/50/120, duration 50/70/30), Track 2 with 1 clip (start 10, duration 80) |
| **Steps** | 1. Open project via Dashboard → 2. Observe timeline track rows |
| **Expected Result** | Clip blocks positioned at pixel locations proportional to their `start` frame. Clip widths proportional to `duration` frames. No overlapping or misaligned clips. |
| **Status** | ⬜ Not Run |
| **Notes** | Timeline zoom scale = `timeline_width_px / total_frames`. Current mock uses `px(50.0 + i * 100.0)`. |

### TC-02: Playhead tracks current_frame correctly

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Timeline with 300-frame duration, timeline visible width 900px (zoom = 3px/frame) |
| **Steps** | 1. Move to frame 100 → 2. Observe playhead position |
| **Expected Result** | Playhead at 300px (100 frames × 3px/frame). Not at the hardcoded `200.0 + 100.0 * 2.0 = 400.0`. |
| **Status** | ⬜ Not Run |
| **Notes** | Current mock: `left(px(200.0 + (self.current_frame as f32) * 2.0))`. |

### TC-03: Play button advances frames and renders

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Timeline loaded, `current_frame = 0` |
| **Steps** | 1. Click Play button → 2. Wait ~1 second at 30fps → 3. Observe canvas |
| **Expected Result** | Canvas image updates each tick (~33ms). `current_frame` increments by 1 each tick. Canvas shows frame ~30 after 1 second. |
| **Status** | ⬜ Not Run |
| **Notes** | Tick rate = 1000/framerate ms. Loop must call `engine.render_frame(frame)` each tick. |

### TC-04: Pause button stops playback

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Playback running (from TC-03) |
| **Steps** | 1. Click Pause button → 2. Wait 1 second → 3. Check `current_frame` |
| **Expected Result** | Timer stops. `current_frame` does not change after Pause. Canvas freezes on last rendered frame. |
| **Status** | ⬜ Not Run |
| **Notes** | Must cancel the tokio interval. No leaked tasks. |

### TC-05: Playback stops at end of timeline

| Property | Value |
|---|---|
| **Category** | Edge Case |
| **Precondition** | Timeline `total_frames = 90`, `current_frame = 85`, playback running |
| **Steps** | 1. Let playback advance past frame 89 |
| **Expected Result** | Playback auto-pauses at frame 89 (or 90). Playhead stops at end of timeline. Play button re-enabled for restart. No out-of-bounds frame requested. |
| **Status** | ⬜ Not Run |
| **Notes** | Must not call `render_frame(90+)` — compositor may panic on OOB. |

### TC-06: Seek bar sets current_frame

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Timeline with 300 frames, timeline ruler visible |
| **Steps** | 1. Click timeline ruler at pixel position 450 (midpoint) |
| **Expected Result** | `current_frame` set to 150 (450px / 3px-per-frame). Playhead moves to 450px. Canvas renders frame 150. |
| **Status** | ⬜ Not Run |
| **Notes** | Click→frame conversion: `frame = (click_x / timeline_width_px) * total_frames`. |

### TC-07: EditorShell unit test — frame renders

| Property | Value |
|---|---|
| **Category** | Unit Test |
| **Precondition** | Mock `NLEState` with 1 track, 1 clip, solid black frame |
| **Steps** | 1. Instantiate `EditorShell` with mock state → 2. Call render → 3. Inspect canvas |
| **Expected Result** | Test passes. Frame data is non-empty RGBA buffer. Dimensions match configured canvas size (800×450). |
| **Status** | ⬜ Not Run |
| **Notes** | Test file: `apps/desktop/src/editor_test.rs` (to be created). |

### TC-08: Playback respects framerate changes

| Property | Value |
|---|---|
| **Category** | Edge Case |
| **Precondition** | Timeline with `framerate = 24` (not default 30) |
| **Steps** | 1. Press Play → 2. Measure tick interval |
| **Expected Result** | Tick interval ≈ 1000/24 ≈ 41.7ms, not 1000/30 ≈ 33.3ms. |
| **Status** | ⬜ Not Run |
| **Notes** | Framerate comes from NLEState, not a hardcoded constant. |

### TC-09: No regression — Dashboard still works

| Property | Value |
|---|---|
| **Category** | Regression |
| **Precondition** | Desktop app launched |
| **Steps** | 1. Click "New Project" → 2. Verify Editor window opens → 3. Close editor → 4. Click "Open Project" → 5. Verify rfd file dialog appears |
| **Expected Result** | Dashboard flows unchanged. New/Open project both functional. |
| **Status** | ⬜ Not Run |
| **Notes** | Dashboard has existing unit test — must still pass. |

### TC-10: No regression — AI Copilot still works

| Property | Value |
|---|---|
| **Category** | Regression |
| **Precondition** | Editor window open, api-gateway running on :8005 |
| **Steps** | 1. Type command in AI Copilot input → 2. Click "Run Command" |
| **Expected Result** | POST to `api-gateway:8005/api/v1/autonomous_edit` succeeds. Response displayed in Copilot widget. |
| **Status** | ⬜ Not Run |
| **Notes** | Copilot is pre-existing — must not break with playback/timeline changes. |

### TC-11: Play button disabled during empty timeline

| Property | Value |
|---|---|
| **Category** | Edge Case |
| **Precondition** | New project, no tracks, no clips |
| **Steps** | 1. Observe Play button state |
| **Expected Result** | Play button disabled (grayed out) or not rendered. Pressing Space does nothing. |
| **Status** | ⬜ Not Run |
| **Notes** | Calling `render_frame()` on an empty timeline should be guarded. |

### TC-12: Keyboard shortcut — Space toggles Play/Pause

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Project loaded, editor focused |
| **Steps** | 1. Press Space → 2. Wait 1s → 3. Press Space again |
| **Expected Result** | First Space: playback starts. Second Space: playback pauses. |
| **Status** | ⬜ Not Run |
| **Notes** | GPUI key binding. Must not fire when text input is focused (e.g., AI Copilot input). |

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| E1 | Timeline with 0 total frames (empty project) | Play button disabled; playhead at position 0; render_frame not called |
| E2 | Timeline with single-frame duration | Playback runs exactly 1 frame then auto-pauses |
| E3 | Rapid Play/Pause toggling (spam Space) | No panic, no leaked tasks. State remains consistent. |
| E4 | Seek while playing | Playback continues from new position without stutter |
| E5 | Playback with DeckLink output enabled | Canvas updates independently from SDI output; no frame drops on either path |
| E6 | Window resize during playback | Timeline ruler and clip positions rescale; playhead remains at correct frame |

---

## Definition of Done

- All TC pass; `cargo test -p lazynext-desktop` green.
- `cargo clippy --all-targets -- -D warnings` clean.
- `cargo fmt --all --check` clean.
- `PLATFORM_ASSESSMENT.md` FORMAT 2 section corrected.
- Human-approved merge to `main`; `feature/20-desktop-gpui-editor` branch retained.

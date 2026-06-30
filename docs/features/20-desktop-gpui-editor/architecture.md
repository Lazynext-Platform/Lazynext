# 🏗️ Architecture: Desktop GPUI Editor

> **Feature**: `20` — Desktop GPUI Editor Completion
> **Status**: FINALIZED

## Pipeline (already real)

```
main.rs → GPUI Application::new()
  │
  ├─ Dashboard window (dashboard.rs)
  │   ├─ "New Project" → opens Editor window
  │   └─ "Open Project" → rfd::FileDialog → .lazynext → load_project_data()
  │
  └─ Editor window (editor.rs) ← NLEState + CoreEngine
      ├─ Left toolbar (tools)
      ├─ Media bin
      ├─ Canvas (800×450)
      │   └─ engine.render_frame(frame) → RGBA → image::RgbaImage → GPUI RenderImage
      ├─ Timeline (300px bottom)
      │   ├─ Track rows from projectData.tracks
      │   ├─ Clip blocks (currently hardcoded mock positions ← FIX)
      │   └─ Playhead (currently hardcoded current_frame * 2.0 ← FIX)
      ├─ Inspector (300px right)
      │   ├─ Transform (scale, position)
      │   ├─ Opacity
      │   └─ (effects/masks pending)
      └─ AI Copilot
          └─ "Run Command" → POST api-gateway:8005/autonomous_edit
```

## Changes needed

### 1. Real clip rendering in timeline (editor.rs:187-203)
Current: hardcoded `left(px(50.0 + (i as f32) * 100.0))` positions.
Fix: render actual clips from `track.clips` with proper start/duration-derived positions.

### 2. Playback controls
Add Play/Pause/Seek that drive `current_frame` updates and `engine.render_frame()`.

### 3. Playhead position
Current: `left(px(200.0 + (self.current_frame as f32) * 2.0))`.
Fix: base on actual frame position relative to timeline width.

### 4. Tests
Add editor unit test (render with mock NLEState, verify frame data populates).

### 5. Assessment correction
Update PLATFORM_ASSESSMENT FORMAT 2 section — remove "1% / 25-line stub" claim.

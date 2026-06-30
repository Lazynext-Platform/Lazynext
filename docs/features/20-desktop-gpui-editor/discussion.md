# 💬 Discussion: Desktop GPUI Editor — Completion

> **Feature**: `20` — Desktop GPUI Editor Completion
> **Status**: 🔴 STAGE 1 — Discuss
> **Branch**: `feature/20-desktop-gpui-editor`
> **Depends On**: #01, #07, #12
> **Date Started**: 2026-06-30

## Summary

The PLATFORM_ASSESSMENT.md claimed the desktop app was a "1%" / "25-line stub with all GPUI code commented out." **This is false.** Code audit reveals:

- `main.rs` (67 lines): GPUI entry with tokio runtime, NLEState init, CoreEngine init with `enable_decklink()`, Dashboard window on launch.
- `dashboard.rs` (193 lines): Full GPUI view with "New Project" (opens Editor window), "Open Project" (rfd::FileDialog for .lazynext files, deserializes ProjectData, loads into NLEState). Includes a unit test.
- `editor.rs` (372 lines): Full GPUI editor shell with:
  - Left toolbar (Select/Text/Blade/Pen tools)
  - Media bin panel (left sidebar)
  - Canvas preview (800×450) with **real frame rendering** — calls `engine.render_frame(frame)`, converts RGBA → image buffer → GPUI RenderImage
  - Timeline panel (300px bottom) with per-track clip rendering and a red playhead
  - Inspector panel (300px right) with Transform + Opacity controls
  - **AI Copilot** widget with command text and "Run Command" button that POSTs to `api-gateway:8005/api/v1/autonomous_edit`
- Cargo.toml wired with gpui 0.2.2, compositor, wgpu, rfd (file dialogs), image, tokio.

**The desktop app is a real, functional GPUI application — not a stub.** This feature is about **hardening and polishing** the already-existing editor, not building from scratch.

## Functional Requirements

- Playback controls (Play/Pause/Seek) that actually drive `engine.render_frame()` and update the playhead position based on NLEState's current frame
- Clip manipulation in the timeline (drag to move, trim handles, select)
- The timeline should render actual clip data from `projectData.tracks` rather than hardcoded mock positions
- Effect/mask panel in the inspector
- At least basic test coverage for the editor component
- Native file save (rfd) for project data
- Keyboard shortcuts (Space = play/pause, etc.)

## Current State (code-verified)

| Component | Status |
|---|---|
| GPUI framework | Active — gpui 0.2.2, real Application::new() event loop |
| Dashboard | Real — New/Open project, file dialog, NLEState init |
| Editor window | Real — full layout with toolbar / media / canvas / timeline / inspector |
| Frame rendering | Real — `engine.render_frame()` → RGBA → GPUI ImageSource |
| Timeline visualization | **Mock** — hardcoded clip positions, not driven by track data |
| Playhead | **Mock** — `current_frame * 2.0` hardcoded, no playback loop |
| AI Copilot | Real — POSTs to api-gateway, handles response |
| DeckLink | Wired — `engine.enable_decklink()` called on init |
| Inspector | Scaffold — Transform + Opacity only, no effect/mask controls |
| Tests | **Minimal** — only dashboard has a test; editor has none |

## What "done" looks like

A desktop editor where a user can:
1. Open a project (rfd) → see tracks and clips on the timeline
2. Play/scrub through the timeline → canvas updates in real time
3. Select a clip → Inspector shows its properties
4. Type an AI command → see the result on the timeline
5. Save the project

## Non-goals
- Full Premiere-like effect graph UI
- DeckLink SDI hardware testing (needs physical hardware)
- Mobile/extension parity (separate features)

## Discussion Complete ✅

**Completed**: 2026-06-30
**Next**: Create `architecture.md` (Stage 2 — Design).

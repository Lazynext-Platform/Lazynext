# 🧭 Feature Motto: Desktop GPUI Editor

> **Feature**: `20` — Desktop GPUI Editor Completion

## DO ✅
- Fix the timeline to render real clip data — the hardcoded mock is the biggest visible gap
- Add playback controls that drive real frame rendering via `engine.render_frame()`
- Add at least one test for the editor
- Correct the assessment

## DON'T ❌
- Do NOT rewrite the GPUI framework integration — it already works
- Do NOT touch the compositor or DeckLink (already wired)
- Do NOT add new editor features beyond playback + real timeline

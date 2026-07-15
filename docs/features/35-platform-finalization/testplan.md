# 🧪 Test Plan: Platform Finalization

> **Feature**: `35` — Platform Finalization
> **Tasks**: [`tasks.md`](tasks.md)
> **Date**: 2026-07-01

---

## Acceptance Criteria

- [ ] Desktop play/pause button toggles frame playback and advances current_frame
- [ ] Desktop AI prompt text input writes to ai_prompt_text and Run Command sends it
- [ ] Mobile NativeBridge calls real native modules (no mock fallback)
- [ ] MCP server advertises 50+ tools matching the orchestrator
- [ ] SAM2 rotoscoping uses ONNX model when available (falls back to rembg)
- [ ] Whisper transcription tries TF Serving before Gemini API
- [ ] Analytics events survive service restart (SQLite persistence)
- [ ] Full E2E test passes against production
- [ ] All 7 formats verified against production URLs

---

## Test Cases

### TC-01: Desktop Play/Pause Toggle

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Desktop app compiled with GPUI |
| **Steps** | 1. Launch desktop app → 2. Click play button → 3. Wait 2 seconds → 4. Verify frame counter increased → 5. Click pause → 6. Verify frame counter stopped |
| **Expected Result** | Play toggles is_playing=true, frame advances; pause stops advance |
| **Status** | ⬜ Not Run |

### TC-02: Desktop AI Prompt Input

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Desktop app compiled, API Gateway running on :8005 |
| **Steps** | 1. Type "Add crossfade between clips" in AI prompt → 2. Click Run Command → 3. Check logs for API Gateway call → 4. Verify API Gateway receives prompt text |
| **Expected Result** | User text is sent to API Gateway (not default prompt) |
| **Status** | ⬜ Not Run |

### TC-03: Mobile NativeBridge Real Data

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Mobile app built for iOS/Android, Rust core compiled as native lib |
| **Steps** | 1. Open mobile app → 2. Navigate to Editor tab → 3. Verify project data loaded from real native module |
| **Expected Result** | Project data comes from Rust core via UniFFI, not mock |
| **Status** | ⬜ Not Run |

### TC-04: MCP Server Tool Listing

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | MCP server running, MCP client connected |
| **Steps** | 1. Send `tools/list` request → 2. Count returned tools → 3. Verify key tools present (export_project, analyze_media, apply_effect, etc.) |
| **Expected Result** | 50+ tools returned with valid schemas |
| **Status** | ⬜ Not Run |

### TC-05: SAM2 Real Inference

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | SAM2 ONNX model at `/models/sam2_hiera_large.onnx` |
| **Steps** | 1. POST /rotoscope with video → 2. Check logs for "SAM2 ONNX" → 3. Verify masks returned |
| **Expected Result** | Segmentation uses real SAM2 model, not rembg |
| **Status** | ⬜ Not Run |

### TC-06: Local Whisper Fallback

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | TF Serving running with whisper-large-v3 |
| **Steps** | 1. Send audio file for transcription → 2. Check logs → 3. Verify TF Serving was called first → 4. Verify Gemini not called |
| **Expected Result** | Transcription uses local TF Serving when available |
| **Status** | ⬜ Not Run |

### TC-07: Analytics Persistence

| Property | Value |
|---|---|
| **Category** | Happy Path |
| **Precondition** | Analytics service running with SQLite |
| **Steps** | 1. POST /events (send 3 events) → 2. Restart service → 3. GET /metrics → 4. Verify 3 events still counted |
| **Expected Result** | Events survive restart |
| **Status** | ⬜ Not Run |

### TC-08: Full E2E Pipeline

| Property | Value |
|---|---|
| **Category** | Integration |
| **Precondition** | All services running on production URLs |
| **Steps** | 1. Run `scripts/full-e2e.sh STAGE=production` → 2. Check exit code → 3. Check ffprobe output |
| **Expected Result** | Exit code 0; valid video output verified |
| **Status** | ⬜ Not Run |

---

## Edge Cases

| # | Scenario | Expected Behavior |
|---|---|---|
| 1 | SAM2 ONNX model file missing | Falls back to rembg gracefully |
| 2 | TF Serving unavailable | Falls back to Gemini API |
| 3 | API Gateway unreachable from MCP server | Returns error to MCP client |
| 4 | Desktop app launched without API Gateway | AI prompt shows "Gateway unavailable" |
| 5 | Mobile app without native module installed | Shows "Native engine unavailable" message |

---

## Test Summary

| Category | Total | Pass | Fail | Skip |
|---|---|---|---|---|
| Happy Path | 7 | — | — | — |
| Edge Cases | 5 | — | — | — |
| **Total** | 12 | — | — | — |

**Result**: ⬜ NOT RUN

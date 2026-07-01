# 🏗️ Architecture: Platform Finalization — All 7 Formats to 100%

> **Feature**: `35` — Platform Finalization
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟡 DRAFT
> **Date**: 2026-07-01

---

## Overview

Close 8 remaining code gaps across the platform. All are **wiring fixes** — connecting existing real implementations that are currently disconnected. No new architecture, no new dependencies, no new files beyond small modifications.

---

## File Structure

### Files to MODIFY:

```
# Gap F1: Desktop play/pause wiring
apps/desktop/src/editor.rs                    # Wire play/pause mouse handler to toggle_playback()
apps/desktop/src/main.rs                      # Wire frame advance loop for playback

# Gap F2: Desktop AI prompt text input
apps/desktop/src/editor.rs                    # Replace static div with GPUI TextInput for ai_prompt_text

# Gap F3: Mobile NativeBridge — real UniFFI wiring
apps/mobile/src/NativeBridge.ts               # Remove MOCK_PROJECT fallback, wire real calls
apps/mobile/modules/lazynext-native/src/MyModule.kt   # Replace stub with real UniFFI calls
apps/mobile/modules/lazynext-native/src/MyModule.swift # Replace stub with real UniFFI calls

# Gap F4: SAM2 real ONNX model
services/pre-processing/src/cv_models.py      # Wire SAM2 ONNX runtime path
services/pre-processing/src/sam2_pipeline.py  # Call real SAM2 instead of rembg

# Gap F5: Local Whisper TF Serving path
services/pre-processing/src/services/audio_analysis.py # Add local TF Serving fallback before OpenAI API

# Gap F6: MCP Server tool expansion
services/mcp-server/src/index.ts              # Expand from 1 tool to 50+ tools from orchestrator
services/mcp-server/package.json              # Add dependencies if needed

# Gap F7: Analytics disk persistence
services/analytics-service/src/index.ts       # Add SQLite persistence layer
services/analytics-service/package.json       # Add better-sqlite3 dependency

# Gap F8: Production deployment
infra/terraform/                              # Run terraform apply
k8s/                                          # Apply K8s manifests
scripts/full-e2e.sh                           # Run against production URLs
```

---

## Component Design

### F1: Desktop Play/Pause

**Responsibility**: Wire the existing `toggle_playback()` method to the play/pause button and add a frame advance loop.

**Location**: `apps/desktop/src/editor.rs`

**Changes**:
- Line 252-254: Replace `log::info!(...)` with `cx.notify()` after toggling
- Loop body: move to `on_mouse_down(|event, window, cx| { self.toggle_playback(); cx.notify(); })`
- Add a GPUI timer or spawn task that advances `current_frame` while `is_playing` is true

The `toggle_playback()` method already exists (line 21-23) — it just needs to be called from the mouse handler.

### F2: Desktop AI Prompt Input

**Responsibility**: Replace the static "Type a command..." div with an actual GPUI text input.

**Location**: `apps/desktop/src/editor.rs`

**Changes**:
- Lines 492-497: Replace `div().child("Type a command...")` with a GPUI `TextInput` or `Editor` element
- Bind the input to `self.ai_prompt_text`
- The `Run Command` button already reads `self.ai_prompt_text` (line 511)

### F3: Mobile NativeBridge

**Responsibility**: Wire real UniFFI-generated bindings into the NativeBridge.

**Location**: `apps/mobile/src/NativeBridge.ts`, `apps/mobile/modules/lazynext-native/src/MyModule.kt`, `MyModule.swift`

**Changes**:
- `MyModule.kt`: Replace hardcoded JSON returns with calls to UniFFI-generated functions
- `MyModule.swift`: Same — replace mock data with real UniFFI calls
- `NativeBridge.ts`: Remove `MOCK_PROJECT` fallback. On error, return empty state with error message.

The UniFFI bindings already exist at `apps/mobile/ios/` and `apps/mobile/android/` (generated from `rust/core/src/mobile_bridge.rs`). The native modules just need to import and call them.

### F4: SAM2 ONNX Model

**Responsibility**: Wire the existing ONNX model path to actually load and run SAM2 inference.

**Location**: `services/pre-processing/src/sam2_pipeline.py`, `services/pre-processing/src/cv_models.py`

**Changes**:
- `cv_models.py`: Add `load_sam2_model()` that loads the ONNX model from `/models/sam2_hiera_large.onnx`
- `sam2_pipeline.py`: Call `load_sam2_model()` and use it for segmentation instead of `rembg`
- Keep `rembg` as a fallback when ONNX model is not available

### F5: Local Whisper TF Serving

**Responsibility**: Add a local Whisper inference path using TF Serving before falling back to OpenAI API.

**Location**: `services/pre-processing/src/services/audio_analysis.py`

**Changes**:
- Before calling OpenAI API, try TF Serving at `TF_SERVING_URL/v1/models/whisper:predict`
- If TF Serving responds, use the local result
- If TF Serving fails, fall back to OpenAI API (existing path)
- If OpenAI fails, return HTTP 503 (existing path)

### F6: MCP Server Expansion

**Responsibility**: Expand the MCP server from 1 tool to matching the 50+ tools in the AI orchestrator.

**Location**: `services/mcp-server/src/index.ts`

**Changes**:
- Import tool definitions from `services/ai-agents/src/orchestrator.ts` or create a shared tool registry
- Expand `ListToolsRequestSchema` handler to return all tools
- Expand `CallToolRequestSchema` handler to route to orchestrator for execution
- Each tool maps to an HTTP call to the API Gateway or ai-agents service

### F7: Analytics Persistence

**Responsibility**: Add SQLite disk persistence to the analytics service.

**Location**: `services/analytics-service/src/index.ts`

**Changes**:
- Add `better-sqlite3` dependency
- Create `analytics.db` on startup with events table
- Write events to SQLite before/instead of in-memory buffer
- Keep in-memory buffer as a hot cache
- Auto-create Kafka topics on connect (in `kafka.ts`)

### F8: Production Deployment

**Responsibility**: Deploy the platform to Azure and verify end-to-end.

**Location**: `infra/terraform/`, `scripts/full-e2e.sh`

**Changes**:
- Run `terraform plan` → `terraform apply` to provision Azure resources
- Deploy Docker containers to Azure Container Apps
- Run `scripts/full-e2e.sh` with `STAGE=production` against live URLs
- Verify all 7 formats work against production

---

## Data Flow

### Desktop Play/Pause
```
[User clicks ▶] → [on_mouse_down] → [self.toggle_playback()] → [is_playing=true]
→ [Timer/Spawn task advances current_frame] → [render_frame() called] → [Canvas updates]
```

### Desktop AI Prompt
```
[User types in TextInput] → [self.ai_prompt_text updated] → [User clicks Run Command]
→ [POST /api/v1/autonomous_edit] → [API Gateway] → [ai-agents orchestrator] → [CRDT patches]
```

### Mobile NativeBridge
```
[EditorScreen.fetchProject()] → [NativeBridge.fetchProject()] → [MyModule.getProjectInfo()]
→ [UniFFI get_project_info()] → [Rust NLEState.get_project_data()] → [JSON response]
```

### MCP Server
```
[MCP Client: tools/list] → [Server returns 50+ tools] → [Client: tools/call "export_project"]
→ [POST API Gateway /api/v1/execute] → [ai-agents orchestrator] → [render-service] → [Response]
```

---

## Configuration

No new configuration variables needed. Existing env vars used:

| Key | Description |
|---|---|
| `TF_SERVING_URL` | Already configured — Whisper TF Serving endpoint |
| `API_GATEWAY_URL` | Already configured — used by MCP server |
| `DATABASE_URL` | Already configured — PostgreSQL |

---

## Security Considerations

- MCP server expansion must not expose admin-only tools without auth
- SAM2 ONNX model loading must validate model file integrity
- No new auth mechanisms — reuse existing JWT/API key patterns

---

## Trade-offs & Alternatives

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| Wiring fixes only (no new arch) | Fast, low risk | Doesn't add new capabilities | ✅ Selected |
| Full mobile rewrite with new arch | More polished | Months of work, high risk | ❌ Too much for v1.0 |
| Skip minor gaps, deploy as-is | Zero dev time | Broken UX on some formats | ❌ Not production-ready |

---

## Next

Create tasks doc → `tasks.md`

# Rust Core — NLE Engine

Single source of truth for all business logic. Contains the NLE state machine, CRDT operations, GPU compositor integration, AI agent orchestration, and autonomous editing engine.

## Modules

| File | Purpose |
|------|---------|
| `nle_state.rs` | NLE state machine: tracks, clips, keyframes, undo/redo via snapshot |
| `engine.rs` | CoreEngine: connects CRDT state, GPU compositor, asset loader, DeckLink |
| `autonomous.rs` | Chronos AI Copilot: LLM-driven autonomous editing |
| `ffmpeg_loader.rs` | CliFfmpegLoader: real video frame decode via ffmpeg CLI |
| `frame_cache.rs` | LRU frame cache for playback |
| `ai_client.rs` | Multi-provider AI client (OpenAI, Anthropic, Gemini, Ollama) |
| `plugin_manager.rs` | VST3 host and shader plugin lifecycle |
| `mobile_bridge.rs` | UniFFI bridge for iOS/Android native modules |

## Usage

```rust
use lazynext_core::NLEState;
use lazynext_core::engine::CoreEngine;

let state = NLEState::new("session", "My Project", 24);
let engine = CoreEngine::init(state).await?;
let frame = engine.render_frame(0).await?;
```

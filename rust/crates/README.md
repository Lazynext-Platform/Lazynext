# Rust Crates — Domain Libraries

14 domain-specific crates powering every subsystem of the Lazynext platform.

| Crate | Purpose |
|-------|---------|
| `state/` | CRDT state management: LWW-Register, vector clocks, tombstones, keyframes |
| `compositor/` | GPU compositor: 17 blend modes, WGSL shaders, WebGPU/Vulkan/Metal |
| `gpu/` | wgpu context management, texture upload, WebGL fallback |
| `audio/` | DSP engine: 10-band EQ, compressor, VST3 host, rodio playback |
| `effects/` | 11 GPU effect shaders: blur, sharpen, chroma key, color grading |
| `export/` | FFMPEG encoding pipeline: MP4, ProRes, DCP, AAF, MOV |
| `masks/` | JFA signed distance field masking, 9 mask types, feather |
| `time/` | MediaTime, FrameRate, TimeCode, CRDT timestamps |
| `neural_engine/` | Face detection (ONNX SCRFD), clip tagging, optical flow |
| `editor_core/` | WASM bridge: CRDT delta merging from JS |
| `ffmpeg_filter/` | Type-safe FFmpeg filter graph construction |
| `plugin/` | Plugin runtime (Boa JS engine) + shader sandbox |
| `bridge/` | Inter-crate communication bus |
| `decklink/` | Blackmagic DeckLink SDI/HDMI I/O |

## Usage

```toml
[dependencies]
state = { path = "../crates/state" }
compositor = { path = "../crates/compositor" }
```

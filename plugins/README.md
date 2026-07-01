# Plugins — SDK & Examples

Plugin SDK for extending Lazynext with custom effects, audio processors, and GPU shaders.

## Plugin Types

| Type | SDK | Example |
|------|-----|---------|
| **Audio** | VST3 host (`rust/crates/audio/src/vst.rs`) | Custom EQ, compressor |
| **GPU Shaders** | WGSL custom shader API | Custom blend modes, effects |
| **JavaScript** | Boa JS runtime (`rust/crates/plugin/`) | Scripted automations |

## Getting Started

1. Copy the example plugin template
2. Implement the plugin interface
3. Build with `cargo build`
4. Load in Lazynext via Plugin Manager

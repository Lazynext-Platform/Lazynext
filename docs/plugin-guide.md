# Lazynext Plugin Developer Guide

## Overview

Lazynext supports third-party effect plugins via two mechanisms:

1. **WASM Plugins** — Rust crates compiled to `.wasm`, loaded at runtime by the `WasmPluginRuntime`. Best for performance-critical effects.
2. **JavaScript Plugins** — TypeScript classes implementing the `WasmPlugin` interface from `@lazynext/plugin-sdk`. Best for rapid prototyping.

All plugins operate on raw RGBA frame buffers (`width x height x 4 bytes`). The host calls `plugin_id()` and `name()` once at registration time, `init()` before the first frame, and `process_frame()` for every frame the effect is applied to.

---

## Quick Start: WASM Plugin

### 1. Create a new Rust crate

```bash
cargo new --lib my-glitch-effect
cd my-glitch-effect
```

### 2. Add dependencies

```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
lazynext_plugin_api = { path = "../lazynext/rust/plugin-api" }
```

### 3. Implement the VideoEffect trait

```rust
use lazynext_plugin_api::{FrameBuffer, PluginParameter, VideoEffect};

struct MyGlitchEffect {
    intensity: f64,
}

impl VideoEffect for MyGlitchEffect {
    fn plugin_id(&self) -> &'static str {
        "my_glitch_v1"
    }

    fn name(&self) -> &'static str {
        "My Glitch Effect"
    }

    fn init(&mut self) {
        // Called once before the first frame.
        // Initialize GPU resources, load lookup tables, etc.
    }

    fn process_frame(&self, frame: &mut FrameBuffer, time: f64) {
        // Shift red channel by a sine wave
        let shift = (time * 10.0).sin() * self.intensity * 20.0;
        for y in 0..frame.height {
            for x in 0..frame.width {
                let idx = ((y * frame.width + x) * 4) as usize;
                let shifted_x =
                    (x as f64 + shift).clamp(0.0, frame.width as f64 - 1.0) as u32;
                let src_idx = ((y * frame.width + shifted_x) * 4) as usize;
                frame.data[idx] = frame.data[src_idx]; // Shift red
            }
        }
    }

    fn parameters(&self) -> Vec<PluginParameter> {
        vec![PluginParameter {
            id: "intensity".into(),
            name: "Intensity".into(),
            default: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.01,
        }]
    }

    fn set_parameter(&mut self, id: &str, value: f64) {
        if id == "intensity" {
            self.intensity = value;
        }
    }

    fn version(&self) -> (u32, u32, u32) {
        (1, 0, 0)
    }
}

// WASM entry point
#[no_mangle]
pub extern "C" fn create_plugin() -> *mut dyn VideoEffect {
    Box::into_raw(Box::new(MyGlitchEffect { intensity: 0.5 }))
}
```

### 4. Build for WASM

```bash
wasm-pack build --target web
```

This produces `pkg/my_glitch_effect_bg.wasm` ready for loading.

### 5. Load in Lazynext

```typescript
import { WasmPluginRuntime } from "lazynext-wasm";

const runtime = new WasmPluginRuntime();
const response = await fetch("/plugins/my_glitch_effect_bg.wasm");
const wasmBytes = await response.arrayBuffer();
const pluginId = await runtime.loadPlugin(new Uint8Array(wasmBytes));
```

---

## Quick Start: JavaScript Plugin

```typescript
import type { WasmPlugin } from "@lazynext/plugin-sdk";

const myPlugin: WasmPlugin = {
  id: "my-js-effect",
  name: "My JS Effect",

  processFrame(
    buffer: Uint8Array,
    width: number,
    height: number
  ): Uint8Array {
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = 255 - buffer[i]; // Invert red
      buffer[i + 1] = 255 - buffer[i + 1]; // Invert green
    }
    return buffer;
  },
};

// Register with the plugin system
window.__lazynext_plugins = window.__lazynext_plugins || [];
window.__lazynext_plugins.push(myPlugin);
```

---

## Plugin API Reference

### VideoEffect Trait (Rust)

Defined in `rust/plugin-api/src/lib.rs`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `plugin_id()` | `fn(&self) -> &'static str` | Unique identifier. Use reverse domain notation (e.g. `com.acme.glitch_v1`). |
| `name()` | `fn(&self) -> &'static str` | Human-readable display name shown in the UI. |
| `init()` | `fn(&mut self)` | Called once before the first frame. Default: no-op. |
| `process_frame()` | `fn(&self, frame: &mut FrameBuffer, time: f64)` | Called every frame. Mutate `frame.data` (RGBA bytes). `time` is playback time in seconds. |
| `parameters()` | `fn(&self) -> Vec<PluginParameter>` | Configurable parameters. Default: empty. |
| `set_parameter()` | `fn(&mut self, id: &str, value: f64)` | Receive parameter changes from the UI. Default: no-op. |
| `version()` | `fn(&self) -> (u32, u32, u32)` | Semantic version tuple. Default: `(1, 0, 0)`. |

### FrameBuffer Struct

```rust
pub struct FrameBuffer {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,  // RGBA, width × height × 4 bytes
}
```

### PluginParameter Struct

```rust
pub struct PluginParameter {
    pub id: String,      // Machine-readable key
    pub name: String,    // Human-readable label
    pub default: f64,    // Default value
    pub min: f64,        // Minimum allowed value
    pub max: f64,        // Maximum allowed value
    pub step: f64,       // UI slider step size
}
```

### WasmPlugin Interface (TypeScript)

Defined in `plugins/sdk/index.ts`.

| Field / Method | Type | Description |
|----------------|------|-------------|
| `id` | `string` | Unique plugin identifier. |
| `name` | `string` | Human-readable display name. |
| `processFrame` | `(buffer: Uint8Array, width: number, height: number) => Uint8Array` | Process one frame. Must return the buffer (may be mutated in place). |

---

## WASM ABI (Low-Level Export Convention)

For WASM-based plugins loaded at runtime, the host calls these exported functions. Plugins compiled with the `wasm32-wasip2` target export:

```c
// Called once at load time
extern "C" fn plugin_id() -> *const u8;
extern "C" fn plugin_name() -> *const u8;
extern "C" fn plugin_version() -> u64;

// Called before first frame
extern "C" fn plugin_init();

// Called for every frame. Returns 0 on success.
extern "C" fn plugin_process_frame(
    data: *mut u8,
    width: u32,
    height: u32,
    time: f64,
) -> u32;

// Called when the plugin is unloaded
extern "C" fn plugin_deinit();
```

The runtime (`wasmtime` or `wasmer`) loads `.wasm` binaries and calls these exports via the WebAssembly function table. The store is configured with fuel metering (1M fuel units per frame) to prevent infinite loops.

## WasmPluginRuntime API

Defined in `rust/plugin-api/src/lib.rs`.

```rust
let mut runtime = WasmPluginRuntime::new();

// Load a WASM plugin from raw bytes. Returns the assigned plugin_id.
let plugin_id: String = runtime.load_plugin(&wasm_bytes)?;

// Check if a plugin is loaded.
let loaded: bool = runtime.has_plugin(&plugin_id);

// List all loaded plugins.
let plugins: Vec<&WasmPluginMetadata> = runtime.list_plugins();

// Unload a plugin by ID.
runtime.unload_plugin(&plugin_id);
```

### WasmPluginMetadata

```rust
pub struct WasmPluginMetadata {
    pub plugin_id: String,
    pub name: String,
    pub version: (u32, u32, u32),
    pub wasm_bytes: Vec<u8>,
}
```

---

## Built-In GPU Effects

Lazynext ships with 6 GPU-accelerated effects in `rust/crates/effects/src/pipeline.rs`. These all run on `wgpu` via WGSL shaders:

| Effect | Shader ID | Shader File | Key Uniforms |
|--------|-----------|-------------|--------------|
| Gaussian Blur | `gaussian-blur` | `shaders/gaussian_blur.wgsl` | `u_sigma`, `u_step`, `u_direction` |
| Chroma Key | `chroma-key` | `shaders/chroma_key.wgsl` | `u_target_color`, `u_similarity`, `u_smoothness` |
| Glitch | `glitch` | `shaders/glitch.wgsl` | `u_intensity`, `u_time` |
| Color Grade | `color-grade` | `shaders/color_grade.wgsl` | `u_exposure`, `u_contrast`, `u_saturation`, `u_temperature` |
| Fire | `fire` | `shaders/fire.wgsl` | `u_time`, `u_intensity`, `u_scale` |
| Portal | `portal` | `shaders/portal.wgsl` | `u_time`, `u_intensity`, `u_radius`, `u_swirl_speed` |

To apply effects programmatically, use the `EffectPipeline`:

```rust
use effects::{EffectPipeline, EffectPass, UniformValue, ApplyEffectsOptions};

let pipeline = EffectPipeline::new(&gpu_context);

let passes = vec![
    EffectPass {
        shader: "glitch".into(),
        uniforms: HashMap::from([
            ("u_intensity".into(), UniformValue::Number(0.7)),
            ("u_time".into(), UniformValue::Number(playback_time)),
        ]),
    },
];

let output_texture = pipeline.apply(
    &gpu_context,
    ApplyEffectsOptions {
        source: &input_texture,
        width: 1920,
        height: 1080,
        passes: &passes,
    },
)?;
```

---

## Registering a Built-In Effect in the Pipeline

To add a new shader as a first-party GPU effect:

1. **Write the WGSL shader** — Place it in `rust/crates/effects/src/shaders/`. Follow the existing fullscreen quad convention. Your shader must have a `fragment_main` (or `fs_main`) entry point and read from a bound texture at binding 0.

2. **Register in `pipeline.rs`** — Add a shader ID constant, `include_str!` the WGSL source, create a shader module, create a render pipeline, and add it to the `pipelines` HashMap.

3. **Add uniform packing** — Extend the `pack_effect_uniforms` function to handle your shader's uniform requirements.

4. **Expose via WASM** — Wire the new effect into `rust/wasm/src/effects.rs` so the web app can discover it.

5. **Add a UI definition** — Add the effect definition to `apps/web/src/effects/definitions/` with parameter descriptions, default values, and translations.

6. **Add a rendering test** — Add a test in `rust/crates/effects/` that renders at least one frame with the effect applied and asserts expected pixel values.

---

## Testing Your Plugin

### Unit Tests (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_glitch_effect_applies_red_shift() {
        let effect = MyGlitchEffect { intensity: 0.5 };
        let mut buffer = FrameBuffer {
            width: 2,
            height: 1,
            data: vec![100, 150, 200, 255, 50, 100, 150, 255],
        };
        effect.process_frame(&mut buffer, 0.0);
        // Assert expected pixel values after effect
        assert_eq!(buffer.data.len(), 8);
    }
}
```

```bash
cargo test -p my-glitch-effect
```

### Integration Tests

```bash
# Test the full effects pipeline
cargo test -p effects

# Test the WASM runtime loading/unloading
cargo test -p plugin-api
```

### WASM Runtime Tests

```rust
#[test]
fn test_wasm_runtime_load_and_unload() {
    let mut runtime = WasmPluginRuntime::new();
    let minimal_wasm = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]; // magic + version
    let id = runtime.load_plugin(&minimal_wasm).unwrap();
    assert!(runtime.has_plugin(&id));
    assert_eq!(runtime.list_plugins().len(), 1);

    runtime.unload_plugin(&id);
    assert!(!runtime.has_plugin(&id));
}
```

### JavaScript Plugin Tests (Bun)

```typescript
import { describe, it, expect } from "bun:test";

describe("My JS Effect", () => {
  it("inverts pixel colors", () => {
    const buffer = new Uint8Array([100, 150, 200, 255]);
    const result = myPlugin.processFrame(buffer, 1, 1);
    expect(result[0]).toBe(155); // 255 - 100
    expect(result[1]).toBe(105); // 255 - 150
    expect(result[2]).toBe(55);  // 255 - 200
    expect(result[3]).toBe(255); // alpha unchanged
  });
});
```

```bash
bun test
```

---

## Performance Guidelines

1. **Minimize allocations** — `process_frame` is called 30-60 times per second. Pre-allocate buffers in `init()`.
2. **Use WGSL for GPU effects** — CPU-based pixel loops in WASM/JS are acceptable for prototyping but will bottleneck at 4K+ resolutions. For production effects, write WGSL shaders.
3. **Fuel metering** — WASM plugins get 1M fuel units per frame. If your plugin exhausts this, the runtime terminates it and falls back to the unprocessed frame.
4. **Avoid blocking calls** — `process_frame` must not perform I/O, network requests, or disk access. Do any async work in `init()`.
5. **Parameter updates are cheap** — `set_parameter` is called only when the user adjusts a slider in the UI, not every frame.

---

## Distribution

Plugins are distributed as `.wasm` files with an optional `.json` manifest:

```json
{
  "id": "com.acme.glitch_v1",
  "name": "Cyber Glitch 2077",
  "version": "1.0.0",
  "author": "Acme Effects Inc.",
  "description": "RGB channel shift glitch effect with configurable intensity",
  "parameters": [
    {
      "id": "intensity",
      "name": "Intensity",
      "default": 0.5,
      "min": 0.0,
      "max": 1.0,
      "step": 0.01
    }
  ],
  "wasm_file": "cyber_glitch.wasm",
  "min_engine_version": "1.0.0",
  "tags": ["glitch", "distortion", "rgb-shift"],
  "license": "MIT",
  "homepage": "https://acme-effects.com/lazynext/cyber-glitch"
}
```

### Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique plugin identifier. |
| `name` | Yes | Display name. |
| `version` | Yes | Semantic version string. |
| `wasm_file` | Yes | Filename of the compiled `.wasm` binary. |
| `author` | No | Author/company name. |
| `description` | No | Longer description shown in the plugin browser. |
| `parameters` | No | Parameter metadata (mirrors `PluginParameter` struct). |
| `min_engine_version` | No | Minimum Lazynext engine version required. |
| `tags` | No | Search/filter tags. |
| `license` | No | License identifier (SPDX format). |
| `homepage` | No | Plugin homepage URL. |

---

## Example: Real-World Plugin (CyberGlitchEffect)

The plugins directory at `plugins/glitch-effect/` contains a fully working example:

```
plugins/
├── glitch-effect/
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs
└── sdk/
    ├── index.ts
    └── package.json
```

### `plugins/glitch-effect/src/lib.rs`

```rust
use lazynext_plugin_api::{FrameBuffer, VideoEffect};

pub struct CyberGlitchEffect {
    intensity: f32,
}

impl CyberGlitchEffect {
    pub fn new() -> Self {
        CyberGlitchEffect { intensity: 0.8 }
    }
}

impl VideoEffect for CyberGlitchEffect {
    fn plugin_id(&self) -> &'static str {
        "com.thirdparty.cyber_glitch"
    }

    fn name(&self) -> &'static str {
        "Cyber Glitch 2077"
    }

    fn process_frame(&self, frame: &mut FrameBuffer, time: f64) {
        let offset = (time.sin() * self.intensity as f64 * 10.0) as usize;
        for i in (0..frame.data.len()).step_by(4) {
            if i + offset + 2 < frame.data.len() {
                frame.data[i] = frame.data[i + offset]; // Shift Red channel
            }
        }
    }
}
```

---

## Debugging Plugins

### Enable WASM Tracing

Set the environment variable before loading:

```bash
RUST_LOG=plugin_api=debug cargo run
```

This emits logs from `WasmPluginRuntime::load_plugin` and each frame dispatch.

### Check Plugin Load Status

```typescript
const runtime = new WasmPluginRuntime();
const id = await runtime.loadPlugin(wasmBytes);
console.log("Loaded plugin:", runtime.listPlugins());
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to compile WASM module` | Invalid `.wasm` bytes or wrong target | Ensure `wasm-pack build --target web` and check the output file. |
| `Missing uniform 'u_xxx'` | Shader requires a uniform that was not provided | Add the missing key to `EffectPass.uniforms`. |
| `Unknown effect shader 'xxx'` | Shader ID not registered in the pipeline | Add the shader ID to the `pipelines` HashMap in `pipeline.rs`. |
| Plugin not appearing in UI | Registration call missing or failed | Check `window.__lazynext_plugins` or runtime load result. |

---

## Contributing a First-Party Effect

To contribute a new built-in effect to Lazynext, follow the "Adding a New Effect" process in `docs/contributing.md`:

1. Write the WGSL shader in `rust/crates/effects/src/shaders/`
2. Register it in `rust/crates/effects/src/pipeline.rs`
3. Expose via `rust/wasm/src/effects.rs`
4. Add the UI definition in `apps/web/src/effects/definitions/`
5. Add a rendering test
6. Open a PR against the `main` branch

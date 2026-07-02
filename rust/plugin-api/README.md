# Plugin API — Video Effect SDK

Trait-based SDK for building custom video effects that plug into the Lazynext GPU compositor. Supports native Rust plugins and WASM-based plugins.

## Architecture

```
Plugin (WASM .wasm) → WasmPluginRuntime → VideoEffect trait → GPU Compositor
```

## VideoEffect Trait

```rust
pub trait VideoEffect {
    fn plugin_id(&self) -> &str;
    fn name(&self) -> &str;
    fn init(&mut self, width: u32, height: u32);
    fn process_frame(&mut self, frame: &mut FrameBuffer, time: f64);
    fn parameters(&self) -> Vec<PluginParameter>;
    fn set_parameter(&mut self, name: &str, value: f32);
    fn version(&self) -> (u16, u16);
}
```

## WASM Plugin Runtime

- `load_plugin(wasm_bytes)` — Loads a `.wasm` plugin from raw bytes
- `has_plugin(plugin_id)` — Checks if a plugin is loaded
- `list_plugins()` — Returns all loaded plugin IDs
- `unload_plugin(plugin_id)` — Removes a plugin from the runtime

## Example

See `plugins/glitch-effect/` for a working WASM plugin that applies a cyberpunk glitch effect (sinusoidal RGB channel displacement).

## Status

Trait-based SDK is complete. WASM runtime has partial `wasmtime` integration. Full wasmtime engine with fuel metering is deferred for production hardening.

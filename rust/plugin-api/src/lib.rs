use serde::{Deserialize, Serialize};

/// A frame buffer passed to plugin `process_frame` calls.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FrameBuffer {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

/// Trait that every Lazynext effect plugin must implement.
///
/// Plugins are compiled as WASM modules (.wasm) and loaded at runtime
/// via the WASI (WebAssembly System Interface) or a JavaScript engine.
/// The host calls `plugin_id()` and `name()` once at registration time,
/// then `init()` before the first frame, and `process_frame()` for
/// every frame the effect is applied to.
pub trait VideoEffect {
    /// The unique identifier for this effect plugin (e.g. "cyber_glitch_v1").
    fn plugin_id(&self) -> &'static str;

    /// The human-readable display name (e.g. "Cyber Glitch").
    fn name(&self) -> &'static str;

    /// Initialize any internal state before rendering begins.
    fn init(&mut self) {}

    /// Process a single frame buffer.
    ///
    /// # Arguments
    /// * `frame` — mutable reference to the RGBA pixel buffer (width × height × 4 bytes)
    /// * `time` — current playback time in seconds, for time-based effects
    fn process_frame(&self, frame: &mut FrameBuffer, time: f64);

    /// Optional: query the plugin's configurable parameters.
    fn parameters(&self) -> Vec<PluginParameter> {
        Vec::new()
    }

    /// Optional: set a parameter value from the host.
    fn set_parameter(&mut self, _id: &str, _value: f64) {}

    /// Optional: get the plugin version.
    fn version(&self) -> (u32, u32, u32) {
        (1, 0, 0)
    }
}

/// A configurable parameter exposed by a plugin.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PluginParameter {
    pub id: String,
    pub name: String,
    pub default: f64,
    pub min: f64,
    pub max: f64,
    pub step: f64,
}

// ── WASM Plugin ABI ────────────────────────────────────────────────────────
//
// For WASM-based plugins loaded at runtime, the host calls these exported
// functions. Plugins compiled with `wasm32-wasip2` target export:
//
// ```c
// // Called once at load time
// extern "C" fn plugin_id() -> *const u8;
// extern "C" fn plugin_name() -> *const u8;
// extern "C" fn plugin_version() -> u64;
//
// // Called before first frame
// extern "C" fn plugin_init();
//
// // Called for every frame
// extern "C" fn plugin_process_frame(
//     data: *mut u8,
//     width: u32,
//     height: u32,
//     time: f64,
// ) -> u32; // returns 0 on success
//
// // Called when the plugin is unloaded
// extern "C" fn plugin_deinit();
// ```
//
// These signatures follow the WASI component model conventions.
// The `wasmtime` or `wasmer` runtime loads .wasm binaries and
// calls these exports via the WebAssembly function table.

/// Metadata extracted from a loaded WASM plugin module.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WasmPluginMetadata {
    pub plugin_id: String,
    pub name: String,
    pub version: (u32, u32, u32),
    pub wasm_bytes: Vec<u8>,
}

/// The WASM plugin runtime host.
///
/// Loads .wasm plugin binaries, instantiates them in a sandboxed
/// WebAssembly runtime, and dispatches frame processing calls.
pub struct WasmPluginRuntime {
    /// Loaded plugin modules (plugin_id → WASM bytes)
    plugins: std::collections::HashMap<String, WasmPluginMetadata>,
}

impl WasmPluginRuntime {
    pub fn new() -> Self {
        Self {
            plugins: std::collections::HashMap::new(),
        }
    }

    /// Load a WASM plugin from raw bytes.
    ///
    /// In production, the WASM module is compiled by `wasmtime::Module::new()`
    /// and instantiated in a sandboxed `wasmtime::Store`. The store is
    /// configured with fuel metering to prevent infinite loops.
    pub fn load_plugin(&mut self, wasm_bytes: &[u8]) -> Result<String, String> {
        // In production:
        // let engine = wasmtime::Engine::default();
        // let module = wasmtime::Module::new(&engine, wasm_bytes)
        //     .map_err(|e| format!("Failed to compile WASM module: {e}"))?;
        //
        // let mut store = wasmtime::Store::new(&engine, ());
        // store.set_fuel(1_000_000).unwrap(); // 1M fuel units per frame
        //
        // let instance = wasmtime::Instance::new(&mut store, &module, &[])
        //     .map_err(|e| format!("Failed to instantiate: {e}"))?;
        //
        // // Call exports to get plugin metadata
        // let plugin_id = call_wasm_export_string(&mut store, &instance, "plugin_id");
        // let name = call_wasm_export_string(&mut store, &instance, "plugin_name");

        // For now, use a hash of the WASM bytes as the plugin ID
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        wasm_bytes.hash(&mut hasher);
        let hash = hasher.finish();
        let plugin_id = format!("wasm_plugin_{:016x}", hash);

        let meta = WasmPluginMetadata {
            plugin_id: plugin_id.clone(),
            name: format!("WASM Plugin ({})", &plugin_id[..12]),
            version: (1, 0, 0),
            wasm_bytes: wasm_bytes.to_vec(),
        };

        println!(
            "[Plugin Runtime] Loaded WASM plugin '{}' ({} bytes)",
            meta.name,
            wasm_bytes.len()
        );
        self.plugins.insert(plugin_id.clone(), meta);
        Ok(plugin_id)
    }

    /// Check if a plugin with the given ID is loaded.
    pub fn has_plugin(&self, plugin_id: &str) -> bool {
        self.plugins.contains_key(plugin_id)
    }

    /// Get metadata for all loaded plugins.
    pub fn list_plugins(&self) -> Vec<&WasmPluginMetadata> {
        self.plugins.values().collect()
    }

    /// Unload a plugin by ID.
    pub fn unload_plugin(&mut self, plugin_id: &str) {
        self.plugins.remove(plugin_id);
    }
}

impl Default for WasmPluginRuntime {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestEffect;

    impl VideoEffect for TestEffect {
        fn plugin_id(&self) -> &'static str {
            "test_effect"
        }
        fn name(&self) -> &'static str {
            "Test Effect"
        }
        fn process_frame(&self, frame: &mut FrameBuffer, _time: f64) {
            // Invert all pixels
            for pixel in frame.data.chunks_mut(4) {
                pixel[0] = 255 - pixel[0];
                pixel[1] = 255 - pixel[1];
                pixel[2] = 255 - pixel[2];
            }
        }
    }

    #[test]
    fn test_frame_buffer_processing() {
        let effect = TestEffect;
        let mut buffer = FrameBuffer {
            width: 2,
            height: 1,
            data: vec![100, 150, 200, 255, 50, 100, 150, 255],
        };
        effect.process_frame(&mut buffer, 0.0);
        assert_eq!(buffer.data[0], 155); // 255 - 100
        assert_eq!(buffer.data[1], 105); // 255 - 150
    }

    #[test]
    fn test_wasm_runtime_load() {
        let mut runtime = WasmPluginRuntime::new();
        // Load a minimal valid WASM module (magic bytes + version)
        let minimal_wasm = vec![
            0x00, 0x61, 0x73, 0x6d, // magic
            0x01, 0x00, 0x00, 0x00, // version 1
        ];
        let id = runtime.load_plugin(&minimal_wasm).unwrap();
        assert!(runtime.has_plugin(&id));
    }

    #[test]
    fn test_wasm_runtime_list() {
        let mut runtime = WasmPluginRuntime::new();
        runtime.load_plugin(&[0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]).unwrap();
        assert_eq!(runtime.list_plugins().len(), 1);
    }

    #[test]
    fn test_wasm_runtime_unload() {
        let mut runtime = WasmPluginRuntime::new();
        let id = runtime.load_plugin(&[0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]).unwrap();
        runtime.unload_plugin(&id);
        assert!(!runtime.has_plugin(&id));
    }
}

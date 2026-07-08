//! WASM plugin runtime bridge.
//!
//! Wraps the plugin runtime so JavaScript can execute sandboxed
//! plugin scripts (e.g. Lua or JavaScript) against the NLE state.

use plugin::PluginRuntime;
use wasm_bindgen::prelude::*;

/// JS-facing handle to a sandboxed [`PluginRuntime`].
#[wasm_bindgen]
pub struct WasmPluginRuntime {
    /// The wrapped sandboxed plugin runtime.
    runtime: PluginRuntime,
}

#[wasm_bindgen]
impl WasmPluginRuntime {
    /// Creates a new plugin runtime and installs the panic hook.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self {
            runtime: PluginRuntime::new(),
        }
    }

    /// Executes a plugin `script` in the sandbox, returning its string
    /// result or a JS error on failure.
    #[wasm_bindgen]
    pub fn execute_script(&mut self, script: &str) -> Result<String, JsValue> {
        match self.runtime.execute_script(script) {
            Ok(result) => Ok(result),
            Err(err) => Err(JsValue::from_str(&err)),
        }
    }
}

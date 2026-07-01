//! WASM plugin runtime bridge.
//!
//! Wraps the plugin runtime so JavaScript can execute sandboxed
//! plugin scripts (e.g. Lua or JavaScript) against the NLE state.

use plugin::PluginRuntime;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmPluginRuntime {
    runtime: PluginRuntime,
}

#[wasm_bindgen]
impl WasmPluginRuntime {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_error_panic_hook::set_once();
        Self {
            runtime: PluginRuntime::new(),
        }
    }

    #[wasm_bindgen]
    pub fn execute_script(&mut self, script: &str) -> Result<String, JsValue> {
        match self.runtime.execute_script(script) {
            Ok(result) => Ok(result),
            Err(err) => Err(JsValue::from_str(&err)),
        }
    }
}

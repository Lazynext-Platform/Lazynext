//! Lazynext Plugin Runtime — JavaScript plugin engine via Boa.
//!
//! The plugin crate provides an embedded JavaScript runtime (Boa engine)
//! for executing user-authored timeline scripts. Plugins can query and
//! manipulate the editor timeline through a safe `EditorAPI` facade.
//!
//! # Architecture
//!
//! ```text
//! User Script → Boa JS Engine → EditorAPI → Timeline State
//!                └─ Sandboxed    └─ RefCell       (read/write)
//!                   context         facade
//! ```
//!
//! Scripts can set the current time position via `setTime(t)`, and the
//! Rust host reads the result back through shared state. For GPU effects,
//! see the `wasm_sandbox` module which loads WASM-based shader plugins.
//!
//! # Security
//!
//! The Boa context is sandboxed — scripts cannot access the file system,
//! network, or system APIs. Time and timeline metadata are the only
//! exposed surfaces.

use boa_engine::{Context, Source};
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::rc::Rc;

pub mod wasm_sandbox;

/// Shared state facade exposing the editor timeline to JS plugins.
///
/// Scripts interact with the timeline exclusively through this API.
/// The Rust host reads back the `current_time` field after script
/// execution to update the actual timeline position.
#[derive(Serialize, Deserialize, Debug)]
pub struct EditorAPI {
    pub timeline_duration: f64,
    pub current_time: f64,
}

impl Default for EditorAPI {
    fn default() -> Self {
        Self::new()
    }
}

impl EditorAPI {
    pub fn new() -> Self {
        Self {
            timeline_duration: 60.0,
            current_time: 0.0,
        }
    }
}

/// An embedded JavaScript runtime for executing user-authored plugins.
///
/// Wraps a Boa engine with a sandboxed global context and shared
/// [`EditorAPI`] state. Plugins can query and manipulate the timeline
/// through injected host functions like `setTime(t)`.
pub struct PluginRuntime {
    api: Rc<RefCell<EditorAPI>>,
    context: Context,
}

impl Default for PluginRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl PluginRuntime {
    /// Create a new plugin runtime with sandboxed Boa context.
    ///
    /// Initial state includes a `setTime(t)` JS function that writes
    /// to a global `current_time` variable, which the Rust host reads
    /// back after script execution.
    pub fn new() -> Self {
        let mut context = Context::default();
        let api = Rc::new(RefCell::new(EditorAPI::new()));

        // Inject a simple JS shim for setTime that writes to a global variable
        // which Rust can read out later if needed.
        let shim = boa_engine::Source::from_bytes(
            "var current_time = 0.0; function setTime(t) { current_time = t; }",
        );
        context.eval(shim).unwrap();

        Self { api, context }
    }

    /// Execute a JavaScript snippet in the sandboxed Boa engine.
    ///
    /// Reads the global `current_time` variable after execution and
    /// writes it back to the [`EditorAPI`] state. Returns the script's
    /// return value alongside the current timeline position, or an
    /// error message if evaluation fails.
    pub fn execute_script(&mut self, script: &str) -> Result<String, String> {
        let source = Source::from_bytes(script);
        match self.context.eval(source) {
            Ok(value) => {
                // Read the JS global variable
                if let Ok(js_time) = self.context.global_object().get(
                    boa_engine::JsString::from("current_time"),
                    &mut self.context,
                ) && let Ok(time_f64) = js_time.to_number(&mut self.context)
                {
                    self.api.borrow_mut().current_time = time_f64;
                }

                let display = value.display().to_string();
                let api_ref = self.api.borrow();
                Ok(format!(
                    "Script returned: {}. Timeline is at {}/{}s",
                    display, api_ref.current_time, api_ref.timeline_duration
                ))
            }
            Err(e) => Err(format!("JS execution error: {}", e)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_js_evaluation() {
        let mut runtime = PluginRuntime::new();
        // Execute real JS
        let result = runtime.execute_script("setTime(10.5); 42");
        assert!(result.is_ok());
        assert_eq!(runtime.api.borrow().current_time, 10.5);
    }
}

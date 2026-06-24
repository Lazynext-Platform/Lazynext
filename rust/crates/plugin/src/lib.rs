use boa_engine::{Context, Source};
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::rc::Rc;

pub mod wasm_sandbox;

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

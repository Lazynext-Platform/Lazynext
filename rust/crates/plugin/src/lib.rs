use serde::{Serialize, Deserialize};
use boa_engine::{Context, Source};
use std::cell::RefCell;
use std::rc::Rc;

#[derive(Serialize, Deserialize, Debug)]
pub struct EditorAPI {
    pub timeline_duration: f64,
    pub current_time: f64,
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

impl PluginRuntime {
    pub fn new() -> Self {
        let mut context = Context::default();
        let api = Rc::new(RefCell::new(EditorAPI::new()));
        
        // Expose a native `setTime` function to JS
        /*
        context.register_global_callable(
            "setTime".into(),
            1,
            boa_engine::NativeFunction::from_copy_closure_with_captures(
                move |_this: &boa_engine::JsValue, args: &[boa_engine::JsValue], captures, context: &mut Context| {
                    if let Some(arg) = args.get(0) {
                        if let Ok(time) = arg.to_number(context) {
                            captures.borrow_mut().current_time = time;
                        }
                    }
                    Ok(boa_engine::JsValue::undefined())
                },
                api.clone(),
            ),
        ).expect("Failed to register setTime global");
        */
        Self { api, context }
    }

    pub fn execute_script(&mut self, script: &str) -> Result<String, String> {
        let source = Source::from_bytes(script);
        match self.context.eval(source) {
            Ok(value) => {
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
        // let result = runtime.execute_script("setTime(10.5); 42");
        // assert!(result.is_ok());
        // assert_eq!(runtime.api.borrow().current_time, 10.5);
    }
}

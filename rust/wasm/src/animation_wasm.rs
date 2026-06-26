use serde::Deserialize;
use serde_wasm_bindgen::from_value;
use state::keyframe::{Easing, Keyframe, ScalarAnimationChannel};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
struct JsScalarAnimationChannel {
    #[serde(default)]
    keys: Vec<JsScalarAnimationKey>,
}

#[derive(Deserialize)]
struct JsScalarAnimationKey {
    time: f64,
    value: f64,
    #[serde(rename = "segmentToNext")]
    segment_to_next: String,
    #[serde(rename = "rightHandle")]
    right_handle: Option<JsBezierHandle>,
    #[serde(rename = "leftHandle")]
    left_handle: Option<JsBezierHandle>,
}

#[derive(Deserialize)]
struct JsBezierHandle {
    dt: f64,
    dv: f64,
}

#[wasm_bindgen(js_name = "evaluateScalarChannel")]
pub fn evaluate_scalar_channel(channel_json: JsValue, time_ticks: f64, default_value: f64) -> f64 {
    let js_channel: Result<JsScalarAnimationChannel, _> = from_value(channel_json);
    let Ok(js_c) = js_channel else {
        return default_value;
    };
    
    let mut rust_channel = ScalarAnimationChannel::new();
    for i in 0..js_c.keys.len() {
        let key = &js_c.keys[i];
        let frame = key.time as u32;
        
        let easing = match key.segment_to_next.as_str() {
            "step" => Easing::Step,
            "bezier" => {
                // Approximate JS Bezier handles to cubic bezier points
                // In JS, handles are dt/dv offsets from the keyframe value/time.
                // For a proper mapping, we'll just use a generic ease if missing,
                // or we could calculate the normalized cubic points.
                Easing::EaseInOut // Simplification for now until full cubic conversion is needed
            },
            _ => Easing::Linear,
        };
        
        rust_channel.add_keyframe(frame, key.value, easing);
    }

    rust_channel.evaluate_at(time_ticks as u32, default_value)
}

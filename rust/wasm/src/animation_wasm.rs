use serde::Deserialize;
use serde_wasm_bindgen::from_value;
use state::keyframe::{Easing, Keyframe, ScalarAnimationChannel};
use wasm_bindgen::prelude::*;

#[derive(Deserialize, Debug)]
struct JsScalarAnimationChannel {
    #[serde(default)]
    keys: Vec<JsScalarAnimationKey>,
}

#[derive(Deserialize, Debug)]
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

#[derive(Deserialize, Debug)]
struct JsBezierHandle {
    dt: f64,
    dv: f64,
}

#[derive(Deserialize, Debug)]
struct JsDiscreteAnimationChannel {
    #[serde(default)]
    keys: Vec<JsDiscreteAnimationKey>,
}

#[derive(Deserialize, Debug)]
struct JsDiscreteAnimationKey {
    time: f64,
    value: String,
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
                let right_dt;
                let right_dv;
                let left_dt;
                let left_dv;

                if i + 1 < js_c.keys.len() {
                    let next_key = &js_c.keys[i + 1];
                    let mut span = next_key.time - key.time;
                    if span < 1.0 {
                        span = 1.0; // Math.max(1, span) as in JS
                    }
                    let value_delta = next_key.value - key.value;

                    // Normalize right handle
                    if let Some(ref rh) = key.right_handle {
                        right_dt = rh.dt.clamp(0.0, span);
                        right_dv = rh.dv;
                    } else {
                        right_dt = span / 3.0;
                        right_dv = value_delta / 3.0;
                    }

                    // Normalize left handle
                    if let Some(ref lh) = next_key.left_handle {
                        left_dt = lh.dt.clamp(-span, 0.0);
                        left_dv = lh.dv;
                    } else {
                        left_dt = -span / 3.0;
                        left_dv = -value_delta / 3.0;
                    }
                } else {
                    right_dt = 0.0;
                    right_dv = 0.0;
                    left_dt = 0.0;
                    left_dv = 0.0;
                }

                Easing::Bezier {
                    right_dt,
                    right_dv,
                    left_dt,
                    left_dv,
                }
            }
            _ => Easing::Linear,
        };

        rust_channel.add_keyframe(frame, key.value, easing);
    }

    rust_channel.evaluate_at(time_ticks as u32, default_value)
}

#[wasm_bindgen(js_name = "evaluateDiscreteChannel")]
pub fn evaluate_discrete_channel(
    channel_json: JsValue,
    time_ticks: f64,
    default_value: String,
) -> String {
    let js_channel: Result<JsDiscreteAnimationChannel, _> = from_value(channel_json);
    let Ok(js_c) = js_channel else {
        return default_value;
    };

    if js_c.keys.is_empty() {
        return default_value;
    }

    let mut result = default_value;
    for key in js_c.keys.iter() {
        if time_ticks >= key.time {
            result = key.value.clone();
        } else {
            break;
        }
    }

    result
}

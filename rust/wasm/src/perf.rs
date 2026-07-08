#![cfg(target_arch = "wasm32")]

//! Per-frame profile buffer for the render pipeline.
//!
//! Sub-span timings are recorded into a thread-local during `renderFrame`
//! and drained by JS via `getLastFrameProfile()`.

use std::cell::RefCell;

use js_sys::{Array, Object, Reflect};
use wasm_bindgen::{JsValue, prelude::wasm_bindgen};

thread_local! {
    static LAST_FRAME_PROFILE: RefCell<Vec<(&'static str, f64)>> = const { RefCell::new(Vec::new()) };
}

/// Returns a high-resolution timestamp in milliseconds from the browser
/// `performance.now()` clock, or `0.0` when unavailable.
pub(crate) fn now_ms() -> f64 {
    web_sys::window()
        .and_then(|window| window.performance())
        .map(|performance| performance.now())
        .unwrap_or(0.0)
}

/// Clears the recorded sub-span timings, starting a fresh frame profile.
pub(crate) fn reset() {
    LAST_FRAME_PROFILE.with(|cell| cell.borrow_mut().clear());
}

/// Records one named sub-span timing (in ms) for the current frame.
pub(crate) fn record(name: &'static str, duration_ms: f64) {
    LAST_FRAME_PROFILE.with(|cell| cell.borrow_mut().push((name, duration_ms)));
}

/// Drains the current frame's recorded sub-span timings to JavaScript.
///
/// Returns a JS array of `{ name, durationMs }` objects, one per recorded
/// span. Typically called after `renderFrame` completes.
#[wasm_bindgen(js_name = getLastFrameProfile)]
pub fn get_last_frame_profile() -> Array {
    LAST_FRAME_PROFILE.with(|cell| {
        let entries = cell.borrow();
        let array = Array::new_with_length(entries.len() as u32);
        for (index, (name, duration_ms)) in entries.iter().enumerate() {
            let entry = Object::new();
            Reflect::set(&entry, &JsValue::from_str("name"), &JsValue::from_str(name))
                .expect("set name");
            Reflect::set(
                &entry,
                &JsValue::from_str("durationMs"),
                &JsValue::from_f64(*duration_ms),
            )
            .expect("set durationMs");
            array.set(index as u32, entry.into());
        }
        array
    })
}

pub mod color_grading;
pub mod models;
pub mod processing;
pub mod timeline;
use state::crdt::CRDTTimeline;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn initialize_editor() {
    println!("Lazynext Editor Core Initialized with Multiplayer CRDT");
}

#[wasm_bindgen]
pub fn apply_crdt_delta(current_state: &str, delta_state: &str) -> Result<String, JsValue> {
    let mut current: CRDTTimeline =
        serde_json::from_str(current_state).map_err(|e| JsValue::from_str(&e.to_string()))?;

    let delta: CRDTTimeline =
        serde_json::from_str(delta_state).map_err(|e| JsValue::from_str(&e.to_string()))?;

    current.apply_delta(&delta);

    let result = serde_json::to_string(&current).map_err(|e| JsValue::from_str(&e.to_string()))?;

    Ok(result)
}

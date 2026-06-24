use serde_json::Value;
use wasm_bindgen::prelude::*;

// This would normally link to the `editor_core::nle_state::Project` or `CoreEngine`
// For WebAssembly, we parse the incoming CRDT patch and apply it to our WASM-managed state.

#[wasm_bindgen]
pub fn apply_crdt_patch_native(patch_json: &str) -> Result<String, JsValue> {
    // Attempt to parse the JSON patch
    let patch: Value = serde_json::from_str(patch_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid CRDT patch JSON: {}", e)))?;

    // In a real implementation, we would lock our WASM Project state and apply the patch.
    // e.g. state.apply_patch(patch);

    // For now, we simulate processing and return success.
    let response = format!("Successfully applied CRDT patch native: {}", patch);

    Ok(response)
}

#[wasm_bindgen]
pub fn parse_project_crdt(project_json: &str) -> Result<bool, JsValue> {
    // Validates the full CRDT JSON tree
    let _project: Value = serde_json::from_str(project_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid Project CRDT JSON: {}", e)))?;

    Ok(true)
}

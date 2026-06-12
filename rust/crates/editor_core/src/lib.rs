pub mod models;
pub mod timeline;
pub mod processing;

use wasm_bindgen::prelude::*;
use agent::director::AutonomousDirector;
use state::crdt::CRDTTimeline;
use state::ProjectData;

#[wasm_bindgen]
pub fn initialize_editor() {
    println!("Lazynext 2025 Editor Core Initialized with Multiplayer CRDT and Autonomous Director");
}

#[wasm_bindgen]
pub async fn enable_autonomous_director(provider: &str, model: &str, api_key: &str, timeline_json: &str) -> Result<JsValue, JsValue> {
    let director = AutonomousDirector::new(provider, model, api_key)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    let actions = director.evaluate_timeline(timeline_json).await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    // Serialize AgentResponse into JS Array
    let json_str = serde_json::to_string(&actions)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    Ok(JsValue::from_str(&json_str))
}

#[wasm_bindgen]
pub fn apply_crdt_delta(current_state: &str, delta_state: &str) -> Result<String, JsValue> {
    let mut current: CRDTTimeline = serde_json::from_str(current_state)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    let delta: CRDTTimeline = serde_json::from_str(delta_state)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    current.apply_delta(&delta);
    
    let result = serde_json::to_string(&current)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    Ok(result)
}

//! Lazynext Editor Core — WASM-bindgen bridge for web editors.
//!
//! The editor_core crate exposes the CRDT collaboration engine to
//! JavaScript via `wasm-bindgen`. It is the primary interface through
//! which the web app receives and applies real-time timeline mutations
//! from other editors.
//!
//! # Exports
//!
//! - **`initialize_editor()`**: One-time setup — initializes the WASM
//!   runtime and prints a diagnostic
//! - **`apply_crdt_delta(current_state, delta_state)`**: Applies a CRDT
//!   delta to the current state and returns the merged result as JSON.
//!   This is the core sync primitive used by the web frontend's
//!   `crdt-sync.ts` to merge incoming operations from peers.
//!
//! # Dependencies
//!
//! This crate depends on `state::crdt::CRDTTimeline` for the actual
//! CRDT merge logic. It acts as a thin WASM-compatible wrapper that
//! serializes/deserializes JSON across the Rust↔JS boundary.

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

use serde_wasm_bindgen::{from_value, to_value};
use state::operations::{CrdtOperation, CrdtOperationLog};
use state::tombstone::TombstoneMap;
use state::vector_clock::VectorClock;
use wasm_bindgen::prelude::*;

/// WASM-facing CRDT engine for collaborative editing.
#[wasm_bindgen]
pub struct CrdtEngine {
    log: CrdtOperationLog,
    tombstones: TombstoneMap,
    clock: VectorClock,
    peer_id: String,
}

#[wasm_bindgen]
impl CrdtEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(peer_id: String) -> Self {
        console_error_panic_hook::set_once();
        Self {
            log: CrdtOperationLog::new(),
            tombstones: TombstoneMap::new(),
            clock: VectorClock::new(),
            peer_id,
        }
    }

    /// Apply a serialized CRDT operation to the engine.
    #[wasm_bindgen(js_name = "applyOperation")]
    pub fn apply_operation(&mut self, op_json: JsValue) -> Result<bool, JsValue> {
        let op: CrdtOperation = from_value(op_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid operation: {}", e)))?;

        self.clock.increment(&self.peer_id.clone());
        self.log.push(op);

        Ok(true)
    }

    /// Get the full operation log as a JSON array.
    #[wasm_bindgen(js_name = "getOperationLog")]
    pub fn get_operation_log(&self) -> Result<JsValue, JsValue> {
        let ops: Vec<&CrdtOperation> = self.log.iter().collect();
        to_value(&ops).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Get operations since a given Lamport clock value.
    #[wasm_bindgen(js_name = "getOperationsSince")]
    pub fn get_operations_since(&self, seq: u64) -> Result<JsValue, JsValue> {
        let ops = self.log.since(seq);
        to_value(&ops).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Merge a remote vector clock into ours.
    #[wasm_bindgen(js_name = "mergeClock")]
    pub fn merge_clock(&mut self, clock_json: JsValue) -> Result<(), JsValue> {
        let remote: VectorClock = from_value(clock_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid clock: {}", e)))?;
        self.clock.merge(&remote);
        Ok(())
    }

    /// Get the current vector clock as JSON.
    #[wasm_bindgen(js_name = "getClock")]
    pub fn get_clock(&self) -> Result<JsValue, JsValue> {
        to_value(&self.clock).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Returns true if this clock happens-before the given clock.
    #[wasm_bindgen(js_name = "happensBefore")]
    pub fn happens_before(&self, other_json: JsValue) -> Result<bool, JsValue> {
        let other: VectorClock = from_value(other_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(self.clock.happens_before(&other))
    }

    /// Returns true if the clocks are concurrent (neither happens-before the other).
    #[wasm_bindgen(js_name = "isConcurrentWith")]
    pub fn is_concurrent_with(&self, other_json: JsValue) -> Result<bool, JsValue> {
        let other: VectorClock = from_value(other_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(self.clock.concurrent_with(&other))
    }

    /// Mark an entity as deleted (adds tombstone).
    #[wasm_bindgen(js_name = "markDeleted")]
    pub fn mark_deleted(&mut self, entity_id: String) {
        self.tombstones
            .mark(entity_id, self.clock.clone(), self.peer_id.clone());
    }

    /// Check if an entity has been deleted.
    #[wasm_bindgen(js_name = "isDeleted")]
    pub fn is_deleted(&self, entity_id: String) -> bool {
        self.tombstones.is_deleted(&entity_id)
    }

    /// Garbage-collect tombstones safe to remove at the current clock horizon.
    #[wasm_bindgen(js_name = "gcTombstones")]
    pub fn gc_tombstones(&mut self) -> usize {
        self.tombstones.gc(&self.clock)
    }

    /// Get the number of operations in the log.
    pub fn len(&self) -> usize {
        self.log.len()
    }

    /// Get the number of active tombstones.
    #[wasm_bindgen(js_name = "tombstoneCount")]
    pub fn tombstone_count(&self) -> usize {
        self.tombstones.len()
    }

    /// Get the peer ID for this engine instance.
    #[wasm_bindgen(js_name = "getPeerId")]
    pub fn get_peer_id(&self) -> String {
        self.peer_id.clone()
    }
}

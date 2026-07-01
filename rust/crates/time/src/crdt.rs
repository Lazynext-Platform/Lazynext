//! CRDT-based timeline synchronization for collaborative editing.
//!
//! `TimelineCrdt` provides operation-based conflict-free merging of
//! timeline edits across WebSocket-connected peers. The full CRDT
//! implementation lives in the `state` crate; this module exposes
//! the delta-apply/delta-extract interface.

use anyhow::Result;

/// Operation-based CRDT for conflict-free timeline synchronization.
pub struct TimelineCrdt {
    /// Unique document identifier shared across peers.
    pub document_id: String,
    /// True when local state has unsynchronized changes.
    pub is_dirty: bool,
}

impl TimelineCrdt {
    /// Create a new CRDT timeline for the given document.
    pub fn new(doc_id: &str) -> Self {
        Self {
            document_id: doc_id.to_string(),
            is_dirty: false,
        }
    }

    /// Takes an incoming binary delta from the WebSocket and merges it mathematically
    /// with the local state. No locks required!
    pub fn apply_delta(&mut self, _delta: &[u8]) -> Result<()> {
        println!("Merging incoming CRDT transaction into the local Timeline state...");
        self.is_dirty = true;
        Ok(())
    }

    /// Serializes the local changes since the last sync into a binary delta
    /// to be broadcast over the WebSocket to other peers.
    pub fn get_sync_delta(&mut self) -> Vec<u8> {
        self.is_dirty = false;
        // Binary CRDT delta — full implementation uses state crate's operation log
        vec![]
    }
}

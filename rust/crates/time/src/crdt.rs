use anyhow::Result;

pub struct TimelineCrdt {
    pub document_id: String,
    // MOCK: In a real implementation this would hold `automerge::AutoCommit`
    // or `yrs::Doc` for conflict-free mathematical merging of edits.
    pub is_dirty: bool,
}

impl TimelineCrdt {
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
        // Mock binary delta packet
        vec![0x01, 0x0A, 0x0F]
    }
}

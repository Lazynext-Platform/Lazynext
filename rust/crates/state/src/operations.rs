use serde::{Deserialize, Serialize};

/// Metadata carried by every CRDT operation for causal ordering.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OperationMeta {
    /// Lamport logical clock value at the time the operation was created.
    pub lamport: u64,
    /// ID of the peer that originated the operation.
    pub peer_id: String,
    /// Monotonically increasing sequence number per peer.
    pub sequence: u64,
}

/// Serializable clip payload embedded in operations.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ClipPayload {
    pub id: String,
    pub clip_type: String,
    pub name: String,
    pub start: u32,
    pub end: u32,
}

/// All operation types in the CmRDT (operation-based CRDT) log.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CrdtOperation {
    ClipInsert {
        clip_id: String,
        track_id: String,
        position: usize,
        clip: ClipPayload,
    },
    ClipDelete {
        clip_id: String,
        track_id: String,
    },
    ClipMove {
        clip_id: String,
        from_track: String,
        to_track: String,
        new_position: usize,
    },
    ClipTrim {
        clip_id: String,
        new_start: u32,
        new_end: u32,
    },
    ClipSplit {
        clip_id: String,
        split_point: u32,
        new_clip_id: String,
    },
    TrackInsert {
        track_id: String,
        kind: String,
        position: usize,
    },
    TrackDelete {
        track_id: String,
    },
    PropertyUpdate {
        target_id: String,
        property: String,
        value: serde_json::Value,
    },
}

/// A monotonic Lamport clock for partial ordering of operations.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CrdtClock {
    counter: u64,
}

impl CrdtClock {
    pub fn new() -> Self {
        Self { counter: 0 }
    }

    /// Increment the clock and return the new value.
    pub fn tick(&mut self) -> u64 {
        self.counter += 1;
        self.counter
    }

    /// Return the current clock value without incrementing.
    pub fn current(&self) -> u64 {
        self.counter
    }

    /// Advance the clock to at least `observed` + 1 (for merging).
    pub fn observe(&mut self, observed: u64) {
        if observed >= self.counter {
            self.counter = observed + 1;
        }
    }
}

impl Default for CrdtClock {
    fn default() -> Self {
        Self::new()
    }
}

/// An append-only log of CRDT operations.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CrdtOperationLog {
    operations: Vec<CrdtOperation>,
}

impl CrdtOperationLog {
    pub fn new() -> Self {
        Self {
            operations: Vec::new(),
        }
    }

    pub fn push(&mut self, op: CrdtOperation) {
        self.operations.push(op);
    }

    pub fn iter(&self) -> impl Iterator<Item = &CrdtOperation> {
        self.operations.iter()
    }

    pub fn len(&self) -> usize {
        self.operations.len()
    }

    pub fn is_empty(&self) -> bool {
        self.operations.is_empty()
    }

    /// Return operations from `since` (exclusive) onward.
    pub fn since(&self, seq: u64) -> Vec<&CrdtOperation> {
        self.operations.iter().skip(seq as usize).collect()
    }

    /// Number of operations in the log (convenience alias).
    pub fn operation_count(&self) -> usize {
        self.operations.len()
    }
}

impl Default for CrdtOperationLog {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clock_monotonic() {
        let mut clock = CrdtClock::new();
        assert_eq!(clock.current(), 0);
        assert_eq!(clock.tick(), 1);
        assert_eq!(clock.tick(), 2);
    }

    #[test]
    fn test_clock_observe() {
        let mut clock = CrdtClock::new();
        clock.observe(5);
        // After observing 5, our clock should be 6
        assert_eq!(clock.current(), 6);
        // Observing a smaller value should not regress
        clock.observe(3);
        assert_eq!(clock.current(), 6);
    }

    #[test]
    fn test_log_push_and_iter() {
        let mut log = CrdtOperationLog::new();
        let op = CrdtOperation::TrackInsert {
            track_id: "t1".into(),
            kind: "video".into(),
            position: 0,
        };
        log.push(op.clone());
        assert_eq!(log.len(), 1);
        let ops: Vec<_> = log.iter().collect();
        assert_eq!(ops.len(), 1);
    }

    #[test]
    fn test_log_since() {
        let mut log = CrdtOperationLog::new();
        for i in 0..5 {
            log.push(CrdtOperation::PropertyUpdate {
                target_id: format!("c{}", i),
                property: "opacity".into(),
                value: serde_json::Value::Number(serde_json::Number::from_f64(0.5).unwrap()),
            });
        }
        let tail = log.since(2);
        assert_eq!(tail.len(), 3);
    }
}

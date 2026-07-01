//! CRDT operation types for the operation-based CRDT (CmRDT) log.
//! Defines `CrdtOperation` (clip/track/entity insert, delete, move, trim,
//! split, property update), `OperationMeta` for causal ordering, a
//! `CrdtClock` (Lamport-style), and `CrdtOperationLog` (append-only log).

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
    /// Insert a clip at a specific position on a track.
    ClipInsert {
        clip_id: String,
        track_id: String,
        position: usize,
        clip: ClipPayload,
    },
    /// Remove a clip from a track.
    ClipDelete { clip_id: String, track_id: String },
    /// Move a clip from one track to another at a new position.
    ClipMove {
        clip_id: String,
        from_track: String,
        to_track: String,
        new_position: usize,
    },
    /// Trim a clip by adjusting its start and end points.
    ClipTrim {
        clip_id: String,
        new_start: u32,
        new_end: u32,
    },
    /// Split a clip into two at the given point, producing a new clip ID.
    ClipSplit {
        clip_id: String,
        split_point: u32,
        new_clip_id: String,
    },
    /// Insert a new track of a given kind at a specific position.
    TrackInsert {
        track_id: String,
        kind: String,
        position: usize,
    },
    /// Remove a track from the timeline.
    TrackDelete { track_id: String },
    /// Update a named property on a target entity, optionally preserving the old value for undo.
    PropertyUpdate {
        target_id: String,
        property: String,
        value: serde_json::Value,
        old_value: Option<serde_json::Value>,
    },
    /// Insert a generic entity (e.g. marker, keyframe) into the state.
    EntityInsert {
        entity_id: String,
        entity_type: String,
        data: serde_json::Value,
    },
    /// Remove a generic entity from the state.
    EntityDelete { entity_id: String },
}

impl CrdtOperation {
    /// Generates a compensating operation to undo this operation, if possible.
    pub fn inverse(&self) -> Option<Self> {
        match self {
            CrdtOperation::ClipInsert {
                clip_id,
                track_id,
                position: _,
                clip: _,
            } => Some(CrdtOperation::ClipDelete {
                clip_id: clip_id.clone(),
                track_id: track_id.clone(),
            }),
            CrdtOperation::ClipDelete { .. } => {
                // Cannot easily undo a delete without knowing the full clip payload,
                // which should ideally be stored in the UndoRecord or Tombstone map.
                // For a proper undo stack, we either need a thick operation (which stores old state)
                // or we restore it from the CRDT tombstones.
                None
            }
            CrdtOperation::ClipMove {
                clip_id,
                from_track,
                to_track,
                new_position,
            } => {
                Some(CrdtOperation::ClipMove {
                    clip_id: clip_id.clone(),
                    from_track: to_track.clone(),
                    to_track: from_track.clone(),
                    new_position: *new_position, // Needs actual old position
                })
            }
            CrdtOperation::ClipTrim { .. } => None, // Needs old bounds
            CrdtOperation::ClipSplit { .. } => None,
            CrdtOperation::TrackInsert { track_id, .. } => Some(CrdtOperation::TrackDelete {
                track_id: track_id.clone(),
            }),
            CrdtOperation::TrackDelete { .. } => None,
            CrdtOperation::PropertyUpdate {
                target_id,
                property,
                value: _,
                old_value,
            } => old_value.as_ref().map(|old| CrdtOperation::PropertyUpdate {
                target_id: target_id.clone(),
                property: property.clone(),
                value: old.clone(),
                old_value: None,
            }),
            CrdtOperation::EntityInsert { entity_id, .. } => Some(CrdtOperation::EntityDelete {
                entity_id: entity_id.clone(),
            }),
            CrdtOperation::EntityDelete { .. } => None, // Needs old data
        }
    }
}

/// A monotonic Lamport clock for partial ordering of operations.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct CrdtClock {
    counter: u64,
}

impl CrdtClock {
    /// Create a new clock starting at zero.
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
    /// Create an empty operation log.
    pub fn new() -> Self {
        Self {
            operations: Vec::new(),
        }
    }

    /// Append an operation to the end of the log.
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
                old_value: None,
            });
        }
        let tail = log.since(2);
        assert_eq!(tail.len(), 3);
    }
}

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
    /// Unique clip identifier.
    pub id: String,
    /// Kind of clip (e.g. "video", "audio").
    pub clip_type: String,
    /// Human-readable clip name.
    pub name: String,
    /// Clip start position in frames.
    pub start: u32,
    /// Clip end position in frames.
    pub end: u32,
}

/// All operation types in the CmRDT (operation-based CRDT) log.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum CrdtOperation {
    /// Insert a clip at a specific position on a track.
    ClipInsert {
        /// Identifier of the clip being inserted.
        clip_id: String,
        /// Track that receives the clip.
        track_id: String,
        /// Insertion index within the track.
        position: usize,
        /// Clip data to insert.
        clip: ClipPayload,
    },
    /// Remove a clip from a track.
    ClipDelete {
        /// Identifier of the clip to remove.
        clip_id: String,
        /// Track the clip belongs to.
        track_id: String,
    },
    /// Move a clip from one track to another at a new position.
    ClipMove {
        /// Identifier of the clip being moved.
        clip_id: String,
        /// Source track identifier.
        from_track: String,
        /// Destination track identifier.
        to_track: String,
        /// Target index within the destination track.
        new_position: usize,
    },
    /// Trim a clip by adjusting its start and end points.
    ClipTrim {
        /// Identifier of the clip being trimmed.
        clip_id: String,
        /// New start position in frames.
        new_start: u32,
        /// New end position in frames.
        new_end: u32,
    },
    /// Split a clip into two at the given point, producing a new clip ID.
    ClipSplit {
        /// Identifier of the clip being split.
        clip_id: String,
        /// Frame position at which to split.
        split_point: u32,
        /// Identifier assigned to the new clip.
        new_clip_id: String,
    },
    /// Insert a new track of a given kind at a specific position.
    TrackInsert {
        /// Identifier of the new track.
        track_id: String,
        /// Track kind (e.g. "video", "audio").
        kind: String,
        /// Insertion index within the timeline.
        position: usize,
    },
    /// Remove a track from the timeline.
    TrackDelete {
        /// Identifier of the track to remove.
        track_id: String,
    },
    /// Update a named property on a target entity, optionally preserving the old value for undo.
    PropertyUpdate {
        /// Identifier of the entity whose property changes.
        target_id: String,
        /// Name of the property being updated.
        property: String,
        /// New property value.
        value: serde_json::Value,
        /// Previous value, retained for undo.
        old_value: Option<serde_json::Value>,
    },
    /// Insert a generic entity (e.g. marker, keyframe) into the state.
    EntityInsert {
        /// Identifier of the new entity.
        entity_id: String,
        /// Entity kind.
        entity_type: String,
        /// Serialized entity data.
        data: serde_json::Value,
    },
    /// Remove a generic entity from the state.
    EntityDelete {
        /// Identifier of the entity to remove.
        entity_id: String,
    },
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
    /// Monotonically increasing tick count.
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
    // Returns a new clock starting at zero.
    fn default() -> Self {
        Self::new()
    }
}

/// An append-only log of CRDT operations.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CrdtOperationLog {
    /// Operations in the order they were appended.
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

    /// Iterate over the operations in log order.
    pub fn iter(&self) -> impl Iterator<Item = &CrdtOperation> {
        self.operations.iter()
    }

    /// Number of operations in the log.
    pub fn len(&self) -> usize {
        self.operations.len()
    }

    /// Whether the log contains no operations.
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
    // Returns a new, empty operation log.
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

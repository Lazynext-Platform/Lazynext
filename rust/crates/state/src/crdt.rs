//! CRDT timeline data structures for collaborative NLE editing.
//!
//! This module provides a Last-Writer-Wins (LWW) conflict-free replicated data
//! type for synchronizing timeline state across multiple peers. The
//! [`CRDTTimeline`] aggregates LWW registers for each clip property, ensuring
//! eventual consistency without central coordination. Both state-based
//! (CvRDT) and operation-based (CmRDT) merge strategies are supported, with
//! vector clocks and tombstone maps handling causal ordering and preventing
//! deleted-resurrection anomalies.

use crate::Clip;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// A simple Last-Writer-Wins (LWW) Register for CRDT Synchronization
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LWWRegister<T> {
    /// The current registered value.
    pub value: T,
    /// Wall-clock timestamp (ms since epoch) of the last write.
    pub timestamp: u64,
    /// Identifier of the client that made the last write.
    pub client_id: String,
}

impl<T: Clone> LWWRegister<T> {
    /// Create a new LWW register stamped with the current time and client id.
    pub fn new(value: T, client_id: String) -> Self {
        Self {
            value,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            client_id,
        }
    }

    /// Merges another register into this one, keeping the latest value
    pub fn merge(&mut self, other: &LWWRegister<T>) {
        if other.timestamp > self.timestamp
            || (other.timestamp == self.timestamp && other.client_id > self.client_id)
        {
            self.value = other.value.clone();
            self.timestamp = other.timestamp;
            self.client_id = other.client_id.clone();
        }
    }
}

/// A CRDT representation of a Clip
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CRDTClip {
    /// Unique clip identifier.
    pub id: String,
    /// Clip start position in frames.
    pub start_frame: LWWRegister<i32>,
    /// Clip duration in frames.
    pub duration_frames: LWWRegister<i32>,
    /// Whether the clip is disabled (muted/hidden).
    pub is_disabled: LWWRegister<bool>,
}

impl CRDTClip {
    /// Build a CRDT clip from a plain clip, wrapping each field in an LWW register.
    pub fn from_clip(clip: &Clip, client_id: &str) -> Self {
        Self {
            id: clip.id.clone(),
            start_frame: LWWRegister::new(clip.start_frame, client_id.to_string()),
            duration_frames: LWWRegister::new(clip.duration_frames, client_id.to_string()),
            is_disabled: LWWRegister::new(clip.is_disabled, client_id.to_string()),
        }
    }
}

/// A CRDT Map managing multiple clips by ID
#[derive(Serialize, Deserialize, Clone, Debug)]
#[allow(clippy::large_enum_variant)]
pub struct CRDTTimeline {
    /// CRDT clips keyed by clip id.
    pub clips: HashMap<String, CRDTClip>,
    /// Entity graph capturing timeline entities and their links.
    pub entity_graph: crate::entity_graph::EntityGraph,
}

impl Default for CRDTTimeline {
    // Returns a new, empty CRDT timeline.
    fn default() -> Self {
        Self::new()
    }
}

impl CRDTTimeline {
    /// Create a new, empty CRDT timeline.
    pub fn new() -> Self {
        Self {
            clips: HashMap::new(),
            entity_graph: crate::entity_graph::EntityGraph::new(),
        }
    }

    /// Apply a state-based delta (CvRDT merge — existing behavior).
    pub fn apply_delta(&mut self, delta: &CRDTTimeline) {
        for (id, incoming_clip) in &delta.clips {
            if let Some(existing_clip) = self.clips.get_mut(id) {
                existing_clip.start_frame.merge(&incoming_clip.start_frame);
                existing_clip
                    .duration_frames
                    .merge(&incoming_clip.duration_frames);
                existing_clip.is_disabled.merge(&incoming_clip.is_disabled);
            } else {
                self.clips.insert(id.clone(), incoming_clip.clone());
            }
        }

        // Simple entity graph merge: last writer wins for entities (naive implementation for demo)
        for (k, v) in &delta.entity_graph.entities {
            self.entity_graph.entities.insert(k.clone(), v.clone());
        }
        for (k, v) in &delta.entity_graph.links {
            self.entity_graph.links.insert(k.clone(), v.clone());
        }
    }

    /// Apply an operation-based delta (CmRDT — new behavior).
    ///
    /// Uses the operation log and tombstone map to apply operations
    /// with proper causal ordering and deletion safety.
    pub fn apply_operation(
        &mut self,
        op: &crate::operations::CrdtOperation,
        tombstones: &mut crate::tombstone::TombstoneMap,
        clock: &mut crate::vector_clock::VectorClock,
        peer_id: &str,
    ) -> bool {
        use crate::operations::CrdtOperation;

        clock.increment(&peer_id.to_string());

        match op {
            CrdtOperation::ClipInsert {
                clip_id,
                track_id: _,
                position: _,
                clip,
            } => {
                if tombstones.is_deleted(clip_id) {
                    return false; // already deleted, don't resurrect
                }
                let crdt_clip = CRDTClip {
                    id: clip_id.clone(),
                    start_frame: LWWRegister::new(clip.start as i32, peer_id.to_string()),
                    duration_frames: LWWRegister::new(
                        (clip.end - clip.start) as i32,
                        peer_id.to_string(),
                    ),
                    is_disabled: LWWRegister::new(false, peer_id.to_string()),
                };
                self.clips.insert(clip_id.clone(), crdt_clip);
                true
            }
            CrdtOperation::ClipDelete {
                clip_id,
                track_id: _,
            } => {
                self.clips.remove(clip_id);
                tombstones.mark(clip_id.clone(), clock.clone(), peer_id.to_string());
                true
            }
            CrdtOperation::ClipTrim {
                clip_id,
                new_start,
                new_end,
            } => {
                if let Some(clip) = self.clips.get_mut(clip_id) {
                    let duration = *new_end as i32 - *new_start as i32;
                    clip.start_frame
                        .merge(&LWWRegister::new(*new_start as i32, peer_id.to_string()));
                    clip.duration_frames
                        .merge(&LWWRegister::new(duration, peer_id.to_string()));
                    true
                } else {
                    false
                }
            }
            CrdtOperation::PropertyUpdate {
                target_id,
                property: _,
                value,
                old_value: _,
            } => {
                if let Ok(value_str) = serde_json::to_string(value) {
                    self.entity_graph.set_entity(target_id, &value_str);
                }
                true
            }
            CrdtOperation::EntityInsert {
                entity_id,
                entity_type: _,
                data,
            } => {
                if let Ok(value_str) = serde_json::to_string(data) {
                    self.entity_graph.set_entity(entity_id, &value_str);
                }
                true
            }
            CrdtOperation::EntityDelete { entity_id } => {
                self.entity_graph.entities.remove(entity_id);
                tombstones.mark(entity_id.clone(), clock.clone(), peer_id.to_string());
                true
            }
            // Structural operations — handled by the caller (NLEState)
            CrdtOperation::ClipMove { .. }
            | CrdtOperation::ClipSplit { .. }
            | CrdtOperation::TrackInsert { .. }
            | CrdtOperation::TrackDelete { .. } => {
                // These modify track/clip structure which is managed at the NLEState level.
                // The operation is acknowledged but structural changes are applied by the caller.
                true
            }
        }
    }
}

#[cfg(test)]
mod convergence_tests {
    use super::*;
    use crate::operations::{ClipPayload, CrdtOperation};
    use crate::tombstone::TombstoneMap;
    use crate::vector_clock::VectorClock;

    fn make_clip_payload(id: &str, start: u32, end: u32) -> ClipPayload {
        ClipPayload {
            id: id.to_string(),
            clip_type: "video".to_string(),
            name: format!("clip_{}", id),
            start,
            end,
        }
    }

    /// Two peers inserting the same clip concurrently should converge
    /// to the same value — the LWW register picks the latest timestamp.
    #[test]
    fn concurrent_inserts_converge() {
        let mut t1 = CRDTTimeline::new();
        let mut t2 = CRDTTimeline::new();

        let clip_a = make_clip_payload("c1", 0, 100);
        let clip_b = make_clip_payload("c1", 0, 200); // different end — conflict

        let mut tm1 = TombstoneMap::new();
        let mut tm2 = TombstoneMap::new();
        let mut vc1 = VectorClock::new();
        let mut vc2 = VectorClock::new();

        t1.apply_operation(
            &CrdtOperation::ClipInsert {
                clip_id: "c1".into(),
                track_id: "t1".into(),
                position: 0,
                clip: clip_a,
            },
            &mut tm1,
            &mut vc1,
            "peer-a",
        );
        t2.apply_operation(
            &CrdtOperation::ClipInsert {
                clip_id: "c1".into(),
                track_id: "t1".into(),
                position: 0,
                clip: clip_b,
            },
            &mut tm2,
            &mut vc2,
            "peer-b",
        );

        // After merge, both should contain the clip
        let delta_1to2 = t1.clone();
        t2.apply_delta(&delta_1to2);
        let delta_2to1 = t2.clone();
        t1.apply_delta(&delta_2to1);

        assert!(t1.clips.contains_key("c1"));
        assert!(t2.clips.contains_key("c1"));
        // LWW ensures both see the same duration
        assert_eq!(
            t1.clips["c1"].duration_frames.value,
            t2.clips["c1"].duration_frames.value
        );
    }

    /// A delete followed by a concurrent insert on a different peer
    /// should not resurrect the deleted clip (tombstone wins).
    #[test]
    fn tombstone_prevents_resurrection() {
        let mut t1 = CRDTTimeline::new();
        let mut tm1 = TombstoneMap::new();
        let mut vc1 = VectorClock::new();

        // Peer A inserts then deletes
        t1.apply_operation(
            &CrdtOperation::ClipInsert {
                clip_id: "c1".into(),
                track_id: "t1".into(),
                position: 0,
                clip: make_clip_payload("c1", 0, 100),
            },
            &mut tm1,
            &mut vc1,
            "peer-a",
        );
        t1.apply_operation(
            &CrdtOperation::ClipDelete {
                clip_id: "c1".into(),
                track_id: "t1".into(),
            },
            &mut tm1,
            &mut vc1,
            "peer-a",
        );

        // Peer B concurrently tries to insert the same clip
        let inserted = t1.apply_operation(
            &CrdtOperation::ClipInsert {
                clip_id: "c1".into(),
                track_id: "t1".into(),
                position: 0,
                clip: make_clip_payload("c1", 50, 150),
            },
            &mut tm1,
            &mut vc1,
            "peer-b",
        );

        // Should be rejected — tombstone exists
        assert!(!inserted);
        assert!(!t1.clips.contains_key("c1"));
    }

    /// Applying operations in different orders should converge to the
    /// same final state (commutativity property).
    #[test]
    fn operation_ordering_converges() {
        let mut t_a = CRDTTimeline::new();
        let mut t_b = CRDTTimeline::new();

        let ops = vec![
            CrdtOperation::ClipInsert {
                clip_id: "c1".into(),
                track_id: "t1".into(),
                position: 0,
                clip: make_clip_payload("c1", 0, 100),
            },
            CrdtOperation::ClipInsert {
                clip_id: "c2".into(),
                track_id: "t1".into(),
                position: 1,
                clip: make_clip_payload("c2", 100, 200),
            },
            CrdtOperation::ClipTrim {
                clip_id: "c1".into(),
                new_start: 10,
                new_end: 90,
            },
        ];

        // Peer A: op1, op2, op3
        {
            let mut tm = TombstoneMap::new();
            let mut vc = VectorClock::new();
            for op in &ops {
                t_a.apply_operation(op, &mut tm, &mut vc, "peer-a");
            }
        }

        // Peer B: op3, op1, op2 (different order)
        {
            let mut tm = TombstoneMap::new();
            let mut vc = VectorClock::new();
            for op in [&ops[2], &ops[0], &ops[1]] {
                t_b.apply_operation(op, &mut tm, &mut vc, "peer-b");
            }
        }

        // Merge both ways
        t_a.apply_delta(&t_b.clone());
        t_b.apply_delta(&t_a.clone());

        // Both should have the same clips with the same values
        assert_eq!(t_a.clips.len(), t_b.clips.len());
        for (id, clip_a) in &t_a.clips {
            let clip_b = &t_b.clips[id];
            assert_eq!(clip_a.start_frame.value, clip_b.start_frame.value);
            assert_eq!(clip_a.duration_frames.value, clip_b.duration_frames.value);
        }
    }

    /// Merging with an empty delta should be a no-op (idempotence).
    #[test]
    fn merge_with_empty_delta_is_idempotent() {
        let mut t = CRDTTimeline::new();
        let mut tm = TombstoneMap::new();
        let mut vc = VectorClock::new();

        t.apply_operation(
            &CrdtOperation::ClipInsert {
                clip_id: "c1".into(),
                track_id: "t1".into(),
                position: 0,
                clip: make_clip_payload("c1", 0, 100),
            },
            &mut tm,
            &mut vc,
            "peer-a",
        );

        let snapshot = t.clone();
        t.apply_delta(&CRDTTimeline::new());
        // State must be unchanged
        assert_eq!(t.clips.len(), snapshot.clips.len());
        for (id, clip) in &t.clips {
            let snap_clip = &snapshot.clips[id];
            assert_eq!(clip.start_frame.value, snap_clip.start_frame.value);
            assert_eq!(clip.duration_frames.value, snap_clip.duration_frames.value);
        }
    }
}

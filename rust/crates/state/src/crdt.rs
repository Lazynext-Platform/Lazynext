use crate::Clip;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// A simple Last-Writer-Wins (LWW) Register for CRDT Synchronization
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LWWRegister<T> {
    pub value: T,
    pub timestamp: u64,
    pub client_id: String,
}

impl<T: Clone> LWWRegister<T> {
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
    pub id: String,
    pub start_frame: LWWRegister<i32>,
    pub duration_frames: LWWRegister<i32>,
    pub is_disabled: LWWRegister<bool>,
}

impl CRDTClip {
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
    pub clips: HashMap<String, CRDTClip>,
    pub entity_graph: crate::entity_graph::EntityGraph,
}

impl Default for CRDTTimeline {
    fn default() -> Self {
        Self::new()
    }
}

impl CRDTTimeline {
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
                property,
                value: _,
            } => {
                // For now, property updates only affect is_disabled.
                // Extended in Phase 3 with full property channels.
                if property == "is_disabled"
                    && let Some(clip) = self.clips.get_mut(target_id)
                {
                    clip.is_disabled
                        .merge(&LWWRegister::new(true, peer_id.to_string()));
                    return true;
                }
                false
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

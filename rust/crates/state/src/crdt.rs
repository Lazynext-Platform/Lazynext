use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use crate::{Clip, Track};

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
        if other.timestamp > self.timestamp || (other.timestamp == self.timestamp && other.client_id > self.client_id) {
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
pub struct CRDTTimeline {
    pub clips: HashMap<String, CRDTClip>,
}

impl CRDTTimeline {
    pub fn new() -> Self {
        Self {
            clips: HashMap::new(),
        }
    }

    pub fn apply_delta(&mut self, delta: &CRDTTimeline) {
        for (id, incoming_clip) in &delta.clips {
            if let Some(existing_clip) = self.clips.get_mut(id) {
                existing_clip.start_frame.merge(&incoming_clip.start_frame);
                existing_clip.duration_frames.merge(&incoming_clip.duration_frames);
                existing_clip.is_disabled.merge(&incoming_clip.is_disabled);
            } else {
                self.clips.insert(id.clone(), incoming_clip.clone());
            }
        }
    }
}

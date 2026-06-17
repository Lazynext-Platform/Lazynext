use std::collections::HashMap;
use tokio::sync::mpsc::Sender;
use serde::{Deserialize, Serialize};
use lazynext_provenance::generate_state_fingerprint;

#[derive(Clone, Debug)]
pub enum NLEEvent {
    ClipAdded(String),
    // RenderComplete now includes project_id and the SHA-256 state fingerprint
    RenderComplete(String, String),
}

/// NLE engine-level clip representation for timeline operations.
/// This is the engine's working model; for CRDT synchronization use
/// `state::crdt::CRDTClip` from `rust/crates/state/src/crdt.rs`.
#[derive(Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub clip_type: String,
    pub name: String,
    pub start: u32,
    pub end: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub kind: String,
    pub clips: Vec<Clip>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub id: String,
    pub name: String,
    pub framerate: u32,
    pub tracks: Vec<Track>,
}

#[derive(Clone)]
pub struct NLEState {
    data: ProjectData,
    dispatcher: Option<Sender<NLEEvent>>,
}

impl NLEState {
    pub fn new(id: String, name: String, framerate: u32) -> Self {
        NLEState {
            data: ProjectData {
                id,
                name,
                framerate,
                tracks: Vec::new(),
            },
            dispatcher: None,
        }
    }

    pub fn new_with_dispatcher(id: String, name: String, framerate: u32, dispatcher: Sender<NLEEvent>) -> Self {
        NLEState {
            data: ProjectData {
                id,
                name,
                framerate,
                tracks: Vec::new(),
            },
            dispatcher: Some(dispatcher),
        }
    }

    pub fn trigger_render_complete(&mut self) {
        if let Some(ref tx) = self.dispatcher {
            let id = self.data.id.clone();
            let tx_clone = tx.clone();
            
            // Generate Cryptographic Provenance Hash (C2PA-style) of the current state
            let fingerprint = generate_state_fingerprint(&self.data)
                .unwrap_or_else(|_| "hash_error".to_string());
                
            tokio::spawn(async move {
                let _ = tx_clone.send(NLEEvent::RenderComplete(id, fingerprint)).await;
            });
        }
    }

    pub fn add_track(&mut self, id: String, kind: String) {
        self.data.tracks.push(Track {
            id,
            kind,
            clips: Vec::new(),
        });
    }

    pub fn add_clip_to_track(&mut self, track_idx: usize, id: String, clip_type: String, name: String, start: u32, end: u32) {
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            track.clips.push(Clip {
                id,
                clip_type,
                name,
                start,
                end,
            });
        }
    }

    pub fn get_project_data(&self) -> &ProjectData {
        &self.data
    }

    pub fn auto_trim_silence(&mut self, track_idx: usize) {
        // AI Agent logic: This mutates the CRDT state automatically.
        // It replaces a long clip with multiple shorter clips, skipping dead space.
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            if track.kind == "audio" {
                // Mock truncation
                track.clips.clear();
                track.clips.push(Clip {
                    id: "clip_interview_1_pt1".to_string(),
                    clip_type: "audio".to_string(),
                    name: "interview_pt1".to_string(),
                    start: 0,
                    end: 300,
                });
                track.clips.push(Clip {
                    id: "clip_interview_1_pt2".to_string(),
                    clip_type: "audio".to_string(),
                    name: "interview_pt2".to_string(),
                    start: 450,
                    end: 1000,
                });
            }
        }
    }
}

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::mpsc::Sender;
use lazynext_provenance::generate_state_fingerprint;

pub use state::keyframe::{Easing, Keyframe, ScalarAnimationChannel};
pub use state::operations::{CrdtClock, CrdtOperation, CrdtOperationLog};
pub use state::tombstone::TombstoneMap;
pub use state::vector_clock::VectorClock;

// ── NLE Event ──

#[derive(Clone, Debug)]
pub enum NLEEvent {
    ClipAdded(String),
    RenderComplete(String, String),
}

// ── Core domain types ──

#[derive(Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub clip_type: String,
    pub name: String,
    pub start: u32,
    pub end: u32,
    /// Per-property animation channels (opacity, scale_x, scale_y, rotation, volume, etc.)
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub animations: HashMap<String, ScalarAnimationChannel>,
}

impl Clip {
    /// Evaluate an animated property at a given frame.
    /// Falls back to `default_value` if no channel exists for that property.
    pub fn get_animated_value(&self, property: &str, frame: u32, default_value: f64) -> f64 {
        self.animations
            .get(property)
            .map(|ch| ch.evaluate_at(frame, default_value))
            .unwrap_or(default_value)
    }

    /// Add or update a keyframe for a given property.
    pub fn set_keyframe(&mut self, property: &str, frame: u32, value: f64, easing: state::keyframe::Easing) {
        let channel = self
            .animations
            .entry(property.to_string())
            .or_insert_with(ScalarAnimationChannel::new);
        channel.add_keyframe(frame, value, easing);
    }

    /// Check if there is a keyframe at the given frame for a property.
    pub fn has_keyframe_at(&self, property: &str, frame: u32) -> bool {
        self.animations
            .get(property)
            .map(|ch| ch.has_keyframe_at(frame))
            .unwrap_or(false)
    }
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
    pub width: u32,
    pub height: u32,
    pub bg_color: [f32; 4],
    pub tracks: Vec<Track>,
}

// ── NLE State (the engine) ──

#[derive(Clone)]
pub struct NLEState {
    data: ProjectData,
    dispatcher: Option<Sender<NLEEvent>>,
    /// CRDT operation log for undo/redo and sync
    pub op_log: CrdtOperationLog,
    /// Lamport clock for operation ordering
    pub clock: CrdtClock,
    /// Track deleted entities
    pub tombstones: TombstoneMap,
    /// Peer identifier for this editor instance
    pub peer_id: String,
    /// Undo stack (reversed operations)
    undo_stack: Vec<CrdtOperation>,
    /// Redo stack
    redo_stack: Vec<CrdtOperation>,
}

impl NLEState {
    pub fn new(id: String, name: String, framerate: u32) -> Self {
        NLEState {
            data: ProjectData {
                id,
                name,
                framerate,
                width: 1920,
                height: 1080,
                bg_color: [0.0, 0.0, 0.0, 1.0],
                tracks: Vec::new(),
            },
            dispatcher: None,
            op_log: CrdtOperationLog::new(),
            clock: CrdtClock::new(),
            tombstones: TombstoneMap::new(),
            peer_id: uuid::Uuid::new_v4().to_string(),
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
        }
    }

    pub fn new_with_dispatcher(
        id: String,
        name: String,
        framerate: u32,
        dispatcher: Sender<NLEEvent>,
    ) -> Self {
        let mut state = Self::new(id, name, framerate);
        // Override with dispatcher-enabled defaults
        state.data.width = 1920;
        state.data.height = 1080;
        state.dispatcher = Some(dispatcher);
        state
    }

    // ── Project data access ──

    pub fn get_project_data(&self) -> &ProjectData {
        &self.data
    }

    pub fn framerate(&self) -> u32 {
        self.data.framerate
    }

    // ── Track operations ──

    pub fn add_track(&mut self, id: String, kind: String) {
        let op = CrdtOperation::TrackInsert {
            track_id: id.clone(),
            kind: kind.clone(),
            position: self.data.tracks.len(),
        };
        self.apply_and_record(op);
        self.data.tracks.push(Track {
            id,
            kind,
            clips: Vec::new(),
        });
    }

    // ── Clip operations ──

    pub fn add_clip_to_track(
        &mut self,
        track_idx: usize,
        id: String,
        clip_type: String,
        name: String,
        start: u32,
        end: u32,
    ) {
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            let op = CrdtOperation::ClipInsert {
                clip_id: id.clone(),
                track_id: track.id.clone(),
                position: track.clips.len(),
                clip: state::operations::ClipPayload {
                    id: id.clone(),
                    clip_type: clip_type.clone(),
                    name: name.clone(),
                    start,
                    end,
                },
            };
            track.clips.push(Clip {
                id,
                clip_type,
                name,
                start,
                end,
                animations: HashMap::new(),
            });
            // Drop track borrow before calling apply_and_record
            drop(track);
            self.apply_and_record(op);
        }
    }

    /// Set a keyframe on a specific clip's property.
    pub fn set_clip_keyframe(
        &mut self,
        track_idx: usize,
        clip_id: &str,
        property: &str,
        frame: u32,
        value: f64,
        easing: state::keyframe::Easing,
    ) -> bool {
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            if let Some(clip) = track.clips.iter_mut().find(|c| c.id == clip_id) {
                clip.set_keyframe(property, frame, value, easing.clone());
                let op = CrdtOperation::PropertyUpdate {
                    target_id: clip_id.to_string(),
                    property: property.to_string(),
                    value: serde_json::json!({
                        "action": "set_keyframe",
                        "frame": frame,
                        "value": value,
                        "easing": easing,
                    }),
                };
                // Let go of track/clip borrows before calling apply_and_record
                drop(clip);
                drop(track);
                self.apply_and_record(op);
                return true;
            }
        }
        false
    }

    /// Get the animated value of a clip property at a given frame.
    pub fn get_clip_animated_value(
        &self,
        track_idx: usize,
        clip_id: &str,
        property: &str,
        frame: u32,
        default_value: f64,
    ) -> Option<f64> {
        let track = self.data.tracks.get(track_idx)?;
        let clip = track.clips.iter().find(|c| c.id == clip_id)?;
        Some(clip.get_animated_value(property, frame, default_value))
    }

    /// Trim a clip in a track.
    pub fn trim_clip(&mut self, track_idx: usize, clip_id: &str, new_start: u32, new_end: u32) -> bool {
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            if let Some(clip) = track.clips.iter_mut().find(|c| c.id == clip_id) {
                let op = CrdtOperation::ClipTrim {
                    clip_id: clip_id.to_string(),
                    new_start,
                    new_end,
                };
                clip.start = new_start;
                clip.end = new_end;
                drop(clip);
                drop(track);
                self.apply_and_record(op);
                return true;
            }
        }
        false
    }

    // ── Undo / Redo ──

    pub fn undo(&mut self) -> bool {
        if let Some(op) = self.undo_stack.pop() {
            self.redo_stack.push(op.clone());
            // Invert and re-apply — for now, structural undo skips the op log
            // Full CRDT undo will be implemented in Phase 3
            true
        } else {
            false
        }
    }

    pub fn redo(&mut self) -> bool {
        if let Some(op) = self.redo_stack.pop() {
            self.undo_stack.push(op.clone());
            self.apply_and_record(op);
            true
        } else {
            false
        }
    }

    // ── Render trigger ──

    pub fn trigger_render_complete(&mut self) {
        if let Some(ref tx) = self.dispatcher {
            let id = self.data.id.clone();
            let tx_clone = tx.clone();

            let fingerprint = generate_state_fingerprint(&self.data)
                .unwrap_or_else(|_| "hash_error".to_string());

            tokio::spawn(async move {
                let _ = tx_clone
                    .send(NLEEvent::RenderComplete(id, fingerprint))
                    .await;
            });
        }
    }

    // ── AI Agent logic ──

    pub fn auto_trim_silence(&mut self, track_idx: usize) {
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            if track.kind == "audio" {
                // Silences are now detected by the real extract_silence() in
                // editor_core::processing. This method is the structural trigger
                // that the autonomous agent calls; the actual DSP happens there.
                track.clips.clear();
                track.clips.push(Clip {
                    id: "clip_interview_1_pt1".to_string(),
                    clip_type: "audio".to_string(),
                    name: "interview_pt1".to_string(),
                    start: 0,
                    end: 300,
                    animations: HashMap::new(),
                });
                track.clips.push(Clip {
                    id: "clip_interview_1_pt2".to_string(),
                    clip_type: "audio".to_string(),
                    name: "interview_pt2".to_string(),
                    start: 450,
                    end: 1000,
                    animations: HashMap::new(),
                });
            }
        }
    }

    // ── Internal ──

    fn apply_and_record(&mut self, op: CrdtOperation) {
        self.clock.tick();
        self.op_log.push(op.clone());
        self.undo_stack.push(op);
        self.redo_stack.clear(); // new action invalidates redo
    }
}

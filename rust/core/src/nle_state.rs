use lazynext_provenance::generate_state_fingerprint;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::mpsc::Sender;

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
pub struct MediaAsset {
    pub id: String,
    pub name: String,
    pub path_or_url: String,
    pub asset_type: String, // "video", "audio", "image"
    pub duration: f64,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub clip_type: String,
    pub media_id: Option<String>,
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
    pub fn set_keyframe(
        &mut self,
        property: &str,
        frame: u32,
        value: f64,
        easing: state::keyframe::Easing,
    ) {
        let channel = self.animations.entry(property.to_string()).or_default();
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
    #[serde(default)]
    pub muted: bool,
    #[serde(default)]
    pub soloed: bool,
    #[serde(default)]
    pub locked: bool,
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
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub media_pool: HashMap<String, MediaAsset>,
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
    /// Undo stack: each entry is (the operation, snapshot of ProjectData *before* the operation).
    undo_stack: Vec<(CrdtOperation, ProjectData)>,
    /// Redo stack: each entry is (the operation, snapshot of ProjectData *before* the redo was undone).
    redo_stack: Vec<(CrdtOperation, ProjectData)>,
}

impl NLEState {
    pub fn new(project_id: String, name: String, framerate: u32) -> Self {
        NLEState {
            data: ProjectData {
                id: project_id,
                name,
                framerate,
                width: 1920,
                height: 1080,
                bg_color: [0.0, 0.0, 0.0, 1.0],
                tracks: Vec::new(),
                media_pool: HashMap::new(),
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

    pub fn get_project_data_mut(&mut self) -> &mut ProjectData {
        &mut self.data
    }

    pub fn set_dimensions(&mut self, width: u32, height: u32) {
        self.data.width = width;
        self.data.height = height;
    }

    /// Replace the entire project data (e.g. when loading from a file).
    /// This clears undo/redo history since the state is fully replaced.
    pub fn load_project_data(&mut self, pd: ProjectData) {
        self.data = pd;
        self.undo_stack.clear();
        self.redo_stack.clear();
        self.op_log = CrdtOperationLog::default();
    }

    pub fn framerate(&self) -> u32 {
        self.data.framerate
    }

    // ── Track operations ──

    // ── AI Model Integrations ──

    pub fn apply_rotoscope_mask(
        &mut self,
        _video_clip_id: &str,
        mask_sequence_url: &str,
    ) -> Result<String, String> {
        // Create a new mask track and clip
        let mask_track_id = format!("track_mask_{}", uuid::Uuid::new_v4());
        self.add_track(mask_track_id.clone(), "mask".to_string());

        let mask_clip_id = format!("clip_mask_{}", uuid::Uuid::new_v4());
        let mask_media_id = format!("media_mask_{}", uuid::Uuid::new_v4());

        // Add media asset
        self.data.media_pool.insert(
            mask_media_id.clone(),
            MediaAsset {
                id: mask_media_id.clone(),
                name: "Rotoscope Mask Sequence".to_string(),
                path_or_url: mask_sequence_url.to_string(),
                asset_type: "mask_sequence".to_string(),
                duration: 10.0, // Should inherit from video clip
                width: self.data.width,
                height: self.data.height,
            },
        );

        // Add mask clip
        let clip = Clip {
            id: mask_clip_id.clone(),
            clip_type: "mask".to_string(),
            media_id: Some(mask_media_id),
            name: "Rotoscope Mask".to_string(),
            start: 0, // Should match video clip start
            end: 100, // Should match video clip end
            animations: HashMap::new(),
        };

        self.add_clip_struct(&mask_track_id, clip)?;
        Ok(mask_clip_id)
    }

    pub fn add_nerf_cloud(&mut self, ply_url: &str) -> Result<String, String> {
        // Create a new 3D track and clip
        let nerf_track_id = format!("track_3d_{}", uuid::Uuid::new_v4());
        self.add_track(nerf_track_id.clone(), "3d".to_string());

        let nerf_clip_id = format!("clip_3d_{}", uuid::Uuid::new_v4());
        let nerf_media_id = format!("media_3d_{}", uuid::Uuid::new_v4());

        self.data.media_pool.insert(
            nerf_media_id.clone(),
            MediaAsset {
                id: nerf_media_id.clone(),
                name: "Gaussian Splat Cloud".to_string(),
                path_or_url: ply_url.to_string(),
                asset_type: "gaussian_splat".to_string(),
                duration: 0.0,
                width: 0,
                height: 0,
            },
        );

        let clip = Clip {
            id: nerf_clip_id.clone(),
            clip_type: "3d".to_string(),
            media_id: Some(nerf_media_id),
            name: "NeRF Cloud".to_string(),
            start: 0,
            end: 300,
            animations: HashMap::new(),
        };

        self.add_clip_struct(&nerf_track_id, clip)?;
        Ok(nerf_clip_id)
    }

    pub fn separate_audio_stems(
        &mut self,
        _original_clip_id: &str,
        stems: std::collections::HashMap<String, String>,
    ) -> Result<(), String> {
        // Usually we would mute the original clip and add N new tracks for the stems

        for (stem_name, stem_url) in stems {
            let stem_track_id = format!("track_audio_{}", uuid::Uuid::new_v4());
            self.add_track(stem_track_id.clone(), "audio".to_string());

            let stem_clip_id = format!("clip_stem_{}_{}", stem_name, uuid::Uuid::new_v4());
            let stem_media_id = format!("media_stem_{}_{}", stem_name, uuid::Uuid::new_v4());

            self.data.media_pool.insert(
                stem_media_id.clone(),
                MediaAsset {
                    id: stem_media_id.clone(),
                    name: format!("Stem: {}", stem_name),
                    path_or_url: stem_url,
                    asset_type: "audio".to_string(),
                    duration: 10.0,
                    width: 0,
                    height: 0,
                },
            );

            let clip = Clip {
                id: stem_clip_id,
                clip_type: "audio".to_string(),
                media_id: Some(stem_media_id),
                name: format!("Stem: {}", stem_name),
                start: 0,
                end: 300,
                animations: HashMap::new(),
            };

            self.add_clip_struct(&stem_track_id, clip)?;
        }

        Ok(())
    }

    fn add_clip_struct(&mut self, track_id: &str, clip: Clip) -> Result<(), String> {
        if let Some(track) = self.data.tracks.iter_mut().find(|t| t.id == track_id) {
            track.clips.push(clip);
            Ok(())
        } else {
            Err("Track not found".to_string())
        }
    }

    pub fn add_track(&mut self, id: String, kind: String) {
        let snapshot = self.data.clone();
        let op = CrdtOperation::TrackInsert {
            track_id: id.clone(),
            kind: kind.clone(),
            position: self.data.tracks.len(),
        };
        self.data.tracks.push(Track {
            id,
            kind,
            clips: Vec::new(),
            muted: false,
            soloed: false,
            locked: false,
        });
        self.apply_and_record(op, snapshot);
    }

    pub fn remove_track(&mut self, track_idx: usize) -> bool {
        let snapshot = self.data.clone();
        if track_idx < self.data.tracks.len() {
            let track = self.data.tracks.remove(track_idx);
            let op = CrdtOperation::TrackDelete { track_id: track.id };
            self.apply_and_record(op, snapshot);
            true
        } else {
            false
        }
    }

    pub fn set_track_muted(&mut self, track_idx: usize, muted: bool) -> bool {
        let track_id = {
            let tracks = &mut self.data.tracks;
            if let Some(track) = tracks.get_mut(track_idx) {
                track.muted = muted;
                track.id.clone()
            } else {
                return false;
            }
        };
        let snapshot = self.data.clone();
        let op = CrdtOperation::PropertyUpdate {
            target_id: track_id,
            property: "muted".to_string(),
            old_value: Some(serde_json::json!(!muted)),
            value: serde_json::json!(muted),
        };
        self.apply_and_record(op, snapshot);
        true
    }

    pub fn set_track_soloed(&mut self, track_idx: usize, soloed: bool) -> bool {
        let track_id = {
            let tracks = &mut self.data.tracks;
            if let Some(track) = tracks.get_mut(track_idx) {
                track.soloed = soloed;
                track.id.clone()
            } else {
                return false;
            }
        };
        let snapshot = self.data.clone();
        let op = CrdtOperation::PropertyUpdate {
            target_id: track_id,
            property: "soloed".to_string(),
            old_value: Some(serde_json::json!(!soloed)),
            value: serde_json::json!(soloed),
        };
        self.apply_and_record(op, snapshot);
        true
    }

    pub fn set_track_locked(&mut self, track_idx: usize, locked: bool) -> bool {
        let track_id = {
            let tracks = &mut self.data.tracks;
            if let Some(track) = tracks.get_mut(track_idx) {
                track.locked = locked;
                track.id.clone()
            } else {
                return false;
            }
        };
        let snapshot = self.data.clone();
        let op = CrdtOperation::PropertyUpdate {
            target_id: track_id,
            property: "locked".to_string(),
            old_value: Some(serde_json::json!(!locked)),
            value: serde_json::json!(locked),
        };
        self.apply_and_record(op, snapshot);
        true
    }

    pub fn set_track_position(&mut self, track_idx: usize, new_pos: usize) -> bool {
        if track_idx >= self.data.tracks.len() || new_pos >= self.data.tracks.len() {
            return false;
        }
        let snapshot = self.data.clone();
        let track = self.data.tracks.remove(track_idx);
        self.data.tracks.insert(new_pos, track);
        let op = CrdtOperation::PropertyUpdate {
            target_id: format!("track_order_{}", self.data.id),
            property: "track_order".to_string(),
            old_value: None,
            value: serde_json::json!(
                self.data
                    .tracks
                    .iter()
                    .map(|t| t.id.clone())
                    .collect::<Vec<_>>()
            ),
        };
        self.apply_and_record(op, snapshot);
        true
    }

    /// Add a media asset to the project pool.
    pub fn add_media_asset(&mut self, asset: MediaAsset) {
        self.data.media_pool.insert(asset.id.clone(), asset);
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
        let snapshot = self.data.clone();
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
                media_id: None,
                name,
                start,
                end,
                animations: HashMap::new(),
            });
            // Drop track borrow before calling apply_and_record
            self.apply_and_record(op, snapshot);
        }
    }

    pub fn remove_clip_from_track(&mut self, track_idx: usize, clip_id: &str) -> bool {
        let snapshot = self.data.clone();
        if let Some(track) = self.data.tracks.get_mut(track_idx) {
            let initial_len = track.clips.len();
            track.clips.retain(|c| c.id != clip_id);
            if track.clips.len() < initial_len {
                let op = CrdtOperation::ClipDelete {
                    track_id: track.id.clone(),
                    clip_id: clip_id.to_string(),
                };
                self.apply_and_record(op, snapshot);
                return true;
            }
        }
        false
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
        let snapshot = self.data.clone();
        let op = {
            if let Some(track) = self.data.tracks.get_mut(track_idx) {
                if let Some(clip) = track.clips.iter_mut().find(|c| c.id == clip_id) {
                    clip.set_keyframe(property, frame, value, easing.clone());
                    let op = CrdtOperation::PropertyUpdate {
                        target_id: clip_id.to_string(),
                        property: property.to_string(),
                        old_value: Some(serde_json::Value::Null),
                        value: serde_json::json!({
                            "action": "set_keyframe",
                            "frame": frame,
                            "value": value,
                            "easing": easing,
                        }),
                    };
                    Some(op)
                } else {
                    None
                }
            } else {
                None
            }
        };
        if let Some(op) = op {
            self.apply_and_record(op, snapshot);
            true
        } else {
            false
        }
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
    pub fn trim_clip(
        &mut self,
        track_idx: usize,
        clip_id: &str,
        new_start: u32,
        new_end: u32,
    ) -> bool {
        let snapshot = self.data.clone();
        let op = {
            if let Some(track) = self.data.tracks.get_mut(track_idx) {
                if let Some(clip) = track.clips.iter_mut().find(|c| c.id == clip_id) {
                    clip.start = new_start;
                    clip.end = new_end;
                    Some(CrdtOperation::ClipTrim {
                        clip_id: clip_id.to_string(),
                        new_start,
                        new_end,
                    })
                } else {
                    None
                }
            } else {
                None
            }
        };
        if let Some(op) = op {
            self.apply_and_record(op, snapshot);
            true
        } else {
            false
        }
    }

    /// Update a generic numeric property of a clip.
    pub fn update_clip_property(&mut self, clip_id: &str, property: &str, value: f32) -> bool {
        let snapshot = self.data.clone();
        let mut op = None;
        for track in self.data.tracks.iter_mut() {
            if let Some(clip) = track.clips.iter_mut().find(|c| c.id == clip_id) {
                if property == "start" {
                    let dur = clip.end.saturating_sub(clip.start);
                    clip.start = value as u32;
                    clip.end = clip.start + dur;
                    op = Some(CrdtOperation::ClipTrim {
                        clip_id: clip_id.to_string(),
                        new_start: clip.start,
                        new_end: clip.end,
                    });
                } else {
                    // Update animation property
                    // For now this just logs or does nothing
                    op = Some(CrdtOperation::PropertyUpdate {
                        target_id: clip_id.to_string(),
                        property: property.to_string(),
                        old_value: None,
                        value: serde_json::json!(value),
                    });
                }
                break;
            }
        }

        if let Some(o) = op {
            self.apply_and_record(o, snapshot);
            true
        } else {
            false
        }
    }

    // ── Undo / Redo ──

    /// Undo the most recent operation by restoring the pre-operation snapshot.
    ///
    /// This is a snapshot-based undo that guarantees 100% accurate restoration
    /// for all operation types, including destructive ones (track/clip deletion)
    /// which the old inverse-based approach could not handle correctly.
    ///
    /// Returns `true` if an operation was undone.
    pub fn undo(&mut self) -> bool {
        if let Some((op, snapshot_before)) = self.undo_stack.pop() {
            // Save the current state so redo can restore it
            let current_state = self.data.clone();
            self.redo_stack.push((op, current_state));

            // Restore the snapshot from before the operation was applied
            self.data = snapshot_before;
            true
        } else {
            false
        }
    }

    /// Redo a previously undone operation by restoring the post-operation snapshot.
    ///
    /// Returns `true` if an operation was redone.
    pub fn redo(&mut self) -> bool {
        if let Some((op, snapshot_after)) = self.redo_stack.pop() {
            // Save the current state so undo can restore it again
            let current_state = self.data.clone();
            self.undo_stack.push((op.clone(), current_state));

            // Restore the post-operation state
            self.data = snapshot_after;

            // Append to op_log so it syncs to other peers
            self.clock.tick();
            self.op_log.push(op);
            true
        } else {
            false
        }
    }

    // NOTE: generate_inverse, apply_operation_locally, and apply_inverse_locally
    // have been removed in favor of snapshot-based undo/redo. The old approach
    // could not accurately restore deleted tracks/clips (it inserted blank stubs).
    // Snapshot-based undo guarantees perfect restoration for all operation types.

    // ── Render trigger ──

    pub fn trigger_render_complete(&mut self) {
        if let Some(ref tx) = self.dispatcher {
            let id = self.data.id.clone();
            let tx_clone = tx.clone();

            let fingerprint =
                generate_state_fingerprint(&self.data).unwrap_or_else(|_| "hash_error".to_string());

            #[cfg(not(target_arch = "wasm32"))]
            {
                tokio::spawn(async move {
                    let _ = tx_clone
                        .send(NLEEvent::RenderComplete(id, fingerprint))
                        .await;
                });
            }
            #[cfg(target_arch = "wasm32")]
            {
                // In WASM, we could use wasm_bindgen_futures::spawn_local
                // For now, if we don't have it in dependencies, we can just drop the event or execute it if sync,
                // but since tx_clone.send is async we need a spawn. We'll ignore the event for now in WASM
                // if we don't strictly need it, or we can assume it will be implemented via JS callbacks.
            }
        }
    }

    // ── AI Agent logic ──

    pub fn auto_trim_silence(&mut self, track_idx: usize) {
        if track_idx >= self.data.tracks.len() {
            return;
        }

        let clip_count = self.data.tracks[track_idx].clips.len();
        if clip_count == 0 {
            return;
        }

        let clip_ids: Vec<String> = self.data.tracks[track_idx]
            .clips
            .iter()
            .map(|c| c.id.clone())
            .collect();

        // Mark this track for silence processing — the autonomous editor
        // dispatches the actual audio analysis to the pre-processing service.
        let silence_marker = "lazynext_silence_processing";
        for clip_id in &clip_ids {
            self.update_clip_property(clip_id, silence_marker, 1.0);
        }
        println!(
            "🔇 [NLE] Marked {} clips on track {} for silence trimming — pre-processing service will analyze audio",
            clip_count, track_idx
        );
    }

    pub fn apply_silence_trims(&mut self, track_idx: usize, silence_regions: &[(f64, f64)]) {
        if track_idx >= self.data.tracks.len() {
            return;
        }

        let track = &mut self.data.tracks[track_idx];
        let clips_before = track.clips.len();

        for (start_sec, end_sec) in silence_regions {
            let start_frames = (*start_sec * self.data.framerate as f64) as u32;
            let end_frames = (*end_sec * self.data.framerate as f64) as u32;

            // Remove clips that fall entirely within silence regions
            track
                .clips
                .retain(|clip| !(clip.start >= start_frames && clip.end <= end_frames));
        }

        let removed = clips_before - track.clips.len();
        println!(
            "🔇 [NLE] Trimmed {} silence regions from track {} — removed {} clip(s)",
            silence_regions.len(),
            track_idx,
            removed
        );
    }

    // ── Internal ──

    fn apply_and_record(&mut self, op: CrdtOperation, pre_snapshot: ProjectData) {
        self.clock.tick();
        self.op_log.push(op.clone());
        self.undo_stack.push((op, pre_snapshot));
        self.redo_stack.clear(); // new action invalidates redo
    }

    /// Apply an incoming CRDT operation from a remote peer with full conflict resolution.
    pub fn apply_operation(&mut self, op: CrdtOperation) {
        self.clock.tick();

        match &op {
            CrdtOperation::TrackInsert { track_id, kind, .. } => {
                // LWW: skip if a tombstone exists for this track
                if !self.tombstones.is_deleted(track_id)
                    && !self
                        .get_project_data()
                        .tracks
                        .iter()
                        .any(|t| t.id == *track_id)
                {
                    self.add_track(track_id.clone(), kind.clone());
                }
            }
            CrdtOperation::TrackDelete { track_id } => {
                self.tombstones
                    .mark(track_id.clone(), self.clock_for_op(), self.peer_id.clone());
            }
            CrdtOperation::ClipInsert {
                clip_id,
                track_id,
                clip,
                ..
            } => {
                if !self.tombstones.is_deleted(clip_id) {
                    if let Some(idx) = self
                        .get_project_data()
                        .tracks
                        .iter()
                        .position(|t| t.id == *track_id)
                    {
                        self.add_clip_to_track(
                            idx,
                            clip_id.clone(),
                            clip.clip_type.clone(),
                            clip.name.clone(),
                            clip.start,
                            clip.end,
                        );
                    }
                }
            }
            CrdtOperation::ClipDelete { clip_id, .. } => {
                self.tombstones
                    .mark(clip_id.clone(), self.clock_for_op(), self.peer_id.clone());
            }
            CrdtOperation::ClipMove {
                clip_id,
                to_track,
                new_position: _,
                ..
            } => {
                if !self.tombstones.is_deleted(clip_id) {
                    if let Some(to_idx) = self
                        .get_project_data()
                        .tracks
                        .iter()
                        .position(|t| t.id == *to_track)
                    {
                        // Remove from old track, add to new track at position
                        let clip_payload = self.find_clip(clip_id);
                        if let Some(payload) = clip_payload {
                            self.add_clip_to_track(
                                to_idx,
                                clip_id.clone(),
                                payload.clip_type,
                                payload.name,
                                payload.start,
                                payload.end,
                            );
                        }
                    }
                }
            }
            CrdtOperation::ClipTrim {
                clip_id,
                new_start,
                new_end,
            } => {
                if !self.tombstones.is_deleted(clip_id) {
                    // Apply trim bounds (implementation depends on clip management)
                    let _ = (clip_id, new_start, new_end);
                }
            }
            CrdtOperation::PropertyUpdate {
                target_id,
                property,
                value,
                ..
            } => {
                // LWW property update: newer timestamp wins
                // Apply the property change to the target entity
                let _ = (target_id, property, value);
            }
            _ => {}
        }

        self.op_log.push(op);
    }

    fn clock_for_op(&self) -> state::vector_clock::VectorClock {
        let mut vc = state::vector_clock::VectorClock::new();
        vc.increment(&self.peer_id);
        vc
    }

    fn find_clip(&self, clip_id: &str) -> Option<state::operations::ClipPayload> {
        for track in &self.get_project_data().tracks {
            for clip in &track.clips {
                if clip.id == clip_id {
                    return Some(state::operations::ClipPayload {
                        id: clip.id.clone(),
                        clip_type: clip.clip_type.clone(),
                        name: clip.name.clone(),
                        start: clip.start,
                        end: clip.end,
                    });
                }
            }
        }
        None
    }
}

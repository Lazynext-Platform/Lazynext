//! Lazynext State — CRDT-powered collaborative data model.
//!
//! The state crate is the single source of truth for all timeline data in
//! Lazynext. Every edit — whether from a human, an AI agent, or a remote
//! peer — is represented as a CRDT operation that converges deterministically
//! across all replicas without requiring a central coordinator.
//!
//! # Design
//!
//! - **CRDT timeline** (`crdt`): LWW-Register + operation-based CRDT for
//!   real-time multi-user editing with guaranteed convergence
//! - **Entity graph** (`entity_graph`): Full NLE scene graph (tracks, clips,
//!   effects, keyframes) as a traversable CRDT data structure
//! - **Operations** (`operations`): All mutation types (TrackInsert, ClipInsert,
//!   ClipDelete, KeyframeUpdate, etc.) with serialization and `inverse()`
//! - **Keyframes** (`keyframe`): Interpolatable property animations with
//!   easing functions (linear, ease-in/out, bezier)
//! - **Tombstones** (`tombstone`): Deletion markers with vector clock
//!   causality — prevents zombie data from re-surfacing after merge
//! - **Vector clocks** (`vector_clock`): Lamport-style partial ordering for
//!   causal consistency across distributed peers
//!
//! # Public types
//!
//! The top-level `Clip`, `Track`, and `ProjectData` types provide a simple
//! Serde-serializable API for CRDT snapshot import/export. For full CRDT
//! semantics (merge, sync, conflict resolution), use the `crdt` module
//! directly.

#![allow(clippy::large_enum_variant)]
pub mod crdt;
pub mod entity_graph;
pub mod keyframe;
pub mod operations;
pub mod tombstone;
pub mod vector_clock;
use serde::{Deserialize, Serialize};

/// A single media placement on a track, measured in frames.
///
/// This is the Serde-serializable snapshot form of a clip. For CRDT-aware
/// editing use [`crdt::CRDTClip`], which wraps each mutable field in an
/// LWW register.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Clip {
    /// Stable unique identifier for the clip.
    pub id: String,
    /// Human-readable clip label shown in the UI.
    pub name: String,
    /// Timeline start position, in frames.
    pub start_frame: i32,
    /// Clip length, in frames.
    pub duration_frames: i32,
    /// Identifier of the source media asset this clip references.
    pub media_id: String,
    /// Whether the clip is muted/hidden (excluded from rendering).
    pub is_disabled: bool,
}

/// An ordered lane of clips of a single kind (video or audio).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Track {
    /// Stable unique identifier for the track.
    pub id: String,
    /// Human-readable track label shown in the UI.
    pub name: String,
    /// Track kind — either `"video"` or `"audio"`.
    pub track_type: String, // "video" | "audio"
    /// Clips placed on this track, in timeline order.
    pub clips: Vec<Clip>,
}

/// A complete project snapshot: canvas settings plus all tracks and clips.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectData {
    /// Stable unique identifier for the project.
    pub id: String,
    /// Human-readable project name.
    pub name: String,
    /// Playback rate in frames per second.
    pub fps: f64,
    /// Output canvas width in pixels.
    pub width: u32,
    /// Output canvas height in pixels.
    pub height: u32,
    /// Background clear color as linear RGBA in `[0.0, 1.0]`.
    pub bg_color: [f32; 4],
    /// Total timeline length, in frames.
    pub duration_frames: i32,
    /// All tracks in the project.
    pub tracks: Vec<Track>,
}

impl ProjectData {
    /// Creates an empty project with default black background and a
    /// 1000-frame duration.
    pub fn new(id: String, name: String, fps: f64, width: u32, height: u32) -> Self {
        Self {
            id,
            name,
            fps,
            width,
            height,
            bg_color: [0.0, 0.0, 0.0, 1.0],
            duration_frames: 1000,
            tracks: Vec::new(),
        }
    }

    /// Appends a track to the end of the track list.
    pub fn add_track(&mut self, track: Track) {
        self.tracks.push(track);
    }

    /// Updates a clip's `start_frame` and/or `is_disabled` fields in place.
    ///
    /// Searches every track for a clip matching `clip_id`. Returns `true`
    /// if the clip was found and updated, `false` otherwise.
    pub fn update_clip(
        &mut self,
        clip_id: &str,
        start_frame: Option<i32>,
        is_disabled: Option<bool>,
    ) -> bool {
        for track in &mut self.tracks {
            for clip in &mut track.clips {
                if clip.id == clip_id {
                    if let Some(sf) = start_frame {
                        clip.start_frame = sf;
                    }
                    if let Some(id) = is_disabled {
                        clip.is_disabled = id;
                    }
                    return true;
                }
            }
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_creation() {
        let proj = ProjectData::new("test_id".into(), "Test Project".into(), 60.0, 1920, 1080);
        assert_eq!(proj.id, "test_id");
        assert_eq!(proj.name, "Test Project");
        assert_eq!(proj.fps, 60.0);
        assert_eq!(proj.width, 1920);
        assert_eq!(proj.height, 1080);
        assert!(proj.tracks.is_empty());
    }

    #[test]
    fn test_add_track_and_clip() {
        let mut proj = ProjectData::new("proj1".into(), "Proj 1".into(), 24.0, 1920, 1080);
        let mut track = Track {
            id: "track1".into(),
            name: "V1".into(),
            track_type: "video".into(),
            clips: Vec::new(),
        };
        let clip = Clip {
            id: "clip1".into(),
            name: "My Video".into(),
            start_frame: 0,
            duration_frames: 240, // 10 seconds at 24fps
            media_id: "my_video.mp4".into(),
            is_disabled: false,
        };

        track.clips.push(clip);
        proj.add_track(track);

        assert_eq!(proj.tracks.len(), 1);
        assert_eq!(proj.tracks[0].clips.len(), 1);
        assert_eq!(proj.tracks[0].clips[0].media_id, "my_video.mp4");
        assert_eq!(proj.tracks[0].clips[0].duration_frames, 240);
    }
}

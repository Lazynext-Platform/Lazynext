#![allow(clippy::large_enum_variant)]
pub mod crdt;
pub mod entity_graph;
pub mod keyframe;
pub mod operations;
pub mod tombstone;
pub mod vector_clock;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Clip {
    pub id: String,
    pub name: String,
    pub start_frame: i32,
    pub duration_frames: i32,
    pub media_id: String,
    pub is_disabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub track_type: String, // "video" | "audio"
    pub clips: Vec<Clip>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProjectData {
    pub id: String,
    pub name: String,
    pub fps: f64,
    pub width: u32,
    pub height: u32,
    pub bg_color: [f32; 4],
    pub duration_frames: i32,
    pub tracks: Vec<Track>,
}

impl ProjectData {
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

    pub fn add_track(&mut self, track: Track) {
        self.tracks.push(track);
    }

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

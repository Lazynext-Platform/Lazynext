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

    pub fn update_clip(&mut self, clip_id: &str, start_frame: Option<i32>, is_disabled: Option<bool>) -> bool {
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

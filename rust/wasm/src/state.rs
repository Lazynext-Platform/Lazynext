use serde_wasm_bindgen::{from_value, to_value};
use state::{ProjectData, Track};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct NLEState {
    project: ProjectData,
    frame: i32,
    is_playing: bool,
}

#[wasm_bindgen]
impl NLEState {
    #[wasm_bindgen(constructor)]
    pub fn new(id: String, name: String, fps: f64) -> Self {
        console_error_panic_hook::set_once();
        Self {
            project: ProjectData::new(id, name, fps, 1280, 720),
            frame: 0,
            is_playing: false,
        }
    }

    #[wasm_bindgen(js_name = "addTrack")]
    pub fn add_track(&mut self, name: String, track_type: String) {
        let track = Track {
            id: format!("track_{}", self.project.tracks.len()),
            name,
            track_type,
            clips: Vec::new(),
        };
        self.project.add_track(track);
    }

    #[wasm_bindgen(js_name = "addClip")]
    pub fn add_clip(&mut self, track_idx: usize, id: String, clip_type: String, name: String, start_frame: i32, duration_frames: i32) {
        use state::Clip;
        if track_idx < self.project.tracks.len() {
            let clip = Clip {
                id,
                name,
                media_id: "".to_string(),
                start_frame,
                duration_frames,
                is_disabled: false,
            };
            self.project.tracks[track_idx].clips.push(clip);
        }
    }

    #[wasm_bindgen(js_name = "getProjectData")]
    pub fn get_project_data(&self) -> JsValue {
        to_value(&self.project).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen(js_name = "loadProjectData")]
    pub fn load_project_data(&mut self, json_val: JsValue) -> Result<(), JsValue> {
        let project: ProjectData = from_value(json_val)?;
        self.project = project;
        Ok(())
    }

    #[wasm_bindgen]
    pub fn play(&mut self) {
        self.is_playing = true;
    }

    #[wasm_bindgen]
    pub fn pause(&mut self) {
        self.is_playing = false;
    }

    #[wasm_bindgen(js_name = "setFrame")]
    pub fn set_frame(&mut self, frame: i32) {
        self.frame = frame;
    }

    #[wasm_bindgen(js_name = "getFrame")]
    pub fn get_frame(&self) -> i32 {
        self.frame
    }

    #[wasm_bindgen(js_name = "getIsPlaying")]
    pub fn get_is_playing(&self) -> bool {
        self.is_playing
    }

    #[wasm_bindgen(js_name = "updateClip")]
    pub fn update_clip(
        &mut self,
        clip_id: String,
        start_frame: Option<i32>,
        is_disabled: Option<bool>,
    ) -> bool {
        self.project.update_clip(&clip_id, start_frame, is_disabled)
    }

    #[wasm_bindgen(js_name = "splitClip")]
    pub fn split_clip(&mut self, clip_id: String, at_frame: i32) {
        for track in &mut self.project.tracks {
            let mut split_idx = None;
            for (idx, clip) in track.clips.iter().enumerate() {
                if clip.id == clip_id {
                    if at_frame > clip.start_frame
                        && at_frame < clip.start_frame + clip.duration_frames
                    {
                        split_idx = Some((idx, clip.clone()));
                        break;
                    }
                }
            }

            if let Some((idx, mut original_clip)) = split_idx {
                let dur1 = at_frame - original_clip.start_frame;
                let dur2 = original_clip.duration_frames - dur1;

                original_clip.duration_frames = dur1;

                let mut new_clip = original_clip.clone();
                new_clip.id = format!("{}_split", original_clip.id);
                new_clip.start_frame = at_frame;
                new_clip.duration_frames = dur2;

                track.clips[idx] = original_clip;
                track.clips.insert(idx + 1, new_clip);
                return;
            }
        }
    }

    #[wasm_bindgen(js_name = "trimClip")]
    pub fn trim_clip(&mut self, clip_id: String, new_start: i32, new_duration: i32) {
        for track in &mut self.project.tracks {
            for clip in &mut track.clips {
                if clip.id == clip_id {
                    clip.start_frame = new_start;
                    clip.duration_frames = new_duration;
                    return;
                }
            }
        }
    }

    #[wasm_bindgen(js_name = "insertCutFromScript")]
    pub fn insert_cut_from_script(&mut self, start_ms: f64, end_ms: f64) {
        // Convert ms to frames using project FPS
        let start_frame = (start_ms / 1000.0 * self.project.fps) as i32;
        let end_frame = (end_ms / 1000.0 * self.project.fps) as i32;

        // Apply cut to all clips that overlap this region
        let clip_ids: Vec<String> = self
            .project
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter())
            .filter(|c| {
                c.start_frame < end_frame && (c.start_frame + c.duration_frames) > start_frame
            })
            .map(|c| c.id.clone())
            .collect();

        for id in clip_ids {
            self.split_clip(id.clone(), start_frame);
            self.split_clip(format!("{}_split", id), end_frame);
        }
    }

    #[wasm_bindgen(js_name = "deleteCutFromScript")]
    pub fn delete_cut_from_script(&mut self, start_ms: f64, end_ms: f64) {
        // Convert ms to frames using project FPS
        let start_frame = (start_ms / 1000.0 * self.project.fps) as i32;
        let end_frame = (end_ms / 1000.0 * self.project.fps) as i32;

        // Find clips that overlap this region
        let clip_ids: Vec<String> = self
            .project
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter())
            .filter(|c| {
                c.start_frame < end_frame && (c.start_frame + c.duration_frames) > start_frame
            })
            .map(|c| c.id.clone())
            .collect();

        for id in clip_ids {
            self.split_clip(id.clone(), start_frame);
            let split_id = format!("{}_split", id);
            self.split_clip(split_id.clone(), end_frame);
            // Disable the middle clip (which represents the deleted text)
            self.update_clip(split_id, None, Some(true));
        }
    }

    #[wasm_bindgen(js_name = "triggerLiveCut")]
    pub fn trigger_live_cut(&mut self, _camera_angle: i32, current_frame: i32) {
        // Find the active multicam clip
        let mut target_clip_id = None;
        for track in &self.project.tracks {
            if track.name.to_lowercase().contains("multicam") {
                for clip in &track.clips {
                    if clip.start_frame <= current_frame
                        && (clip.start_frame + clip.duration_frames) > current_frame
                    {
                        target_clip_id = Some(clip.id.clone());
                        break;
                    }
                }
            }
        }

        if let Some(id) = target_clip_id {
            self.split_clip(id, current_frame);
            // In a real NLE, we would then change the active camera metadata of the new split clip
            // self.update_clip_camera(format!("{}_split", id), camera_angle);
        }
    }
}

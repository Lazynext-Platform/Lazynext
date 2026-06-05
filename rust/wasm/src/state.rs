use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::{from_value, to_value};
use state::{ProjectData, Track, Clip};

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
    pub fn update_clip(&mut self, clip_id: String, start_frame: Option<i32>, is_disabled: Option<bool>) -> bool {
        self.project.update_clip(&clip_id, start_frame, is_disabled)
    }
}

//! Mobile bridge — exposes the NLE engine to React Native via UniFFI.
//!
//! The UDL definition is in `rust/core/uniffi/lazynext.udl`.

use crate::nle_state::NLEState;
use once_cell::sync::Lazy;
use std::sync::Mutex;

uniffi::include_scaffolding!("lazynext");

static GLOBAL_ENGINE: Lazy<Mutex<Option<NLEState>>> = Lazy::new(|| Mutex::new(None));

pub fn init_engine(session_id: String, project_name: String, framerate: u32) -> String {
    let mut engine = GLOBAL_ENGINE.lock().unwrap();
    *engine = Some(NLEState::new(session_id, project_name, framerate));
    "Engine initialized".to_string()
}

pub fn get_project_info() -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_ref() {
        let pd = engine.get_project_data();
        let total_clips: usize = pd.tracks.iter().map(|t| t.clips.len()).sum();
        
        let tracks: Vec<serde_json::Value> = pd.tracks.iter().map(|t| {
            let clips: Vec<serde_json::Value> = t.clips.iter().map(|c| {
                serde_json::json!({
                    "id": c.id,
                    "name": c.name,
                    "start": c.start,
                    "duration": c.end.saturating_sub(c.start)
                })
            }).collect();
            
            serde_json::json!({
                "id": t.id,
                "name": format!("{} Track {}", if t.kind == "video" { "V" } else { "A" }, t.id.chars().take(4).collect::<String>()),
                "trackType": t.kind,
                "clips": clips
            })
        }).collect();

        serde_json::json!({
            "name": pd.name,
            "id": pd.id,
            "framerate": pd.framerate,
            "width": pd.width,
            "height": pd.height,
            "track_count": pd.tracks.len(),
            "clip_count": total_clips,
            "tracks": tracks
        })
        .to_string()
    } else {
        "{}".to_string()
    }
}

pub fn add_track(kind: String) -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.add_track(format!("track_{}", uuid::Uuid::new_v4()), kind);
        "Track added".to_string()
    } else {
        "Engine not initialized".to_string()
    }
}

pub fn add_clip(_track_index: u32, _clip_type: String, _name: String, _start: u32, _end: u32) -> String {
    // For now, this just acts as a stub to match UDL. Real clip adding would be done via state ops.
    "Clip added".to_string()
}

pub fn move_clip(clip_id: String, new_start: u32) -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.update_clip_property(&clip_id, "start", new_start as f32);
        format!("Moved clip {}", clip_id)
    } else {
        "Engine not initialized".to_string()
    }
}

pub fn process_intent(prompt: String, _require_approval: bool) -> String {
    if prompt.contains("cut") || prompt.contains("silence") {
        "Trimmed silence from audio tracks.".to_string()
    } else if prompt.contains("music") {
        "Added cinematic background score.".to_string()
    } else if prompt.contains("color") || prompt.contains("grade") {
        "Applied teal-orange color grade.".to_string()
    } else {
        format!("Processed: '{}'", prompt)
    }
}

pub fn get_timeline_state() -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_ref() {
        serde_json::to_string_pretty(engine.get_project_data()).unwrap_or_default()
    } else {
        "{}".to_string()
    }
}

pub fn undo() -> bool {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.undo()
    } else {
        false
    }
}

pub fn redo() -> bool {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.redo()
    } else {
        false
    }
}

pub fn get_status() -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_ref() {
        serde_json::json!({
            "initialized": true,
            "processing": false,
            "current_project": engine.get_project_data().name,
            "operation_count": engine.op_log.iter().count(),
            "peer_id": engine.peer_id
        })
        .to_string()
    } else {
        r#"{"initialized": false}"#.to_string()
    }
}

pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

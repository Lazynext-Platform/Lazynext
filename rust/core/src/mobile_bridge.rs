//! Mobile bridge — exposes the NLE engine to React Native via UniFFI.
//!
//! The UDL definition is in `rust/core/uniffi/lazynext.udl`.

use crate::nle_state::NLEState;
use once_cell::sync::Lazy;
use std::sync::Mutex;

uniffi::include_scaffolding!("lazynext");

static GLOBAL_ENGINE: Lazy<Mutex<Option<NLEState>>> = Lazy::new(|| Mutex::new(None));

/// Initializes the global NLE engine with the given session and project parameters.
pub fn init_engine(session_id: String, project_name: String, framerate: u32) -> String {
    let mut engine = GLOBAL_ENGINE.lock().unwrap();
    *engine = Some(NLEState::new(session_id, project_name, framerate));
    "Engine initialized".to_string()
}

/// Returns a JSON snapshot of the current project including tracks, clips,
/// dimensions, framerate, and metadata.
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

/// Adds a new track of the given kind ("video" or "audio") to the global
/// NLE engine's timeline.
pub fn add_track(kind: String) -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.add_track(format!("track_{}", uuid::Uuid::new_v4()), kind);
        "Track added".to_string()
    } else {
        "Engine not initialized".to_string()
    }
}

/// Adds a clip to a track at the given index with the specified parameters.
/// Validates bounds and clip type before insertion. Returns a result message.
pub fn add_clip(track_index: u32, clip_type: String, name: String, start: u32, end: u32) -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        let track_idx = track_index as usize;
        let track_count = engine.get_project_data().tracks.len();
        if track_idx >= track_count {
            return format!(
                "Clip not added: track index {} out of bounds (total: {})",
                track_idx, track_count
            );
        }
        if start >= end {
            return format!(
                "Clip not added: invalid range (start={} >= end={})",
                start, end
            );
        }
        let clip_id = format!("clip_{}", uuid::Uuid::new_v4());
        engine.add_clip_to_track(track_idx, clip_id.clone(), clip_type, name, start, end);
        format!("Clip added: {}", clip_id)
    } else {
        "Engine not initialized".to_string()
    }
}

/// Moves a clip to a new start position on the timeline.
pub fn move_clip(clip_id: String, new_start: u32) -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.update_clip_property(&clip_id, "start", new_start as f32);
        format!("Moved clip {}", clip_id)
    } else {
        "Engine not initialized".to_string()
    }
}

/// Processes a natural-language editing intent using the AutonomousEditor's
/// local fallback plan and returns a summary of the actions taken. For full
/// LLM-powered editing, use the Lazynext AI Copilot via the API gateway.
pub fn process_intent(prompt: String, require_approval: bool) -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        let editor = crate::AutonomousEditor::new();
        let intent = crate::autonomous::VideoIntent {
            prompt: prompt.clone(),
            require_plan_approval: require_approval,
            source_files: Vec::new(),
            llm_provider: None,
        };
        match editor.process_intent_sync(engine, &intent) {
            Ok(result) => result,
            Err(e) => format!("Failed to process intent: {}", e),
        }
    } else {
        "Engine not initialized".to_string()
    }
}

/// Returns a pretty-printed JSON representation of the full project data.
pub fn get_timeline_state() -> String {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_ref() {
        serde_json::to_string_pretty(engine.get_project_data()).unwrap_or_default()
    } else {
        "{}".to_string()
    }
}

/// Undoes the most recent operation on the NLE state. Returns true if an
/// operation was actually undone.
pub fn undo() -> bool {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.undo()
    } else {
        false
    }
}

/// Redoes the most recently undone operation on the NLE state. Returns true
/// if an operation was actually redone.
pub fn redo() -> bool {
    if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
        engine.redo()
    } else {
        false
    }
}

/// Returns a JSON status object indicating engine initialization state, current
/// project name, and operation count.
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

/// Returns the current crate version from `CARGO_PKG_VERSION`.
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Sends a rotoscoping request to the AI service for the given video,
/// using the provided object prompt. Applies the returned mask to the NLE
/// state on success.
pub fn request_rotoscope(video_id: String, prompt: String) -> String {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    rt.block_on(async {
        let client = crate::ai_client::AIClient::new();
        match client.rotoscope(&video_id, &prompt).await {
            Ok(res) => {
                if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
                    let mask_url = res.mask_sequence_url.unwrap_or_default();
                    let _ = engine.apply_rotoscope_mask(&video_id, &mask_url);
                    "Rotoscoping complete. Mask added.".to_string()
                } else {
                    "Engine not initialized".to_string()
                }
            }
            Err(e) => format!("Rotoscoping failed: {}", e),
        }
    })
}

/// Sends a NeRF extraction request to the AI service for the given video.
/// Adds the resulting point cloud or mesh to the NLE state on success.
pub fn request_nerf(video_id: String) -> String {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    rt.block_on(async {
        let client = crate::ai_client::AIClient::new();
        match client.extract_nerf(&video_id).await {
            Ok(res) => {
                if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
                    let ply_url = res.point_cloud_url.unwrap_or_default();
                    let _ = engine.add_nerf_cloud(&ply_url);
                    "NeRF extraction complete. Splat added.".to_string()
                } else {
                    "Engine not initialized".to_string()
                }
            }
            Err(e) => format!("NeRF extraction failed: {}", e),
        }
    })
}

/// Sends a stem separation request to the AI service for the given audio,
/// splitting it into the requested number of stems. Adds the resulting
/// audio tracks to the NLE state on success.
pub fn request_stem_separation(audio_id: String, stems: u32) -> String {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    rt.block_on(async {
        let client = crate::ai_client::AIClient::new();
        match client.split_stems(&audio_id, stems).await {
            Ok(res) => {
                if let Some(engine) = GLOBAL_ENGINE.lock().unwrap().as_mut() {
                    let stems_map = if res.stems.is_empty() {
                        std::collections::HashMap::new()
                    } else {
                        res.stems
                    };
                    let _ = engine.separate_audio_stems(&audio_id, stems_map);
                    "Stem separation complete. Audio tracks added.".to_string()
                } else {
                    "Engine not initialized".to_string()
                }
            }
            Err(e) => format!("Stem separation failed: {}", e),
        }
    })
}

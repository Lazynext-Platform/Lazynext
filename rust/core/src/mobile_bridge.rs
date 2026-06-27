//! Mobile bridge — exposes the NLE engine to React Native via UniFFI.
//!
//! The UDL definition is in `rust/core/uniffi/lazynext.udl`.
//! Run these commands to generate native bindings:
//!
//! ```sh
//! # Kotlin (Android)
//! uniffi-bindgen generate rust/core/uniffi/lazynext.udl \
//!   --language kotlin --out-dir apps/mobile/android/app/src/main/java/lazynext
//!
//! # Swift (iOS)
//! uniffi-bindgen generate rust/core/uniffi/lazynext.udl \
//!   --language swift --out-dir apps/mobile/ios/Lazynext/Bridge
//! ```
//!
//! Then add `uniffi` to Cargo.toml and uncomment the macros below.

use crate::nle_state::NLEState;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct MobileNLEBridge {
    state: Arc<Mutex<NLEState>>,
}

impl MobileNLEBridge {
    pub fn new(id: String, name: String, framerate: u32) -> Self {
        MobileNLEBridge {
            state: Arc::new(Mutex::new(NLEState::new(id, name, framerate))),
        }
    }

    pub fn get_project_name(&self) -> String {
        let state = self.state.lock().unwrap();
        state.get_project_data().name.clone()
    }

    pub fn add_track(&self, id: String, kind: String) {
        let mut state = self.state.lock().unwrap();
        state.add_track(id, kind);
    }

    pub fn get_track_count(&self) -> usize {
        let state = self.state.lock().unwrap();
        state.get_project_data().tracks.len()
    }

    /// Process an AI editing intent through the autonomous editor.
    pub fn process_intent(&self, prompt: &str) -> String {
        // In production: call AutonomousEditor::process_intent_with_llm via tokio runtime
        // For now: return a status message based on keyword matching
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

    /// Get the full project info as a JSON string.
    pub fn get_project_info_json(&self) -> String {
        let state = self.state.lock().unwrap();
        let pd = state.get_project_data();
        let total_clips: usize = pd.tracks.iter().map(|t| t.clips.len()).sum();
        serde_json::json!({
            "name": pd.name,
            "id": pd.id,
            "framerate": pd.framerate,
            "width": pd.width,
            "height": pd.height,
            "track_count": pd.tracks.len(),
            "clip_count": total_clips
        })
        .to_string()
    }

    /// Get the full timeline state as a JSON string.
    pub fn get_timeline_state_json(&self) -> String {
        let state = self.state.lock().unwrap();
        serde_json::to_string_pretty(state.get_project_data()).unwrap_or_default()
    }

    /// Undo the last operation.
    pub fn undo(&self) -> bool {
        self.state.lock().unwrap().undo()
    }

    /// Redo the last undone operation.
    pub fn redo(&self) -> bool {
        self.state.lock().unwrap().redo()
    }

    /// Get engine status info.
    pub fn get_status_json(&self) -> String {
        let state = self.state.lock().unwrap();
        serde_json::json!({
            "initialized": true,
            "processing": false,
            "current_project": state.get_project_data().name,
            "operation_count": state.op_log.iter().count(),
            "peer_id": state.peer_id
        })
        .to_string()
    }

    /// Get the bridge version.
    pub fn version(&self) -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }
}

// In production, uncomment and add `uniffi` to Cargo.toml:
//
// uniffi::setup_scaffolding!();
//
// #[uniffi::export]
// impl MobileNLEBridge {
//     #[uniffi::constructor]
//     pub fn new(id: String, name: String, framerate: u32) -> Self { ... }
//
//     pub fn get_project_name(&self) -> String { ... }
//     pub fn process_intent(&self, prompt: String) -> String { ... }
//     pub fn get_project_info_json(&self) -> String { ... }
//     pub fn get_timeline_state_json(&self) -> String { ... }
//     pub fn undo(&self) -> bool { ... }
//     pub fn redo(&self) -> bool { ... }
//     pub fn get_status_json(&self) -> String { ... }
//     pub fn version() -> String { env!("CARGO_PKG_VERSION").to_string() }
// }

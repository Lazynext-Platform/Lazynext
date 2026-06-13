use crate::nle_state::NLEState;
use std::sync::{Arc, Mutex};

// This module exposes the NLEState to React Native via UniFFI or JNI.
// For the sake of the Lazynext architecture demonstration, we define the FFI boundary here.

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
}

// In a real implementation, we would use the `uniffi` macro here:
// uniffi::setup_scaffolding!();
// uniffi::export! {
//     impl MobileNLEBridge { ... }
// }

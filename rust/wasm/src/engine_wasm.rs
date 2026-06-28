#[cfg(target_arch = "wasm32")]
use lazynext_core::{engine::CoreEngine, nle_state::NLEState};
use std::sync::Arc;
use tokio::sync::Mutex;
use wasm_bindgen::prelude::*;
use web_sys::HtmlCanvasElement;

#[wasm_bindgen]
pub struct WasmEngine {
    engine: Arc<Mutex<NLEState>>,
    core: Arc<CoreEngine>,
}

#[wasm_bindgen]
impl WasmEngine {
    #[wasm_bindgen(constructor)]
    pub async fn new(project_id: String, project_name: String, framerate: u32) -> Result<WasmEngine, JsValue> {
        console_error_panic_hook::set_once();
        
        let state = NLEState::new(project_id, project_name, framerate);
        let engine = Arc::new(Mutex::new(state));
        
        let core = CoreEngine::init(engine.clone())
            .await
            .map_err(|e| JsValue::from_str(&format!("Failed to init core engine: {}", e)))?;
            
        Ok(Self {
            engine,
            core: Arc::new(core),
        })
    }

    #[wasm_bindgen]
    pub async fn render_to_canvas(&self, canvas: HtmlCanvasElement, frame_idx: u32) -> Result<(), JsValue> {
        let width = canvas.width();
        let height = canvas.height();
        
        {
            let mut state = self.engine.lock().await;
            state.set_dimensions(width, height);
        }
        
        let _ = self.core.render_frame_to_target(frame_idx, &canvas).await
            .map_err(|e| JsValue::from_str(&format!("Render failed: {}", e)))?;
            
        Ok(())
    }
    
    #[wasm_bindgen]
    pub async fn add_test_clip(&self) {
        let mut state = self.engine.lock().await;
        state.add_track("V1".to_string(), "video".to_string());
        state.add_clip_to_track(
            0,
            "clip_1".to_string(),
            "video".to_string(),
            "source_footage.mp4".to_string(),
            0,
            300,
        );
    }

    #[wasm_bindgen(js_name = "addMedia")]
    pub async fn add_media(&self, id: String, name: String, path_or_url: String, asset_type: String, duration: f64, width: u32, height: u32) {
        let mut state = self.engine.lock().await;
        let asset = lazynext_core::nle_state::MediaAsset {
            id: id.clone(),
            name,
            path_or_url,
            asset_type,
            duration,
            width,
            height,
        };
        state.get_project_data_mut().media_pool.insert(id, asset);
    }
    
    #[wasm_bindgen(js_name = "addTrack")]
    pub async fn add_track(&self, kind: String) {
        let mut state = self.engine.lock().await;
        let track_name = format!("{}1", if kind == "video" { "V" } else { "A" });
        state.add_track(track_name, kind);
    }
    
    #[wasm_bindgen(js_name = "getTimelineState")]
    pub async fn get_timeline_state(&self) -> String {
        let state = self.engine.lock().await;
        serde_json::to_string_pretty(state.get_project_data()).unwrap_or_else(|_| "{}".to_string())
    }
}

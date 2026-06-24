use crate::nle_state::NLEState;
use std::sync::Arc;
use tokio::sync::Mutex;

/// The primary engine that connects the CRDT NLE State with the native processing pipelines.
/// In a full production environment, this struct dispatches tasks to an FFmpeg subprocess
/// or a WebGL/WGPU context for hardware-accelerated frame rendering.
pub struct CoreEngine {
    project: Arc<Mutex<NLEState>>,
    is_hardware_accelerated: bool,
}

impl CoreEngine {
    pub fn new(project: Arc<Mutex<NLEState>>) -> Self {
        println!("[CoreEngine] Initialized. Awaiting frame commands.");
        Self {
            project,
            is_hardware_accelerated: true,
        }
    }

    /// Renders a single frame from the CRDT timeline state via the GPU compositor.
    ///
    /// When the compositor is available (desktop / WASM-with-WebGPU), this
    /// delegates to `compositor::Compositor::render_frame`.  Falls back to a
    /// software mock when no GPU context is active (e.g. headless CLI).
    pub async fn render_frame(&self, frame_idx: u32) -> Result<Vec<u8>, String> {
        let state = self.project.lock().await;

        // Frame index bounds check against the longest track
        let max_duration: u32 = state
            .get_project_data()
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().map(|c| c.end))
            .max()
            .unwrap_or(1);
        if frame_idx >= max_duration && max_duration > 0 {
            return Err(format!(
                "Frame {} out of bounds (max duration: {})",
                frame_idx, max_duration
            ));
        }

        // ── Compositor path (real GPU rendering) ──────────────────────────
        //
        // TODO Phase 4: wire the lazynext_compositor crate.
        //
        //   let compositor = compositor::Compositor::get_or_init(&gpu_ctx)?;
        //   let frame_desc = build_frame_descriptor(&state, frame_idx)?;
        //   let rgba = compositor.render_to_buffer(&frame_desc)?;
        //   return Ok(rgba);
        //
        // For now, return a mock buffer indicating the stub status.

        println!(
            "[CoreEngine] Rendering frame {} (mock compositor path)",
            frame_idx
        );

        let width = state.get_project_data().width;
        let height = state.get_project_data().height;
        let mut mock_buffer = vec![0u8; (width * height * 4) as usize];
        mock_buffer[0] = 255; // Red pixel top-left — identifies mock frames

        Ok(mock_buffer)
    }

    /// Dispatches an asynchronous export job to FFmpeg using the current CRDT state.
    pub async fn dispatch_export(&self, output_path: &str) -> Result<(), String> {
        println!(
            "[CoreEngine] Dispatching export to {} via FFmpeg pipeline...",
            output_path
        );

        // Mock FFmpeg subprocess execution
        if self.is_hardware_accelerated {
            println!("[CoreEngine] Using NVENC/VideoToolbox hardware acceleration.");
        }

        // Simulate IO delay
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        println!("[CoreEngine] Export complete!");
        Ok(())
    }
}

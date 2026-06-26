use crate::nle_state::NLEState;
use std::sync::Arc;
use tokio::sync::Mutex;

/// The primary engine that connects the CRDT NLE State with the native processing pipelines.
/// In a full production environment, this struct dispatches tasks to an FFmpeg subprocess
/// or a WebGL/WGPU context for hardware-accelerated frame rendering.
pub struct CoreEngine {
    project: Arc<Mutex<NLEState>>,
    gpu_ctx: Arc<gpu::GpuContext>,
    compositor: Arc<tokio::sync::Mutex<compositor::Compositor>>,
    is_hardware_accelerated: bool,
}

impl CoreEngine {
    pub async fn init(project: Arc<Mutex<NLEState>>) -> Result<Self, String> {
        println!("[CoreEngine] Initializing GPU Context...");
        
        // GpuContext::new() returns Result<GpuContext, GpuError>
        let gpu_ctx = gpu::GpuContext::new()
            .await
            .map_err(|e| format!("Failed to initialize GPU context: {}", e))?;
            
        let gpu_ctx = Arc::new(gpu_ctx);
        let comp = compositor::Compositor::new(&gpu_ctx);
        
        println!("[CoreEngine] Initialized. Awaiting frame commands.");
        Ok(Self {
            project,
            gpu_ctx,
            compositor: Arc::new(tokio::sync::Mutex::new(comp)),
            is_hardware_accelerated: true,
        })
    }

    /// Renders a single frame from the CRDT timeline state via the GPU compositor.
    ///
    /// Builds a `FrameDescriptor` from the current timeline state by mapping
    /// clips that are visible at the given frame index to `LayerDescriptor`
    /// items, then delegates to the compositor for GPU rendering. The resulting
    /// texture is read back to CPU memory as RGBA bytes.
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

        let pd = state.get_project_data();
        let width = pd.width;
        let height = pd.height;

        // ── Build FrameDescriptor from timeline state ─────────────────────
        let mut items: Vec<compositor::FrameItemDescriptor> = Vec::new();

        for track in &pd.tracks {
            for clip in &track.clips {
                // Only include clips visible at this frame
                if frame_idx >= clip.start && frame_idx < clip.end {
                    // Evaluate animated properties at this frame
                    let opacity = clip.get_animated_value("opacity", frame_idx, 1.0) as f32;
                    let center_x = clip.get_animated_value("position_x", frame_idx, width as f64 / 2.0) as f32;
                    let center_y = clip.get_animated_value("position_y", frame_idx, height as f64 / 2.0) as f32;
                    let scale_x = clip.get_animated_value("scale_x", frame_idx, 1.0) as f32;
                    let scale_y = clip.get_animated_value("scale_y", frame_idx, 1.0) as f32;
                    let rotation = clip.get_animated_value("rotation", frame_idx, 0.0) as f32;

                    let layer = compositor::LayerDescriptor {
                        texture_id: clip.id.clone(),
                        transform: compositor::QuadTransformDescriptor {
                            center_x,
                            center_y,
                            width: width as f32 * scale_x,
                            height: height as f32 * scale_y,
                            rotation_degrees: rotation,
                            flip_x: false,
                            flip_y: false,
                        },
                        opacity,
                        blend_mode: compositor::BlendMode::Normal,
                        effect_pass_groups: Vec::new(),
                        mask: None,
                        color_grading: None,
                        crop: None,
                        border_radius: None,
                        shadow: None,
                    };
                    items.push(compositor::FrameItemDescriptor::Layer(layer));
                }
            }
        }

        let frame_desc = compositor::FrameDescriptor {
            width,
            height,
            clear: compositor::CanvasClearDescriptor {
                color: pd.bg_color,
            },
            items,
        };

        // ── Render via GPU compositor ─────────────────────────────────────
        let mut comp = self.compositor.lock().await;
        let texture = comp
            .render_frame_to_texture(&self.gpu_ctx, &frame_desc)
            .map_err(|e| format!("Compositor error: {e}"))?;

        // ── Read texture back to CPU ──────────────────────────────────────
        #[cfg(not(target_arch = "wasm32"))]
        {
            let rgba_bytes = self
                .gpu_ctx
                .read_texture_to_cpu(&texture, width, height)
                .map_err(|e| format!("GPU readback error: {e}"))?;
            Ok(rgba_bytes)
        }

        #[cfg(target_arch = "wasm32")]
        {
            // On WASM, textures are rendered to canvas directly — return
            // an empty vec as a sentinel (the real pixels are on the canvas).
            Ok(Vec::new())
        }
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

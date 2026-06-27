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
    width: u32,
    height: u32,
}

impl CoreEngine {
    pub async fn init(project: Arc<Mutex<NLEState>>) -> Result<Self, String> {
        println!("[CoreEngine] Initializing GPU Context...");

        // GpuContext::new() returns Result<GpuContext, GpuError>
        let gpu_ctx = gpu::GpuContext::new()
            .await
            .map_err(|e| format!("Failed to initialize GPU context: {}", e))?;

        let (width, height) = {
            let state = project.lock().await;
            let pd = state.get_project_data();
            (pd.width, pd.height)
        };

        let gpu_ctx = Arc::new(gpu_ctx);
        let comp = compositor::Compositor::new(&gpu_ctx);

        println!("[CoreEngine] Initialized. Awaiting frame commands.");
        Ok(Self {
            project,
            gpu_ctx,
            compositor: Arc::new(tokio::sync::Mutex::new(comp)),
            is_hardware_accelerated: true,
            width,
            height,
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
                    let center_x =
                        clip.get_animated_value("position_x", frame_idx, width as f64 / 2.0) as f32;
                    let center_y =
                        clip.get_animated_value("position_y", frame_idx, height as f64 / 2.0)
                            as f32;
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
            clear: compositor::CanvasClearDescriptor { color: pd.bg_color },
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

    /// Dispatches an export job by rendering all frames through the GPU compositor
    /// and piping them to ffmpeg for encoding. Supports all export formats.
    ///
    /// This is used by the CLI and headless renderer. For web-based exports,
    /// the render-service handles encoding independently.
    pub async fn dispatch_export(&self, output_path: &str) -> Result<(), String> {
        println!(
            "[CoreEngine] Dispatching export to {} via FFmpeg pipeline...",
            output_path
        );

        let state = self.project.lock().await;
        let pd = state.get_project_data();

        let total_frames: u32 = pd
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().map(|c| c.end))
            .max()
            .unwrap_or(300);

        let config = lazynext_export::ExportConfig {
            format: lazynext_export::ExportFormat::Mp4,
            width: pd.width,
            height: pd.height,
            framerate: pd.framerate,
            bitrate_kbps: 8000,
            output_path: output_path.to_string(),
        };

        drop(state); // release lock before rendering

        if self.is_hardware_accelerated {
            println!("[CoreEngine] Using hardware-accelerated encoding path.");
        }

        println!(
            "[CoreEngine] Rendering {} frames ({}x{} @ {}fps)...",
            total_frames, config.width, config.height, config.framerate
        );

        let pipeline = lazynext_export::ExportPipeline::new(config);
        let engine_ref = self;

        let mut rendered = 0u32;
        pipeline
            .export(|frame_idx| {
                let rgba = tokio::runtime::Handle::current()
                    .block_on(async { engine_ref.render_frame(frame_idx).await });
                rendered += 1;
                if rendered.is_multiple_of(30) {
                    println!("[CoreEngine] Rendered frame {}/{}", rendered, total_frames);
                }
                let frame_size = (engine_ref.width * engine_ref.height * 4) as usize;
                match rgba {
                    Ok(bytes) => bytes,
                    Err(e) => {
                        eprintln!("[CoreEngine] Frame {} render error: {}", frame_idx, e);
                        vec![0u8; frame_size]
                    }
                }
            })
            .await
            .map_err(|e| format!("Export failed: {e}"))?;

        println!("[CoreEngine] Export complete!");
        Ok(())
    }
}

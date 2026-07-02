//! Core engine module connecting the CRDT NLE state with GPU compositor,
//! asset loading, playback control, and SDI output via DeckLink.
//! Provides the `CoreEngine` runtime, the `AssetLoader` trait for media
//! frame retrieval, and the `PlaybackLoop` real-time playhead driver.

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
    asset_loader: Option<Arc<dyn AssetLoader>>,
    pub is_hardware_accelerated: bool,
    pub width: u32,
    pub height: u32,
    #[cfg(not(target_arch = "wasm32"))]
    pub decklink: tokio::sync::Mutex<Option<decklink::DecklinkEngine>>,
}

/// Abstract trait for loading raw video frames for the compositor.
pub trait AssetLoader: Send + Sync {
    /// Loads a frame for the given media asset at the given local frame index.
    fn load_frame(
        &self,
        media_id: &str,
        frame_idx: u32,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<Vec<u8>, String>> + Send>>;
}

/// Real-time loop that increments the playhead and dispatches render events.
pub struct PlaybackLoop {
    is_playing: bool,
    current_frame: u32,
    _framerate: u32,
    audio: Option<audio::playback::AudioPlayback>,
    #[cfg(not(target_arch = "wasm32"))]
    decklink: Option<decklink::DecklinkEngine>,
}

impl PlaybackLoop {
    pub fn new(framerate: u32) -> Self {
        let audio = audio::playback::AudioPlayback::new().ok();
        #[cfg(not(target_arch = "wasm32"))]
        let mut decklink = Some(decklink::DecklinkEngine::new());
        #[cfg(not(target_arch = "wasm32"))]
        if let Some(dl) = &mut decklink {
            // Hardcode to 1080p24 for now, since that's our default project framerate
            dl.configure(
                decklink::SdiVideoMode::HD1080p24,
                decklink::PixelFormat::Bgra8Bit,
            );
        }

        Self {
            is_playing: false,
            current_frame: 0,
            _framerate: framerate,
            audio,
            #[cfg(not(target_arch = "wasm32"))]
            decklink,
        }
    }

    pub fn play(&mut self) {
        self.is_playing = true;
        if let Some(audio) = &self.audio {
            audio.resume();
        }
        #[cfg(not(target_arch = "wasm32"))]
        if let Some(dl) = &mut self.decklink {
            let _ = dl.start_output();
        }
    }

    pub fn pause(&mut self) {
        self.is_playing = false;
        if let Some(audio) = &self.audio {
            audio.pause();
        }
        #[cfg(not(target_arch = "wasm32"))]
        if let Some(dl) = &mut self.decklink {
            dl.stop_output();
        }
    }

    pub fn seek(&mut self, frame: u32) {
        self.current_frame = frame;
        if let Some(audio) = &self.audio {
            // Seek isn't cleanly supported in rodio on simple buffers without recreating the source,
            // but we can pause it to prevent desync until a new stream is started.
            audio.pause();
        }
    }

    pub fn is_playing(&self) -> bool {
        self.is_playing
    }
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
        #[cfg(not(target_arch = "wasm32"))]
        let loader = Arc::new(crate::ring_buffer_decoder::RingBufferDecoder::new(
            width, height,
        ));

        #[cfg(not(target_arch = "wasm32"))]
        let asset_loader: Option<Arc<dyn AssetLoader>> = Some(loader);

        #[cfg(target_arch = "wasm32")]
        let asset_loader: Option<Arc<dyn AssetLoader>> = None;

        Ok(Self {
            project,
            gpu_ctx,
            compositor: Arc::new(tokio::sync::Mutex::new(comp)),
            asset_loader,
            is_hardware_accelerated: true,
            width,
            height,
            #[cfg(not(target_arch = "wasm32"))]
            decklink: tokio::sync::Mutex::new(None),
        })
    }

    /// Sets the asset loader used to fetch media frames dynamically.
    pub fn set_asset_loader(&mut self, loader: Arc<dyn AssetLoader>) {
        self.asset_loader = Some(loader);
    }

    /// Clear the asset loader so render_frame uses static textures only.
    /// Use this when frames are pre-uploaded as textures (e.g. CLI batch render).
    pub fn clear_asset_loader(&mut self) {
        self.asset_loader = None;
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub async fn enable_decklink(&self) {
        let mut dl_guard = self.decklink.lock().await;
        if dl_guard.is_none() {
            let mut dl = decklink::DecklinkEngine::new();
            dl.configure(
                decklink::SdiVideoMode::HD1080p24,
                decklink::PixelFormat::Bgra8Bit,
            );
            let _ = dl.start_output();
            *dl_guard = Some(dl);
            println!("[CoreEngine] Decklink SDI output enabled.");
        }
    }

    /// Uploads a texture to the GPU compositor for use by clips.
    pub async fn upload_texture(
        &self,
        id: &str,
        rgba: &[u8],
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        let texture = self
            .gpu_ctx
            .create_texture_from_rgba(rgba, width, height)
            .map_err(|e| format!("Failed to create texture: {e}"))?;
        let mut comp = self.compositor.lock().await;
        comp.upsert_texture(id.to_string(), texture);
        Ok(())
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
                    let local_frame = frame_idx - clip.start;

                    // Fetch frame data if asset_loader is present
                    if let Some(loader) = &self.asset_loader {
                        // Resolve the actual media file path from the clip's media_id
                        let media_path = clip
                            .media_id
                            .as_ref()
                            .and_then(|mid| pd.media_pool.get(mid))
                            .map(|asset| asset.path_or_url.clone())
                            .unwrap_or_else(|| clip.id.clone());

                        match loader.load_frame(&media_path, local_frame).await {
                            Ok(rgba) => {
                                // We assume media matches project dimensions for this example
                                let _ = self.upload_texture(&clip.id, &rgba, width, height).await;
                            }
                            Err(e) => {
                                eprintln!(
                                    "[CoreEngine] Failed to load frame {} for clip {}: {}",
                                    local_frame, clip.id, e
                                );
                            }
                        }
                    }
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
                        luma_key_threshold: None,
                        luma_key_tolerance: None,
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

            // Pump to Decklink if active
            let mut dl_guard = self.decklink.lock().await;
            if let Some(dl) = dl_guard.as_mut() {
                let _ = dl.pump_frame_to_sdi(&rgba_bytes, width, height);
            }

            Ok(rgba_bytes)
        }

        #[cfg(target_arch = "wasm32")]
        {
            // On WASM, textures are rendered to canvas directly — return
            // an empty vec as a sentinel (the real pixels are on the canvas).
            Ok(Vec::new())
        }
    }

    #[cfg(target_arch = "wasm32")]
    pub async fn render_frame_to_target(
        &self,
        frame_idx: u32,
        canvas: &web_sys::HtmlCanvasElement,
    ) -> Result<(), String> {
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
                        luma_key_threshold: None,
                        luma_key_tolerance: None,
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

        // Render directly to the user-provided canvas
        self.gpu_ctx
            .render_texture_via_gl_canvas(&texture, canvas, width, height)
            .map_err(|e| format!("WebGL render error: {e}"))?;

        Ok(())
    }

    /// Dispatches an export job by rendering all frames through the GPU compositor
    /// and piping them to ffmpeg for encoding. Supports all export formats.
    ///
    /// - `format` / `bitrate_kbps` are caller-controlled (export options).
    /// - `total_frames` is the exact number of frames to render, derived from the
    ///   timeline duration by the caller — so exports match project length.
    /// - `progress_tx` receives each rendered frame index (for progress bars / SSE).
    ///
    /// This is used by the CLI and headless renderer. For web-based exports,
    /// the render-service handles encoding independently.
    #[cfg(not(target_arch = "wasm32"))]
    pub async fn dispatch_export(
        &self,
        output_path: &str,
        format: lazynext_export::ExportFormat,
        bitrate_kbps: u32,
        total_frames: u32,
        progress_tx: Option<tokio::sync::mpsc::UnboundedSender<u32>>,
    ) -> Result<(), String> {
        println!(
            "[CoreEngine] Dispatching export to {} via FFmpeg pipeline...",
            output_path
        );

        let state = self.project.lock().await;
        let pd = state.get_project_data();

        let config = lazynext_export::ExportConfig {
            format,
            width: pd.width,
            height: pd.height,
            framerate: pd.framerate,
            bitrate_kbps,
            output_path: output_path.to_string(),
        };

        drop(state); // release lock before rendering

        if self.is_hardware_accelerated {
            println!("[CoreEngine] Using hardware-accelerated encoding path.");
        }

        println!(
            "[CoreEngine] Rendering {} frames ({}x{} @ {}fps, {:?})...",
            total_frames, config.width, config.height, config.framerate, config.format
        );

        let pipeline = lazynext_export::ExportPipeline::new(config);
        let engine_ref = self;

        let progress_tx_clone = progress_tx.clone();

        pipeline
            .export(total_frames, move |frame_idx| {
                let tx_for_frame = progress_tx_clone.clone();
                async move {
                    let rgba = engine_ref.render_frame(frame_idx).await;
                    if let Some(ref tx) = tx_for_frame {
                        let _ = tx.send(frame_idx);
                    } else if frame_idx % 30 == 0 {
                        println!("[CoreEngine] Rendered frame {}/{}", frame_idx, total_frames);
                    }
                    let frame_size = (engine_ref.width * engine_ref.height * 4) as usize;
                    match rgba {
                        Ok(bytes) => bytes,
                        Err(e) => {
                            eprintln!("[CoreEngine] Frame {} render error: {}", frame_idx, e);
                            vec![0u8; frame_size]
                        }
                    }
                } // close async block
            }) // close export closure
            .await
            .map_err(|e| format!("Export failed: {e}"))?;

        println!("[CoreEngine] Export complete!");
        Ok(())
    }
}

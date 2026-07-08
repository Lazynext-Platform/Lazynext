//! WASM bridge for the GPU compositor.
//!
//! Manages a per-thread compositor runtime backed by a WebGPU/WebGL canvas.
//! Provides full project rendering — parses a JSON project description
//! (tracks, clips, transforms, keyframes, filters, shadows, text, chroma-key
//! effects) and dispatches composited frames to the GPU surface.

#![cfg(target_arch = "wasm32")]

use std::cell::RefCell;

use compositor::{Compositor, FrameDescriptor, RenderFrameOptions};
use gpu::wgpu;
use js_sys::Object;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

use crate::gpu::{
    import_canvas_texture, read_offscreen_canvas_property, read_serde_property, read_u32_property,
    with_gpu_runtime,
};
use crate::perf;

struct CompositorRuntime {
    /// The HTML canvas the compositor renders into.
    canvas: web_sys::HtmlCanvasElement,
    /// The underlying GPU compositor engine.
    compositor: Compositor,
    /// The GPU surface bound to the canvas.
    surface: wgpu::Surface<'static>,
    /// Current configured surface size as `(width, height)`.
    surface_size: (u32, u32),
}

thread_local! {
    static COMPOSITOR_RUNTIME: RefCell<Option<CompositorRuntime>> = const { RefCell::new(None) };
}

/// Initializes the per-thread compositor runtime against a new WebGPU/WebGL
/// surface of the given size.
///
/// If a runtime already exists it is resized instead. Returns an error for
/// zero dimensions or sizes exceeding the 16384×16384 GPU limit.
#[wasm_bindgen(js_name = initCompositor)]
pub fn init_compositor(width: u32, height: u32) -> Result<(), JsValue> {
    if width == 0 || height == 0 {
        return Err(JsValue::from_str(&format!(
            "Invalid compositor dimensions: {}x{} (must be > 0)",
            width, height
        )));
    }
    if width > 16384 || height > 16384 {
        return Err(JsValue::from_str(&format!(
            "Compositor dimensions exceed GPU limits: {}x{} (max 16384x16384)",
            width, height
        )));
    }
    with_gpu_runtime(|gpu_runtime| {
        if COMPOSITOR_RUNTIME.with(|runtime| runtime.borrow().is_some()) {
            return resize_compositor(width, height);
        }

        // On WebGL, wgpu is bound to a specific canvas; reuse it so the UI
        // can mount the output directly instead of copying pixels through
        // an intermediate 2D canvas every frame. On WebGPU, surface rendering
        // works against any canvas so we create a fresh one.
        let canvas = if let Some(gl_canvas) = gpu_runtime.context.gl_canvas() {
            gl_canvas.clone()
        } else {
            let document = web_sys::window()
                .and_then(|window| window.document())
                .ok_or_else(|| JsValue::from_str("Document is not available"))?;
            document
                .create_element("canvas")?
                .dyn_into::<web_sys::HtmlCanvasElement>()
                .map_err(|_| JsValue::from_str("Failed to create compositor canvas"))?
        };
        canvas.set_width(width);
        canvas.set_height(height);

        let compositor = Compositor::new(&gpu_runtime.context);
        let surface = gpu_runtime
            .context
            .instance()
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas.clone()))
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        gpu_runtime
            .context
            .configure_surface(&surface, width, height)
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        COMPOSITOR_RUNTIME.with(|runtime| {
            runtime.replace(Some(CompositorRuntime {
                canvas,
                compositor,
                surface,
                surface_size: (width, height),
            }));
        });

        Ok(())
    })
}

/// Resizes the compositor canvas and reconfigures its GPU surface.
///
/// No-ops if the size is unchanged. Errors if the compositor has not been
/// initialized via [`init_compositor`].
#[wasm_bindgen(js_name = resizeCompositor)]
pub fn resize_compositor(width: u32, height: u32) -> Result<(), JsValue> {
    with_gpu_runtime(|gpu_runtime| {
        COMPOSITOR_RUNTIME.with(|runtime| {
            let mut borrow = runtime.borrow_mut();
            let Some(runtime) = borrow.as_mut() else {
                return Err(JsValue::from_str(
                    "Compositor is not initialized. Call initCompositor() first.",
                ));
            };
            runtime.canvas.set_width(width);
            runtime.canvas.set_height(height);
            if runtime.surface_size != (width, height) {
                gpu_runtime
                    .context
                    .configure_surface(&runtime.surface, width, height)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;
                runtime.surface_size = (width, height);
            }
            Ok(())
        })
    })
}

/// Returns the HTML canvas element the compositor renders into, so the UI
/// can mount it directly.
#[wasm_bindgen(js_name = getCompositorCanvas)]
pub fn get_compositor_canvas() -> Result<web_sys::HtmlCanvasElement, JsValue> {
    COMPOSITOR_RUNTIME.with(|runtime| {
        let borrow = runtime.borrow();
        let Some(runtime) = borrow.as_ref() else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };
        Ok(runtime.canvas.clone())
    })
}

/// Uploads a JS image source into a GPU texture cached under the given ID.
///
/// The `options` object carries `{ id, source, width, height }`. Errors on
/// zero dimensions or if the compositor is not initialized.
#[wasm_bindgen(js_name = uploadTexture)]
pub fn upload_texture(options: JsValue) -> Result<(), JsValue> {
    let UploadTextureOptions {
        id,
        source,
        width,
        height,
    } = parse_upload_texture_options(options)?;

    if width == 0 || height == 0 {
        return Err(JsValue::from_str(&format!(
            "Invalid texture dimensions for '{}': {}x{} (must be > 0)",
            id, width, height
        )));
    }

    with_gpu_runtime(|gpu_runtime| {
        COMPOSITOR_RUNTIME.with(|runtime| {
            let mut borrow = runtime.borrow_mut();
            let Some(runtime) = borrow.as_mut() else {
                return Err(JsValue::from_str(
                    "Compositor is not initialized. Call initCompositor() first.",
                ));
            };

            let texture = import_canvas_texture(
                &gpu_runtime.context,
                &source,
                width,
                height,
                "compositor-upload-texture",
            );
            runtime.compositor.upsert_texture(id, texture);
            Ok(())
        })
    })
}

/// Releases the cached GPU texture with the given ID, freeing its memory.
#[wasm_bindgen(js_name = releaseTexture)]
pub fn release_texture(id: String) -> Result<(), JsValue> {
    COMPOSITOR_RUNTIME.with(|runtime| {
        let mut borrow = runtime.borrow_mut();
        let Some(runtime) = borrow.as_mut() else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };
        runtime.compositor.release_texture(&id);
        Ok(())
    })
}

/// Renders a single composited frame from a JS frame descriptor to the GPU
/// surface, recording per-stage timings via [`perf`].
///
/// The `options` object describes the layers, transforms, and effects for
/// this frame. Errors if the compositor is not initialized.
#[wasm_bindgen(js_name = renderFrame)]
pub fn render_frame(options: JsValue) -> Result<(), JsValue> {
    perf::reset();

    let t_deserialize = perf::now_ms();
    let frame: FrameDescriptor = serde_wasm_bindgen::from_value(options)
        .map_err(|error| JsValue::from_str(&format!("Invalid frame descriptor: {error}")))?;
    perf::record("wasm.deserialize", perf::now_ms() - t_deserialize);

    with_gpu_runtime(|gpu_runtime| {
        COMPOSITOR_RUNTIME.with(|runtime| {
            let mut borrow = runtime.borrow_mut();
            let Some(runtime) = borrow.as_mut() else {
                return Err(JsValue::from_str(
                    "Compositor is not initialized. Call initCompositor() first.",
                ));
            };

            if runtime.surface_size != (frame.width, frame.height) {
                runtime.canvas.set_width(frame.width);
                runtime.canvas.set_height(frame.height);
                let t_surface = perf::now_ms();
                gpu_runtime
                    .context
                    .configure_surface(&runtime.surface, frame.width, frame.height)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;
                perf::record("wasm.surfaceConfigure", perf::now_ms() - t_surface);
                runtime.surface_size = (frame.width, frame.height);
            }

            if gpu_runtime.context.supports_surface_rendering() {
                let t_render = perf::now_ms();
                let result = runtime
                    .compositor
                    .render_frame(
                        &gpu_runtime.context,
                        RenderFrameOptions {
                            frame: &frame,
                            surface: &runtime.surface,
                        },
                    )
                    .map_err(|error| JsValue::from_str(&error.to_string()));
                perf::record("wasm.renderFrameToSurface", perf::now_ms() - t_render);
                result
            } else {
                // WebGL still needs a separate composition pass, but the output
                // surface is now persistent just like the WebGPU path.
                let t_composite = perf::now_ms();
                let texture = runtime
                    .compositor
                    .render_frame_to_texture(&gpu_runtime.context, &frame)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;
                perf::record("wasm.compositeToTexture", perf::now_ms() - t_composite);

                let t_present = perf::now_ms();
                gpu_runtime
                    .context
                    .present_texture_to_surface(&texture, &runtime.surface)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;
                perf::record("wasm.presentToSurface", perf::now_ms() - t_present);

                Ok(())
            }
        })
    })
}

#[derive(Debug)]
struct UploadTextureOptions {
    /// Cache identifier for the uploaded texture.
    id: String,
    /// Source image supplied as an offscreen canvas.
    source: wgpu::web_sys::OffscreenCanvas,
    /// Texture width in pixels.
    width: u32,
    /// Texture height in pixels.
    height: u32,
}

// Parse the JS `uploadTexture` options object into a typed struct.
fn parse_upload_texture_options(value: JsValue) -> Result<UploadTextureOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("uploadTexture expects an options object"))?;

    Ok(UploadTextureOptions {
        id: read_serde_property(&object, "id")?,
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
    })
}

// === Project Rendering Logic ===

use compositor::{
    BlendMode, CanvasClearDescriptor, ColorGradingDescriptor, CropDescriptor, FrameItemDescriptor,
    LayerDescriptor, QuadTransformDescriptor, ShadowDescriptor,
};
use serde::Deserialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Deserialize, Debug, Clone)]
struct ClipTransform {
    /// Horizontal offset from center, in pixels.
    x: f32,
    /// Vertical offset from center, in pixels.
    y: f32,
    /// Uniform scale factor.
    scale: f32,
    /// Rotation in degrees.
    rotation: f32,
    /// Opacity in the range 0–1.
    opacity: f32,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipFilters {
    /// Brightness multiplier.
    brightness: Option<f32>,
    /// Contrast multiplier.
    contrast: Option<f32>,
    /// Saturation multiplier.
    saturation: Option<f32>,
    /// Grayscale amount in the range 0–1.
    grayscale: Option<f32>,
    /// Sepia amount in the range 0–1.
    sepia: Option<f32>,
    /// Color inversion amount in the range 0–1.
    invert: Option<f32>,
    /// Hue rotation in degrees.
    hue_rotate: Option<f32>,
    /// Pixelation amount.
    pixelate: Option<f32>,
    /// Edge-detection amount.
    edge_detect: Option<f32>,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipCrop {
    /// Left crop inset.
    left: f32,
    /// Top crop inset.
    top: f32,
    /// Right crop inset.
    right: f32,
    /// Bottom crop inset.
    bottom: f32,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipShadow {
    color: Option<String>, // e.g. "rgba(0,0,0,0.5)"
    /// Shadow offset distance in pixels.
    distance: Option<f32>,
    /// Shadow direction angle in degrees.
    angle: Option<f32>,
    /// Shadow blur radius.
    blur: Option<f32>,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipTransition {
    #[serde(rename = "type")]
    /// Transition type identifier.
    type_: String,
    /// Transition duration in frames.
    duration_frames: u32,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipTransitions {
    #[serde(rename = "in", default)]
    /// Incoming transition applied at the clip start.
    in_: Option<ClipTransition>,
    #[serde(default)]
    /// Outgoing transition applied at the clip end.
    out: Option<ClipTransition>,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipKeyframe {
    /// Frame position of the keyframe.
    frame: u32,
    /// Name of the animated property.
    property: String,
    /// Property value at this keyframe.
    value: f32,
    #[serde(default)]
    /// Optional easing curve name for interpolation.
    easing: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipEffectConfig {
    /// Unique effect identifier.
    id: String,
    #[serde(rename = "type")]
    /// Effect type identifier (e.g. "chroma_key").
    type_: String,
    #[serde(default)]
    /// Named scalar effect parameters.
    properties: std::collections::HashMap<String, f32>,
    #[serde(default)]
    /// Optional color parameter for the effect.
    color: Option<Vec<f32>>,
}

#[derive(Deserialize, Debug, Clone)]
struct ClipConfig {
    /// Unique clip identifier.
    id: String,
    #[serde(rename = "type")]
    /// Clip type ("video", "image", "text", etc.).
    type_: String,
    /// Display name of the clip.
    name: String,
    /// Timeline start frame.
    start_frame: u32,
    /// Duration in frames.
    duration_frames: u32,
    #[serde(default)]
    /// Spatial transform (position, scale, rotation, opacity).
    transform: Option<ClipTransform>,
    #[serde(default)]
    /// Color/effect filters applied to the clip.
    filters: Option<ClipFilters>,
    #[serde(default)]
    /// Crop insets for the clip.
    crop: Option<ClipCrop>,
    #[serde(default)]
    /// Drop-shadow configuration.
    shadow: Option<ClipShadow>,
    #[serde(default)]
    /// Corner radius in pixels.
    border_radius: Option<f32>,
    #[serde(default)]
    /// Blend mode name for compositing.
    blend_mode: Option<String>,
    #[serde(default)]
    /// In/out transitions for the clip.
    transitions: Option<ClipTransitions>,
    #[serde(default)]
    /// Property animation keyframes.
    keyframes: Option<Vec<ClipKeyframe>>,
    #[serde(default)]
    /// Text content for text clips.
    text_content: Option<String>,
    #[serde(default)]
    /// Font size in pixels for text clips.
    font_size: Option<f32>,
    #[serde(default)]
    /// Font family for text clips.
    font_family: Option<String>,
    #[serde(default)]
    /// Foreground/text color.
    color: Option<String>,
    #[serde(default)]
    /// Text background color.
    bg_color: Option<String>,
    #[serde(default)]
    /// Padding around the text background.
    bg_padding: Option<f32>,
    #[serde(default)]
    /// Text stroke (outline) color.
    text_stroke_color: Option<String>,
    #[serde(default)]
    /// Text stroke (outline) width.
    text_stroke_width: Option<f32>,
    #[serde(default)]
    /// Additional spacing between letters.
    letter_spacing: Option<f32>,
    #[serde(default)]
    /// Text alignment ("left", "center", "right").
    text_align: Option<String>,
    #[serde(default)]
    /// GPU effect passes to apply to the clip.
    effects: Option<Vec<ClipEffectConfig>>,
}

#[derive(Deserialize, Debug, Clone)]
struct TrackConfig {
    /// Unique track identifier.
    id: String,
    /// Display name of the track.
    name: String,
    /// Clips contained in this track.
    clips: Vec<ClipConfig>,
}

#[derive(Deserialize, Debug, Clone)]
struct ProjectConfig {
    /// Project output width in pixels.
    width: u32,
    /// Project output height in pixels.
    height: u32,
    /// Project frame rate.
    fps: f32,
    /// Total project duration in frames.
    duration_frames: u32,
    /// Background clear color as RGBA.
    bg_color: [f32; 4],
    #[serde(default)]
    /// Tracks comprising the project timeline.
    tracks: Vec<TrackConfig>,
}

// Derive a deterministic RGBA placeholder color from a clip name via hashing.
fn get_color_for_name(name: &str) -> [u8; 4] {
    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    let hash = hasher.finish();
    [
        (hash & 0xFF) as u8,
        ((hash >> 8) & 0xFF) as u8,
        ((hash >> 16) & 0xFF) as u8,
        255,
    ]
}

// Create a GPU texture filled with a single solid color.
fn create_solid_texture(
    gpu_context: &gpu::GpuContext,
    color: [u8; 4],
    width: u32,
    height: u32,
    label: &'static str,
) -> wgpu::Texture {
    let texture = gpu_context.create_render_texture(width, height, label);
    let pixel_count = width * height;

    // wgpu texture format is Bgra8Unorm
    let bgra_color = [color[2], color[1], color[0], color[3]];

    let mut pixels = Vec::with_capacity((pixel_count * 4) as usize);
    for _ in 0..pixel_count {
        pixels.extend_from_slice(&bgra_color);
    }
    gpu_context.queue().write_texture(
        wgpu::TexelCopyTextureInfo {
            texture: &texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        },
        &pixels,
        wgpu::TexelCopyBufferLayout {
            offset: 0,
            bytes_per_row: Some(width * 4),
            rows_per_image: Some(height),
        },
        wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
    );
    texture
}

/// Renders frame `frame_idx` of a full project described by `project_json`.
///
/// Parses the JSON project (tracks, clips, transforms, keyframes, text, and
/// effects), evaluates animated properties at the requested frame, and
/// composites the result to the GPU surface. Errors on invalid JSON or if
/// the compositor is not initialized.
#[wasm_bindgen(js_name = renderProjectFrame)]
pub fn render_project_frame(project_json: &str, frame_idx: u32) -> Result<(), JsValue> {
    let project: ProjectConfig = serde_json::from_str(project_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse project JSON: {}", e)))?;

    with_gpu_runtime(|gpu_runtime| {
        COMPOSITOR_RUNTIME.with(|runtime| {
            let mut borrow = runtime.borrow_mut();
            let Some(runtime) = borrow.as_mut() else {
                return Err(JsValue::from_str(
                    "Compositor is not initialized. Call initCompositor() first.",
                ));
            };

            // Rasterize text (with optional background, stroke, and alignment) into a GPU texture.
            fn create_text_texture(
                context: &gpu::GpuContext,
                text: &str,
                font_size: f32,
                color: &str,
                font_family: &str,
                bg_color: Option<&str>,
                bg_padding: Option<f32>,
                stroke_color: Option<&str>,
                stroke_width: Option<f32>,
                letter_spacing: Option<f32>,
                text_align: &str,
                width: u32,
                height: u32,
                label: &'static str,
            ) -> Result<wgpu::Texture, JsValue> {
                let canvas = web_sys::OffscreenCanvas::new(width, height)?;
                let ctx = canvas
                    .get_context("2d")?
                    .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
                    .dyn_into::<web_sys::OffscreenCanvasRenderingContext2d>()?;

                ctx.set_fill_style_str("rgba(0, 0, 0, 0)");
                ctx.fill_rect(0.0, 0.0, width as f64, height as f64);

                let font_str = format!("{}px {}", font_size, font_family);
                ctx.set_font(&font_str);

                // Attempt to set letter-spacing if supported (requires newer JS spec, might need to set it via canvas style)
                if let Some(ls) = letter_spacing {
                    let _ = js_sys::Reflect::set(
                        &ctx,
                        &JsValue::from_str("letterSpacing"),
                        &JsValue::from_str(&format!("{}px", ls)),
                    );
                }

                if let Some(bg) = bg_color {
                    let metrics = ctx.measure_text(text)?;
                    let padding = bg_padding.unwrap_or(20.0);
                    let text_width = metrics.width();

                    let rect_x = ((width as f64) - text_width) / 2.0 - (padding as f64);
                    let rect_y = ((height as f64) - (font_size as f64)) / 2.0 - (padding as f64);
                    let rect_width = text_width + (padding as f64) * 2.0;
                    let rect_height = (font_size as f64) + (padding as f64) * 2.0;

                    ctx.set_fill_style_str(bg);
                    ctx.fill_rect(rect_x, rect_y, rect_width, rect_height);
                }

                ctx.set_text_align(text_align);
                ctx.set_text_baseline("middle");

                let x = match text_align {
                    "left" => 50.0,
                    "right" => (width as f64) - 50.0,
                    _ => (width as f64) / 2.0, // center
                };

                let y = (height as f64) / 2.0;

                if let (Some(s_color), Some(s_width)) = (stroke_color, stroke_width) {
                    ctx.set_stroke_style_str(s_color);
                    ctx.set_line_width(s_width as f64);
                    ctx.set_line_join("round");
                    ctx.stroke_text(text, x, y)?;
                }

                ctx.set_fill_style_str(color);
                ctx.fill_text(text, x, y)?;

                Ok(context.import_offscreen_canvas_texture(&canvas, width, height, label))
            }

            // 1. Ensure textures exist
            for track in &project.tracks {
                for clip in &track.clips {
                    if clip.type_ == "text" {
                        let text_str = clip.text_content.as_deref().unwrap_or("Text");
                        let size = clip.font_size.unwrap_or(100.0);
                        let col = clip.color.as_deref().unwrap_or("#ffffff");
                        let font_family = clip.font_family.as_deref().unwrap_or("sans-serif");
                        let bg_col = clip.bg_color.as_deref();
                        let bg_pad = clip.bg_padding;
                        let stroke_col = clip.text_stroke_color.as_deref();
                        let stroke_width = clip.text_stroke_width;
                        let ls = clip.letter_spacing;
                        let t_align = clip.text_align.as_deref().unwrap_or("center");

                        // Include new properties in cache key!
                        let cache_key = format!(
                            "{}-{}-{}-{}-{}-{:?}-{:?}-{:?}-{:?}-{:?}-{}",
                            clip.id,
                            text_str,
                            size,
                            col,
                            font_family,
                            bg_col,
                            bg_pad,
                            stroke_col,
                            stroke_width,
                            ls,
                            t_align
                        );
                        if !runtime.compositor.has_texture(&cache_key) {
                            if let Ok(tex) = create_text_texture(
                                &gpu_runtime.context,
                                text_str,
                                size,
                                col,
                                font_family,
                                bg_col,
                                bg_pad,
                                stroke_col,
                                stroke_width,
                                ls,
                                t_align,
                                project.width,
                                project.height,
                                "text_texture",
                            ) {
                                runtime.compositor.upsert_texture(cache_key, tex);
                            }
                        }
                    } else {
                        if !runtime.compositor.has_texture(&clip.id) {
                            let color = get_color_for_name(&clip.name);
                            let tex = create_solid_texture(
                                &gpu_runtime.context,
                                color,
                                project.width,
                                project.height,
                                "clip_texture",
                            );
                            runtime.compositor.upsert_texture(clip.id.clone(), tex);
                        }
                    }
                }
            }

            // Interpolate a property's animated value at the current frame from its keyframes.
            fn get_keyframed_value(
                keyframes: &Option<Vec<ClipKeyframe>>,
                property: &str,
                current_frame: u32,
                default_val: f32,
            ) -> f32 {
                if let Some(kfs) = keyframes {
                    let mut prop_kfs: Vec<&ClipKeyframe> =
                        kfs.iter().filter(|k| k.property == property).collect();
                    if prop_kfs.is_empty() {
                        return default_val;
                    }
                    prop_kfs.sort_by_key(|k| k.frame);

                    if current_frame <= prop_kfs.first().unwrap().frame {
                        return prop_kfs.first().unwrap().value;
                    }
                    if current_frame >= prop_kfs.last().unwrap().frame {
                        return prop_kfs.last().unwrap().value;
                    }

                    for i in 0..prop_kfs.len() - 1 {
                        let k1 = prop_kfs[i];
                        let k2 = prop_kfs[i + 1];
                        if current_frame >= k1.frame && current_frame < k2.frame {
                            let mut progress =
                                (current_frame - k1.frame) as f32 / (k2.frame - k1.frame) as f32;

                            if let Some(easing) = &k1.easing {
                                match easing.as_str() {
                                    "ease-in" => progress = progress * progress,
                                    "ease-out" => progress = progress * (2.0 - progress),
                                    "ease-in-out" => {
                                        progress = progress * progress * (3.0 - 2.0 * progress)
                                    }
                                    "step" => progress = 0.0,
                                    _ => {} // linear
                                }
                            }

                            return k1.value + (k2.value - k1.value) * progress;
                        }
                    }
                }
                default_val
            }

            // 2. Build the frame
            let mut items = vec![];
            for track in &project.tracks {
                for clip in &track.clips {
                    if frame_idx >= clip.start_frame
                        && frame_idx < clip.start_frame + clip.duration_frames
                    {
                        let (mut cx, mut cy, mut w, mut h, mut rot, mut opac) =
                            match &clip.transform {
                                Some(t) => (
                                    t.x + (project.width as f32 / 2.0),
                                    t.y + (project.height as f32 / 2.0),
                                    project.width as f32 * t.scale,
                                    project.height as f32 * t.scale,
                                    t.rotation,
                                    t.opacity,
                                ),
                                None => (
                                    project.width as f32 / 2.0,
                                    project.height as f32 / 2.0,
                                    project.width as f32,
                                    project.height as f32,
                                    0.0,
                                    1.0,
                                ),
                            };

                        if let Some(t) = &clip.transform {
                            // Apply keyframes for transform properties
                            let kf_x = get_keyframed_value(&clip.keyframes, "x", frame_idx, t.x);
                            let kf_y = get_keyframed_value(&clip.keyframes, "y", frame_idx, t.y);
                            let kf_scale =
                                get_keyframed_value(&clip.keyframes, "scale", frame_idx, t.scale);
                            let kf_rot = get_keyframed_value(
                                &clip.keyframes,
                                "rotation",
                                frame_idx,
                                t.rotation,
                            );
                            let kf_opac = get_keyframed_value(
                                &clip.keyframes,
                                "opacity",
                                frame_idx,
                                t.opacity,
                            );

                            cx = kf_x + (project.width as f32 / 2.0);
                            cy = kf_y + (project.height as f32 / 2.0);
                            w = project.width as f32 * kf_scale;
                            h = project.height as f32 * kf_scale;
                            rot = kf_rot;
                            opac = kf_opac;
                        }

                        // Parse color grading with keyframes
                        let cg = clip.filters.as_ref().map(|f| ColorGradingDescriptor {
                            brightness: get_keyframed_value(
                                &clip.keyframes,
                                "filters.brightness",
                                frame_idx,
                                f.brightness.unwrap_or(1.0),
                            ),
                            contrast: get_keyframed_value(
                                &clip.keyframes,
                                "filters.contrast",
                                frame_idx,
                                f.contrast.unwrap_or(1.0),
                            ),
                            saturation: get_keyframed_value(
                                &clip.keyframes,
                                "filters.saturation",
                                frame_idx,
                                f.saturation.unwrap_or(1.0),
                            ),
                            grayscale: Some(get_keyframed_value(
                                &clip.keyframes,
                                "filters.grayscale",
                                frame_idx,
                                f.grayscale.unwrap_or(0.0),
                            )),
                            sepia: Some(get_keyframed_value(
                                &clip.keyframes,
                                "filters.sepia",
                                frame_idx,
                                f.sepia.unwrap_or(0.0),
                            )),
                            invert: Some(get_keyframed_value(
                                &clip.keyframes,
                                "filters.invert",
                                frame_idx,
                                f.invert.unwrap_or(0.0),
                            )),
                            hue_rotate: Some(get_keyframed_value(
                                &clip.keyframes,
                                "filters.hue_rotate",
                                frame_idx,
                                f.hue_rotate.unwrap_or(0.0),
                            )),
                            pixelate: Some(get_keyframed_value(
                                &clip.keyframes,
                                "filters.pixelate",
                                frame_idx,
                                f.pixelate.unwrap_or(0.0),
                            )),
                            edge_detect: Some(get_keyframed_value(
                                &clip.keyframes,
                                "filters.edge_detect",
                                frame_idx,
                                f.edge_detect.unwrap_or(0.0),
                            )),
                        });

                        if let Some(ref trans) = clip.transitions {
                            if let Some(ref in_t) = trans.in_ {
                                if frame_idx >= clip.start_frame
                                    && frame_idx < clip.start_frame + in_t.duration_frames
                                {
                                    let progress = (frame_idx - clip.start_frame) as f32
                                        / in_t.duration_frames as f32;
                                    opac *= progress;
                                }
                            }
                            if let Some(ref out_t) = trans.out {
                                let clip_end = clip.start_frame + clip.duration_frames;
                                if frame_idx < clip_end
                                    && frame_idx >= clip_end - out_t.duration_frames
                                {
                                    let progress = (clip_end - frame_idx) as f32
                                        / out_t.duration_frames as f32;
                                    opac *= progress;
                                }
                            }
                        }

                        let mut b_mode = BlendMode::Normal;
                        if let Some(ref bm_str) = clip.blend_mode {
                            b_mode = match bm_str.to_lowercase().as_str() {
                                "darken" => BlendMode::Darken,
                                "multiply" => BlendMode::Multiply,
                                "color-burn" | "colorburn" => BlendMode::ColorBurn,
                                "lighten" => BlendMode::Lighten,
                                "screen" => BlendMode::Screen,
                                "color-dodge" | "colordodge" => BlendMode::ColorDodge,
                                "overlay" => BlendMode::Overlay,
                                "soft-light" | "softlight" => BlendMode::SoftLight,
                                "hard-light" | "hardlight" => BlendMode::HardLight,
                                "difference" => BlendMode::Difference,
                                "exclusion" => BlendMode::Exclusion,
                                "hue" => BlendMode::Hue,
                                "saturation" => BlendMode::Saturation,
                                "color" => BlendMode::Color,
                                "luminosity" => BlendMode::Luminosity,
                                _ => BlendMode::Normal,
                            };
                        }

                        let mut effect_pass_groups = vec![];
                        if let Some(effects) = &clip.effects {
                            let mut passes = vec![];
                            for effect in effects {
                                if effect.type_ == "chroma_key" {
                                    let mut uniforms = std::collections::HashMap::new();

                                    if let Some(target_color) = &effect.color {
                                        uniforms.insert(
                                            "u_target_color".to_string(),
                                            compositor::EffectUniformValueDescriptor::Vector(
                                                target_color.clone(),
                                            ),
                                        );
                                    }

                                    if let Some(similarity) = effect.properties.get("similarity") {
                                        uniforms.insert(
                                            "u_similarity".to_string(),
                                            compositor::EffectUniformValueDescriptor::Number(
                                                *similarity,
                                            ),
                                        );
                                    }

                                    if let Some(smoothness) = effect.properties.get("smoothness") {
                                        uniforms.insert(
                                            "u_smoothness".to_string(),
                                            compositor::EffectUniformValueDescriptor::Number(
                                                *smoothness,
                                            ),
                                        );
                                    }

                                    passes.push(compositor::EffectPassDescriptor {
                                        shader: "chroma-key".to_string(),
                                        uniforms,
                                    });
                                }
                            }
                            if !passes.is_empty() {
                                effect_pass_groups.push(passes);
                            }
                        }

                        if clip.type_ == "video" || clip.type_ == "image" || clip.type_ == "text" {
                            let texture_id = if clip.type_ == "text" {
                                let text_str = clip.text_content.as_deref().unwrap_or("Text");
                                let size = clip.font_size.unwrap_or(100.0);
                                let col = clip.color.as_deref().unwrap_or("#ffffff");
                                format!("{}-{}-{}-{}", clip.id, text_str, size, col)
                            } else {
                                clip.id.clone()
                            };

                            items.push(FrameItemDescriptor::Layer(LayerDescriptor {
                                texture_id,
                                luma_key_threshold: Some(0.0),
                                luma_key_tolerance: Some(0.0),
                                transform: QuadTransformDescriptor {
                                    center_x: cx,
                                    center_y: cy,
                                    width: w,
                                    height: h,
                                    rotation_degrees: rot,
                                    flip_x: false,
                                    flip_y: false,
                                },
                                opacity: opac,
                                blend_mode: b_mode,
                                effect_pass_groups,
                                mask: None,
                                color_grading: cg,
                                crop: clip.crop.as_ref().map(|c| CropDescriptor {
                                    left: get_keyframed_value(
                                        &clip.keyframes,
                                        "crop_left",
                                        frame_idx,
                                        c.left,
                                    ),
                                    top: get_keyframed_value(
                                        &clip.keyframes,
                                        "crop_top",
                                        frame_idx,
                                        c.top,
                                    ),
                                    right: get_keyframed_value(
                                        &clip.keyframes,
                                        "crop_right",
                                        frame_idx,
                                        c.right,
                                    ),
                                    bottom: get_keyframed_value(
                                        &clip.keyframes,
                                        "crop_bottom",
                                        frame_idx,
                                        c.bottom,
                                    ),
                                }),
                                border_radius: Some(get_keyframed_value(
                                    &clip.keyframes,
                                    "border_radius",
                                    frame_idx,
                                    clip.border_radius.unwrap_or(0.0),
                                )),
                                shadow: clip.shadow.as_ref().map(|s| ShadowDescriptor {
                                    color: {
                                        // Parse rgba string like "rgba(0,0,0,0.5)"
                                        let col = s.color.as_deref().unwrap_or("rgba(0,0,0,0.5)");
                                        if col.starts_with("rgba(") {
                                            let parts: Vec<&str> =
                                                col[5..col.len() - 1].split(',').collect();
                                            if parts.len() == 4 {
                                                [
                                                    parts[0].trim().parse::<f32>().unwrap_or(0.0)
                                                        / 255.0,
                                                    parts[1].trim().parse::<f32>().unwrap_or(0.0)
                                                        / 255.0,
                                                    parts[2].trim().parse::<f32>().unwrap_or(0.0)
                                                        / 255.0,
                                                    parts[3].trim().parse::<f32>().unwrap_or(0.5),
                                                ]
                                            } else {
                                                [0.0, 0.0, 0.0, 0.5]
                                            }
                                        } else {
                                            [0.0, 0.0, 0.0, 0.5]
                                        }
                                    },
                                    distance: get_keyframed_value(
                                        &clip.keyframes,
                                        "shadow_distance",
                                        frame_idx,
                                        s.distance.unwrap_or(0.0),
                                    ),
                                    angle: get_keyframed_value(
                                        &clip.keyframes,
                                        "shadow_angle",
                                        frame_idx,
                                        s.angle.unwrap_or(0.0),
                                    ),
                                    blur: get_keyframed_value(
                                        &clip.keyframes,
                                        "shadow_blur",
                                        frame_idx,
                                        s.blur.unwrap_or(0.0),
                                    ),
                                }),
                            }));
                        }
                    }
                }
            }

            let frame = FrameDescriptor {
                width: project.width,
                height: project.height,
                clear: CanvasClearDescriptor {
                    color: project.bg_color,
                },
                items,
            };

            // 3. Render
            if runtime.surface_size != (frame.width, frame.height) {
                runtime.canvas.set_width(frame.width);
                runtime.canvas.set_height(frame.height);
                gpu_runtime
                    .context
                    .configure_surface(&runtime.surface, frame.width, frame.height)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;
                runtime.surface_size = (frame.width, frame.height);
            }

            if gpu_runtime.context.supports_surface_rendering() {
                runtime
                    .compositor
                    .render_frame(
                        &gpu_runtime.context,
                        RenderFrameOptions {
                            frame: &frame,
                            surface: &runtime.surface,
                        },
                    )
                    .map_err(|error| JsValue::from_str(&error.to_string()))
            } else {
                let texture = runtime
                    .compositor
                    .render_frame_to_texture(&gpu_runtime.context, &frame)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;

                gpu_runtime
                    .context
                    .present_texture_to_surface(&texture, &runtime.surface)
                    .map_err(|error| JsValue::from_str(&error.to_string()))?;

                Ok(())
            }
        })
    })
}

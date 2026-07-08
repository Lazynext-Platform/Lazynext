//! Frame descriptor types for the compositor.
//!
//! Defines the data structures that describe a single composited frame:
//! canvas configuration, layer stacks (video, text, effect), quad
//! transforms, masks, color grading, crop regions, dropshadows,
//! and effect pass uniforms. These descriptors are serialized and
//! sent from the CRDT timeline to the GPU compositor.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::BlendMode;

/// Describes a single composited frame with canvas size and layer items.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameDescriptor {
    /// Canvas width in pixels.
    pub width: u32,
    /// Canvas height in pixels.
    pub height: u32,
    /// Background clear color for the canvas.
    pub clear: CanvasClearDescriptor,
    /// Stack of frame items (layers, text, effects) in paint order.
    pub items: Vec<FrameItemDescriptor>,
}

/// Background clear color for the canvas as RGBA.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasClearDescriptor {
    /// RGBA clear color with components in [0, 1].
    pub color: [f32; 4],
}

/// Layer types within a frame: video layers, text layers, or scene effects.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
#[allow(clippy::large_enum_variant)]
pub enum FrameItemDescriptor {
    /// A video/image layer with optional effects, mask, and grading.
    Layer(LayerDescriptor),
    /// A text layer rendered from an MSDF texture.
    TextLayer(TextLayerDescriptor),
    /// One or more groups of effect passes applied to the entire scene.
    SceneEffect {
        /// Groups of effect passes applied sequentially to the scene.
        effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    },
}

/// Descriptor for a video/image layer with transform, blend mode, effects, and optional adjustments.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerDescriptor {
    /// Unique identifier for the source texture in the texture store.
    pub texture_id: String,
    /// 2D quad transform (position, size, rotation, flip).
    pub transform: QuadTransformDescriptor,
    /// Layer opacity in [0, 1].
    pub opacity: f32,
    /// Blend mode used when compositing this layer.
    pub blend_mode: BlendMode,
    /// Groups of effect passes applied to this layer.
    #[serde(default)]
    pub effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    /// Optional layer mask with feathering and inversion.
    pub mask: Option<LayerMaskDescriptor>,
    /// Optional color grading adjustments (brightness, contrast, etc.).
    pub color_grading: Option<ColorGradingDescriptor>,
    /// Optional crop region in normalized coordinates.
    pub crop: Option<CropDescriptor>,
    /// Optional corner radius for rounded rect clipping.
    pub border_radius: Option<f32>,
    /// Optional drop shadow parameters.
    pub shadow: Option<ShadowDescriptor>,
    /// Luma key lower bound for chroma-key-like transparency.
    pub luma_key_threshold: Option<f32>,
    /// Luma key tolerance range above threshold.
    pub luma_key_tolerance: Option<f32>,
}

/// Descriptor for a text layer rendered from an MSDF atlas texture.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextLayerDescriptor {
    /// MSDF atlas texture ID containing the rendered glyph data.
    pub text_texture_id: String,
    /// 2D quad transform for positioning the text.
    pub transform: QuadTransformDescriptor,
    /// Text opacity in [0, 1].
    pub opacity: f32,
    /// RGBA fill color for the glyph body.
    pub color: [f32; 4],
    /// RGBA color for the glyph outline.
    pub outline_color: [f32; 4],
    /// RGBA color for the drop shadow.
    pub shadow_color: [f32; 4],
    /// Signed distance field pixel range for anti-aliasing.
    pub px_range: f32,
    /// Width of the glyph outline in distance-field units.
    pub outline_width: f32,
    /// XY offset of the drop shadow in distance-field units.
    pub shadow_offset: [f32; 2],
    /// Blur radius for the drop shadow.
    pub shadow_blur: f32,
}

/// Crop region offsets in normalized coordinates (left, top, right, bottom).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropDescriptor {
    /// Left edge of crop region in normalized coordinates [0, 1].
    pub left: f32,
    /// Top edge of crop region in normalized coordinates [0, 1].
    pub top: f32,
    /// Right edge of crop region in normalized coordinates [0, 1].
    pub right: f32,
    /// Bottom edge of crop region in normalized coordinates [0, 1].
    pub bottom: f32,
}

/// Layer drop shadow parameters: color, distance, angle, and blur.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShadowDescriptor {
    /// RGBA shadow color.
    pub color: [f32; 4],
    /// Offset distance of the shadow from the layer.
    pub distance: f32,
    /// Angle of the shadow offset in degrees.
    pub angle: f32,
    /// Blur radius of the shadow.
    pub blur: f32,
}

/// Color grading parameters including brightness, contrast, saturation, and optional effects.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorGradingDescriptor {
    /// Brightness adjustment multiplier (1.0 = neutral).
    pub brightness: f32,
    /// Contrast adjustment multiplier (1.0 = neutral).
    pub contrast: f32,
    /// Saturation adjustment multiplier (1.0 = neutral).
    pub saturation: f32,
    /// Grayscale blend strength in [0, 1].
    pub grayscale: Option<f32>,
    /// Sepia tone strength in [0, 1].
    pub sepia: Option<f32>,
    /// Color inversion strength in [0, 1].
    pub invert: Option<f32>,
    /// Hue rotation in degrees.
    pub hue_rotate: Option<f32>,
    /// Pixelation block size factor.
    pub pixelate: Option<f32>,
    /// Edge detection intensity.
    pub edge_detect: Option<f32>,
}

/// 2D quad transform with position, size, rotation, and flip flags.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuadTransformDescriptor {
    /// X coordinate of the quad center in normalized canvas space.
    pub center_x: f32,
    /// Y coordinate of the quad center in normalized canvas space.
    pub center_y: f32,
    /// Width of the quad in normalized canvas space.
    pub width: f32,
    /// Height of the quad in normalized canvas space.
    pub height: f32,
    /// Rotation angle in degrees.
    pub rotation_degrees: f32,
    /// Whether the quad is flipped horizontally.
    pub flip_x: bool,
    /// Whether the quad is flipped vertically.
    pub flip_y: bool,
}

/// Layer mask referencing a texture with feathering and inversion settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerMaskDescriptor {
    /// Texture ID of the mask image in the texture store.
    pub texture_id: String,
    /// Feather radius for softening the mask edges.
    pub feather: f32,
    /// When true, the mask alpha is inverted before blending.
    pub inverted: bool,
}

/// A single effect pass linking a shader name to its uniform values.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectPassDescriptor {
    /// Name of the effect shader to use.
    pub shader: String,
    /// Uniform values passed to the effect shader.
    pub uniforms: HashMap<String, EffectUniformValueDescriptor>,
}

/// A typed uniform value for an effect shader: a scalar number or a vector.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum EffectUniformValueDescriptor {
    /// A single scalar float value.
    Number(f32),
    /// A packed vector of float values.
    Vector(Vec<f32>),
}

/// Descriptor for a canvas-sized texture identified by ID and dimensions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasTextureDescriptor {
    /// Unique identifier for the canvas texture.
    pub id: String,
    /// Texture width in pixels.
    pub width: u32,
    /// Texture height in pixels.
    pub height: u32,
}

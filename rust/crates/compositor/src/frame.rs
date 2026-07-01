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
    pub width: u32,
    pub height: u32,
    pub clear: CanvasClearDescriptor,
    pub items: Vec<FrameItemDescriptor>,
}

/// Background clear color for the canvas as RGBA.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CanvasClearDescriptor {
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
        effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    },
}

/// Descriptor for a video/image layer with transform, blend mode, effects, and optional adjustments.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerDescriptor {
    pub texture_id: String,
    pub transform: QuadTransformDescriptor,
    pub opacity: f32,
    pub blend_mode: BlendMode,
    #[serde(default)]
    pub effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    pub mask: Option<LayerMaskDescriptor>,
    pub color_grading: Option<ColorGradingDescriptor>,
    pub crop: Option<CropDescriptor>,
    pub border_radius: Option<f32>,
    pub shadow: Option<ShadowDescriptor>,
    pub luma_key_threshold: Option<f32>,
    pub luma_key_tolerance: Option<f32>,
}

/// Descriptor for a text layer rendered from an MSDF atlas texture.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextLayerDescriptor {
    pub text_texture_id: String, // The rendered MSDF atlas or glyphs (or pre-rendered MSDF string)
    pub transform: QuadTransformDescriptor,
    pub opacity: f32,
    pub color: [f32; 4],
    pub outline_color: [f32; 4],
    pub shadow_color: [f32; 4],
    pub px_range: f32,
    pub outline_width: f32,
    pub shadow_offset: [f32; 2],
    pub shadow_blur: f32,
}

/// Crop region offsets in normalized coordinates (left, top, right, bottom).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropDescriptor {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

/// Layer drop shadow parameters: color, distance, angle, and blur.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShadowDescriptor {
    pub color: [f32; 4],
    pub distance: f32,
    pub angle: f32,
    pub blur: f32,
}

/// Color grading parameters including brightness, contrast, saturation, and optional effects.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorGradingDescriptor {
    pub brightness: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub grayscale: Option<f32>,
    pub sepia: Option<f32>,
    pub invert: Option<f32>,
    pub hue_rotate: Option<f32>,
    pub pixelate: Option<f32>,
    pub edge_detect: Option<f32>,
}

/// 2D quad transform with position, size, rotation, and flip flags.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuadTransformDescriptor {
    pub center_x: f32,
    pub center_y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation_degrees: f32,
    pub flip_x: bool,
    pub flip_y: bool,
}

/// Layer mask referencing a texture with feathering and inversion settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerMaskDescriptor {
    pub texture_id: String,
    pub feather: f32,
    pub inverted: bool,
}

/// A single effect pass linking a shader name to its uniform values.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectPassDescriptor {
    pub shader: String,
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
    pub id: String,
    pub width: u32,
    pub height: u32,
}

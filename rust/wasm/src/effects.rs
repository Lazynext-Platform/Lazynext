//! WASM bridge for GPU effect passes.
//!
//! Applies compositor effect chains (custom shaders, 3D LUTs, chroma-key)
//! to offscreen canvases via the GPU runtime, returning processed canvases
//! back to JavaScript for further compositing or display.

#![cfg(target_arch = "wasm32")]

use effects::{ApplyEffectsOptions, EffectPass, UniformValue};
use gpu::wgpu;
use js_sys::Object;
use serde::Deserialize;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

use crate::gpu::{
    import_canvas_texture, read_offscreen_canvas_property, read_serde_property, read_u32_property,
    render_texture_to_canvas, with_gpu_runtime,
};

struct ApplyEffectPassesOptions {
    /// Source canvas to process.
    source: wgpu::web_sys::OffscreenCanvas,
    /// Canvas width in pixels.
    width: u32,
    /// Canvas height in pixels.
    height: u32,
    /// Ordered effect passes to apply.
    passes: Vec<EffectPassInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EffectPassInput {
    /// Shader identifier for the pass.
    shader: String,
    /// Uniform values supplied to the shader.
    uniforms: Vec<EffectUniformInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EffectUniformInput {
    /// Uniform name.
    name: String,
    /// Uniform value components.
    value: Vec<f32>,
}

/// Applies a chain of GPU effect passes (custom shaders) to a source canvas.
///
/// The `options` object carries `{ source, width, height, passes }`, where
/// each pass names a shader and its uniform values. Returns a new offscreen
/// canvas with the processed result.
#[wasm_bindgen(js_name = applyEffectPasses)]
pub fn apply_effect_passes(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let ApplyEffectPassesOptions {
        source,
        width,
        height,
        passes,
    } = parse_apply_effect_passes_options(options)?;

    with_gpu_runtime(|runtime| {
        let source_texture = import_canvas_texture(
            &runtime.context,
            &source,
            width,
            height,
            "effects-input-texture",
        );
        let effect_passes = map_effect_passes(passes);
        let result_texture = runtime
            .effects
            .apply(
                &runtime.context,
                ApplyEffectsOptions {
                    source: &source_texture,
                    width,
                    height,
                    passes: &effect_passes,
                },
            )
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        render_texture_to_canvas(&runtime.context, &result_texture, width, height)
    })
}

// Converts JS effect pass inputs into GPU-ready effect passes.
fn map_effect_passes(effect_passes: Vec<EffectPassInput>) -> Vec<EffectPass> {
    effect_passes
        .into_iter()
        .map(|pass| EffectPass {
            shader: pass.shader,
            uniforms: pass
                .uniforms
                .into_iter()
                .map(|uniform| {
                    let value = if uniform.value.len() == 1 {
                        UniformValue::Number(uniform.value[0])
                    } else {
                        UniformValue::Vector(uniform.value)
                    };
                    (uniform.name, value)
                })
                .collect(),
        })
        .collect()
}

// Parses the JS options object for `applyEffectPasses`.
fn parse_apply_effect_passes_options(value: JsValue) -> Result<ApplyEffectPassesOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyEffectPasses expects an options object"))?;

    Ok(ApplyEffectPassesOptions {
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        passes: read_serde_property(&object, "passes")?,
    })
}

use effects::ApplyLutOptions;

#[allow(dead_code)]
struct ApplyLutOptionsJs {
    /// Source canvas to grade.
    source: wgpu::web_sys::OffscreenCanvas,
    /// Canvas width in pixels.
    width: u32,
    /// Canvas height in pixels.
    height: u32,
    /// Flat RGBA LUT cube data.
    lut_data: Vec<f32>,
    /// Side length of the LUT cube.
    lut_size: u32,
}

/// Applies a 3D color LUT to a source canvas using trilinear interpolation.
///
/// The `options` object carries `{ source, width, height, lutData, lutSize }`
/// where `lutData` is a flat RGBA `f32` cube of side `lutSize` (default 32).
/// Returns a new offscreen canvas with the graded result.
#[wasm_bindgen(js_name = apply3DLut)]
pub fn apply_3d_lut(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let options = parse_apply_lut_options(options)?;

    with_gpu_runtime(|runtime| {
        let source_texture = import_canvas_texture(
            &runtime.context,
            &options.source,
            options.width,
            options.height,
            "lut3d-input-texture",
        );

        // Convert the LUT data (f32) into a 3D WebGPU texture
        let lut_size = options.lut_size;
        let lut_texture = runtime
            .context
            .device()
            .create_texture(&wgpu::TextureDescriptor {
                label: Some("lut3d-texture"),
                size: wgpu::Extent3d {
                    width: lut_size,
                    height: lut_size,
                    depth_or_array_layers: lut_size,
                },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D3,
                format: wgpu::TextureFormat::Rgba32Float,
                usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
                view_formats: &[],
            });

        // Write the lut_data into the texture
        runtime.context.queue().write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &lut_texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            bytemuck::cast_slice(&options.lut_data),
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(lut_size * 16),
                rows_per_image: Some(lut_size),
            },
            wgpu::Extent3d {
                width: lut_size,
                height: lut_size,
                depth_or_array_layers: lut_size,
            },
        );

        let result_texture = runtime
            .effects
            .apply_lut(
                &runtime.context,
                ApplyLutOptions {
                    source: &source_texture,
                    width: options.width,
                    height: options.height,
                    lut_texture: &lut_texture,
                },
            )
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        render_texture_to_canvas(
            &runtime.context,
            &result_texture,
            options.width,
            options.height,
        )
    })
}

// Parses the JS options object for `apply3DLut`.
fn parse_apply_lut_options(value: JsValue) -> Result<ApplyLutOptionsJs, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("apply3DLut expects an options object"))?;

    let lut_data = read_serde_property::<Vec<f32>>(&object, "lutData").unwrap_or_else(|_| vec![]);

    Ok(ApplyLutOptionsJs {
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        lut_data,
        lut_size: read_u32_property(&object, "lutSize").unwrap_or(32),
    })
}

struct ApplyChromaKeyOptions {
    /// Source canvas to key.
    source: wgpu::web_sys::OffscreenCanvas,
    /// Canvas width in pixels.
    width: u32,
    /// Canvas height in pixels.
    height: u32,
    /// RGB key color to remove.
    key_color: Vec<f32>, // [r, g, b]
    /// Keying color similarity tolerance.
    similarity: f32,
    /// Edge softness of the key.
    smoothness: f32,
}

/// Applies chroma-key (green-screen) removal to a source canvas.
///
/// The `options` object carries `{ source, width, height, keyColor,
/// similarity, smoothness }` — `keyColor` is the RGB key to remove, with
/// `similarity`/`smoothness` controlling the keying tolerance and edge
/// softness. Returns a new offscreen canvas with the keyed result.
#[wasm_bindgen(js_name = applyChromaKey)]
pub fn apply_chroma_key(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let options = parse_apply_chroma_key_options(options)?;

    with_gpu_runtime(|runtime| {
        let source_texture = import_canvas_texture(
            &runtime.context,
            &options.source,
            options.width,
            options.height,
            "chroma-key-input-texture",
        );
        let passes = vec![EffectPass {
            shader: "chroma-key".to_string(),
            uniforms: std::collections::HashMap::from([
                (
                    "u_target_color".to_string(),
                    UniformValue::Vector(options.key_color),
                ),
                (
                    "u_similarity".to_string(),
                    UniformValue::Number(options.similarity),
                ),
                (
                    "u_smoothness".to_string(),
                    UniformValue::Number(options.smoothness),
                ),
            ]),
        }];
        let result_texture = runtime
            .effects
            .apply(
                &runtime.context,
                ApplyEffectsOptions {
                    source: &source_texture,
                    width: options.width,
                    height: options.height,
                    passes: &passes,
                },
            )
            .map_err(|error| JsValue::from_str(&error.to_string()))?;
        render_texture_to_canvas(
            &runtime.context,
            &result_texture,
            options.width,
            options.height,
        )
    })
}

// Parses the JS options object for `applyChromaKey`.
fn parse_apply_chroma_key_options(value: JsValue) -> Result<ApplyChromaKeyOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyChromaKey expects an options object"))?;

    let key_color = read_serde_property::<Vec<f32>>(&object, "keyColor")
        .unwrap_or_else(|_| vec![0.0, 1.0, 0.0]);
    let similarity = crate::gpu::read_f32_property(&object, "similarity").unwrap_or(0.4);
    let smoothness = crate::gpu::read_f32_property(&object, "smoothness").unwrap_or(0.1);

    Ok(ApplyChromaKeyOptions {
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        key_color,
        similarity,
        smoothness,
    })
}

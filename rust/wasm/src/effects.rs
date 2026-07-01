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
    source: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    passes: Vec<EffectPassInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EffectPassInput {
    shader: String,
    uniforms: Vec<EffectUniformInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EffectUniformInput {
    name: String,
    value: Vec<f32>,
}

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
    source: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    lut_data: Vec<f32>,
    lut_size: u32,
}

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
    source: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    key_color: Vec<f32>, // [r, g, b]
    similarity: f32,
    smoothness: f32,
}

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

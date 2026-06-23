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

#[allow(dead_code)]
struct ApplyLutOptions {
    source: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    lut_data: Vec<f32>,
    lut_size: u32,
}

#[wasm_bindgen(js_name = apply3DLut)]
pub fn apply_3d_lut(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    // Scaffold for 3D LUT application
    let _apply_lut_options = parse_apply_lut_options(options)?;

    // In a full implementation, this passes the 3D texture to WebGPU for color interpolation.
    // Returning a blank canvas for scaffolding signature.
    let canvas = wgpu::web_sys::OffscreenCanvas::new(1920, 1080).unwrap();
    Ok(canvas)
}

fn parse_apply_lut_options(value: JsValue) -> Result<ApplyLutOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("apply3DLut expects an options object"))?;

    Ok(ApplyLutOptions {
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        lut_data: vec![], // Scaffold
        lut_size: 32,     // Common 33x33x33 LUT scaffold
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
    let _options = parse_apply_chroma_key_options(options)?;

    // Scaffold for WebGPU chroma key shader application.
    // Calculates YUV distance from key_color and alpha masks pixels.
    let canvas = wgpu::web_sys::OffscreenCanvas::new(1920, 1080).unwrap();
    Ok(canvas)
}

fn parse_apply_chroma_key_options(value: JsValue) -> Result<ApplyChromaKeyOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyChromaKey expects an options object"))?;

    Ok(ApplyChromaKeyOptions {
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        key_color: vec![0.0, 1.0, 0.0], // default green
        similarity: 0.4,
        smoothness: 0.1,
    })
}

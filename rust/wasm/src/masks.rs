#![cfg(target_arch = "wasm32")]

use gpu::wgpu;
use js_sys::Object;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

use crate::gpu::{
    import_canvas_texture, read_f32_property, read_offscreen_canvas_property, read_u32_property,
    render_texture_to_canvas, with_gpu_runtime,
};

struct ApplyMaskFeatherOptions {
    mask: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    feather: f32,
}

#[wasm_bindgen(js_name = applyMaskFeather)]
pub fn apply_mask_feather(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let ApplyMaskFeatherOptions {
        mask,
        width,
        height,
        feather,
    } = parse_apply_mask_feather_options(options)?;

    with_gpu_runtime(|runtime| {
        let mask_texture = import_canvas_texture(
            &runtime.context,
            &mask,
            width,
            height,
            "masks-input-texture",
        );
        let result_texture = runtime.masks.apply_mask_feather(
            &runtime.context,
            masks::ApplyMaskFeatherOptions {
                mask: &mask_texture,
                width,
                height,
                feather,
            },
        );
        render_texture_to_canvas(&runtime.context, &result_texture, width, height)
    })
}

fn parse_apply_mask_feather_options(value: JsValue) -> Result<ApplyMaskFeatherOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyMaskFeather expects an options object"))?;

    Ok(ApplyMaskFeatherOptions {
        mask: read_offscreen_canvas_property(&object, "mask")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        feather: read_f32_property(&object, "feather")?,
    })
}

struct ApplyPolygonMaskOptions {
    mask: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
    points_x: Vec<f32>,
    points_y: Vec<f32>,
}

#[wasm_bindgen(js_name = applyPolygonMask)]
pub fn apply_polygon_mask(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    // Scaffold for Polygon Masking
    let _apply_polygon_mask_options = parse_apply_polygon_mask_options(options)?;

    // In a full implementation, we would pass these vertices to a WebGPU stencil buffer
    // For now, we return a blank canvas to satisfy the WebAssembly signature
    let canvas = wgpu::web_sys::OffscreenCanvas::new(1920, 1080).unwrap();
    Ok(canvas)
}

fn parse_apply_polygon_mask_options(value: JsValue) -> Result<ApplyPolygonMaskOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyPolygonMask expects an options object"))?;

    Ok(ApplyPolygonMaskOptions {
        mask: read_offscreen_canvas_property(&object, "mask")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        points_x: vec![], // Scaffold
        points_y: vec![], // Scaffold
    })
}

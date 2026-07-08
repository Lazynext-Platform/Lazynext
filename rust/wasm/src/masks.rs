//! WASM bridge for GPU mask operations.
//!
//! Applies mask feathering (Gaussian blur on alpha) via the GPU mask
//! pipeline and polygon mask composition via the 2D canvas API,
//! returning processed offscreen canvases to JavaScript.

#![cfg(target_arch = "wasm32")]

use gpu::wgpu;
use js_sys::Object;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

use crate::gpu::{
    import_canvas_texture, read_f32_property, read_offscreen_canvas_property, read_u32_property,
    render_texture_to_canvas, with_gpu_runtime,
};

struct ApplyMaskFeatherOptions {
    /// Source mask canvas.
    mask: wgpu::web_sys::OffscreenCanvas,
    /// Canvas width in pixels.
    width: u32,
    /// Canvas height in pixels.
    height: u32,
    /// Blur radius applied to the mask alpha.
    feather: f32,
}

/// Feathers a mask by applying a Gaussian blur to its alpha channel on the
/// GPU.
///
/// The `options` object carries `{ mask, width, height, feather }`, where
/// `feather` is the blur radius. Returns a new offscreen canvas with the
/// softened mask.
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

// Parses the JS options object for `applyMaskFeather`.
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

#[allow(dead_code)]
struct ApplyPolygonMaskOptions {
    /// Existing mask canvas to intersect.
    mask: wgpu::web_sys::OffscreenCanvas,
    /// Canvas width in pixels.
    width: u32,
    /// Canvas height in pixels.
    height: u32,
    /// Polygon vertex X coordinates.
    points_x: Vec<f64>,
    /// Polygon vertex Y coordinates.
    points_y: Vec<f64>,
}

/// Intersects an existing mask with a polygon defined by point arrays.
///
/// The `options` object carries `{ mask, width, height, points_x, points_y }`.
/// The polygon is filled and composited with `destination-in` so only the
/// overlapping region survives. Returns a new offscreen canvas.
#[wasm_bindgen(js_name = applyPolygonMask)]
pub fn apply_polygon_mask(options: JsValue) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let opts = parse_apply_polygon_mask_options(options)?;

    // Create an output canvas
    let canvas = wgpu::web_sys::OffscreenCanvas::new(opts.width, opts.height).unwrap();

    let context = canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("Failed to get 2d context"))?
        .dyn_into::<wgpu::web_sys::OffscreenCanvasRenderingContext2d>()?;

    // Draw original mask if any
    context.draw_image_with_offscreen_canvas(&opts.mask, 0.0, 0.0)?;

    // Fill the polygon
    context.set_fill_style(&JsValue::from_str("white"));

    // Setup path
    context.begin_path();
    if !opts.points_x.is_empty() {
        context.move_to(opts.points_x[0], opts.points_y[0]);
        for i in 1..opts.points_x.len() {
            context.line_to(opts.points_x[i], opts.points_y[i]);
        }
        context.close_path();
    }

    // We want to intersect the mask. So we use "destination-in" or just draw if mask is empty.
    context.set_global_composite_operation("destination-in")?;
    context.fill();

    Ok(canvas)
}

// Parses the JS options object for `applyPolygonMask`.
fn parse_apply_polygon_mask_options(value: JsValue) -> Result<ApplyPolygonMaskOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("applyPolygonMask expects an options object"))?;

    let points_x_val = js_sys::Reflect::get(&object, &JsValue::from_str("points_x"))?;
    let points_y_val = js_sys::Reflect::get(&object, &JsValue::from_str("points_y"))?;

    let points_x_arr = js_sys::Array::from(&points_x_val);
    let points_y_arr = js_sys::Array::from(&points_y_val);

    let mut points_x = Vec::new();
    let mut points_y = Vec::new();

    for i in 0..points_x_arr.length() {
        points_x.push(points_x_arr.get(i).as_f64().unwrap_or(0.0));
        points_y.push(points_y_arr.get(i).as_f64().unwrap_or(0.0));
    }

    Ok(ApplyPolygonMaskOptions {
        mask: read_offscreen_canvas_property(&object, "mask")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
        points_x,
        points_y,
    })
}

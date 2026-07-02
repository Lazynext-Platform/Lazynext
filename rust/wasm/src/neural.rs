//! WASM bridge for the neural engine.
//!
//! Initializes the facial recognition model and exposes face detection,
//! clip tagging, and smart bin building on raw frame data, returning
//! detection results as JSON to JavaScript.

use neural_engine::{FacialRecognitionModel, SmartBin};
use serde_wasm_bindgen;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = initNeuralEngine)]
pub fn init_neural_engine() -> Result<JsValue, JsValue> {
    let model = FacialRecognitionModel::new();
    Ok(JsValue::from_bool(model.is_loaded))
}

#[wasm_bindgen(js_name = detectFaces)]
pub fn detect_faces(frame_data: &[u8], width: u32, height: u32) -> Result<JsValue, JsValue> {
    let model = FacialRecognitionModel::new();
    let detections = model.detect_faces(frame_data, width, height);
    Ok(serde_wasm_bindgen::to_value(&detections).map_err(|e| JsValue::from_str(&e.to_string()))?)
}

#[wasm_bindgen(js_name = autoTagFootage)]
pub fn auto_tag_footage(clip_ids: Box<[JsValue]>) -> Result<JsValue, JsValue> {
    let clip_ids: Vec<String> = clip_ids
        .iter()
        .filter_map(|v| v.as_string())
        .collect();
    let model = FacialRecognitionModel::new();
    let tagged = model.auto_tag_footage(clip_ids);
    Ok(serde_wasm_bindgen::to_value(&tagged).map_err(|e| JsValue::from_str(&e.to_string()))?)
}

#[wasm_bindgen(js_name = buildSmartBins)]
pub fn build_smart_bins(tagged: JsValue) -> Result<JsValue, JsValue> {
    let tagged_map: std::collections::HashMap<String, Vec<String>> =
        serde_wasm_bindgen::from_value(tagged)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
    let bins: Vec<SmartBin> = FacialRecognitionModel::build_smart_bins(&tagged_map);
    Ok(serde_wasm_bindgen::to_value(&bins).map_err(|e| JsValue::from_str(&e.to_string()))?)
}

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen;
use neural_engine::FacialRecognitionModel;

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

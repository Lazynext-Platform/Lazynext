use wasm_bindgen::prelude::*;
use audio::AudioEngine;

#[wasm_bindgen(js_name = processAudioBuffer)]
pub fn process_audio_buffer(buffer: &[f32], sample_rate: u32, channels: u16) -> Result<Vec<f32>, JsValue> {
    let engine = AudioEngine::new(sample_rate, channels);
    let output = engine.process_buffer(buffer.to_vec());
    Ok(output)
}

use wasm_bindgen::prelude::*;

/// Process an audio buffer through the master bus (hard limiting).
#[wasm_bindgen(js_name = "processAudioBuffer")]
pub fn process_audio_buffer(buffer: Vec<f32>, sample_rate: u32, channels: u16) -> Vec<f32> {
    let engine = audio::AudioEngine::new(sample_rate, channels);
    engine.process_buffer(buffer)
}

/// Apply a parametric EQ to an audio buffer.
///
/// Frequencies in Hz, gain in dB, Q is bandwidth.
#[wasm_bindgen(js_name = "applyParametricEq")]
pub fn apply_parametric_eq(
    buffer: Vec<f64>,
    sample_rate: u32,
    low_freq: f64,
    low_gain_db: f64,
    mid_freq: f64,
    mid_gain_db: f64,
    mid_q: f64,
    high_freq: f64,
    high_gain_db: f64,
) -> Vec<f64> {
    let mut eq = audio::eq::ParametricEq::new(
        low_freq,
        low_gain_db,
        mid_freq,
        mid_gain_db,
        mid_q,
        high_freq,
        high_gain_db,
        sample_rate,
    );
    let mut output = buffer;
    eq.process_buffer(&mut output);
    output
}

/// Apply a dynamics compressor to an audio buffer.
#[wasm_bindgen(js_name = "applyCompressor")]
pub fn apply_compressor(
    buffer: Vec<f64>,
    sample_rate: u32,
    threshold_db: f64,
    ratio: f64,
    attack_ms: f64,
    release_ms: f64,
    makeup_gain_db: f64,
) -> Vec<f64> {
    let mut comp = audio::compressor::Compressor::new(
        threshold_db,
        ratio,
        3.0,
        attack_ms,
        release_ms,
        makeup_gain_db,
        sample_rate,
    );
    let mut output = buffer;
    comp.process_buffer(&mut output);
    output
}

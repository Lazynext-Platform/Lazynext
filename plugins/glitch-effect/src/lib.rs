//! Cyber Glitch 2077 — example Lazynext WASM effect plugin.
//!
//! This plugin demonstrates the `VideoEffect` trait from `lazynext_plugin_api`.
//! It applies a time-based RGB channel displacement effect — shifting the red
//! channel by a sinusoidal offset to create a "cyber glitch" look.
//!
//! # Usage
//!
//! Compile to WASM with `wasm32-wasip2` target and load into the Lazynext
//! plugin runtime:
//!
//! ```ignore
//! cargo build --target wasm32-wasip2 --release
//! ```
//!
//! The resulting `.wasm` binary implements the C ABI exports expected by
//! `lazynext_plugin_api::WasmPluginRuntime`.
//!
//! # For plugin developers
//!
//! See the `lazynext_plugin_api` crate for the full `VideoEffect` trait
//! contract, `FrameBuffer` type, and `PluginParameter` configuration.

use lazynext_plugin_api::{VideoEffect, FrameBuffer};

/// Applies a sinusoidal RGB channel displacement effect.
///
/// The glitch intensity (0.0–1.0) controls the maximum pixel offset.
/// The effect varies over time via `sin(time)` for an animated look.
pub struct CyberGlitchEffect {
    intensity: f32,
}

impl CyberGlitchEffect {
    /// Create a new glitch effect with default intensity (0.8).
    pub fn new() -> Self {
        CyberGlitchEffect { intensity: 0.8 }
    }
}

impl VideoEffect for CyberGlitchEffect {
    fn plugin_id(&self) -> &'static str {
        "com.thirdparty.cyber_glitch"
    }

    fn name(&self) -> &'static str {
        "Cyber Glitch 2077"
    }

    fn process_frame(&self, frame: &mut FrameBuffer, time: f64) {
        // Third-party developers would write custom pixel manipulation here.
        // For example, shifting RGB channels based on a sine wave.
        let offset = (time.sin() * self.intensity as f64 * 10.0) as usize;
        
        // Very basic mock glitch representation
        for i in (0..frame.data.len()).step_by(4) {
            if i + offset + 2 < frame.data.len() {
                // Shift Red channel
                frame.data[i] = frame.data[i + offset];
            }
        }
    }
}

// In a WASI environment, we would use #[no_mangle] extern "C" here to export the plugin.

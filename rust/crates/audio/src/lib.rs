//! Lazynext Audio — real-time DSP engine and VST3 host.
//!
//! The audio crate provides low-latency audio processing for the NLE:
//! a mixing console, parametric EQ, dynamics compressor, spatial audio
//! (Ambisonics), and a VST3 plugin host for industry-standard effects.
//!
//! # Signal chain
//!
//! ```text
//! Source Clip → EQ → Compressor → VST Insert → Mixer Bus → Limiter → Output
//!                    └─ Sidechain ←──────────┘
//! ```
//!
//! # Modules
//!
//! - **mixer**: Multi-bus mixing console with per-track gain/pan/mute/solo
//! - **compressor**: Feed-forward dynamics compressor with threshold, ratio,
//!   attack, release, knee, and makeup gain
//! - **eq**: 10-band parametric equalizer with configurable filter types
//!   (low-pass, high-pass, band-pass, notch, shelf, peaking)
//! - **vst**: VST3 plugin host via `libloading` — loads, instantiates,
//!   and processes through third-party audio plugins
//! - **playback**: Hardware audio output via `rodio` (cpal → CoreAudio /
//!   WASAPI / ALSA)
//! - **spatial**: Ambisonic spatial audio (first-order B-format)
//! - **fft**: Real-time FFT for spectral analysis and visualization
//! - **sync**: Sample-accurate playback synchronization with video frames

#![allow(clippy::large_enum_variant)]
#![allow(clippy::too_many_arguments)]

#[cfg(not(target_arch = "wasm32"))]
pub mod mixer;
#[cfg(not(target_arch = "wasm32"))]
pub mod playback;

pub mod spatial;
pub mod vst;

pub mod compressor;
pub mod eq;
pub mod fft;
pub mod sync;

/// Audio engine for real-time and offline DSP processing.
pub struct AudioEngine {
    /// Sample rate in Hz for audio processing (e.g. 48000).
    pub sample_rate: u32,
    /// Number of audio channels (1 = mono, 2 = stereo).
    pub channels: u16,
}

impl AudioEngine {
    /// Create a new audio engine for the given sample rate and channel count.
    pub fn new(sample_rate: u32, channels: u16) -> Self {
        Self {
            sample_rate,
            channels,
        }
    }

    /// Process a mono audio buffer through the master bus.
    /// Applies hard limiting as a safety clip.
    #[allow(clippy::manual_clamp)]
    pub fn process_buffer(&self, mut buffer: Vec<f32>) -> Vec<f32> {
        for sample in buffer.iter_mut() {
            if *sample > 1.0 {
                *sample = 1.0;
            } else if *sample < -1.0 {
                *sample = -1.0;
            }
        }
        buffer
    }

    /// Process a stereo interleaved buffer
    pub fn process_stereo(&self, mut buffer: Vec<f32>) -> Vec<f32> {
        for sample in buffer.iter_mut() {
            *sample = sample.clamp(-1.0, 1.0);
        }
        buffer
    }
}

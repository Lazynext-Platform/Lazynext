pub mod spatial;
pub mod vst;

pub mod eq;
pub mod compressor;

/// Audio engine for real-time and offline DSP processing.
pub struct AudioEngine {
    pub sample_rate: u32,
    pub channels: u16,
}

impl AudioEngine {
    pub fn new(sample_rate: u32, channels: u16) -> Self {
        Self {
            sample_rate,
            channels,
        }
    }

    /// Process a mono audio buffer through the master bus.
    /// Applies hard limiting as a safety clip.
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

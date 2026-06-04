pub mod vst;

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

    pub fn process_buffer(&self, mut buffer: Vec<f32>) -> Vec<f32> {
        // MOCK: Master bus DSP chain processing
        for sample in buffer.iter_mut() {
            // Apply a simple hard limiter logic
            if *sample > 1.0 {
                *sample = 1.0;
            } else if *sample < -1.0 {
                *sample = -1.0;
            }
        }
        buffer
    }
}
pub mod spatial;

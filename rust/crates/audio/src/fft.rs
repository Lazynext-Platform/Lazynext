use rustfft::{FftPlanner, num_complex::Complex};

/// An FFT-based audio analyzer for generating frequency bins.
/// Designed for extracting low, mid, and high frequencies for audio-reactive WebGPU shaders.
#[allow(dead_code)]
pub struct AudioAnalyzer {
    sample_rate: u32,
    fft_size: usize,
}

impl AudioAnalyzer {
    pub fn new(sample_rate: u32, fft_size: usize) -> Self {
        Self {
            sample_rate,
            fft_size,
        }
    }

    /// Process a mono audio buffer and return frequency magnitude bins.
    pub fn compute_frequency_bins(&self, buffer: &[f32]) -> Vec<f32> {
        let size = buffer.len().min(self.fft_size);
        if size == 0 {
            return vec![];
        }

        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(size);

        // Convert f32 to Complex
        let mut complex_buffer: Vec<Complex<f32>> = buffer
            .iter()
            .take(size)
            .map(|&val| Complex { re: val, im: 0.0 })
            .collect();

        // Pad with zeros if necessary
        complex_buffer.resize(size, Complex { re: 0.0, im: 0.0 });

        fft.process(&mut complex_buffer);

        // Calculate magnitudes (only need first half up to Nyquist limit)
        let nyquist_limit = size / 2;
        complex_buffer
            .iter()
            .take(nyquist_limit)
            .map(|c| c.norm())
            .collect()
    }

    /// Summarize FFT bins into typical 3-band EQ bands for simple shader reactivity.
    /// Returns (low, mid, high) magnitudes.
    pub fn compute_3band(&self, buffer: &[f32]) -> (f32, f32, f32) {
        let bins = self.compute_frequency_bins(buffer);
        if bins.is_empty() {
            return (0.0, 0.0, 0.0);
        }

        let total_bins = bins.len();
        
        let low_end = total_bins / 10;          // e.g. 0-2kHz (very roughly)
        let mid_end = total_bins * 6 / 10;      // e.g. 2k-12kHz

        let low = bins[0..low_end].iter().sum::<f32>() / (low_end as f32).max(1.0);
        let mid = bins[low_end..mid_end].iter().sum::<f32>() / ((mid_end - low_end) as f32).max(1.0);
        let high = bins[mid_end..].iter().sum::<f32>() / ((total_bins - mid_end) as f32).max(1.0);

        (low, mid, high)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_bins() {
        let analyzer = AudioAnalyzer::new(44100, 256);
        let mut sine_wave = vec![0.0; 256];
        for (i, sample) in sine_wave.iter_mut().enumerate() {
            *sample = (i as f32 * 0.1).sin();
        }

        let bins = analyzer.compute_frequency_bins(&sine_wave);
        assert_eq!(bins.len(), 128); // Nyquist limit
        
        let (low, mid, high) = analyzer.compute_3band(&sine_wave);
        assert!(low > 0.0 || mid > 0.0 || high > 0.0);
    }
}

//! Audio track synchronization via FFT cross-correlation.
//!
//! Computes the sample-accurate offset between two audio tracks (master and
//! secondary) using forward/inverse FFT-based cross-correlation. A positive
//! offset indicates the secondary track is delayed relative to the master.

use rustfft::{FftPlanner, num_complex::Complex};

/// Synchronizer that aligns two audio tracks by cross-correlation.
pub struct AudioSynchronizer {
    pub sample_rate: u32,
}

impl AudioSynchronizer {
    /// Create a new synchronizer for the given sample rate.
    pub fn new(sample_rate: u32) -> Self {
        Self { sample_rate }
    }

    /// Calculate the sample offset between a master track and a secondary track using Cross-Correlation via FFT.
    /// Returns the offset in samples. A positive offset means `secondary` is delayed relative to `master`.
    pub fn calculate_offset(&self, master: &[f32], secondary: &[f32]) -> isize {
        // Find next power of two for fast FFT
        let n = (master.len() + secondary.len() - 1).next_power_of_two();

        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(n);
        let ifft = planner.plan_fft_inverse(n);

        // Pad with zeros and convert to Complex
        let mut master_complex: Vec<Complex<f32>> = master
            .iter()
            .map(|&val| Complex::new(val, 0.0))
            .chain(std::iter::repeat(Complex::new(0.0, 0.0)))
            .take(n)
            .collect();

        let mut secondary_complex: Vec<Complex<f32>> = secondary
            .iter()
            .map(|&val| Complex::new(val, 0.0))
            .chain(std::iter::repeat(Complex::new(0.0, 0.0)))
            .take(n)
            .collect();

        // Forward FFT
        fft.process(&mut master_complex);
        fft.process(&mut secondary_complex);

        // Multiply Master by the complex conjugate of Secondary
        let mut cross_corr: Vec<Complex<f32>> = master_complex
            .iter()
            .zip(secondary_complex.iter())
            .map(|(m, s)| m * s.conj())
            .collect();

        // Inverse FFT to get cross-correlation in time domain
        ifft.process(&mut cross_corr);

        // Find the peak magnitude in the cross-correlation result
        let mut max_val = 0.0;
        let mut max_idx = 0;

        for (i, val) in cross_corr.iter().enumerate() {
            let magnitude = val.norm();
            if magnitude > max_val {
                max_val = magnitude;
                max_idx = i;
            }
        }

        // Handle wrap-around for negative shifts
        if max_idx > n / 2 {
            max_idx as isize - n as isize
        } else {
            max_idx as isize
        }
    }
}

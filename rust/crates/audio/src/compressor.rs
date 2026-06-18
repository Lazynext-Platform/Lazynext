/// A dynamics compressor with soft-knee, adjustable ratio, and make-up gain.
pub struct Compressor {
    threshold_db: f64,
    ratio: f64,
    knee_width_db: f64,
    attack_coeff: f64,
    release_coeff: f64,
    makeup_gain_linear: f64,
    envelope: f64,
}

impl Compressor {
    /// Create a new compressor.
    ///
    /// # Arguments
    /// * `threshold_db` — Level above which compression begins (e.g. -20.0)
    /// * `ratio` — Compression ratio (e.g. 4.0 = 4:1)
    /// * `knee_width_db` — Soft-knee width in dB (e.g. 3.0)
    /// * `attack_ms` — Attack time in milliseconds
    /// * `release_ms` — Release time in milliseconds
    /// * `makeup_gain_db` — Make-up gain in dB to compensate for gain reduction
    /// * `sample_rate` — Sample rate in Hz
    pub fn new(
        threshold_db: f64,
        ratio: f64,
        knee_width_db: f64,
        attack_ms: f64,
        release_ms: f64,
        makeup_gain_db: f64,
        sample_rate: u32,
    ) -> Self {
        let attack_coeff = (-1.0 / (attack_ms / 1000.0 * sample_rate as f64)).exp();
        let release_coeff = (-1.0 / (release_ms / 1000.0 * sample_rate as f64)).exp();
        let makeup_gain_linear = 10.0_f64.powf(makeup_gain_db / 20.0);

        Self {
            threshold_db,
            ratio,
            knee_width_db,
            attack_coeff,
            release_coeff,
            makeup_gain_linear,
            envelope: 0.0,
        }
    }

    /// Process a single sample. Returns the compressed output.
    pub fn process(&mut self, input: f64) -> f64 {
        // Compute input level in dB
        let input_db = if input.abs() < 1e-10 {
            -120.0
        } else {
            20.0 * input.abs().log10()
        };

        // Soft-knee gain computer
        let half_knee = self.knee_width_db / 2.0;
        let gain_reduction_db = if input_db < self.threshold_db - half_knee {
            // Below knee: no compression
            0.0
        } else if input_db > self.threshold_db + half_knee {
            // Above knee: full compression
            (self.threshold_db - input_db) * (1.0 - 1.0 / self.ratio)
        } else {
            // In the knee: interpolated
            let t = (input_db - self.threshold_db + half_knee) / self.knee_width_db;
            (self.threshold_db - input_db) * (1.0 - 1.0 / self.ratio) * t * t
        };

        // Envelope follower (attack/release smoothing)
        let coeff = if gain_reduction_db < self.envelope {
            self.attack_coeff
        } else {
            self.release_coeff
        };
        self.envelope = coeff * self.envelope + (1.0 - coeff) * gain_reduction_db;

        // Apply gain reduction and makeup gain
        let gain_linear = 10.0_f64.powf(self.envelope / 20.0);
        input * gain_linear * self.makeup_gain_linear
    }

    /// Process a buffer in-place.
    pub fn process_buffer(&mut self, buffer: &mut [f64]) {
        for sample in buffer.iter_mut() {
            *sample = self.process(*sample);
        }
    }

    /// Reset the envelope follower.
    pub fn reset(&mut self) {
        self.envelope = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compressor_below_threshold() {
        let mut comp = Compressor::new(-20.0, 4.0, 3.0, 10.0, 100.0, 0.0, 44100);
        // Quiet signal should pass through nearly unchanged
        let output = comp.process(0.01); // ~-40dB
        assert!((output - 0.01).abs() < 0.01);
    }

    #[test]
    fn test_compressor_above_threshold() {
        let mut comp = Compressor::new(-20.0, 4.0, 0.1, 1.0, 100.0, 0.0, 44100);
        let output = comp.process(1.0); // 0dB
        // Should be reduced (4:1 ratio means gain reduction of ~15dB at 0dB input)
        assert!(output.abs() < 1.0);
    }

    #[test]
    fn test_compressor_makeup_gain() {
        let mut comp = Compressor::new(-10.0, 4.0, 0.1, 1.0, 100.0, 6.0, 44100);
        let output = comp.process(0.1); // quiet signal should get makeup gain
        assert!(output.abs() > 0.1);
    }
}

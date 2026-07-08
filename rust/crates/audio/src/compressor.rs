//! Dynamics compressor DSP with soft-knee, sidechain support, and envelope smoothing.
//!
//! Provides a stereo-capable compressor with adjustable threshold, ratio,
//! knee width, attack/release times, and make-up gain. Supports sidechain
//! processing where one signal controls gain reduction applied to another
//! (e.g. kick-drum ducking on a bass line).
//!
/// A stereo-capable dynamics compressor with soft-knee, adjustable ratio,
/// envelope-based attack/release smoothing, and make-up gain.
///
/// Gain reduction is computed per-sample using a soft-knee curve and smoothed
/// with separate attack and release coefficients. Supports sidechain processing
/// where one signal controls gain reduction applied to another.
pub struct Compressor {
    /// Level in dB above which compression begins.
    threshold_db: f64,
    /// Compression ratio (e.g. 4.0 = 4:1).
    ratio: f64,
    /// Soft-knee width in dB.
    knee_width_db: f64,
    /// Envelope smoothing coefficient for the attack phase.
    attack_coeff: f64,
    /// Envelope smoothing coefficient for the release phase.
    release_coeff: f64,
    /// Make-up gain as a linear multiplier.
    makeup_gain_linear: f64,
    /// Current gain-reduction envelope value in dB.
    envelope: f64,
}

impl Compressor {
    /// Create a new compressor with validated parameters.
    ///
    /// # Arguments
    /// * `threshold_db` — Level above which compression begins (e.g. -20.0). Must be <= 0.0.
    /// * `ratio` — Compression ratio (e.g. 4.0 = 4:1). Must be >= 1.0.
    /// * `knee_width_db` — Soft-knee width in dB (e.g. 3.0). Must be >= 0.0.
    /// * `attack_ms` — Attack time in milliseconds. Must be > 0.0.
    /// * `release_ms` — Release time in milliseconds. Must be > 0.0.
    /// * `makeup_gain_db` — Make-up gain in dB. Clamped to [-24, 24].
    /// * `sample_rate` — Sample rate in Hz. Must be > 0.
    ///
    /// Invalid parameters are clamped to safe defaults rather than rejected,
    /// ensuring the compressor always produces valid audio.
    pub fn new(
        threshold_db: f64,
        ratio: f64,
        knee_width_db: f64,
        attack_ms: f64,
        release_ms: f64,
        makeup_gain_db: f64,
        sample_rate: u32,
    ) -> Self {
        let threshold_db = threshold_db.min(0.0);
        let ratio = ratio.max(1.0);
        let knee_width_db = knee_width_db.max(0.0);
        let attack_ms = attack_ms.max(0.01);
        let release_ms = release_ms.max(0.01);
        let makeup_gain_db = makeup_gain_db.clamp(-24.0, 24.0);
        let sample_rate = sample_rate.max(1);
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

    /// Process a single sample with sidechain input.
    ///
    /// The gain reduction is computed from `sidechain_input` (e.g. a kick drum)
    /// but applied to `input` (e.g. a bass line). Useful for ducking effects
    /// where one signal should be attenuated when another is loud.
    pub fn process_sidechain(&mut self, input: f64, sidechain_input: f64) -> f64 {
        // Compute sidechain input level in dB
        let sidechain_db = if sidechain_input.abs() < 1e-10 {
            -120.0
        } else {
            20.0 * sidechain_input.abs().log10()
        };

        // Soft-knee gain computer based on SIDECHAIN
        let half_knee = self.knee_width_db / 2.0;
        let gain_reduction_db = if sidechain_db < self.threshold_db - half_knee {
            0.0
        } else if sidechain_db > self.threshold_db + half_knee {
            (self.threshold_db - sidechain_db) * (1.0 - 1.0 / self.ratio)
        } else {
            let t = (sidechain_db - self.threshold_db + half_knee) / self.knee_width_db;
            (self.threshold_db - sidechain_db) * (1.0 - 1.0 / self.ratio) * t * t
        };

        // Envelope follower
        let coeff = if gain_reduction_db < self.envelope {
            self.attack_coeff
        } else {
            self.release_coeff
        };
        self.envelope = coeff * self.envelope + (1.0 - coeff) * gain_reduction_db;

        // Apply gain reduction and makeup gain to MAIN input
        let gain_linear = 10.0_f64.powf(self.envelope / 20.0);
        input * gain_linear * self.makeup_gain_linear
    }

    /// Process a buffer in-place using a sidechain buffer.
    pub fn process_buffer_sidechain(&mut self, buffer: &mut [f64], sidechain_buffer: &[f64]) {
        for (sample, &sidechain_sample) in buffer.iter_mut().zip(sidechain_buffer.iter()) {
            *sample = self.process_sidechain(*sample, sidechain_sample);
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

    #[test]
    fn test_sidechain_ducking() {
        let mut comp = Compressor::new(-20.0, 4.0, 0.1, 1.0, 100.0, 0.0, 44100);
        let loud_voice = 1.0; // 0dB
        let quiet_bgm = 0.1; // -20dB

        let output_with_ducking = comp.process_sidechain(quiet_bgm, loud_voice);
        let output_without_ducking = comp.process_sidechain(quiet_bgm, 0.0);

        // BGM should be compressed strictly due to the loud sidechain
        assert!(output_with_ducking.abs() < output_without_ducking.abs());
    }
}

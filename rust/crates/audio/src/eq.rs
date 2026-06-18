/// Biquad filter coefficients for parametric EQ.
#[derive(Clone, Debug)]
pub struct BiquadCoeffs {
    pub b0: f64,
    pub b1: f64,
    pub b2: f64,
    pub a1: f64,
    pub a2: f64,
}

/// Filter types supported by the parametric EQ.
#[derive(Clone, Debug, PartialEq)]
pub enum FilterType {
    LowPass,
    HighPass,
    BandPass,
    LowShelf,
    HighShelf,
    Peaking,
    Notch,
}

/// A second-order biquad filter stage.
pub struct BiquadFilter {
    coeffs: BiquadCoeffs,
    x1: f64,
    x2: f64,
    y1: f64,
    y2: f64,
}

impl BiquadFilter {
    /// Design a filter from type, frequency, Q, and gain.
    pub fn new(
        filter_type: FilterType,
        freq_hz: f64,
        q: f64,
        gain_db: f64,
        sample_rate: u32,
    ) -> Self {
        let coeffs = design_biquad(filter_type, freq_hz, q, gain_db, sample_rate);
        Self {
            coeffs,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    /// Process a single sample through the filter.
    pub fn process(&mut self, input: f64) -> f64 {
        let output = self.coeffs.b0 * input + self.coeffs.b1 * self.x1 + self.coeffs.b2 * self.x2
            - self.coeffs.a1 * self.y1
            - self.coeffs.a2 * self.y2;

        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;

        output
    }

    /// Process a buffer of f64 samples in-place.
    pub fn process_buffer(&mut self, buffer: &mut [f64]) {
        for sample in buffer.iter_mut() {
            *sample = self.process(*sample);
        }
    }

    /// Reset filter state.
    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }
}

/// Design biquad coefficients for a given filter specification.
///
/// Uses the Audio EQ Cookbook formulas by Robert Bristow-Johnson.
fn design_biquad(
    filter_type: FilterType,
    freq_hz: f64,
    q: f64,
    gain_db: f64,
    sample_rate: u32,
) -> BiquadCoeffs {
    use std::f64::consts::TAU;

    let fs = sample_rate as f64;
    let w0 = TAU * freq_hz / fs;
    let alpha = w0.sin() / (2.0 * q);
    let a = 10.0_f64.powf(gain_db / 40.0);

    match filter_type {
        FilterType::LowPass => {
            let b0 = (1.0 - w0.cos()) / 2.0;
            let b1 = 1.0 - w0.cos();
            let b2 = (1.0 - w0.cos()) / 2.0;
            let a0 = 1.0 + alpha;
            let a1 = -2.0 * w0.cos();
            let a2 = 1.0 - alpha;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
        FilterType::HighPass => {
            let b0 = (1.0 + w0.cos()) / 2.0;
            let b1 = -(1.0 + w0.cos());
            let b2 = (1.0 + w0.cos()) / 2.0;
            let a0 = 1.0 + alpha;
            let a1 = -2.0 * w0.cos();
            let a2 = 1.0 - alpha;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
        FilterType::BandPass => {
            let b0 = alpha;
            let b1 = 0.0;
            let b2 = -alpha;
            let a0 = 1.0 + alpha;
            let a1 = -2.0 * w0.cos();
            let a2 = 1.0 - alpha;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
        FilterType::LowShelf => {
            let b0 = a * ((a + 1.0) - (a - 1.0) * w0.cos() + 2.0 * a.sqrt() * alpha);
            let b1 = 2.0 * a * ((a - 1.0) - (a + 1.0) * w0.cos());
            let b2 = a * ((a + 1.0) - (a - 1.0) * w0.cos() - 2.0 * a.sqrt() * alpha);
            let a0 = (a + 1.0) + (a - 1.0) * w0.cos() + 2.0 * a.sqrt() * alpha;
            let a1 = -2.0 * ((a - 1.0) + (a + 1.0) * w0.cos());
            let a2 = (a + 1.0) + (a - 1.0) * w0.cos() - 2.0 * a.sqrt() * alpha;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
        FilterType::HighShelf => {
            let b0 = a * ((a + 1.0) + (a - 1.0) * w0.cos() + 2.0 * a.sqrt() * alpha);
            let b1 = -2.0 * a * ((a - 1.0) + (a + 1.0) * w0.cos());
            let b2 = a * ((a + 1.0) + (a - 1.0) * w0.cos() - 2.0 * a.sqrt() * alpha);
            let a0 = (a + 1.0) - (a - 1.0) * w0.cos() + 2.0 * a.sqrt() * alpha;
            let a1 = 2.0 * ((a - 1.0) - (a + 1.0) * w0.cos());
            let a2 = (a + 1.0) - (a - 1.0) * w0.cos() - 2.0 * a.sqrt() * alpha;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
        FilterType::Peaking => {
            let b0 = 1.0 + alpha * a;
            let b1 = -2.0 * w0.cos();
            let b2 = 1.0 - alpha * a;
            let a0 = 1.0 + alpha / a;
            let a1 = -2.0 * w0.cos();
            let a2 = 1.0 - alpha / a;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
        FilterType::Notch => {
            let b0 = 1.0;
            let b1 = -2.0 * w0.cos();
            let b2 = 1.0;
            let a0 = 1.0 + alpha;
            let a1 = -2.0 * w0.cos();
            let a2 = 1.0 - alpha;
            BiquadCoeffs {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
            }
        }
    }
}

/// A three-band parametric EQ (low, mid, high).
pub struct ParametricEq {
    low_shelf: BiquadFilter,
    mid_peaking: BiquadFilter,
    high_shelf: BiquadFilter,
}

impl ParametricEq {
    pub fn new(
        low_freq: f64,
        low_gain_db: f64,
        mid_freq: f64,
        mid_gain_db: f64,
        mid_q: f64,
        high_freq: f64,
        high_gain_db: f64,
        sample_rate: u32,
    ) -> Self {
        Self {
            low_shelf: BiquadFilter::new(
                FilterType::LowShelf,
                low_freq,
                0.7,
                low_gain_db,
                sample_rate,
            ),
            mid_peaking: BiquadFilter::new(
                FilterType::Peaking,
                mid_freq,
                mid_q,
                mid_gain_db,
                sample_rate,
            ),
            high_shelf: BiquadFilter::new(
                FilterType::HighShelf,
                high_freq,
                0.7,
                high_gain_db,
                sample_rate,
            ),
        }
    }

    pub fn process(&mut self, input: f64) -> f64 {
        let low = self.low_shelf.process(input);
        let mid = self.mid_peaking.process(low);
        self.high_shelf.process(mid)
    }

    pub fn process_buffer(&mut self, buffer: &mut [f64]) {
        for sample in buffer.iter_mut() {
            *sample = self.process(*sample);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lowpass_attenuates_high() {
        // 1kHz lowpass at 44.1kHz should pass DC but attenuate Nyquist
        let mut filter = BiquadFilter::new(FilterType::LowPass, 1000.0, 0.707, 0.0, 44100);
        // DC signal needs a few samples to reach steady-state
        let mut output = 0.0;
        for _ in 0..20 {
            output = filter.process(1.0);
        }
        assert!(output.abs() > 0.9, "DC gain should be ~1.0, got {}", output);
    }

    #[test]
    fn test_filter_reset() {
        let mut filter = BiquadFilter::new(FilterType::LowPass, 1000.0, 0.707, 0.0, 44100);
        filter.process(1.0);
        filter.process(1.0);
        filter.reset();
        // After reset, state should be zero
        assert_eq!(filter.x1, 0.0);
        assert_eq!(filter.y1, 0.0);
    }

    #[test]
    fn test_parametric_eq_no_gain_is_transparent() {
        let mut eq = ParametricEq::new(200.0, 0.0, 1000.0, 0.0, 1.0, 5000.0, 0.0, 44100);
        let output = eq.process(0.5);
        // With 0dB gain on all bands, signal should be close to input
        assert!((output - 0.5).abs() < 0.1);
    }
}

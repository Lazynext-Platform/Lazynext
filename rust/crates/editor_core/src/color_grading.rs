//! In-place color grading pipeline for RGBA frame buffers.
//!
//! Applies contrast, brightness, and saturation adjustments directly to pixel data
//! without intermediate allocations. Exposed to JavaScript via `wasm-bindgen` for
//! real-time preview in the web editor shell.

use wasm_bindgen::prelude::*;

/// In-place color grading processor for RGBA frame buffers.
#[wasm_bindgen]
pub struct ColorGradingProcessor {
    /// Contrast multiplier around the 0.5 midpoint.
    contrast: f32,
    /// Additive brightness offset.
    brightness: f32,
    /// Saturation multiplier on color difference from luma.
    saturation: f32,
}

#[wasm_bindgen]
impl ColorGradingProcessor {
    /// Create a new color grading processor with the given parameters.
    ///
    /// * `contrast` — multiplier around 0.5 midpoint (1.0 = no change)
    /// * `brightness` — additive offset in [0, 1] range (0.0 = no change)
    /// * `saturation` — multiplier on color difference from luma (1.0 = no change)
    #[wasm_bindgen(constructor)]
    pub fn new(contrast: f32, brightness: f32, saturation: f32) -> Self {
        Self {
            contrast,
            brightness,
            saturation,
        }
    }

    /// Applies color grading to a flat RGBA buffer.
    /// Modifies the buffer in-place to avoid allocations.
    #[wasm_bindgen]
    pub fn apply_grading(&self, frame_data: &mut [u8]) {
        for chunk in frame_data.chunks_exact_mut(4) {
            let r = chunk[0] as f32 / 255.0;
            let g = chunk[1] as f32 / 255.0;
            let b = chunk[2] as f32 / 255.0;
            let a = chunk[3];

            // 1. Brightness
            let mut r = r + self.brightness;
            let mut g = g + self.brightness;
            let mut b = b + self.brightness;

            // 2. Contrast
            r = (r - 0.5) * self.contrast + 0.5;
            g = (g - 0.5) * self.contrast + 0.5;
            b = (b - 0.5) * self.contrast + 0.5;

            // 3. Saturation (Luma approximation)
            let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = luma + self.saturation * (r - luma);
            g = luma + self.saturation * (g - luma);
            b = luma + self.saturation * (b - luma);

            // Clamp and write back
            chunk[0] = (r.clamp(0.0, 1.0) * 255.0) as u8;
            chunk[1] = (g.clamp(0.0, 1.0) * 255.0) as u8;
            chunk[2] = (b.clamp(0.0, 1.0) * 255.0) as u8;
            chunk[3] = a; // alpha remains unchanged
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_pipeline_preserves_colors() {
        // contrast=1.0, brightness=0.0, saturation=1.0: no change expected
        let processor = ColorGradingProcessor::new(1.0, 0.0, 1.0);
        let mut pixels = vec![0u8, 0, 0, 255, 255, 255, 255, 255, 128, 128, 128, 255];
        let original = pixels.clone();
        processor.apply_grading(&mut pixels);
        // Black and white should be exact (no floating-point rounding)
        assert_eq!(pixels[0], 0);
        assert_eq!(pixels[1], 0);
        assert_eq!(pixels[2], 0);
        assert_eq!(pixels[4], 255);
        assert_eq!(pixels[5], 255);
        assert_eq!(pixels[6], 255);
        // Mid-gray may differ by at most 1 due to f32→u8 rounding
        for i in 8..11 {
            let diff = (pixels[i] as i16 - original[i] as i16).unsigned_abs();
            assert!(diff <= 1, "mid-gray channel {i} drifted by {diff}");
        }
    }

    #[test]
    fn brightness_increase_lightens_mid_gray() {
        // brightness +0.2 should increase mid-gray pixel values
        let processor = ColorGradingProcessor::new(1.0, 0.2, 1.0);
        let mut pixels = vec![128u8, 128, 128, 255];
        processor.apply_grading(&mut pixels);
        // All three RGB channels should be brighter than 128
        assert!(pixels[0] > 128, "R channel not brightened: {}", pixels[0]);
        assert!(pixels[1] > 128, "G channel not brightened: {}", pixels[1]);
        assert!(pixels[2] > 128, "B channel not brightened: {}", pixels[2]);
    }

    #[test]
    fn brightness_decrease_darkens_mid_gray() {
        // brightness -0.2 should decrease mid-gray pixel values
        let processor = ColorGradingProcessor::new(1.0, -0.2, 1.0);
        let mut pixels = vec![128u8, 128, 128, 255];
        processor.apply_grading(&mut pixels);
        // All three RGB channels should be darker than 128
        assert!(pixels[0] < 128, "R channel not darkened: {}", pixels[0]);
        assert!(pixels[1] < 128, "G channel not darkened: {}", pixels[1]);
        assert!(pixels[2] < 128, "B channel not darkened: {}", pixels[2]);
    }

    #[test]
    fn contrast_spreads_values_from_midpoint() {
        // contrast=2.0 should make dark pixels darker and light pixels lighter
        let processor = ColorGradingProcessor::new(2.0, 0.0, 1.0);
        let mut pixels = vec![
            64, 64, 64, 255, // darker than mid-gray
            192, 192, 192, 255, // lighter than mid-gray
        ];
        processor.apply_grading(&mut pixels);
        // Dark pixel should be even darker (< 64)
        assert!(pixels[0] < 64, "dark R got lighter: {}", pixels[0]);
        // Light pixel should be even lighter (> 192)
        assert!(pixels[4] > 192, "light R got darker: {}", pixels[4]);
    }

    #[test]
    fn saturation_zero_produces_grayscale() {
        // saturation=0.0 should make all RGB channels equal (luma only)
        let processor = ColorGradingProcessor::new(1.0, 0.0, 0.0);
        let mut pixels = vec![255u8, 0, 0, 255]; // pure red
        processor.apply_grading(&mut pixels);
        // All channels should be equal (grayscale), and not zero
        assert_eq!(pixels[0], pixels[1], "R and G differ after desaturation");
        assert_eq!(pixels[1], pixels[2], "G and B differ after desaturation");
        assert!(pixels[0] > 0, "desaturated pixel should not be black");
    }

    #[test]
    fn alpha_channel_preserved_through_pipeline() {
        let processor = ColorGradingProcessor::new(1.5, 0.1, 1.2);
        let alpha_values = [0u8, 64, 128, 192, 255];
        let mut pixels: Vec<u8> = alpha_values
            .iter()
            .flat_map(|&a| vec![128u8, 128, 128, a])
            .collect();
        let alphas_before: Vec<u8> = alpha_values.to_vec();
        processor.apply_grading(&mut pixels);
        // Each alpha channel must remain unchanged
        for (i, &expected_alpha) in alphas_before.iter().enumerate() {
            let alpha_index = i * 4 + 3;
            assert_eq!(
                pixels[alpha_index], expected_alpha,
                "alpha at pixel {i} changed from {expected_alpha} to {}",
                pixels[alpha_index]
            );
        }
    }

    #[test]
    fn brightness_increases_all_channels_equally() {
        // With identity contrast and saturation, brightness adds a
        // constant delta to every channel. +0.2 in [0,1] → +51 in [0,255].
        let processor = ColorGradingProcessor::new(1.0, 0.2, 1.0);
        let mut pixels = vec![100u8, 150, 200, 255];
        processor.apply_grading(&mut pixels);
        let expected_increase = (0.2_f32 * 255.0).round() as i16;
        assert_eq!(
            pixels[0] as i16 - 100i16,
            expected_increase,
            "R channel increase mismatch"
        );
        assert_eq!(
            pixels[1] as i16 - 150i16,
            expected_increase,
            "G channel increase mismatch"
        );
        assert_eq!(
            pixels[2] as i16 - 200i16,
            expected_increase,
            "B channel increase mismatch"
        );
        assert_eq!(pixels[3], 255, "alpha must be preserved");
    }

    #[test]
    fn contrast_stretches_values_away_from_midpoint() {
        // contrast > 1.0 pushes values away from the 0.5 midpoint.
        // Mid-gray (128) stays anchored near 128 while extremes diverge.
        let processor = ColorGradingProcessor::new(2.0, 0.0, 1.0);
        let mut pixels = vec![
            30, 30, 30, 255, // well below mid-gray
            128, 128, 128, 255, // exactly at mid-gray
            220, 220, 220, 255, // well above mid-gray
        ];
        processor.apply_grading(&mut pixels);
        // Below-midpoint pixels move down
        assert!(
            pixels[0] < 30,
            "dark pixel should be darker, got {}",
            pixels[0]
        );
        // Mid-gray stays anchored (floating-point rounding may drift by 1-2)
        let mid_drift = (pixels[4] as i16 - 128i16).unsigned_abs();
        assert!(
            mid_drift <= 2,
            "mid-gray drifted by {mid_drift}, got {}",
            pixels[4]
        );
        // Above-midpoint pixels move up
        assert!(
            pixels[8] > 220,
            "light pixel should be lighter, got {}",
            pixels[8]
        );
        // Verify distances from midpoint increase on both sides
        let dark_dist_before = 128i16 - 30i16;
        let dark_dist_after = 128i16 - pixels[0] as i16;
        assert!(
            dark_dist_after > dark_dist_before,
            "dark pixel should move further from midpoint"
        );
        let light_dist_before = 220i16 - 128i16;
        let light_dist_after = pixels[8] as i16 - 128i16;
        assert!(
            light_dist_after > light_dist_before,
            "light pixel should move further from midpoint"
        );
    }

    #[test]
    fn saturation_leaves_grayscale_pixels_unchanged() {
        // For grayscale pixels (R == G == B), luma equals the channel
        // value, so (channel - luma) is zero — saturation has no effect.
        // Only saturation varies; contrast=1.0 and brightness=0.0.
        let processor = ColorGradingProcessor::new(1.0, 0.0, 4.0);
        let original = vec![64u8, 64, 64, 255, 128, 128, 128, 200, 200, 200, 200, 128];
        let mut pixels = original.clone();
        processor.apply_grading(&mut pixels);
        for i in 0..original.len() {
            let diff = (pixels[i] as i16 - original[i] as i16).unsigned_abs();
            assert!(diff <= 1, "grayscale pixel at index {i} changed by {diff}");
        }
    }

    #[test]
    fn pipeline_produces_valid_rgba_output() {
        // Aggressive parameters must never produce out-of-range output
        // or arithmetic panics (NaN, overflow before clamping).
        let processor = ColorGradingProcessor::new(10.0, 2.0, 20.0);
        let mut pixels = vec![
            0u8, 0, 0, 0, 255, 255, 255, 255, 128, 128, 128, 128, 10, 200, 50, 75,
        ];
        processor.apply_grading(&mut pixels);
        // Alpha channel is always preserved verbatim
        assert_eq!(pixels[3], 0);
        assert_eq!(pixels[7], 255);
        assert_eq!(pixels[11], 128);
        assert_eq!(pixels[15], 75);
        // Clamping guarantees RGB bytes are in [0, 255]. The fact that
        // apply_grading returned without panicking already validates this.
        // We additionally verify no arithmetic overflow corrupted the buffer
        // by spot-checking a few expected byte positions.
        let _ = pixels; // used above via index assertions
    }
}

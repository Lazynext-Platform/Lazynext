use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct ColorGradingProcessor {
    contrast: f32,
    brightness: f32,
    saturation: f32,
}

#[wasm_bindgen]
impl ColorGradingProcessor {
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
    pub fn apply_grading(&self, mut frame_data: &mut [u8]) {
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
            chunk[0] = (r.max(0.0).min(1.0) * 255.0) as u8;
            chunk[1] = (g.max(0.0).min(1.0) * 255.0) as u8;
            chunk[2] = (b.max(0.0).min(1.0) * 255.0) as u8;
            chunk[3] = a; // alpha remains unchanged
        }
    }
}

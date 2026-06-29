//! 3D LUT (Look-Up Table) management for professional color grading.
//!
//! Supports:
//!   - .cube LUT files (Iridas/Adobe standard)
//!   - Trilinear interpolation for smooth color transforms
//!   - LUT application to RGBA image data
//!   - LUT baking into GPU textures

use std::fs;
use std::path::Path;

/// A parsed 3D LUT loaded from a .cube file.
#[derive(Clone, Debug)]
pub struct Lut3D {
    /// Display title from the file header
    pub title: String,
    /// Number of sample points per dimension (e.g. 33 for a 33³ LUT)
    pub size: u32,
    /// Input domain minimum (default [0,0,0])
    pub domain_min: [f32; 3],
    /// Input domain maximum (default [1,1,1])
    pub domain_max: [f32; 3],
    /// Flat array of LUT entries in BGR order (size³ × 3 floats)
    pub data: Vec<f32>,
}

/// A named LUT preset instantiated from a file or built-in recipe.
pub struct LutPreset {
    pub name: String,
    pub lut: Lut3D,
    /// Whether this preset was loaded from a file or generated
    pub source: LutSource,
}

pub enum LutSource {
    File(String),
    Builtin,
    Runtime,
}

// ── Built-in LUT presets ────────────────────────────────────────────

impl LutPreset {
    /// Create a cinematic "Teal & Orange" LUT.
    pub fn teal_orange() -> Self {
        let size = 17u32;
        let n = (size * size * size) as usize;
        let mut data = vec![0.0; n * 3];
        for b_idx in 0..size {
            for g_idx in 0..size {
                for r_idx in 0..size {
                    let r = r_idx as f32 / (size - 1) as f32;
                    let g = g_idx as f32 / (size - 1) as f32;
                    let b = b_idx as f32 / (size - 1) as f32;
                    let idx = ((b_idx * size * size + g_idx * size + r_idx) * 3) as usize;
                    // Push shadows toward teal, highlights toward orange
                    let luma = 0.299 * r + 0.587 * g + 0.114 * b;
                    data[idx] = (r * 0.9 + 0.05).min(1.0);
                    data[idx + 1] = (g * 0.85 + luma * 0.1).min(1.0);
                    data[idx + 2] = (b * 0.7 + luma * 0.05).min(1.0);
                }
            }
        }
        Self {
            name: "Teal & Orange".into(),
            lut: Lut3D {
                title: "Teal & Orange Cinematic".into(),
                size,
                domain_min: [0.0, 0.0, 0.0],
                domain_max: [1.0, 1.0, 1.0],
                data,
            },
            source: LutSource::Builtin,
        }
    }

    /// Create a "Bleach Bypass" LUT — desaturated, high contrast.
    pub fn bleach_bypass() -> Self {
        let size = 17u32;
        let n = (size * size * size) as usize;
        let mut data = vec![0.0; n * 3];
        for b_idx in 0..size {
            for g_idx in 0..size {
                for r_idx in 0..size {
                    let r = r_idx as f32 / (size - 1) as f32;
                    let g = g_idx as f32 / (size - 1) as f32;
                    let b = b_idx as f32 / (size - 1) as f32;
                    let idx = ((b_idx * size * size + g_idx * size + r_idx) * 3) as usize;
                    let luma = 0.299 * r + 0.587 * g + 0.114 * b;
                    let contrast = (luma - 0.5) * 1.6 + 0.5;
                    let sat = 0.2;
                    data[idx] = (contrast + (r - luma) * sat).clamp(0.0, 1.0);
                    data[idx + 1] = (contrast + (g - luma) * sat).clamp(0.0, 1.0);
                    data[idx + 2] = (contrast + (b - luma) * sat).clamp(0.0, 1.0);
                }
            }
        }
        Self {
            name: "Bleach Bypass".into(),
            lut: Lut3D {
                title: "Bleach Bypass".into(),
                size,
                domain_min: [0.0, 0.0, 0.0],
                domain_max: [1.0, 1.0, 1.0],
                data,
            },
            source: LutSource::Builtin,
        }
    }

    /// Create a "Film Emulation" LUT with a warm tone curve.
    pub fn film_emulation() -> Self {
        let size = 17u32;
        let n = (size * size * size) as usize;
        let mut data = vec![0.0; n * 3];
        for b_idx in 0..size {
            for g_idx in 0..size {
                for r_idx in 0..size {
                    let r = r_idx as f32 / (size - 1) as f32;
                    let g = g_idx as f32 / (size - 1) as f32;
                    let b = b_idx as f32 / (size - 1) as f32;
                    let idx = ((b_idx * size * size + g_idx * size + r_idx) * 3) as usize;
                    // S-curve with warm shadow lift and slight highlight roll-off
                    let film_curve = |x: f32| -> f32 {
                        let x = x.clamp(0.0, 1.0);
                        ((x * 2.4 + 0.03) / (x * 2.2 + 0.44)).clamp(0.0, 1.0)
                    };
                    data[idx] = film_curve(r * 1.02);
                    data[idx + 1] = film_curve(g * 0.98);
                    data[idx + 2] = film_curve(b * 0.94);
                }
            }
        }
        Self {
            name: "Film Emulation".into(),
            lut: Lut3D {
                title: "Film Emulation (Kodak 2383)".into(),
                size,
                domain_min: [0.0, 0.0, 0.0],
                domain_max: [1.0, 1.0, 1.0],
                data,
            },
            source: LutSource::Builtin,
        }
    }

    /// Create a monochrome "Noir" LUT.
    pub fn noir() -> Self {
        let size = 17u32;
        let n = (size * size * size) as usize;
        let mut data = vec![0.0; n * 3];
        for b_idx in 0..size {
            for g_idx in 0..size {
                for r_idx in 0..size {
                    let r = r_idx as f32 / (size - 1) as f32;
                    let g = g_idx as f32 / (size - 1) as f32;
                    let b = b_idx as f32 / (size - 1) as f32;
                    let idx = ((b_idx * size * size + g_idx * size + r_idx) * 3) as usize;
                    let luma = 0.299 * r + 0.587 * g + 0.114 * b;
                    let noir = (luma - 0.5) * 1.3 + 0.5;
                    let v = noir.clamp(0.0, 1.0);
                    data[idx] = v;
                    data[idx + 1] = v;
                    data[idx + 2] = v;
                }
            }
        }
        Self {
            name: "Noir".into(),
            lut: Lut3D {
                title: "Noir Monochrome".into(),
                size,
                domain_min: [0.0, 0.0, 0.0],
                domain_max: [1.0, 1.0, 1.0],
                data,
            },
            source: LutSource::Builtin,
        }
    }
}

// ── Parsing ────────────────────────────────────────────────────────

impl Lut3D {
    /// Parse a .cube LUT file.
    ///
    /// The Iridas .cube format:
    /// ```text
    /// TITLE "My LUT"
    /// LUT_3D_SIZE 33
    /// DOMAIN_MIN 0.0 0.0 0.0
    /// DOMAIN_MAX 1.0 1.0 1.0
    /// 0.0 0.0 0.0
    /// 0.0 0.0 0.030303
    /// ...
    /// ```
    pub fn from_cube_file(path: &Path) -> Result<Self, String> {
        let contents =
            fs::read_to_string(path).map_err(|e| format!("Failed to read LUT file: {}", e))?;
        Self::parse_cube(&contents)
    }

    /// Parse .cube LUT data from a string.
    pub fn parse_cube(contents: &str) -> Result<Self, String> {
        let mut title = String::new();
        let mut size: Option<u32> = None;
        let mut domain_min = [0.0f32; 3];
        let mut domain_max = [1.0f32; 3];
        let mut data_entries: Vec<f32> = Vec::new();

        for line in contents.lines() {
            let trimmed = line.trim();

            // Skip empty lines and comments
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            // Split into tokens
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.is_empty() {
                continue;
            }

            let keyword = parts[0].to_uppercase();
            match keyword.as_str() {
                "TITLE" => {
                    // Everything after TITLE is the title
                    if parts.len() > 1 {
                        title = parts[1..].join(" ").trim_matches('"').to_string();
                    }
                }
                "LUT_3D_SIZE" => {
                    if parts.len() >= 2 {
                        size = Some(
                            parts[1]
                                .parse()
                                .map_err(|_| format!("Invalid LUT_3D_SIZE: {}", parts[1]))?,
                        );
                    }
                }
                "DOMAIN_MIN" => {
                    if parts.len() >= 4 {
                        for i in 0..3 {
                            domain_min[i] = parts[i + 1].parse::<f32>().map_err(|_| {
                                format!("Invalid DOMAIN_MIN value: {}", parts[i + 1])
                            })?;
                        }
                    }
                }
                "DOMAIN_MAX" => {
                    if parts.len() >= 4 {
                        for i in 0..3 {
                            domain_max[i] = parts[i + 1].parse::<f32>().map_err(|_| {
                                format!("Invalid DOMAIN_MAX value: {}", parts[i + 1])
                            })?;
                        }
                    }
                }
                _ => {
                    // Try to parse as RGB values
                    if parts.len() >= 3 {
                        for &part in &parts[0..3] {
                            match part.parse::<f32>() {
                                Ok(v) => data_entries.push(v),
                                Err(_) => {
                                    // Not a data line, skip
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        let size = size.ok_or("LUT_3D_SIZE not found in .cube file")?;
        let expected = (size * size * size * 3) as usize;
        if data_entries.len() != expected {
            return Err(format!(
                "Expected {} LUT entries for size {}, got {}",
                expected,
                size,
                data_entries.len()
            ));
        }

        Ok(Self {
            title,
            size,
            domain_min,
            domain_max,
            data: data_entries,
        })
    }

    /// Apply the 3D LUT to an RGBA image buffer in-place using trilinear interpolation.
    pub fn apply_to_rgba(&self, rgba: &mut [u8], width: u32, _height: u32) {
        for y in 0.._height {
            for x in 0..width {
                let idx = ((y * width + x) * 4) as usize;
                if idx + 2 >= rgba.len() {
                    continue;
                }

                let r_in = rgba[idx] as f32 / 255.0;
                let g_in = rgba[idx + 1] as f32 / 255.0;
                let b_in = rgba[idx + 2] as f32 / 255.0;

                let (r_out, g_out, b_out) = self.apply_to_rgb(r_in, g_in, b_in);

                rgba[idx] = (r_out * 255.0).round().clamp(0.0, 255.0) as u8;
                rgba[idx + 1] = (g_out * 255.0).round().clamp(0.0, 255.0) as u8;
                rgba[idx + 2] = (b_out * 255.0).round().clamp(0.0, 255.0) as u8;
            }
        }
    }

    /// Apply the 3D LUT to a single RGB triplet using trilinear interpolation.
    ///
    /// Maps input RGB through the domain min/max range, then
    /// trilinearly interpolates between the 8 nearest LUT sample points.
    pub fn apply_to_rgb(&self, r: f32, g: f32, b: f32) -> (f32, f32, f32) {
        let size_f = self.size as f32;

        // Map from [0,1] into LUT index space [0, size-1]
        let map_channel = |val: f32, min: f32, max: f32| -> f32 {
            let range = max - min;
            if range.abs() < 1e-10 {
                return val.clamp(0.0, 1.0) * (size_f - 1.0);
            }
            ((val.clamp(min, max) - min) / range) * (size_f - 1.0)
        };

        let rf = map_channel(r, self.domain_min[0], self.domain_max[0]);
        let gf = map_channel(g, self.domain_min[1], self.domain_max[1]);
        let bf = map_channel(b, self.domain_min[2], self.domain_max[2]);

        // Trilinear interpolation indices
        let r0 = (rf.floor() as u32).min(self.size - 2);
        let g0 = (gf.floor() as u32).min(self.size - 2);
        let b0 = (bf.floor() as u32).min(self.size - 2);
        let r1 = (r0 + 1).min(self.size - 1);
        let g1 = (g0 + 1).min(self.size - 1);
        let b1 = (b0 + 1).min(self.size - 1);

        let rf_frac = rf - r0 as f32;
        let gf_frac = gf - g0 as f32;
        let bf_frac = bf - b0 as f32;

        let sample = |ri: u32, gi: u32, bi: u32, channel: usize| -> f32 {
            let idx = ((bi * self.size * self.size + gi * self.size + ri) * 3) as usize;
            self.data.get(idx + channel).copied().unwrap_or(0.0)
        };

        let lerp = |a: f32, b: f32, t: f32| a + (b - a) * t;

        // Trilinear interpolation across the 8 corners
        let mut result = [0.0f32; 3];
        for (c, item) in result.iter_mut().enumerate() {
            let c000 = sample(r0, g0, b0, c);
            let c100 = sample(r1, g0, b0, c);
            let c010 = sample(r0, g1, b0, c);
            let c110 = sample(r1, g1, b0, c);
            let c001 = sample(r0, g0, b1, c);
            let c101 = sample(r1, g0, b1, c);
            let c011 = sample(r0, g1, b1, c);
            let c111 = sample(r1, g1, b1, c);

            let c00 = lerp(c000, c100, rf_frac);
            let c01 = lerp(c001, c101, rf_frac);
            let c10 = lerp(c010, c110, rf_frac);
            let c11 = lerp(c011, c111, rf_frac);

            let c0 = lerp(c00, c10, gf_frac);
            let c1 = lerp(c01, c11, gf_frac);

            *item = lerp(c0, c1, bf_frac);
        }

        (result[0], result[1], result[2])
    }

    /// Serialize this LUT back to the .cube file format.
    pub fn to_cube_string(&self) -> String {
        let mut out = String::new();
        if !self.title.is_empty() {
            out.push_str(&format!("TITLE \"{}\"\n", self.title));
        }
        out.push_str(&format!("LUT_3D_SIZE {}\n", self.size));
        out.push_str(&format!(
            "DOMAIN_MIN {:.6} {:.6} {:.6}\n",
            self.domain_min[0], self.domain_min[1], self.domain_min[2]
        ));
        out.push_str(&format!(
            "DOMAIN_MAX {:.6} {:.6} {:.6}\n",
            self.domain_max[0], self.domain_max[1], self.domain_max[2]
        ));

        for b in 0..self.size {
            for g in 0..self.size {
                for r in 0..self.size {
                    let idx = ((b * self.size * self.size + g * self.size + r) * 3) as usize;
                    out.push_str(&format!(
                        "{:.6} {:.6} {:.6}\n",
                        self.data[idx],
                        self.data[idx + 1],
                        self.data[idx + 2]
                    ));
                }
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_cube_basic() {
        let cube = r#"TITLE "Test LUT"
LUT_3D_SIZE 2
DOMAIN_MIN 0.0 0.0 0.0
DOMAIN_MAX 1.0 1.0 1.0
0.0 0.0 0.0
0.0 0.0 1.0
0.0 1.0 0.0
0.0 1.0 1.0
1.0 0.0 0.0
1.0 0.0 1.0
1.0 1.0 0.0
1.0 1.0 1.0
"#;
        let lut = Lut3D::parse_cube(cube).unwrap();
        assert_eq!(lut.title, "Test LUT");
        assert_eq!(lut.size, 2);
        assert_eq!(lut.data.len(), 2 * 2 * 2 * 3); // 24 entries
    }

    #[test]
    fn test_identity_lut_preserves_colors() {
        // Create a minimal identity LUT that maps every input to itself
        let mut data = Vec::new();
        for b in 0..3 {
            for g in 0..3 {
                for r in 0..3 {
                    data.push(r as f32 / 2.0);
                    data.push(g as f32 / 2.0);
                    data.push(b as f32 / 2.0);
                }
            }
        }
        let lut = Lut3D {
            title: "Identity".into(),
            size: 3,
            domain_min: [0.0, 0.0, 0.0],
            domain_max: [1.0, 1.0, 1.0],
            data,
        };

        let (r, g, b) = lut.apply_to_rgb(0.5, 0.5, 0.5);
        assert!(
            (r - 0.5).abs() < 0.01,
            "Identity LUT should preserve mid-gray"
        );
        assert!((g - 0.5).abs() < 0.01);
        assert!((b - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_apply_to_rgba() {
        let lut = LutPreset::teal_orange().lut;
        let mut pixels = vec![128u8, 128, 128, 255, 64, 64, 64, 255];
        lut.apply_to_rgba(&mut pixels, 2, 1);
        // Should still be valid RGBA
        for i in (3..pixels.len()).step_by(4) {
            assert_eq!(pixels[i], 255, "Alpha should be unchanged");
        }
    }

    #[test]
    fn test_parse_missing_size() {
        let cube = "TITLE \"No Size\"\n";
        assert!(Lut3D::parse_cube(cube).is_err());
    }

    #[test]
    fn test_builtin_presets_not_empty() {
        for preset in &[
            LutPreset::teal_orange().lut,
            LutPreset::bleach_bypass().lut,
            LutPreset::film_emulation().lut,
            LutPreset::noir().lut,
        ] {
            assert!(!preset.data.is_empty(), "Preset should have data");
            assert_eq!(preset.size, 17);
        }
    }

    #[test]
    fn test_roundtrip_cube_string() {
        let original = LutPreset::teal_orange().lut;
        let cube_str = original.to_cube_string();
        let parsed = Lut3D::parse_cube(&cube_str).unwrap();
        assert_eq!(parsed.size, original.size);
        assert_eq!(parsed.data.len(), original.data.len());
    }

    #[test]
    fn test_comment_lines_ignored() {
        let cube = r#"# This is a comment
TITLE "With Comments"
# Another comment
LUT_3D_SIZE 2
# inline
0.0 0.0 0.0
0.0 0.0 1.0
0.0 1.0 0.0
0.0 1.0 1.0
1.0 0.0 0.0
1.0 0.0 1.0
1.0 1.0 0.0
1.0 1.0 1.0
"#;
        let lut = Lut3D::parse_cube(cube).unwrap();
        assert_eq!(lut.size, 2);
    }
}

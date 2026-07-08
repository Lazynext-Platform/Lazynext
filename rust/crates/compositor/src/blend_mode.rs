//! Compositing blend modes for GPU layer compositing.
//!
//! Defines the 17 Porter-Duff derivative and separable blend modes
//! used for compositing layers in the NLE. Each variant maps to a
//! shader code index consumed by the GPU compositor pipeline.

use serde::{Deserialize, Serialize};

/// A layer compositing blend mode (17 Porter-Duff / separable modes).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BlendMode {
    /// Standard alpha compositing with no blending.
    Normal,
    /// Selects the darker of the base and blend colors per channel.
    Darken,
    /// Multiplies base and blend colors per channel, always producing a darker result.
    Multiply,
    /// Darkens the base color to reflect the blend color by increasing contrast.
    ColorBurn,
    /// Selects the lighter of the base and blend colors per channel.
    Lighten,
    /// Inverts, multiplies, and inverts again, always producing a lighter result.
    Screen,
    /// Adds base and blend values, clamped to 1.0.
    PlusLighter,
    /// Brightens the base color to reflect the blend color by decreasing contrast.
    ColorDodge,
    /// Combines Multiply and Screen based on base color luminance.
    Overlay,
    /// Similar to Overlay but with a softer, more diffused effect.
    SoftLight,
    /// Combines Multiply and Screen based on blend color luminance.
    HardLight,
    /// Subtracts the darker from the lighter color per channel.
    Difference,
    /// Similar to Difference but with lower contrast.
    Exclusion,
    /// Preserves the hue of the blend layer while keeping base luminance and saturation.
    Hue,
    /// Preserves the saturation of the blend layer while keeping base hue and luminance.
    Saturation,
    /// Preserves the hue and saturation of the blend layer while keeping base luminance.
    Color,
    /// Preserves the luminance of the blend layer while keeping base hue and saturation.
    Luminosity,
}

impl BlendMode {
    /// Returns the GPU shader index for this blend mode (0–16).
    pub fn shader_code(self) -> u32 {
        match self {
            Self::Normal => 0,
            Self::Darken => 1,
            Self::Multiply => 2,
            Self::ColorBurn => 3,
            Self::Lighten => 4,
            Self::Screen => 5,
            Self::PlusLighter => 6,
            Self::ColorDodge => 7,
            Self::Overlay => 8,
            Self::SoftLight => 9,
            Self::HardLight => 10,
            Self::Difference => 11,
            Self::Exclusion => 12,
            Self::Hue => 13,
            Self::Saturation => 14,
            Self::Color => 15,
            Self::Luminosity => 16,
        }
    }
}

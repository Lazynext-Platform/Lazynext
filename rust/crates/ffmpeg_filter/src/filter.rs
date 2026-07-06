//! Typed FFMPEG filter definitions with builder-pattern constructors.
//!
//! Each `Filter` wraps an FFMPEG filter name, typed parameters, and
//! input/output pad labels. Pre-built constructors cover common
//! operations: scale, fps, trim, overlay, drawtext, color balance,
//! hue, blur, audio volume/eq, crossfade, and pixel format conversion.

use crate::types::*;

/// A single FFMPEG filter with typed parameters.
#[derive(Debug, Clone)]
pub struct Filter {
    /// Unique label within the filter graph (e.g., `[v0]`).
    pub label: PadLabels,
    /// Filter name (e.g., `scale`, `trim`, `overlay`).
    pub name: String,
    /// Filter parameters as key=value pairs.
    pub params: Vec<(String, String)>,
    /// Input pad labels this filter reads from.
    pub inputs: Vec<String>,
    /// Whether this filter produces a final output.
    pub is_output: bool,
}

impl Filter {
    /// Create a new filter with the given name and pad labels.
    pub fn new(name: impl Into<String>, label: PadLabels) -> Self {
        Self {
            label,
            name: name.into(),
            params: Vec::new(),
            inputs: Vec::new(),
            is_output: false,
        }
    }

    /// Add a key=value parameter.
    pub fn param(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.params.push((key.into(), value.into()));
        self
    }

    /// Mark this filter as producing the final output stream.
    pub fn as_output(mut self) -> Self {
        self.is_output = true;
        self
    }

    /// Build the FFMPEG filter string for this filter.
    pub fn to_filter_string(&self) -> String {
        let params_str = if self.params.is_empty() {
            String::new()
        } else {
            let p: Vec<String> = self
                .params
                .iter()
                .map(|(k, v)| {
                    if k == "_pos" {
                        v.clone()
                    } else {
                        format!("{k}={v}")
                    }
                })
                .collect();
            format!("={}", p.join(":"))
        };
        format!("{}{params_str}", self.name)
    }

    // ── Pre-built filter constructors ──

    /// Scale video filter.
    ///
    /// FFMPEG uses positional args for scale: `scale=W:H:flags`.
    pub fn scale(label: PadLabels, resolution: Resolution, algorithm: ScaleAlgorithm) -> Self {
        let mut f = Self::new("scale", label);
        // Build as positional: scale=1920:1080:flags=lanczos
        // Override params to use positional format
        f.params.push((
            "_pos".into(),
            format!(
                "{}:{}:flags={}",
                resolution.width(),
                resolution.height(),
                algorithm
            ),
        ));
        f
    }

    /// Add positional parameters (single colon-delimited string after `=`).
    pub fn positional_param(mut self, value: impl Into<String>) -> Self {
        self.params.push(("_pos".into(), value.into()));
        self
    }

    /// FPS conversion filter. Changes the framerate of the input stream.
    pub fn fps(label: PadLabels, rate: FrameRate) -> Self {
        Self::new("fps", label).positional_param(rate.to_string())
    }

    /// Trim filter. Extracts a contiguous segment of frames.
    /// Validates that start_frame <= end_frame.
    pub fn trim(label: PadLabels, start_frame: u64, end_frame: u64) -> Self {
        let end = end_frame.max(start_frame);
        if end_frame < start_frame {
            eprintln!(
                "[ffmpeg_filter] trim: end_frame ({}) < start_frame ({}), clamping to start_frame",
                end_frame, start_frame
            );
        }
        Self::new("trim", label)
            .param("start_frame", start_frame.to_string())
            .param("end_frame", end.to_string())
    }

    /// SetPTS filter. Resets presentation timestamps (used after trim).
    pub fn setpts(label: PadLabels, expr: impl Into<String>) -> Self {
        Self::new("setpts", label).positional_param(expr.into())
    }

    /// Overlay filter. Composites one video stream on top of another.
    pub fn overlay(label: PadLabels, x: impl Into<String>, y: impl Into<String>) -> Self {
        Self::new("overlay", label)
            .param("x", x.into())
            .param("y", y.into())
    }

    /// Drawtext filter. Renders text onto the video stream.
    pub fn drawtext(
        label: PadLabels,
        text: impl Into<String>,
        font_size: u32,
        font_color: impl Into<String>,
        x: impl Into<String>,
        y: impl Into<String>,
    ) -> Self {
        Self::new("drawtext", label)
            .param("text", text.into())
            .param("fontsize", font_size.to_string())
            .param("fontcolor", font_color.into())
            .param("x", x.into())
            .param("y", y.into())
    }

    /// Color balance filter. Adjusts red, green, and blue channel levels.
    /// Values are clamped to FFmpeg's valid range of [-1.0, 1.0].
    pub fn colorbalance(label: PadLabels, red: f32, green: f32, blue: f32) -> Self {
        let clamp = |v: f32| v.clamp(-1.0, 1.0);
        let (r, g, b) = (clamp(red), clamp(green), clamp(blue));
        if red != r || green != g || blue != b {
            eprintln!(
                "[ffmpeg_filter] colorbalance: values clamped to [-1.0, 1.0] (in: r={red}, g={green}, b={blue})"
            );
        }
        Self::new("colorbalance", label)
            .param("rs", r.to_string())
            .param("gs", g.to_string())
            .param("bs", b.to_string())
    }

    /// Hue filter. Adjusts hue rotation and saturation.
    pub fn hue(label: PadLabels, hue_degrees: f32, saturation: f32) -> Self {
        Self::new("hue", label)
            .param("h", hue_degrees.to_string())
            .param("s", saturation.to_string())
    }

    /// Box blur filter. Applies a block-averaging blur to luma and chroma.
    pub fn boxblur(label: PadLabels, radius: u32, power: u32) -> Self {
        Self::new("boxblur", label)
            .param("luma_radius", radius.to_string())
            .param("luma_power", power.to_string())
    }

    /// Volume filter. Adjusts audio gain by the given multiplier.
    /// Factor is clamped to [0.0, 10.0] for safety.
    pub fn volume(label: PadLabels, factor: f32) -> Self {
        let factor = factor.clamp(0.0, 10.0);
        Self::new("volume", label).param("volume", factor.to_string())
    }

    /// Audio equalizer filter. Adjusts gain at a specific frequency band.
    /// Validates frequency > 0 and width > 0; gain_db clamped to [-30, 30].
    pub fn equalizer(label: PadLabels, frequency: u32, width: u32, gain_db: f32) -> Self {
        let freq = frequency.max(1);
        let w = width.max(1);
        let g = gain_db.clamp(-30.0, 30.0);
        if frequency == 0 || width == 0 {
            eprintln!(
                "[ffmpeg_filter] equalizer: frequency or width was 0, clamped to 1 (f={}, w={})",
                frequency, width
            );
        }
        Self::new("equalizer", label)
            .param("f", freq.to_string())
            .param("width_type", "h".to_string())
            .param("w", w.to_string())
            .param("g", g.to_string())
    }

    /// Crossfade filter. Transitions between two inputs with a fade effect.
    /// Duration is clamped to a minimum of 0.1 seconds.
    pub fn crossfade(label: PadLabels, duration_seconds: f32) -> Self {
        let dur = duration_seconds.max(0.1);
        Self::new("xfade", label)
            .param("transition", "fade".to_string())
            .param("duration", dur.to_string())
            .param("offset", "0".to_string())
    }

    /// Format filter. Converts the pixel format of the stream.
    pub fn format(label: PadLabels, pix_fmt: PixelFormat) -> Self {
        Self::new("format", label).param("pix_fmts", pix_fmt.to_string())
    }
}

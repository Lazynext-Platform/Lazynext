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
				.map(|(k, v)| if k == "_pos" { v.clone() } else { format!("{k}={v}") })
				.collect();
			format!("={}", p.join(":"))
		};
		format!("{}{params_str}", self.name)
	}

	// ── Pre-built filter constructors ──

	/// Scale video filter (FFMPEG uses positional args: scale=W:H:flags).
	pub fn scale(label: PadLabels, resolution: Resolution, algorithm: ScaleAlgorithm) -> Self {
		let mut f = Self::new("scale", label);
		// Build as positional: scale=1920:1080:flags=lanczos
		// Override params to use positional format
		f.params.push(("_pos".into(), format!("{}:{}:flags={}", resolution.width(), resolution.height(), algorithm)));
		f
	}

	/// Helper: add positional params to a filter (single string after =).
	pub fn positional_param(mut self, value: impl Into<String>) -> Self {
		self.params.push(("_pos".into(), value.into()));
		self
	}

	/// FPS conversion filter.
	pub fn fps(label: PadLabels, rate: FrameRate) -> Self {
		Self::new("fps", label).positional_param(rate.to_string())
	}

	/// Trim filter — extract a segment.
	pub fn trim(label: PadLabels, start_frame: u64, end_frame: u64) -> Self {
		Self::new("trim", label)
			.param("start_frame", start_frame.to_string())
			.param("end_frame", end_frame.to_string())
	}

	/// SetPTS — reset presentation timestamps after trim.
	pub fn setpts(label: PadLabels, expr: impl Into<String>) -> Self {
		Self::new("setpts", label).positional_param(expr.into())
	}

	/// Overlay one video on top of another.
	pub fn overlay(label: PadLabels, x: impl Into<String>, y: impl Into<String>) -> Self {
		Self::new("overlay", label)
			.param("x", x.into())
			.param("y", y.into())
	}

	/// Draw text on video.
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

	/// Color balance adjustment.
	pub fn colorbalance(
		label: PadLabels,
		red: f32,
		green: f32,
		blue: f32,
	) -> Self {
		Self::new("colorbalance", label)
			.param("rs", red.to_string())
			.param("gs", green.to_string())
			.param("bs", blue.to_string())
	}

	/// Hue/saturation adjustment.
	pub fn hue(label: PadLabels, hue_degrees: f32, saturation: f32) -> Self {
		Self::new("hue", label)
			.param("h", hue_degrees.to_string())
			.param("s", saturation.to_string())
	}

	/// Box blur.
	pub fn boxblur(label: PadLabels, radius: u32, power: u32) -> Self {
		Self::new("boxblur", label)
			.param("luma_radius", radius.to_string())
			.param("luma_power", power.to_string())
	}

	/// Audio volume adjustment.
	pub fn volume(label: PadLabels, factor: f32) -> Self {
		Self::new("volume", label).param("volume", factor.to_string())
	}

	/// Audio equalizer.
	pub fn equalizer(
		label: PadLabels,
		frequency: u32,
		width: u32,
		gain_db: f32,
	) -> Self {
		Self::new("equalizer", label)
			.param("f", frequency.to_string())
			.param("width_type", "h".to_string())
			.param("w", width.to_string())
			.param("g", gain_db.to_string())
	}

	/// Crossfade between two inputs.
	pub fn crossfade(label: PadLabels, duration_seconds: f32) -> Self {
		Self::new("xfade", label)
			.param("transition", "fade".to_string())
			.param("duration", duration_seconds.to_string())
			.param("offset", "0".to_string())
	}

	/// Format conversion (pixel format).
	pub fn format(label: PadLabels, pix_fmt: PixelFormat) -> Self {
		Self::new("format", label).param("pix_fmts", pix_fmt.to_string())
	}
}

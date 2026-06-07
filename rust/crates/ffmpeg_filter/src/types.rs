use serde::{Deserialize, Serialize};

/// Input/output pad labels for filter connections.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PadLabels {
	pub input: String,
	pub output: String,
}

/// A single input stream reference for a filter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputSpec {
	pub stream_index: usize,
	pub label: String,
}

/// Standard video resolution presets.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Resolution {
	/// 1920x1080
	HD1080,
	/// 3840x2160
	UHD4K,
	/// 7680x4320
	UHD8K,
	/// 1280x720
	HD720,
	/// Custom width x height
	Custom(u32, u32),
}

impl Resolution {
	pub fn width(&self) -> u32 {
		match self {
			Resolution::HD1080 => 1920,
			Resolution::UHD4K => 3840,
			Resolution::UHD8K => 7680,
			Resolution::HD720 => 1280,
			Resolution::Custom(w, _) => *w,
		}
	}

	pub fn height(&self) -> u32 {
		match self {
			Resolution::HD1080 => 1080,
			Resolution::UHD4K => 2160,
			Resolution::UHD8K => 4320,
			Resolution::HD720 => 720,
			Resolution::Custom(_, h) => *h,
		}
	}
}

impl std::fmt::Display for Resolution {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "{}x{}", self.width(), self.height())
	}
}

/// Standard frame rates.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum FrameRate {
	Fps24,
	Fps30,
	Fps60,
	Fps120,
	Custom(u32),
}

impl std::fmt::Display for FrameRate {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			FrameRate::Fps24 => write!(f, "24"),
			FrameRate::Fps30 => write!(f, "30"),
			FrameRate::Fps60 => write!(f, "60"),
			FrameRate::Fps120 => write!(f, "120"),
			FrameRate::Custom(n) => write!(f, "{n}"),
		}
	}
}

/// Pixel format.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PixelFormat {
	Yuv420p,
	Yuv422p,
	Yuv444p,
	Rgb24,
	Rgba,
	Gray,
}

impl std::fmt::Display for PixelFormat {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		let s = match self {
			PixelFormat::Yuv420p => "yuv420p",
			PixelFormat::Yuv422p => "yuv422p",
			PixelFormat::Yuv444p => "yuv444p",
			PixelFormat::Rgb24 => "rgb24",
			PixelFormat::Rgba => "rgba",
			PixelFormat::Gray => "gray",
		};
		write!(f, "{s}")
	}
}

/// Audio sample format.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SampleFormat {
	S16,
	S32,
	Flt,
	Dbl,
}

impl std::fmt::Display for SampleFormat {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		let s = match self {
			SampleFormat::S16 => "s16",
			SampleFormat::S32 => "s32",
			SampleFormat::Flt => "flt",
			SampleFormat::Dbl => "dbl",
		};
		write!(f, "{s}")
	}
}

/// Audio sample rate in Hz.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SampleRate {
	Hz44100,
	Hz48000,
	Hz96000,
}

impl std::fmt::Display for SampleRate {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			SampleRate::Hz44100 => write!(f, "44100"),
			SampleRate::Hz48000 => write!(f, "48000"),
			SampleRate::Hz96000 => write!(f, "96000"),
		}
	}
}

/// Scaling algorithm for video resize.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScaleAlgorithm {
	Bilinear,
	Bicubic,
	Lanczos,
	Spline,
}

impl std::fmt::Display for ScaleAlgorithm {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		let s = match self {
			ScaleAlgorithm::Bilinear => "bilinear",
			ScaleAlgorithm::Bicubic => "bicubic",
			ScaleAlgorithm::Lanczos => "lanczos",
			ScaleAlgorithm::Spline => "spline",
		};
		write!(f, "{s}")
	}
}

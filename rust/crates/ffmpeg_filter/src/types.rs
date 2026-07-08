//! Shared types for the FFMPEG filter system.
//!
//! Defines pad labels, input stream specs, resolution presets
//! (HD to 8K), frame rates, pixel formats, sample formats/rates,
//! and scaling algorithms — all serializable for WASM bridge use.

use serde::{Deserialize, Serialize};

/// Input/output pad labels for filter connections.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PadLabels {
    /// Label for the input pad.
    pub input: String,
    /// Label for the output pad.
    pub output: String,
}

/// A single input stream reference for a filter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputSpec {
    /// Index of the source stream.
    pub stream_index: usize,
    /// Label identifying this input.
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
    /// Returns the width in pixels.
    pub fn width(&self) -> u32 {
        match self {
            Resolution::HD1080 => 1920,
            Resolution::UHD4K => 3840,
            Resolution::UHD8K => 7680,
            Resolution::HD720 => 1280,
            Resolution::Custom(w, _) => *w,
        }
    }

    /// Returns the height in pixels.
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
    // Formats the resolution as "widthxheight".
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}x{}", self.width(), self.height())
    }
}

/// Standard frame rates.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum FrameRate {
    /// 24 frames per second.
    Fps24,
    /// 30 frames per second.
    Fps30,
    /// 60 frames per second.
    Fps60,
    /// 120 frames per second.
    Fps120,
    /// Custom frame rate.
    Custom(u32),
}

impl std::fmt::Display for FrameRate {
    // Formats the frame rate as its numeric value.
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
    /// 4:2:0 subsampled YUV.
    Yuv420p,
    /// 4:2:2 subsampled YUV.
    Yuv422p,
    /// 4:4:4 full-sampled YUV.
    Yuv444p,
    /// 24-bit RGB.
    Rgb24,
    /// 32-bit RGBA.
    Rgba,
    /// 8-bit grayscale.
    Gray,
}

impl std::fmt::Display for PixelFormat {
    // Formats the pixel format as its FFMPEG name.
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
    /// Signed 16-bit integer.
    S16,
    /// Signed 32-bit integer.
    S32,
    /// 32-bit floating point.
    Flt,
    /// 64-bit double precision.
    Dbl,
}

impl std::fmt::Display for SampleFormat {
    // Formats the sample format as its FFMPEG name.
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
    /// 44.1 kHz (CD quality).
    Hz44100,
    /// 48 kHz (professional video).
    Hz48000,
    /// 96 kHz (high-resolution).
    Hz96000,
}

impl std::fmt::Display for SampleRate {
    // Formats the sample rate as its value in Hz.
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
    /// Bilinear interpolation (fast, lower quality).
    Bilinear,
    /// Bicubic interpolation (balanced speed and quality).
    Bicubic,
    /// Lanczos interpolation (high quality with slight sharpening).
    Lanczos,
    /// Spline interpolation (smooth, high quality).
    Spline,
}

impl std::fmt::Display for ScaleAlgorithm {
    // Formats the scaling algorithm as its FFMPEG name.
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

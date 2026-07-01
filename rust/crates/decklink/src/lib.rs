//! Blackmagic DeckLink SDI/HDMI I/O for broadcast monitoring.
//!
//! Provides frame-accurate video output to professional SDI monitors,
//! decks, and switchers via Blackmagic Design capture/output cards.
//!
//! # Features
//! - SDI output at up to 12G-SDI (4K 60p)
//! - HDMI output for consumer monitoring
//! - Key/Fill output for downstream keyers
//! - Reference input (genlock/tri-level) for broadcast sync
//!
//! # Feature flags
//! - `decklink-sdk`: enables the native C++ DeckLink SDK via `cxx` bridge
//!   (requires Blackmagic Desktop Video SDK installed on the build machine)
//!
//! The pure-Rust fallback provides a simulated device for development
//! and CI without requiring the Blackmagic SDK.

use std::fmt;

/// SDI video mode (resolution + framerate).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SdiVideoMode {
    /// 1080i 50 Hz (interlaced)
    HD1080i50,
    /// 1080i 59.94 Hz (interlaced)
    HD1080i5994,
    /// 1080p 23.976 Hz
    HD1080p2398,
    /// 1080p 24 Hz
    HD1080p24,
    /// 1080p 25 Hz
    HD1080p25,
    /// 1080p 29.97 Hz
    HD1080p2997,
    /// 1080p 30 Hz
    HD1080p30,
    /// 720p 50 Hz
    HD720p50,
    /// 720p 59.94 Hz
    HD720p5994,
    /// 720p 60 Hz
    HD720p60,
    /// UHD 4K 23.976 Hz
    UHD4Kp2398,
    /// UHD 4K 24 Hz
    UHD4Kp24,
    /// UHD 4K 25 Hz
    UHD4Kp25,
    /// UHD 4K 29.97 Hz
    UHD4Kp2997,
    /// UHD 4K 30 Hz
    UHD4Kp30,
    /// UHD 4K 50 Hz
    UHD4Kp50,
    /// UHD 4K 59.94 Hz
    UHD4Kp5994,
    /// UHD 4K 60 Hz
    UHD4Kp60,
}

impl SdiVideoMode {
    pub fn width(&self) -> u32 {
        match self {
            Self::HD720p50 | Self::HD720p5994 | Self::HD720p60 => 1280,
            Self::HD1080i50
            | Self::HD1080i5994
            | Self::HD1080p2398
            | Self::HD1080p24
            | Self::HD1080p25
            | Self::HD1080p2997
            | Self::HD1080p30 => 1920,
            _ => 3840,
        }
    }

    pub fn height(&self) -> u32 {
        match self {
            Self::HD720p50 | Self::HD720p5994 | Self::HD720p60 => 720,
            Self::HD1080i50 | Self::HD1080i5994 => 1080, // interlaced
            _ if self.width() == 1920 => 1080,
            _ => 2160,
        }
    }

    pub fn framerate(&self) -> f64 {
        match self {
            Self::HD1080p2398 | Self::UHD4Kp2398 => 23.976,
            Self::HD1080p24 | Self::UHD4Kp24 => 24.0,
            Self::HD1080p25 | Self::UHD4Kp25 => 25.0,
            Self::HD1080p2997 | Self::UHD4Kp2997 => 29.97,
            Self::HD1080p30 | Self::UHD4Kp30 => 30.0,
            Self::HD1080i50 => 25.0,
            Self::HD1080i5994 => 29.97,
            Self::HD720p50 | Self::UHD4Kp50 => 50.0,
            Self::HD720p5994 | Self::UHD4Kp5994 => 59.94,
            Self::HD720p60 | Self::UHD4Kp60 => 60.0,
        }
    }

    pub fn is_interlaced(&self) -> bool {
        matches!(self, Self::HD1080i50 | Self::HD1080i5994)
    }
}

/// DeckLink output pixel format.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PixelFormat {
    /// 8-bit YUV 4:2:2 (standard SDI)
    Yuv8Bit,
    /// 10-bit YUV 4:2:2 (broadcast SDI)
    Yuv10Bit,
    /// 8-bit BGRA (HDMI/compositor output)
    Bgra8Bit,
    /// 10-bit RGB 4:4:4 (high-end monitoring)
    Rgb10Bit,
}

impl PixelFormat {
    pub fn bytes_per_pixel(&self) -> u32 {
        match self {
            PixelFormat::Yuv8Bit => 2,
            PixelFormat::Yuv10Bit => 3, // packed
            PixelFormat::Bgra8Bit => 4,
            PixelFormat::Rgb10Bit => 4,
        }
    }
}

/// The DeckLink I/O engine.
///
/// In production (with `decklink-sdk` feature), this wraps a real
/// `IDeckLinkOutput` instance via the Blackmagic C++ SDK.
#[cfg(not(feature = "decklink-sdk"))]
pub struct DecklinkEngine {
    mode: SdiVideoMode,
    pixel_format: PixelFormat,
    frame_counter: u64,
    is_connected: bool,
}

#[cfg(not(feature = "decklink-sdk"))]
impl DecklinkEngine {
    pub fn new() -> Self {
        println!("[DeckLink] Initialized in software simulation mode (no SDK).");
        Self {
            mode: SdiVideoMode::HD1080p24,
            pixel_format: PixelFormat::Bgra8Bit,
            frame_counter: 0,
            is_connected: false,
        }
    }

    /// Detect connected DeckLink devices.
    /// Returns the number of devices found.
    /// Detect connected DeckLink devices.
    ///
    /// Returns the number of devices found. In production (with the
    /// `decklink-sdk` feature) this iterates `IDeckLinkIterator`.
    pub fn detect_devices(&self) -> usize {
        println!("[DeckLink] Scanning for devices... (simulated: 0 devices found)");
        0
    }

    /// Configure the output mode and pixel format.
    pub fn configure(&mut self, mode: SdiVideoMode, format: PixelFormat) {
        println!(
            "[DeckLink] Configured: {:?} @ {:.2}fps, {:?}",
            mode,
            mode.framerate(),
            format
        );
        self.mode = mode;
        self.pixel_format = format;
    }

    /// Start video output.
    pub fn start_output(&mut self) -> Result<(), String> {
        println!(
            "[DeckLink] Starting SDI output: {}x{}",
            self.mode.width(),
            self.mode.height()
        );
        self.is_connected = true;
        Ok(())
    }

    /// Stop video output.
    pub fn stop_output(&mut self) {
        println!("[DeckLink] Stopping SDI output.");
        self.is_connected = false;
    }

    /// Schedule a frame for SDI output.
    ///
    /// The buffer must be in the configured pixel format and match
    /// the configured resolution. Frames are queued and output at
    /// the configured framerate.
    pub fn pump_frame_to_sdi(
        &mut self,
        buffer: &[u8],
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        if !self.is_connected {
            return Err("DeckLink output not started".to_string());
        }

        let expected_size = (width * height * self.pixel_format.bytes_per_pixel()) as usize;
        if buffer.len() < expected_size {
            return Err(format!(
                "Buffer too small: expected {} bytes, got {}",
                expected_size,
                buffer.len()
            ));
        }

        self.frame_counter += 1;
        if self.frame_counter % 60 == 1 {
            println!(
                "[DeckLink] Frame {} — {}x{} SDI output active",
                self.frame_counter, width, height
            );
        }
        Ok(())
    }

    /// Get the total number of frames output.
    pub fn frame_count(&self) -> u64 {
        self.frame_counter
    }

    /// Get the timecode of the last output frame, in frames.
    pub fn last_timecode_frame(&self) -> u32 {
        (self.frame_counter % u64::from(u32::MAX)) as u32
    }
}

#[cfg(not(feature = "decklink-sdk"))]
impl Default for DecklinkEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Debug for DecklinkEngine {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("DecklinkEngine")
            .field("mode", &self.mode)
            .field("frame_counter", &self.frame_counter)
            .field("is_connected", &self.is_connected)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sdi_mode_dimensions() {
        assert_eq!(SdiVideoMode::HD1080p24.width(), 1920);
        assert_eq!(SdiVideoMode::HD1080p24.height(), 1080);
        assert_eq!(SdiVideoMode::UHD4Kp60.width(), 3840);
        assert_eq!(SdiVideoMode::UHD4Kp60.height(), 2160);
    }

    #[test]
    fn test_sdi_mode_framerate() {
        assert!((SdiVideoMode::HD1080p2398.framerate() - 23.976).abs() < 0.001);
        assert_eq!(SdiVideoMode::HD1080p24.framerate(), 24.0);
        assert_eq!(SdiVideoMode::UHD4Kp60.framerate(), 60.0);
    }

    #[test]
    fn test_decklink_engine_lifecycle() {
        let mut engine = DecklinkEngine::new();
        assert_eq!(engine.detect_devices(), 0);

        engine.configure(SdiVideoMode::HD1080p24, PixelFormat::Bgra8Bit);
        assert!(engine.start_output().is_ok());

        // Pump a test frame
        let frame = vec![0u8; 1920 * 1080 * 4];
        assert!(engine.pump_frame_to_sdi(&frame, 1920, 1080).is_ok());

        engine.stop_output();
        // Should fail after stop
        assert!(engine.pump_frame_to_sdi(&frame, 1920, 1080).is_err());
    }

    #[test]
    fn test_pixel_format_bytes_per_pixel() {
        assert_eq!(PixelFormat::Bgra8Bit.bytes_per_pixel(), 4);
        assert_eq!(PixelFormat::Yuv8Bit.bytes_per_pixel(), 2);
    }
}

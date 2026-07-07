//! Theme system — dark/light/system mode for the GPUI desktop app.
//!
//! Reads `LAZYNEXT_THEME` env var (`"dark"`, `"light"`, `"system"`).
//! When `"system"`, detects the OS preference via window/appearance
//! queries.  Exports `ThemeMode`, `Theme`, and colour constants.

use gpui::Rgba as GpuiRgba;
use std::env;

#[derive(Clone, Copy, PartialEq, Debug)]
pub enum ThemeMode {
    Dark,
    Light,
}

impl ThemeMode {
    pub fn from_env() -> Self {
        match env::var("LAZYNEXT_THEME").as_deref() {
            Ok("light") => ThemeMode::Light,
            Ok("dark") => ThemeMode::Dark,
            _ => {
                // Fallback: detect OS appearance (macOS only for now)
                #[cfg(target_os = "macos")]
                {
                    let output = std::process::Command::new("defaults")
                        .args(["read", "-g", "AppleInterfaceStyle"])
                        .output();
                    match output {
                        Ok(o) if String::from_utf8_lossy(&o.stdout).trim() == "Dark" => {
                            ThemeMode::Dark
                        }
                        _ => ThemeMode::Light,
                    }
                }
                #[cfg(not(target_os = "macos"))]
                ThemeMode::Dark
            }
        }
    }
}

#[derive(Clone)]
#[allow(dead_code)]
pub struct Theme {
    pub bg_main: GpuiRgba,
    pub bg_panel: GpuiRgba,
    pub bg_hover: GpuiRgba,
    pub accent_primary: GpuiRgba,
    pub accent_secondary: GpuiRgba,
    pub text_primary: GpuiRgba,
    pub text_secondary: GpuiRgba,
    pub text_muted: GpuiRgba,
    pub border: GpuiRgba,
    #[allow(dead_code)]
    pub playhead: GpuiRgba,
    #[allow(dead_code)]
    pub timeline_bg: GpuiRgba,
    pub mode: ThemeMode,
}

impl Theme {
    pub fn dark() -> Self {
        Theme {
            bg_main: rgb(0x05, 0x05, 0x05),
            bg_panel: rgb(0x12, 0x12, 0x12),
            bg_hover: rgb(0x1e, 0x1e, 0x1e),
            accent_primary: rgb(0x00, 0xd4, 0xdf),
            accent_secondary: rgb(0x00, 0x33, 0xff),
            text_primary: rgb(0xfa, 0xfa, 0xfa),
            text_secondary: rgb(0xa1, 0xa1, 0xaa),
            text_muted: rgb(0x52, 0x52, 0x5b),
            border: rgb(0x2a, 0x2a, 0x2a),
            playhead: rgb(0xff, 0x00, 0x44),
            timeline_bg: rgb(0x0a, 0x0a, 0x0a),
            mode: ThemeMode::Dark,
        }
    }

    pub fn light() -> Self {
        Theme {
            bg_main: rgb(0xfc, 0xfc, 0xfc),
            bg_panel: rgb(0xf5, 0xf5, 0xf5),
            bg_hover: rgb(0xe4, 0xe4, 0xe7),
            accent_primary: rgb(0x00, 0xd4, 0xdf),
            accent_secondary: rgb(0x00, 0x33, 0xff),
            text_primary: rgb(0x09, 0x09, 0x0b),
            text_secondary: rgb(0x3f, 0x3f, 0x46),
            text_muted: rgb(0x71, 0x71, 0x7a),
            border: rgb(0xe4, 0xe4, 0xe7),
            playhead: rgb(0xff, 0x00, 0x44),
            timeline_bg: rgb(0xf5, 0xf5, 0xf5),
            mode: ThemeMode::Light,
        }
    }

    pub fn auto() -> Self {
        match ThemeMode::from_env() {
            ThemeMode::Dark => Theme::dark(),
            ThemeMode::Light => Theme::light(),
        }
    }
}

fn rgb(r: u8, g: u8, b: u8) -> GpuiRgba {
    GpuiRgba {
        r: r as f32 / 255.0,
        g: g as f32 / 255.0,
        b: b as f32 / 255.0,
        a: 1.0,
    }
}

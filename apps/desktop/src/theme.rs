//! Theme system — dark/light/system mode for the GPUI desktop app.
//!
//! Reads `LAZYNEXT_THEME` env var (`"dark"`, `"light"`, `"system"`).
//! When `"system"`, detects the OS preference via window/appearance
//! queries.  Exports `ThemeMode`, `Theme`, and colour constants.

use gpui::Rgba as GpuiRgba;
use std::env;

/// The active colour scheme: dark or light.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum ThemeMode {
    /// Dark colour scheme.
    Dark,
    /// Light colour scheme.
    Light,
    /// System colour scheme.
    System,
}

impl ThemeMode {
    /// Resolve the theme mode from `LAZYNEXT_THEME`, falling back to OS appearance.
    pub fn from_env() -> Self {
        match env::var("LAZYNEXT_THEME").as_deref() {
            Ok("light") => ThemeMode::Light,
            Ok("dark") => ThemeMode::Dark,
            Ok("system") => ThemeMode::System,
            _ => ThemeMode::System,
        }
    }
}

/// A resolved set of UI colours plus the active theme mode.
#[derive(Clone)]
#[allow(dead_code)]
pub struct Theme {
    /// Main window background colour.
    pub bg_main: GpuiRgba,
    /// Panel background colour.
    pub bg_panel: GpuiRgba,
    /// Background colour for hovered elements.
    pub bg_hover: GpuiRgba,
    /// Primary accent colour.
    pub accent_primary: GpuiRgba,
    /// Secondary accent colour.
    pub accent_secondary: GpuiRgba,
    /// Primary text colour.
    pub text_primary: GpuiRgba,
    /// Secondary text colour.
    pub text_secondary: GpuiRgba,
    /// Muted text colour.
    pub text_muted: GpuiRgba,
    /// Border colour.
    pub border: GpuiRgba,
    /// Timeline playhead colour.
    #[allow(dead_code)]
    pub playhead: GpuiRgba,
    /// Timeline background colour.
    #[allow(dead_code)]
    pub timeline_bg: GpuiRgba,
    /// The active theme mode.
    pub mode: ThemeMode,
}

impl Theme {
    /// Build the default dark theme palette.
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

    /// Build the default light theme palette.
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

    /// Build a theme by resolving the mode from the environment/OS.
    pub fn auto() -> Self {
        // As we don't have appearance here, we default system to Dark.
        // It's better to use from_appearance.
        match ThemeMode::from_env() {
            ThemeMode::Dark => Theme::dark(),
            ThemeMode::Light => Theme::light(),
            ThemeMode::System => Theme::dark(),
        }
    }

    /// Build a theme from GPUI's WindowAppearance, respecting LAZYNEXT_THEME override.
    pub fn from_appearance(appearance: gpui::WindowAppearance) -> Self {
        let mut theme = match env::var("LAZYNEXT_THEME").as_deref() {
            Ok("light") => Theme::light(),
            Ok("dark") => Theme::dark(),
            _ => match appearance {
                gpui::WindowAppearance::Dark | gpui::WindowAppearance::VibrantDark => Theme::dark(),
                gpui::WindowAppearance::Light | gpui::WindowAppearance::VibrantLight => Theme::light(),
            }
        };

        // Explicitly override the mode string if it's set to "system" (so the UI prints "System")
        if let Ok("system") | Err(_) = env::var("LAZYNEXT_THEME").as_deref() {
            theme.mode = ThemeMode::System;
        }

        theme
    }
}

// Construct an opaque GPUI colour from 8-bit RGB components.
fn rgb(r: u8, g: u8, b: u8) -> GpuiRgba {
    GpuiRgba {
        r: r as f32 / 255.0,
        g: g as f32 / 255.0,
        b: b as f32 / 255.0,
        a: 1.0,
    }
}

//! Lazynext Export — multi-format encoding pipeline via FFMPEG.
//!
//! The export crate drives the final video output from the compositor's
//! rendered frames through FFMPEG to produce delivery-ready files. It
//! supports six professional formats with type-safe encoder configuration.
//!
//! # Formats
//!
//! | Format | Container | Codec | Use Case |
//! |--------|-----------|-------|----------|
//! | MP4 | `.mp4` | H.264 / H.265 | Web, social media |
//! | ProRes | `.mov` | ProRes 422 HQ | Professional post |
//! | DCP | `.mxf` | JPEG 2000 | Cinema distribution |
//! | AAF | `.aaf` | — | Avid interchange |
//! | MOV | `.mov` | H.264 / ProRes | QuickTime delivery |
//! | GIF | `.gif` | — | Social media / previews |
//!
//! # Pipeline
//!
//! ```text
//! Compositor Frames → ExportPipeline → Encoder → FFMPEG Process → Output File
//!                        ├─ Color conversion (RGBA → YUV)
//!                        ├─ Bitrate control (CBR / VBR / CRF)
//!                        └─ Format-specific muxing
//! ```
//!
//! The `ExportPipeline` struct handles the full encode lifecycle. The
//! `ExportEncoder` wraps FFMPEG's libx264/libx265 with safe Rust bindings.
//! The `ExportConfig` struct provides type-safe configuration for all
//! format-specific parameters.

pub mod aaf;
pub mod dcp;

pub mod encoder;
pub mod mp4;
pub mod pipeline;
pub mod prores;

pub use encoder::{ExportConfig, ExportEncoder, ExportFormat};
pub use pipeline::{ExportPipeline, build_export_command};

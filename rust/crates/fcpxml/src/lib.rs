//! FCPXML Exporter for DaVinci Resolve Studio interoperability.
//!
//! This crate exports Lazynext timelines to FCPXML format, which can be
//! imported into DaVinci Resolve Studio for professional color grading,
//! VFX, and final mastering.
//!
//! # Features
//!
//! - Export timeline structure with video/audio tracks
//! - Media linking with relative paths (single folder workflow)
//! - Basic clip positioning, duration, and transform data
//! - Audio clip synchronization
//! - Skip complex effects (to be applied in Resolve)
//!
//! # FCPXML Version
//!
//! Supports FCPXML 1.8 compatible with DaVinci Resolve 18+

pub mod serializer;
pub mod types;

pub use serializer::FcpxmlExporter;
pub use types::{FcpxmlConfig, MediaLinkMode};

/// Export a timeline to FCPXML format for DaVinci Resolve
///
/// # Arguments
/// * `project` - The project containing the timeline
/// * `output_path` - Path to write the FCPXML file
/// * `media_folder` - Path to the media folder (video + audio together)
/// * `config` - Export configuration
///
/// # Returns
/// Result indicating success or error
pub fn export_to_fcpxml(
    project: &editor_core::models::Project,
    output_path: &str,
    media_folder: &str,
    config: FcpxmlConfig,
) -> anyhow::Result<()> {
    let exporter = FcpxmlExporter::new(config);
    exporter.export(project, output_path, media_folder)
}

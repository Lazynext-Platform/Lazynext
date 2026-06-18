use crate::encoder::ExportFormat;

/// Re-export for discoverability.
pub use crate::encoder::ExportEncoder;
pub use crate::pipeline::{ExportPipeline, build_export_command};

/// Convenience: MP4 export with standard settings.
pub fn mp4_config(
    output_path: &str,
    width: u32,
    height: u32,
    framerate: u32,
) -> crate::encoder::ExportConfig {
    crate::encoder::ExportConfig {
        format: ExportFormat::Mp4,
        width,
        height,
        framerate,
        bitrate_kbps: 8000,
        output_path: output_path.to_string(),
    }
}

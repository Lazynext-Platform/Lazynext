use crate::encoder::{ExportConfig, ExportFormat};

/// Convenience: ProRes 422 HQ export.
pub fn prores_config(output_path: &str, width: u32, height: u32, framerate: u32) -> ExportConfig {
    ExportConfig {
        format: ExportFormat::ProRes,
        width,
        height,
        framerate,
        bitrate_kbps: 0, // ProRes uses constant quality
        output_path: output_path.to_string(),
    }
}

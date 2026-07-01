//! Export pipeline for rendering compositor frames and piping them to ffmpeg.

use crate::encoder::{ExportConfig, ExportEncoder};
use anyhow::Result;

/// An export pipeline that renders compositor frames and pipes them to ffmpeg.
pub struct ExportPipeline {
    config: ExportConfig,
}

impl ExportPipeline {
    /// Create a new export pipeline with the given configuration.
    pub fn new(config: ExportConfig) -> Self {
        Self { config }
    }

    /// Run the export pipeline.
    ///
    /// Renders exactly `total_frames` frames by invoking `render_frame(i)` for
    /// each frame index and piping the returned RGBA bytes to an ffmpeg child
    /// process's stdin. The frames come from the GPU compositor
    /// (rust/crates/compositor/) via frame readback; this pipeline handles only
    /// the encoding side.
    ///
    /// `total_frames` is caller-controlled (derived from the timeline duration)
    /// so that exports match the project length exactly rather than a fixed
    /// default.
    pub async fn export<F, Fut>(&self, total_frames: u32, mut render_frame: F) -> Result<()>
    where
        F: FnMut(u32) -> Fut,
        Fut: std::future::Future<Output = Vec<u8>>,
    {
        use std::process::Stdio;
        use tokio::io::AsyncWriteExt;

        let (cmd, args) = ExportEncoder::pipe_command(&self.config);

        let mut child = tokio::process::Command::new(&cmd)
            .args(&args)
            .stdin(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| anyhow::anyhow!("Failed to spawn {}: {}", cmd, e))?;

        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| anyhow::anyhow!("Failed to open stdin"))?;

        let frame_size = (self.config.width * self.config.height * 4) as usize;

        for frame_idx in 0..total_frames {
            let rgba = render_frame(frame_idx).await;

            if rgba.len() != frame_size {
                return Err(anyhow::anyhow!(
                    "Frame {} has wrong size: expected {} bytes, got {}",
                    frame_idx,
                    frame_size,
                    rgba.len()
                ));
            }

            stdin
                .write_all(&rgba)
                .await
                .map_err(|e| anyhow::anyhow!("Failed to write frame {}: {}", frame_idx, e))?;
        }

        // Close stdin to signal EOF to ffmpeg
        let _ = stdin;

        let output = child
            .wait_with_output()
            .await
            .map_err(|e| anyhow::anyhow!("ffmpeg wait error: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("ffmpeg exited with error: {}", stderr));
        }

        println!("✅ Export complete: {}", self.config.output_path);
        Ok(())
    }
}

/// Build an ffmpeg command string from an export configuration for shell invocation.
pub fn build_export_command(config: &ExportConfig) -> String {
    let args = ExportEncoder::build_ffmpeg_args(config);
    format!("ffmpeg {}", args.join(" "))
}

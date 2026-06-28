use crate::encoder::{ExportConfig, ExportEncoder};
use anyhow::Result;

/// An export pipeline that renders compositor frames and pipes them to ffmpeg.
pub struct ExportPipeline {
    config: ExportConfig,
}

impl ExportPipeline {
    pub fn new(config: ExportConfig) -> Self {
        Self { config }
    }

    /// Run the export pipeline.
    ///
    /// In production, this spawns an ffmpeg child process and writes
    /// compositor-rendered frames to its stdin. The frames come from the
    /// GPU compositor (rust/crates/compositor/) via frame readback.
    ///
    /// Currently the compositor frame rendering is handled by the caller;
    /// this pipeline handles the encoding side.
    pub async fn export<F, Fut>(&self, mut render_frame: F) -> Result<()>
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

        let total_frames = self.config.framerate * 10; // default 10-second export
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

/// Synchronous convenience: build ffmpeg command for shell invocation.
pub fn build_export_command(config: &ExportConfig) -> String {
    let args = ExportEncoder::build_ffmpeg_args(config);
    format!("ffmpeg {}", args.join(" "))
}

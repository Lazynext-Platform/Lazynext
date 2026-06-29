use crate::engine::AssetLoader;
use std::future::Future;
use std::io::Read;
use std::pin::Pin;
use std::process::{Command, Stdio};

/// An `AssetLoader` that fetches video frames by calling the `ffmpeg` CLI binary.
pub struct CliFfmpegLoader {
    width: u32,
    height: u32,
}

impl CliFfmpegLoader {
    pub fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }
}

impl AssetLoader for CliFfmpegLoader {
    fn load_frame(
        &self,
        media_id: &str,
        frame_idx: u32,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<u8>, String>> + Send>> {
        let media_path = media_id.to_string();
        let width = self.width;
        let height = self.height;

        Box::pin(async move {
            let timestamp_sec = (frame_idx as f64) / 24.0;
            let timestamp_str = format!("{:.3}", timestamp_sec);

            let result = tokio::task::spawn_blocking(move || {
                let mut child = Command::new("ffmpeg")
                    .args([
                        "-ss",
                        &timestamp_str,
                        "-i",
                        &media_path,
                        "-frames:v",
                        "1",
                        "-f",
                        "rawvideo",
                        "-pix_fmt",
                        "rgba",
                        "-s",
                        &format!("{}x{}", width, height),
                        "-loglevel",
                        "error",
                        "-",
                    ])
                    .stdout(Stdio::piped())
                    .stderr(Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;

                let mut stdout = child.stdout.take().expect("Failed to open stdout");
                let expected_size = (width * height * 4) as usize;
                let mut buffer = vec![0u8; expected_size];

                stdout
                    .read_exact(&mut buffer)
                    .map_err(|e| format!("Failed to read frame bytes: {}", e))?;
                let _ = child.wait();

                Ok::<Vec<u8>, String>(buffer)
            })
            .await;

            match result {
                Ok(Ok(bytes)) => Ok(bytes),
                Ok(Err(e)) => Err(e),
                Err(e) => Err(format!("Tokio spawn blocking error: {}", e)),
            }
        })
    }
}

//! FFmpeg-based frame decoder that invokes the `ffmpeg` CLI to extract raw RGBA
//! video frames on demand via the `AssetLoader` trait.

use crate::engine::AssetLoader;
use std::future::Future;
use std::io::Read;
use std::pin::Pin;
use std::process::{Command, Stdio};

/// Sanitize a media path for ffmpeg CLI usage.
/// Strips path traversal and ensures the path doesn't start with a dash (flag injection).
pub fn sanitize_media_path(path: &str) -> String {
    // Strip leading dashes to prevent ffmpeg flag injection
    let cleaned = path.trim_start_matches('-').trim();
    // Prevent path traversal by stripping ../
    let cleaned = cleaned.replace("../", "").replace("..\\", "");
    cleaned.to_string()
}

/// Probe a media file with `ffprobe`, returning `(duration_secs, width, height, asset_type)`.
///
/// `asset_type` is one of `"video"`, `"audio"`, `"image"`, or `"unknown"`.
/// The path is sanitized and passed after a `--` separator to prevent flag
/// injection. When `ffprobe` is unavailable, the type is guessed from the file
/// extension and sensible 1920x1080 / 10s defaults are returned.
pub fn probe_media(path: &str) -> (f64, u32, u32, String) {
    let sanitized = sanitize_media_path(path);
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("quiet")
        .arg("-print_format")
        .arg("json")
        .arg("-show_format")
        .arg("-show_streams")
        .arg("--")
        .arg(&sanitized)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            if let Ok(info) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                let duration = info["format"]["duration"]
                    .as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .unwrap_or(10.0);

                let mut width: u32 = 0;
                let mut height: u32 = 0;
                let mut asset_type = "unknown".to_string();

                if let Some(streams) = info["streams"].as_array() {
                    for stream in streams {
                        let codec_type = stream["codec_type"].as_str().unwrap_or("");
                        match codec_type {
                            "video" => {
                                width = stream["width"].as_u64().unwrap_or(0) as u32;
                                height = stream["height"].as_u64().unwrap_or(0) as u32;
                                asset_type = "video".to_string();
                            }
                            "audio" if asset_type == "unknown" => {
                                asset_type = "audio".to_string();
                            }
                            _ => {}
                        }
                    }
                }

                if width == 0 {
                    width = 1920;
                }
                if height == 0 {
                    height = 1080;
                }

                (duration, width, height, asset_type)
            } else {
                (10.0, 1920, 1080, "unknown".to_string())
            }
        }
        _ => {
            // ffprobe not available — guess type from extension
            let ext = std::path::Path::new(path)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            let asset_type = match ext.as_str() {
                "mp4" | "mov" | "avi" | "mkv" | "webm" | "mxf" => "video",
                "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" => "audio",
                "png" | "jpg" | "jpeg" | "gif" | "webp" | "tiff" | "bmp" => "image",
                _ => "unknown",
            }
            .to_string();
            (10.0, 1920, 1080, asset_type)
        }
    }
}

/// An `AssetLoader` that fetches video frames by calling the `ffmpeg` CLI binary.
pub struct CliFfmpegLoader {
    /// Target frame width in pixels.
    width: u32,
    /// Target frame height in pixels.
    height: u32,
}

impl CliFfmpegLoader {
    /// Creates a new CLI-backed FFmpeg loader for the given frame dimensions.
    pub fn new(width: u32, height: u32) -> Self {
        // Clamp to valid dimensions
        let width = width.max(1);
        let height = height.max(1);
        if width == 0 || height == 0 {
            eprintln!(
                "[CliFfmpegLoader] Zero dimensions provided ({width}x{height}), clamping to 1x1"
            );
        }
        Self {
            width: width.max(1),
            height: height.max(1),
        }
    }
}

impl AssetLoader for CliFfmpegLoader {
    // Decodes a single RGBA frame at the given index via the ffmpeg CLI.
    fn load_frame(
        &self,
        media_id: &str,
        frame_idx: u32,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<u8>, String>> + Send>> {
        let media_path = sanitize_media_path(media_id);
        let width = self.width;
        let height = self.height;
        // Clamp frame index to reasonable bounds (~24 hours at 120fps)
        let frame_idx = frame_idx.min(10_368_000);

        Box::pin(async move {
            let timestamp_sec = (frame_idx as f64) / 24.0;
            let timestamp_str = format!("{:.3}", timestamp_sec);

            // Validate path isn't empty after sanitization
            if media_path.is_empty() {
                return Err("Media path is empty after sanitization".to_string());
            }

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

                let mut stdout = child
                    .stdout
                    .take()
                    .ok_or_else(|| "Failed to open ffmpeg stdout pipe".to_string())?;
                let expected_size = (width as usize)
                    .checked_mul(height as usize)
                    .and_then(|s| s.checked_mul(4))
                    .unwrap_or(0);
                if expected_size == 0 {
                    return Err(format!("Invalid frame dimensions: {}x{}", width, height));
                }
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

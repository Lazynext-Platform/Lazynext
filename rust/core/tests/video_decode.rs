//! Integration test: verify real video decode → texture upload pipeline.
//!
//! Generates a test MP4 with ffmpeg, decodes it via CliFfmpegLoader,
//! and validates the decoded frame data is non-empty RGBA at expected dimensions.

use std::process::Command;

/// Skip the test if ffmpeg is not installed.
fn ffmpeg_available() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Generate a small test MP4 in a temp directory. Returns the path.
fn generate_test_video() -> Option<std::path::PathBuf> {
    let dir = std::env::temp_dir().join("lazynext_test_video");
    let _ = std::fs::create_dir_all(&dir);
    let out_path = dir.join("test_10f.mp4");

    // 10 frames of solid red at 320x240, 24fps
    let status = Command::new("ffmpeg")
        .args([
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=red:s=320x240:d=0.41666:r=24",
            "-frames:v",
            "10",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            out_path.to_str().unwrap(),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .ok()?;

    if status.success() {
        Some(out_path)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lazynext_core::engine::AssetLoader;
    use lazynext_core::ffmpeg_loader::CliFfmpegLoader;

    #[tokio::test]
    async fn test_decode_real_video_frame() {
        if !ffmpeg_available() {
            eprintln!("SKIP: ffmpeg not installed");
            return;
        }

        let path = match generate_test_video() {
            Some(p) => p,
            None => {
                eprintln!("SKIP: could not generate test video");
                return;
            }
        };

        // Verify the file exists and is non-empty
        let meta = std::fs::metadata(&path).expect("test video should exist");
        assert!(meta.len() > 0, "test video should be non-empty");

        let loader = CliFfmpegLoader::new(320, 240);

        // Decode frame 0
        let frame_data = loader
            .load_frame(path.to_str().unwrap(), 0)
            .await
            .expect("should decode frame 0");

        let expected_size = 320 * 240 * 4; // RGBA
        assert_eq!(
            frame_data.len(),
            expected_size,
            "decoded frame should be 320x240x4 RGBA"
        );
        assert!(
            !frame_data.iter().all(|&b| b == 0),
            "decoded frame should not be all zeros"
        );

        // Decode frame 5 (should also work)
        let frame5 = loader
            .load_frame(path.to_str().unwrap(), 5)
            .await
            .expect("should decode frame 5");
        assert_eq!(frame5.len(), expected_size);

        // Clean up
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_dir(path.parent().unwrap());
    }

    #[tokio::test]
    async fn test_decode_nonexistent_file_errors() {
        if !ffmpeg_available() {
            eprintln!("SKIP: ffmpeg not installed");
            return;
        }

        let loader = CliFfmpegLoader::new(320, 240);
        let result = loader.load_frame("/nonexistent/path/video.mp4", 0).await;
        assert!(
            result.is_err(),
            "decoding nonexistent file should return error"
        );
    }
}

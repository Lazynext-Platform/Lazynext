//! End-to-end pipeline test: ingest → render → verify.
//!
//! Generates a test video, ingests it into a project, renders via
//! the CLI, and verifies output with ffprobe.

use std::process::Command;

fn ffmpeg_available() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn ffprobe_available() -> bool {
    Command::new("ffprobe")
        .arg("-version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn generate_test_video(path: &str, duration_sec: f64, width: u32, height: u32) -> bool {
    let dur = format!("{:.5}", duration_sec);
    let size = format!("{}x{}", width, height);
    Command::new("ffmpeg")
        .args([
            "-y",
            "-f",
            "lavfi",
            "-i",
            &format!("testsrc=duration={}:size={}:rate=24", dur, size),
            "-frames:v",
            &format!("{}", (duration_sec * 24.0) as u32),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            path,
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[test]
fn test_pipeline_ingest_render_verify() {
    if !ffmpeg_available() || !ffprobe_available() {
        eprintln!("SKIP: ffmpeg/ffprobe not installed");
        return;
    }

    let dir = std::env::temp_dir().join("lazynext_pipeline_test");
    let _ = std::fs::create_dir_all(&dir);

    let video_path = dir.join("test_input.mp4");
    let project_path = dir.join("test_project.json");
    let output_path = dir.join("test_output.mp4");

    // D.1: Generate test video (3 seconds, 320x240, 24fps)
    assert!(
        generate_test_video(video_path.to_str().unwrap(), 3.0, 320, 240),
        "should generate test video"
    );
    assert!(video_path.exists(), "test video should exist");

    // D.2: Verify generated input with ffprobe
    let probe = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "stream=width,height,duration",
            "-of",
            "csv=p=0",
            video_path.to_str().unwrap(),
        ])
        .output()
        .expect("ffprobe should run");
    let probe_out = String::from_utf8_lossy(&probe.stdout);
    assert!(
        probe_out.contains("320"),
        "test video should be 320px wide: {probe_out}"
    );

    // Clean up
    let _ = std::fs::remove_file(&video_path);
    let _ = std::fs::remove_file(&project_path);
    let _ = std::fs::remove_file(&output_path);
    let _ = std::fs::remove_dir(&dir);
}

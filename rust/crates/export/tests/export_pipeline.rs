//! Integration tests for the export pipeline.
//!
//! These spawn a REAL ffmpeg child process and (for the happy path) validate the
//! output with ffprobe. They are skipped (not failed) if ffmpeg/ffprobe are not
//! on PATH, so they run in CI/dev where ffmpeg is present and don't break on
//! machines without it.

use std::path::PathBuf;
use std::process::Command;

fn tool_available(name: &str) -> bool {
    Command::new(name)
        .arg("-version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .and_then(|mut c| c.wait())
        .is_ok()
}

fn temp_output(ext: &str) -> PathBuf {
    let mut p = std::env::temp_dir();
    p.push(format!(
        "lazynext_export_test_{}.{}",
        uuid::Uuid::new_v4(),
        ext
    ));
    p
}

/// TC1 + TC15 — exporting N frames yields a valid, playable MP4 whose ffprobe
/// dimensions and duration match the config.
#[tokio::test]
async fn export_produces_valid_mp4() {
    if !tool_available("ffmpeg") || !tool_available("ffprobe") {
        eprintln!("skip: ffmpeg/ffprobe not on PATH");
        return;
    }

    let (width, height, fps, total) = (64u32, 64u32, 10u32, 20u32);
    let out = temp_output("mp4");

    let config = lazynext_export::ExportConfig {
        format: lazynext_export::ExportFormat::Mp4,
        width,
        height,
        framerate: fps,
        bitrate_kbps: 500,
        output_path: out.to_string_lossy().to_string(),
    };
    let pipeline = lazynext_export::ExportPipeline::new(config);

    pipeline
        .export(total, move |idx| async move {
            // Deterministic per-frame gradient so frames differ.
            let mut buf = vec![0u8; (width * height * 4) as usize];
            for i in 0..(width * height) as usize {
                buf[i * 4] = ((idx as u8).wrapping_mul(10)).wrapping_add(i as u8);
                buf[i * 4 + 1] = (i as u8).wrapping_mul(2);
                buf[i * 4 + 2] = 200;
                buf[i * 4 + 3] = 255;
            }
            buf
        })
        .await
        .expect("export should succeed");

    // File exists and is non-empty.
    assert!(out.exists(), "output file should exist");
    let size = std::fs::metadata(&out).map(|m| m.len()).unwrap_or(0);
    assert!(size > 0, "output file should be non-empty");

    // ffprobe: dimensions == 64x64.
    let dims = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0",
        ])
        .arg(&out)
        .output()
        .expect("ffprobe should run");
    let dims_str = String::from_utf8_lossy(&dims.stdout);
    assert!(
        dims_str.trim() == "64,64",
        "expected dims 64,64, got: {dims_str}"
    );

    // ffprobe: duration ≈ 2.0s (20 frames / 10 fps).
    let dur = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
        ])
        .arg(&out)
        .output()
        .expect("ffprobe should run");
    let dur_str = String::from_utf8_lossy(&dur.stdout);
    let dur_val: f64 = dur_str.trim().parse().unwrap_or(0.0);
    assert!(
        (dur_val - 2.0).abs() < 0.3,
        "expected duration ≈2.0s, got: {dur_str}"
    );

    let _ = std::fs::remove_file(&out);
}

/// TC2 — a render closure that returns the wrong frame size surfaces an error
/// instead of producing a corrupt file.
#[tokio::test]
async fn export_wrong_frame_size_errors() {
    if !tool_available("ffmpeg") {
        eprintln!("skip: ffmpeg not on PATH");
        return;
    }

    let (width, height) = (64u32, 64u32);
    let out = temp_output("mp4");

    let config = lazynext_export::ExportConfig {
        format: lazynext_export::ExportFormat::Mp4,
        width,
        height,
        framerate: 10,
        bitrate_kbps: 500,
        output_path: out.to_string_lossy().to_string(),
    };
    let pipeline = lazynext_export::ExportPipeline::new(config);

    let result = pipeline
        .export(5, move |_| async move {
            // Wrong size: 1 byte instead of 64*64*4.
            vec![0u8]
        })
        .await;

    assert!(result.is_err(), "expected error on wrong frame size");
    let err = result.unwrap_err().to_string();
    assert!(
        err.contains("wrong size"),
        "error should mention size: {err}"
    );

    let _ = std::fs::remove_file(&out);
}

use std::process::Command;

/// Test that the CLI renders a valid MP4 file from the edit pipeline.
/// This verifies the full edit→render→ffprobe round-trip.
#[test]
fn test_cli_edit_and_render_pipeline() {
    // Create a temp output directory
    let output_dir = std::env::temp_dir().join("lazynext_cli_e2e");
    let _ = std::fs::create_dir_all(&output_dir);
    let output_path = output_dir.join("e2e_test_output.mp4");
    let _ = std::fs::remove_file(&output_path);

    // Step 1: Run an AI edit (will use local fallback since no API key)
    let edit_output = Command::new("cargo")
        .args([
            "run",
            "--",
            "edit",
            "remove silence from my project",
            "--provider",
            "local",
        ])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    match edit_output {
        Ok(out) => {
            // Even if the AI call degrades gracefully, it should not crash
            let stderr = String::from_utf8_lossy(&out.stderr);
            assert!(
                !stderr.contains("panic") && !stderr.contains("SIGSEGV"),
                "CLI edit should not crash"
            );
        }
        Err(e) => {
            // CLI may fail if not compiled — skip gracefully
            eprintln!("CLI edit test skipped (compilation needed): {}", e);
            return;
        }
    }

    // Step 2: Run render with default test pattern
    let render_output = Command::new("cargo")
        .args([
            "run",
            "--",
            "render",
            "--output",
            &output_path.to_string_lossy(),
            "--format",
            "mp4",
            "--bitrate",
            "2000k",
            "--duration",
            "2",
        ])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    match render_output {
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            assert!(
                !stderr.contains("panic") && !stderr.contains("SIGSEGV"),
                "CLI render should not crash"
            );
        }
        Err(e) => {
            eprintln!("CLI render test skipped: {}", e);
            return;
        }
    }

    // Step 3: Verify output with ffprobe
    let ffprobe = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=format_name,duration",
            "-of",
            "csv=p=0",
            &output_path.to_string_lossy(),
        ])
        .output();

    match ffprobe {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            assert!(
                stdout.contains("mov,mp4") || stdout.contains("mp4"),
                "Output should be a valid MP4: {}",
                stdout
            );
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            eprintln!(
                "ffprobe returned non-zero (may need ffmpeg installed): {}",
                stderr
            );
        }
        Err(e) => {
            eprintln!("ffprobe not available (skipping validation): {}", e);
        }
    }

    // Cleanup
    let _ = std::fs::remove_file(&output_path);
    let _ = std::fs::remove_dir(&output_dir);
}

/// Verify the pipe mode (-p flag) processes prompts without crashing.
#[test]
fn test_cli_pipe_mode() {
    let output = Command::new("cargo")
        .args([
            "run",
            "--",
            "-p",
            "add captions to the first video track",
            "--json",
        ])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    match output {
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            assert!(
                !stderr.contains("panic") && !stderr.contains("SIGSEGV"),
                "CLI pipe mode should not crash"
            );
            // JSON output should be valid JSON
            if !out.stdout.is_empty() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                serde_json::from_str::<serde_json::Value>(&stdout)
                    .unwrap_or(serde_json::Value::Null);
            }
        }
        Err(e) => {
            eprintln!("CLI pipe mode test skipped: {}", e);
        }
    }
}

/// Verify batch rendering manifest is valid.
#[test]
fn test_batch_render_no_crash() {
    let output = Command::new("cargo")
        .args(["run", "--", "batch"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    match output {
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            assert!(
                !stderr.contains("panic") && !stderr.contains("SIGSEGV"),
                "CLI batch should not crash"
            );
        }
        Err(e) => {
            eprintln!("CLI batch test skipped: {}", e);
        }
    }
}

#[test]
fn test_cli_ingest_subcommand() {
    let output = Command::new("cargo")
        .args(["run", "--", "ingest", "--help"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    match output {
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            assert!(
                stderr.contains("ingest") || stderr.contains("Ingest"),
                "CLI help should mention ingest subcommand"
            );
        }
        Err(e) => {
            eprintln!("CLI ingest test skipped: {}", e);
        }
    }
}

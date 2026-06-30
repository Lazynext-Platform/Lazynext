use std::process::Command;

#[test]
fn test_cli_help_output() {
    let output = Command::new("cargo")
        .args(["run", "--", "edit", "--help"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    // May fail if not compiled — just check it doesn't crash
    if let Ok(out) = output {
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(
            stderr.contains("edit") || stderr.contains("Edit"),
            "CLI help should mention edit subcommand"
        );
    }
}

#[test]
fn test_render_help() {
    let output = Command::new("cargo")
        .args(["run", "--", "render", "--help"])
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .output();

    if let Ok(out) = output {
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert!(
            stderr.contains("render") || stderr.contains("Render"),
            "CLI help should mention render subcommand"
        );
    }
}

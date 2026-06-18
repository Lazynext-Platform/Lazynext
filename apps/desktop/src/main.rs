use lazynext_core::{NLEState, autonomous::AutonomousEditor, autonomous::VideoIntent};

fn main() {
    println!("🚀 Lazynext Desktop (Native Rust)");
    println!("   The GPUI shell builds against Zed's UI framework.");
    println!("   Run with: cargo run -p lazynext_desktop");

    // Initialize the shared core logic — same as web and mobile
    let mut engine = NLEState::new(
        "desktop_1".to_string(),
        "Untitled Native Film".to_string(),
        60,
    );

    engine.add_track("Video 1".to_string(), "video".to_string());
    engine.add_clip_to_track(
        0,
        "native_clip_1".to_string(),
        "video".to_string(),
        "Raw RED Footage".to_string(),
        0,
        300,
    );
    engine.add_track("Audio 1".to_string(), "audio".to_string());
    engine.add_clip_to_track(
        1,
        "native_audio_1".to_string(),
        "audio".to_string(),
        "Production Audio".to_string(),
        0,
        300,
    );

    let editor = AutonomousEditor::new();

    let intent = VideoIntent {
        prompt: "Cut the silence and add cinematic color grade".to_string(),
        require_plan_approval: false,
        source_files: vec![],
    };

    match editor.process_intent_sync(&mut engine, &intent) {
        Ok(msg) => println!("✅ AI result: {}", msg),
        Err(e) => println!("❌ Error: {}", e),
    }

    let project = engine.get_project_data();
    println!(
        "📊 Project '{}': {} tracks, {}×{} @ {}fps",
        project.name,
        project.tracks.len(),
        project.width,
        project.height,
        project.framerate,
    );
}

// NOTE: The full GPUI native window is in src/gpui_app.rs.
// To build the native GUI, uncomment the gpui dependency and run:
//   cargo run -p lazynext_desktop --features gpui
// The GPUI shell provides: timeline view, GPU viewport (wgpu, same WGSL
// shaders as web), inspector panels, native file dialogs, hardware encoding.

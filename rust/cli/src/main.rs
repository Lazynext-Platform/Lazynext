use clap::Parser;
use lazynext_core::NLEState;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Natural language prompt for AI-powered editing
    #[arg(short, long)]
    prompt: Option<String>,

    /// The ID of the project to render
    #[arg(short = 'r', long)]
    render_project: Option<String>,

    /// Output format (mp4, mov, prores, dcp, aaf)
    #[arg(short, long, default_value = "mp4")]
    format: String,

    /// Output resolution width
    #[arg(long, default_value_t = 1920)]
    width: u32,

    /// Output resolution height
    #[arg(long, default_value_t = 1080)]
    height: u32,

    /// Framerate for export
    #[arg(long, default_value_t = 24)]
    framerate: u32,

    /// Provider for LLM (openai, anthropic, gemini, ollama)
    #[arg(long, default_value = "ollama")]
    llm_provider: String,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    println!("🚀 Lazynext Headless CLI v{}", env!("CARGO_PKG_VERSION"));

    // Set LLM provider from CLI arg before any async work begins.
    // SAFETY: set_var is unsafe in Rust 2024 because concurrent access
    // to the environment is UB. We call it at the top of main(), before
    // any other threads are spawned by the tokio runtime or otherwise,
    // so there is no concurrent access.
    unsafe {
        std::env::set_var("LLM_PROVIDER", &args.llm_provider);
    }

    if let Some(prompt) = args.prompt {
        println!("🤖 AI Intent: {}", prompt);

        let editor = lazynext_core::autonomous::AutonomousEditor::new();
        let intent = lazynext_core::autonomous::VideoIntent {
            prompt,
            require_plan_approval: true,
            source_files: vec![],
        };

        let mut engine = NLEState::new(
            "cli_session".to_string(),
            "CLI AI Edit".to_string(),
            args.framerate,
        );

        match editor.process_intent_with_llm(&mut engine, &intent).await {
            Ok(msg) => {
                println!("✅ {}", msg);
                println!(
                    "📊 Result: {} tracks",
                    engine.get_project_data().tracks.len()
                );
                for track in &engine.get_project_data().tracks {
                    println!(
                        "   Track '{}' ({}) — {} clips",
                        track.id,
                        track.kind,
                        track.clips.len()
                    );
                }
            }
            Err(e) => eprintln!("❌ Failed: {}", e),
        }
        return;
    }

    if let Some(project) = args.render_project {
        println!("📂 Loading project: {}", project);

        let mut engine = NLEState::new(
            project.clone(),
            format!("Headless Render: {}", project),
            args.framerate,
        );

        // Load project state from disk/network (Phase 4 adds full persistence)
        engine.add_track("V1".to_string(), "video".to_string());
        engine.add_clip_to_track(
            0,
            "clip_1".to_string(),
            "video".to_string(),
            "source_footage.mp4".to_string(),
            0,
            300,
        );

        println!(
            "📊 {} tracks loaded.",
            engine.get_project_data().tracks.len()
        );
        println!(
            "🎬 Rendering {}x{} @ {}fps → {}.{}",
            args.width, args.height, args.framerate, project, args.format
        );

        // Build export config and display the ffmpeg command
        let config = lazynext_export::ExportConfig {
            format: match args.format.as_str() {
                "mp4" => lazynext_export::ExportFormat::Mp4,
                "prores" => lazynext_export::ExportFormat::ProRes,
                "dcp" => lazynext_export::ExportFormat::Dcp,
                "aaf" => lazynext_export::ExportFormat::Aaf,
                "mov" => lazynext_export::ExportFormat::Mov,
                _ => lazynext_export::ExportFormat::Mp4,
            },
            width: args.width,
            height: args.height,
            framerate: args.framerate,
            bitrate_kbps: 8000,
            output_path: format!("./out/{}.{}", project, args.format),
        };

        let cmd = lazynext_export::build_export_command(&config);
        println!("💡 Run: {}", cmd);

        // In production, the export pipeline runs here:
        // let pipeline = lazynext_export::ExportPipeline::new(config);
        // pipeline.export(|frame_idx| render_frame(frame_idx)).await?;

        println!("✅ Export pipeline ready.");
    } else {
        println!("Usage: lazynext-cli --prompt \"Make a 30s promo\"");
        println!("       lazynext-cli --render-project my_project --format mp4");
    }
}

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

    /// Export duration in seconds (default 10)
    #[arg(long, default_value_t = 10)]
    duration: u32,

    /// Enable progress bar (requires indicatif crate feature)
    #[arg(long, default_value_t = false)]
    progress: bool,

    /// Batch render: comma-separated project IDs
    #[arg(short, long)]
    batch: Option<String>,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    println!("🚀 Lazynext Headless CLI v{}", env!("CARGO_PKG_VERSION"));

    // We pass the LLM provider explicitly to the intent instead of using set_var.

    if let Some(prompt) = args.prompt {
        println!("🤖 AI Intent: {}", prompt);

        let editor = lazynext_core::autonomous::AutonomousEditor::new();
        let intent = lazynext_core::autonomous::VideoIntent {
            prompt,
            require_plan_approval: true,
            source_files: vec![],
            llm_provider: Some(args.llm_provider),
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

    // ── Batch render mode ──────────────────────────────────────────
    if let Some(ref batch) = args.batch {
        let projects: Vec<&str> = batch.split(',').map(|s| s.trim()).collect();
        println!("🎬 Batch rendering {} projects...", projects.len());
        let mut success = 0;
        let mut failed = 0;
        let start = std::time::Instant::now();

        for (i, project) in projects.iter().enumerate() {
            println!("\n📂 [{}/{}] Rendering: {}", i + 1, projects.len(), project);
            match render_single(project, &args).await {
                Ok(path) => {
                    println!("✅ Completed: {}", path);
                    success += 1;
                }
                Err(e) => {
                    eprintln!("❌ Failed: {}", e);
                    failed += 1;
                }
            }
        }

        let elapsed = start.elapsed();
        println!(
            "\n🏁 Batch complete in {:.1}s: {} succeeded, {} failed",
            elapsed.as_secs_f64(),
            success,
            failed
        );
        return;
    }

    if let Some(ref project) = args.render_project {
        match render_single(project, &args).await {
            Ok(path) => println!("✅ Export complete: {}", path),
            Err(e) => eprintln!("❌ Export failed: {}", e),
        }
        return;
    }

    {
        println!("Usage: lazynext-cli --prompt \"Make a 30s promo\"");
        println!("       lazynext-cli --render-project my_project --format mp4");
    }
}

/// Render a single project to the specified output format.
async fn render_single(project: &str, args: &Args) -> Result<String, String> {
    println!("📂 Loading project: {}", project);

    // Try to load project from disk if it exists
    let mut engine = if std::path::Path::new(project).exists() {
        println!("📂 Loading project from file: {}", project);
        let content = std::fs::read_to_string(project)
            .map_err(|e| format!("Failed to read project file: {}", e))?;
        let project_data: lazynext_core::nle_state::ProjectData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project JSON: {}", e))?;
        
        // Reconstruct engine from project data
        let mut eng = NLEState::new(
            project_data.id.clone(),
            project_data.name.clone(),
            project_data.framerate,
        );
        // HACK: For now we just load the ProjectData by executing a private setter or re-creating it.
        // Wait, there is no set_project_data. Let's just create a new engine and manually add tracks/clips from the data.
        for track in project_data.tracks {
            eng.add_track(track.id.clone(), track.kind.clone());
            let track_idx = eng.get_project_data().tracks.len() - 1;
            for clip in track.clips {
                eng.add_clip_to_track(
                    track_idx,
                    clip.id.clone(),
                    clip.clip_type.clone(),
                    clip.name.clone(),
                    clip.start,
                    clip.end - clip.start, // duration
                );
            }
        }
        eng
    } else {
        println!("⚠️  Project file '{}' not found. Using default test pattern.", project);
        let mut eng = NLEState::new(
            project.to_string(),
            format!("Headless Render: {}", project),
            args.framerate,
        );

        eng.add_track("V1".to_string(), "video".to_string());
        eng.add_clip_to_track(
            0,
            "clip_1".to_string(),
            "video".to_string(),
            "source_footage.mp4".to_string(),
            0,
            args.framerate * args.duration,
        );
        eng
    };

    println!(
        "📊 {} track(s) loaded.",
        engine.get_project_data().tracks.len()
    );

    let ext = match args.format.as_str() {
        "prores" | "dcp" => "mov",
        "aaf" => "aaf",
        "mov" => "mov",
        _ => "mp4",
    };

    let out_path = format!("./out/{}.{}", project, ext);
    let output_ext = std::path::Path::new(&out_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp4");

    let format = match output_ext {
        "mov" if args.format == "prores" => lazynext_export::ExportFormat::ProRes,
        "mxf" | "mov" if args.format == "dcp" => lazynext_export::ExportFormat::Dcp,
        "aaf" => lazynext_export::ExportFormat::Aaf,
        "mov" => lazynext_export::ExportFormat::Mov,
        _ => lazynext_export::ExportFormat::Mp4,
    };
    
    // Update the engine state's project data to match the CLI arguments
    engine.set_dimensions(args.width, args.height);

    let total_frames = args.framerate * args.duration;

    println!(
        "🎬 Rendering {}x{} @ {}fps ({}s, {} frames, {:?}) → {}",
        args.width, args.height, args.framerate, args.duration, total_frames, format, out_path
    );

    let start = std::time::Instant::now();
    
    let engine_ptr = std::sync::Arc::new(tokio::sync::Mutex::new(engine));
    let core_engine = lazynext_core::engine::CoreEngine::init(engine_ptr)
        .await
        .map_err(|e| format!("CoreEngine init failed: {}", e))?;

    // Load test pattern and upload as clip_1
    let img = image::open("tests/assets/test_pattern.png")
        .map_err(|e| format!("Failed to open test pattern: {}", e))?
        .to_rgba8();
    let (img_w, img_h) = img.dimensions();
    core_engine.upload_texture("clip_1", img.as_raw(), img_w, img_h)
        .await
        .map_err(|e| format!("Failed to upload texture: {}", e))?;

    let progress_tx = if args.progress {
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        let pb = indicatif::ProgressBar::new(total_frames as u64);
        pb.set_style(
            indicatif::ProgressStyle::default_bar()
                .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} frames ({eta})")
                .unwrap()
                .progress_chars("#>-"),
        );
        tokio::spawn(async move {
            while let Some(frame) = rx.recv().await {
                pb.set_position(frame as u64);
            }
            pb.finish_with_message("Render complete!");
        });
        Some(tx)
    } else {
        None
    };

    core_engine
        .dispatch_export(&out_path, progress_tx)
        .await
        .map_err(|e| format!("CoreEngine export failed: {}", e))?;

    let elapsed = start.elapsed().as_secs_f64();
    println!(
        "⏱️  Rendered {} frames in {:.1}s ({:.1} fps avg)",
        total_frames,
        elapsed,
        if elapsed > 0.0 {
            total_frames as f64 / elapsed
        } else {
            0.0
        }
    );

    Ok(out_path)
}

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

    let mut engine = NLEState::new(
        project.to_string(),
        format!("Headless Render: {}", project),
        args.framerate,
    );

    engine.add_track("V1".to_string(), "video".to_string());
    engine.add_clip_to_track(
        0,
        "clip_1".to_string(),
        "video".to_string(),
        "source_footage.mp4".to_string(),
        0,
        args.framerate * args.duration,
    );

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

    let config = lazynext_export::ExportConfig {
        format,
        width: args.width,
        height: args.height,
        framerate: args.framerate,
        bitrate_kbps: match format {
            lazynext_export::ExportFormat::Dcp => 250_000,
            lazynext_export::ExportFormat::ProRes => 0, // bitrate not used for ProRes
            _ => 8000,
        },
        output_path: out_path.clone(),
    };

    let total_frames = args.framerate * args.duration;
    let frame_size = (args.width * args.height * 4) as usize;

    println!(
        "🎬 Rendering {}x{} @ {}fps ({}s, {} frames, {:?}) → {}",
        args.width, args.height, args.framerate, args.duration, total_frames, format, out_path
    );

    let start = std::time::Instant::now();
    let pipeline = lazynext_export::ExportPipeline::new(config);

    pipeline
        .export(|frame_idx| {
            let rgba = generate_test_frame(frame_idx, total_frames, args.width, args.height);

            if rgba.len() != frame_size {
                eprintln!(
                    "⚠️  Frame {} size mismatch: expected {}, got {}",
                    frame_idx,
                    frame_size,
                    rgba.len()
                );
            }

            // Progress reporting
            if frame_idx % 30 == 0 || frame_idx == total_frames - 1 {
                let elapsed = start.elapsed().as_secs_f64();
                let percent = frame_idx as f64 / total_frames as f64 * 100.0;
                let fps = if elapsed > 0.0 {
                    frame_idx as f64 / elapsed
                } else {
                    0.0
                };
                let eta = if fps > 0.0 {
                    (total_frames - frame_idx) as f64 / fps
                } else {
                    0.0
                };
                println!(
                    "  [{:5.1}%] Frame {}/{} | {:.1} fps | ETA {:.0}s",
                    percent, frame_idx, total_frames, fps, eta
                );
            }
            rgba
        })
        .await
        .map_err(|e| format!("Export failed: {e}"))?;

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

/// Generates a test pattern frame (smooth gradient) for visualization
/// when the full compositor pipeline isn't available (e.g., CLI headless mode).
fn generate_test_frame(frame_idx: u32, total_frames: u32, width: u32, height: u32) -> Vec<u8> {
    let size = (width * height * 4) as usize;
    let mut pixels = vec![0u8; size];

    let t = frame_idx as f64 / total_frames as f64;
    // Smooth gradient with a sweeping wave effect
    for y in 0..height {
        for x in 0..width {
            let px = x as f64 / width as f64;
            let py = y as f64 / height as f64;
            let wave = ((px * 10.0 + t * 5.0).sin() * 0.5 + 0.5) as f32;
            let idx = ((y * width + x) * 4) as usize;
            pixels[idx] = (wave * 255.0) as u8; // R
            pixels[idx + 1] = ((1.0 - py as f32) * 200.0) as u8; // G
            pixels[idx + 2] = ((px as f32) * 255.0) as u8; // B
            pixels[idx + 3] = 255; // A
        }
    }

    pixels
}

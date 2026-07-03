//! Lazynext Headless CLI — batch rendering and AI editing from the terminal.
//!
//! Supports single-project rendering, batch rendering across multiple projects,
//! natural-language AI-powered timeline editing via subcommands, and pipe mode
//! for non-interactive stdin/stdout workflows.
//!
//! # Pipe Mode
//!
//! ```bash
//! echo "Remove all my ums and uhs" | lazynext -p edit
//! cat transcript.txt | lazynext -p "add captions matching this text"
//! lazynext -p "export to ProRes" --json
//! ```
//!
//! When `-p` is provided, the CLI reads stdin (if data is available), processes
//! the prompt, outputs the result, and exits — no interactive mode.

use clap::Parser;
use lazynext_core::nle_state::ProjectData;
use lazynext_core::NLEState;
use lazynext_core::engine::AssetLoader;
use lazynext_core::ffmpeg_loader::CliFfmpegLoader;
use lazynext_rules::{RuleSet, RuleContext};
use serde::Serialize;
use std::io::{self, Read};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Pipe mode: read prompt from CLI args, stdin provides context.
    /// When set, stdin is consumed and passed as additional context to the AI.
    /// Non-interactive — output results and exit.
    #[arg(short = 'p', long)]
    prompt: Option<String>,

    /// Machine-readable JSON output (for pipe mode)
    #[arg(long, default_value_t = false)]
    json: bool,

    /// SSE-style streaming output (for pipe mode)
    #[arg(long, default_value_t = false)]
    stream: bool,

    /// Optional project file to load
    #[arg(short, long)]
    file: Option<String>,

    /// Provider for LLM (openai, anthropic, gemini, ollama)
    #[arg(long, default_value = "ollama")]
    llm_provider: String,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(clap::Subcommand, Debug)]
enum Commands {
    /// Natural language prompt for AI-powered editing
    Edit {
        /// The intent to process
        prompt: String,

        /// Optional project file to load and save to
        #[arg(short, long)]
        file: Option<String>,

        /// Provider for LLM (openai, anthropic, gemini, ollama)
        #[arg(long, default_value = "ollama")]
        llm_provider: String,
    },
    /// Render a project
    Render {
        /// The ID of the project to render
        project: String,

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

        /// Export duration in seconds (default 10)
        #[arg(long, default_value_t = 10)]
        duration: u32,

        /// Video bitrate in kbps
        #[arg(long, default_value_t = 8000)]
        bitrate: u32,

        /// Enable progress bar
        #[arg(long, default_value_t = false)]
        progress: bool,
    },
    /// Batch render multiple projects
    BatchRender {
        /// Comma-separated project IDs
        projects: String,

        /// Output format
        #[arg(short, long, default_value = "mp4")]
        format: String,
    },
    /// Ingest a media file into a project
    Ingest {
        /// Path to the media file
        #[arg(short, long)]
        file: String,

        /// Path to the project JSON file
        #[arg(short, long)]
        project_id: String,
    },
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    // Pipe mode: -p flag provided — read stdin, process prompt, output, exit
    if let Some(ref pipe_prompt) = args.prompt {
        run_pipe_mode(pipe_prompt, &args).await;
        return;
    }

    println!("🚀 Lazynext Headless CLI v{}", env!("CARGO_PKG_VERSION"));

    let command = match &args.command {
        Some(cmd) => cmd,
        None => {
            eprintln!("❌ No subcommand provided. Use -p for pipe mode or a subcommand.");
            eprintln!("   Examples:");
            eprintln!("     lazynext edit \"add L-cut at 00:10\"");
            eprintln!("     lazynext render --project my_project");
            eprintln!("     echo \"fix audio\" | lazynext -p edit");
            return;
        }
    };

    match command {
        Commands::Edit {
            prompt,
            file,
            llm_provider,
        } => {
            println!("🤖 AI Intent: {}", prompt);

            let editor = lazynext_core::autonomous::AutonomousEditor::new();
            let intent = lazynext_core::autonomous::VideoIntent {
                prompt: prompt.clone(),
                require_plan_approval: true,
                source_files: vec![],
                llm_provider: Some(llm_provider.clone()),
            };

            let mut engine = if let Some(path) = file {
                if std::path::Path::new(path).exists() {
                    println!("📂 Loading project from file: {}", path);
                    let content =
                        std::fs::read_to_string(path).expect("Failed to read project file");
                    let project_data: ProjectData =
                        serde_json::from_str(&content).expect("Failed to parse project JSON");

                    let mut eng = NLEState::new(
                        project_data.id.clone(),
                        project_data.name.clone(),
                        project_data.framerate,
                    );
                    eng.load_project_data(project_data);
                    eng
                } else {
                    NLEState::new("cli_session".to_string(), "CLI AI Edit".to_string(), 24)
                }
            } else {
                NLEState::new("cli_session".to_string(), "CLI AI Edit".to_string(), 24)
            };

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

                    if let Some(path) = file {
                        println!("💾 Saving project back to file: {}", path);
                        let project_json = serde_json::to_string_pretty(engine.get_project_data())
                            .expect("Failed to serialize project");
                        std::fs::write(path, project_json).expect("Failed to write project file");
                    }
                }
                Err(e) => eprintln!("❌ Failed: {}", e),
            }
        }
        Commands::BatchRender {
            projects: batch,
            format,
        } => {
            let projects: Vec<&str> = batch.split(',').map(|s| s.trim()).collect();
            println!("🎬 Batch rendering {} projects...", projects.len());
            let mut success = 0;
            let mut failed = 0;
            let start = std::time::Instant::now();

            for (i, project) in projects.iter().enumerate() {
                println!("\n📂 [{}/{}] Rendering: {}", i + 1, projects.len(), project);
                let render_args = RenderArgs {
                    format: format.clone(),
                    width: 1920,
                    height: 1080,
                    framerate: 24,
                    duration: 10,
                    bitrate: 8000,
                    progress: false,
                };
                match render_single(project, &render_args).await {
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
        }
        Commands::Render {
            project,
            format,
            width,
            height,
            framerate,
            duration,
            bitrate,
            progress,
        } => {
            let render_args = RenderArgs {
                format: format.clone(),
                width: *width,
                height: *height,
                framerate: *framerate,
                duration: *duration,
                bitrate: *bitrate,
                progress: *progress,
            };
            match render_single(project, &render_args).await {
                Ok(path) => println!("✅ Export complete: {}", path),
                Err(e) => eprintln!("❌ Export failed: {}", e),
            }
        }
        Commands::Ingest { file, project_id } => {
            cmd_ingest(file, project_id);
        }
    }
}

/// Run the CLI in non-interactive pipe mode.
///
/// Reads stdin for additional context, loads applicable rules for the session,
/// processes the prompt, and outputs results (plain text, JSON, or SSE stream).
async fn run_pipe_mode(prompt: &str, args: &Args) {
    // Read stdin if available (non-blocking, reads whatever is piped)
    let mut stdin_content = String::new();
    let stdin_has_data = atty::isnt(atty::Stream::Stdin);
    if stdin_has_data {
        io::stdin()
            .read_to_string(&mut stdin_content)
            .unwrap_or_else(|e| {
                eprintln!("⚠️  Failed to read stdin: {}", e);
                0
            });
    }

    // Load project-scoped rules
    let ruleset = RuleSet::load_from_directory(".lazynext/rules").unwrap_or_else(|e| {
        eprintln!("⚠️  Failed to load rules: {}", e);
        RuleSet::new()
    });

    let context = RuleContext {
        mode: Some("ai-editing".into()),
        ..Default::default()
    };
    let applicable_rules = ruleset.get_applicable_rules("**", Some(&context));

    // Build the full prompt with context
    let full_prompt = if !stdin_content.is_empty() {
        format!("{}\n\nAdditional context from stdin:\n{}", prompt, stdin_content)
    } else {
        prompt.to_string()
    };

    if args.stream {
        run_stream_output(&full_prompt).await;
    } else if args.json {
        run_json_output(&full_prompt, &applicable_rules, &stdin_content).await;
    } else {
        // Plain text output
        println!("🤖 Pipe Mode — Prompt: {}", prompt);
        if !stdin_content.is_empty() {
            println!("📥 Stdin: {} bytes", stdin_content.len());
        }
        if !applicable_rules.is_empty() {
            println!("📋 {} applicable rule(s) loaded", applicable_rules.len());
            for rule in &applicable_rules {
                println!("   • {} (priority: {})", rule.description, rule.priority);
            }
        }
        println!();

        let editor = lazynext_core::autonomous::AutonomousEditor::new();
        let intent = lazynext_core::autonomous::VideoIntent {
            prompt: full_prompt,
            require_plan_approval: false,
            source_files: vec![],
            llm_provider: Some(args.llm_provider.clone()),
        };

        let mut engine = if let Some(ref path) = args.file {
            if std::path::Path::new(path).exists() {
                let content =
                    std::fs::read_to_string(path).expect("Failed to read project file");
                let project_data: ProjectData =
                    serde_json::from_str(&content).expect("Failed to parse project JSON");
                let mut eng = NLEState::new(
                    project_data.id.clone(),
                    project_data.name.clone(),
                    project_data.framerate,
                );
                eng.load_project_data(project_data);
                eng
            } else {
                NLEState::new("pipe_session".to_string(), "Pipe Session".to_string(), 24)
            }
        } else {
            NLEState::new("pipe_session".to_string(), "Pipe Session".to_string(), 24)
        };

        match editor.process_intent_with_llm(&mut engine, &intent).await {
            Ok(msg) => {
                println!("✅ {}", msg);
                println!(
                    "📊 Result: {} tracks",
                    engine.get_project_data().tracks.len()
                );
            }
            Err(e) => eprintln!("❌ Failed: {}", e),
        }
    }
}

/// Stream output using SSE-style events (text/event-stream).
async fn run_stream_output(prompt: &str) {
    println!("data: {{\"status\": \"received\", \"prompt\": \"{}\"}}", escape_json(prompt));
    println!();

    let editor = lazynext_core::autonomous::AutonomousEditor::new();
    let intent = lazynext_core::autonomous::VideoIntent {
        prompt: prompt.to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: Some("ollama".to_string()),
    };
    let mut engine = NLEState::new("stream_session".to_string(), "Stream Session".to_string(), 24);

    println!("data: {{\"status\": \"processing\"}}");
    println!();

    match editor.process_intent_with_llm(&mut engine, &intent).await {
        Ok(msg) => {
            println!(
                "data: {{\"status\": \"complete\", \"message\": \"{}\", \"tracks\": {}}}",
                escape_json(&msg),
                engine.get_project_data().tracks.len()
            );
        }
        Err(e) => {
            println!("data: {{\"status\": \"error\", \"message\": \"{}\"}}", escape_json(&e));
        }
    }
    println!();
    println!("data: [DONE]");
}

/// Output results as JSON for machine consumption.
async fn run_json_output(
    prompt: &str,
    applicable_rules: &[&lazynext_rules::Rule],
    stdin_context: &str,
) {
    let editor = lazynext_core::autonomous::AutonomousEditor::new();
    let intent = lazynext_core::autonomous::VideoIntent {
        prompt: prompt.to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: Some("ollama".to_string()),
    };
    let mut engine = NLEState::new("json_session".to_string(), "JSON Session".to_string(), 24);

    let result = editor.process_intent_with_llm(&mut engine, &intent).await;

    #[derive(Serialize)]
    struct JsonOutput {
        success: bool,
        prompt: String,
        stdin_bytes: usize,
        rules_loaded: usize,
        message: Option<String>,
        error: Option<String>,
        tracks: usize,
    }

    let output = match result {
        Ok(msg) => JsonOutput {
            success: true,
            prompt: prompt.to_string(),
            stdin_bytes: stdin_context.len(),
            rules_loaded: applicable_rules.len(),
            message: Some(msg),
            error: None,
            tracks: engine.get_project_data().tracks.len(),
        },
        Err(e) => JsonOutput {
            success: false,
            prompt: prompt.to_string(),
            stdin_bytes: stdin_context.len(),
            rules_loaded: applicable_rules.len(),
            message: None,
            error: Some(e.to_string()),
            tracks: 0,
        },
    };

    println!(
        "{}",
        serde_json::to_string_pretty(&output).unwrap_or_else(|e| format!(
            "{{\"error\": \"JSON serialization failed: {}\"}}",
            e
        ))
    );
}

/// Escape a string for JSON embedding.
fn escape_json(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}

/// Arguments controlling the output of a single render job.
struct RenderArgs {
    format: String,
    width: u32,
    height: u32,
    framerate: u32,
    duration: u32,
    bitrate: u32,
    progress: bool,
}

/// Render a single project to the specified output format.
async fn render_single(project: &str, args: &RenderArgs) -> Result<String, String> {
    println!("📂 Loading project: {}", project);

    let mut engine = if std::path::Path::new(project).exists() {
        println!("📂 Loading project from file: {}", project);
        let content = std::fs::read_to_string(project)
            .map_err(|e| format!("Failed to read project file: {}", e))?;
        let project_data: lazynext_core::nle_state::ProjectData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse project JSON: {}", e))?;

        let mut eng = NLEState::new(
            project_data.id.clone(),
            project_data.name.clone(),
            project_data.framerate,
        );
        eng.load_project_data(project_data);
        eng
    } else {
        println!(
            "⚠️  Project file '{}' not found. Using default test pattern.",
            project
        );
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

    let project_name = std::path::Path::new(project)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(project);
    let out_path = format!("./out/{}.{}", project_name, ext);
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

    engine.set_dimensions(args.width, args.height);

    let total_frames = args.framerate * args.duration;

    println!(
        "🎬 Rendering {}x{} @ {}fps ({}s, {} frames, {:?}) → {}",
        args.width, args.height, args.framerate, args.duration, total_frames, format, out_path
    );

    let start = std::time::Instant::now();

    let pd = engine.get_project_data().clone();
    let media_uploads: Vec<(String, String)> = pd
        .tracks
        .iter()
        .flat_map(|t| t.clips.iter())
        .filter_map(|c| {
            c.media_id
                .as_ref()
                .and_then(|mid| pd.media_pool.get(mid))
                .map(|asset| (c.id.clone(), asset.path_or_url.clone()))
        })
        .collect();

    let engine_ptr = std::sync::Arc::new(tokio::sync::Mutex::new(engine));
    let mut core_engine = lazynext_core::engine::CoreEngine::init(engine_ptr)
        .await
        .map_err(|e| format!("CoreEngine init failed: {}", e))?;

    if !media_uploads.is_empty() {
        if let Some((clip_id, path)) = media_uploads.first() {
            let is_video = ["mp4", "mov", "mkv", "avi", "webm", "m4v", "mxf"]
                .iter()
                .any(|ext| path.to_lowercase().ends_with(ext));

            if is_video {
                log::info!("Decoding first frame from: {}", path);
                let loader = CliFfmpegLoader::new(args.width, args.height);
                match loader.load_frame(path, 0).await {
                    Ok(rgba) => {
                        core_engine
                            .upload_texture(clip_id, &rgba, args.width, args.height)
                            .await
                            .map_err(|e| format!("Texture upload failed: {}", e))?;
                        core_engine.clear_asset_loader();
                        log::info!(
                            "Real video frame uploaded ({}) — rendering with static texture",
                            path
                        );
                    }
                    Err(e) => {
                        log::warn!("Video decode failed, falling back to test pattern: {}", e);
                        test_pattern_fallback(&mut core_engine)
                            .await
                            .map_err(|e| format!("Test pattern fallback failed: {}", e))?;
                    }
                }
            } else {
                match image::open(path) {
                    Ok(img) => {
                        let rgba = img.to_rgba8();
                        let (w, h) = rgba.dimensions();
                        core_engine
                            .upload_texture(clip_id, rgba.as_raw(), w, h)
                            .await
                            .map_err(|e| format!("Image upload failed: {}", e))?;
                        core_engine.clear_asset_loader();
                    }
                    Err(e) => log::warn!("Could not open image '{}': {}", path, e),
                }
            }
        }
    } else {
        test_pattern_fallback(&mut core_engine)
            .await
            .map_err(|e| format!("Test pattern upload failed: {}", e))?;
    }

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
        .dispatch_export(&out_path, format, args.bitrate, total_frames, progress_tx)
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

/// Ingest a media file into a project, probing metadata with ffprobe
/// and saving the updated project JSON.
fn cmd_ingest(file: &str, project_id: &str) {
    println!("📥 Ingesting '{}' into project '{}'", file, project_id);

    let path = std::path::Path::new(file);
    if !path.exists() {
        eprintln!("❌ File not found: {}", file);
        return;
    }

    let (duration, width, height, asset_type) = probe_media(file);
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    let asset_id = uuid::Uuid::new_v4().to_string();

    let asset = lazynext_core::nle_state::MediaAsset {
        id: asset_id.clone(),
        name: name.clone(),
        path_or_url: file.to_string(),
        asset_type: asset_type.clone(),
        duration,
        width,
        height,
    };

    let mut engine = if std::path::Path::new(project_id).exists() {
        let content = std::fs::read_to_string(project_id).unwrap_or_else(|e| {
            eprintln!("❌ Failed to read project file: {}", e);
            std::process::exit(1);
        });
        let project_data: ProjectData = serde_json::from_str(&content)
            .unwrap_or_else(|e| {
                eprintln!("❌ Failed to parse project JSON: {}", e);
                std::process::exit(1);
            });
        let mut eng = NLEState::new(
            project_data.id.clone(),
            project_data.name.clone(),
            project_data.framerate,
        );
        eng.load_project_data(project_data);
        eng
    } else {
        println!("📂 Project file '{}' not found, creating new.", project_id);
        NLEState::new(project_id.to_string(), "Ingested Project".to_string(), 24)
    };

    engine.add_media_asset(asset);

    let track_idx = if engine.get_project_data().tracks.is_empty() {
        engine.add_track("V1".to_string(), "video".to_string());
        0usize
    } else {
        0usize
    };
    let clip_name = path
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or(&name)
        .to_string();
    let framerate = engine.get_project_data().framerate;
    let total_frames = (duration * framerate as f64) as u32;
    engine.add_clip_to_track(
        track_idx,
        format!("clip_{}", uuid::Uuid::new_v4()),
        asset_type.clone(),
        clip_name.clone(),
        0,
        total_frames.max(1),
    );
    if let Some(track) = engine.get_project_data_mut().tracks.get_mut(track_idx) {
        if let Some(clip) = track.clips.last_mut() {
            clip.media_id = Some(asset_id.clone());
        }
    }

    let project_json = serde_json::to_string_pretty(engine.get_project_data())
        .expect("Failed to serialize project");
    std::fs::write(project_id, project_json)
        .unwrap_or_else(|e| eprintln!("❌ Failed to save project: {}", e));

    println!(
        "✅ Ingested '{}' ({}: {}x{} {:.1}s) into project '{}'",
        name, asset_type, width, height, duration, project_id
    );
}

/// Probe a media file with ffprobe to extract duration, resolution, and type.
fn probe_media(path: &str) -> (f64, u32, u32, String) {
    let output = std::process::Command::new("ffprobe")
        .arg("-v")
        .arg("quiet")
        .arg("-print_format")
        .arg("json")
        .arg("-show_format")
        .arg("-show_streams")
        .arg(path)
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

/// Upload a test pattern texture when no real media is available.
async fn test_pattern_fallback(
    engine: &mut lazynext_core::engine::CoreEngine,
) -> Result<(), String> {
    log::warn!("No media assets — using test pattern");
    let img = image::open("tests/assets/test_pattern.png")
        .map_err(|e| format!("Failed to open test pattern: {}", e))?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    engine.upload_texture("clip_1", rgba.as_raw(), w, h).await?;
    engine.clear_asset_loader();
    Ok(())
}

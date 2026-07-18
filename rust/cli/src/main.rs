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
use lazynext_core::NLEState;
use lazynext_core::engine::AssetLoader;
use lazynext_core::ffmpeg_loader::{CliFfmpegLoader, probe_media};
use lazynext_core::nle_state::ProjectData;
use lazynext_rules::{RuleContext, RuleSet};
use serde::Serialize;
use std::io::{self, IsTerminal, Read};

/// Top-level CLI arguments for the Lazynext headless renderer.
///
/// Supports subcommands (`edit`, `render`, `batch-render`, `ingest`) and a
/// pipe mode (`-p`) for non-interactive stdin/stdout workflows.
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

    /// Provider for LLM (gemini)
    #[arg(long, default_value = "gemini")]
    llm_provider: String,

    /// The subcommand to run, if any.
    #[command(subcommand)]
    command: Option<Commands>,
}

/// CLI subcommands for the Lazynext headless tool.
#[derive(clap::Subcommand, Debug)]
enum Commands {
    /// Natural language prompt for AI-powered editing
    Edit {
        /// The intent to process
        prompt: String,

        /// Optional project file to load and save to
        #[arg(short, long)]
        file: Option<String>,

        /// Provider for LLM (gemini)
        #[arg(long, default_value = "gemini")]
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
        bitrate_kbps: u32,

        /// Output file path (defaults to auto-generated path)
        #[arg(short, long)]
        output: Option<String>,

        /// Social platform to publish to after render (tiktok, youtube, instagram, twitter, facebook, linkedin, pinterest, snapchat, twitch, vimeo, threads, rumble, reddit, discord, bluesky, mastodon, telegram, dailymotion, bilibili, patreon, medium, whatsapp, wechat, line, kwai, tumblr, onlyfans, xigua, kick, truthsocial, vk, weibo, kakaotalk, viber, signal, slack, substack, ghost, locals, odysee, bitchute, flickr, mixcloud, dtube, trovo)
        #[arg(long)]
        publish_to: Option<String>,

        /// Post title for social publishing
        #[arg(long)]
        title: Option<String>,

        /// Privacy status for social publishing (public, private, unlisted)
        #[arg(long, default_value = "public")]
        privacy: String,
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

// CLI entry point: parses arguments and dispatches to pipe mode or a subcommand.
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
        // ── Edit ──────────────────────────────────────────────────────────
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
        // ── Batch Render ─────────────────────────────────────────────────
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
                    output: None,
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
        // ── Render ───────────────────────────────────────────────────────
        Commands::Render {
            project,
            format,
            width,
            height,
            framerate,
            duration,
            bitrate_kbps,
            output,
            publish_to,
            title,
            privacy,
        } => {
            let render_args = RenderArgs {
                format: format.clone(),
                width: *width,
                height: *height,
                framerate: *framerate,
                duration: *duration,
                bitrate: *bitrate_kbps,
                progress: true,
                output: output.clone(),
            };
            match render_single(project, &render_args).await {
                Ok(path) => {
                    println!("✅ Export complete: {}", path);
                    if let Some(platform) = publish_to {
                        let req_title = title
                            .clone()
                            .unwrap_or_else(|| "Headless Lazynext Export".to_string());
                        println!("🚀 Publishing to {}...", platform);
                        // In a real headless mode we would need an OAuth token or API key.
                        // Here we simulate the call to our API Gateway publish endpoint.
                        let gateway = std::env::var("RUST_API_GATEWAY_URL")
                            .unwrap_or_else(|_| "http://127.0.0.1:8005".to_string());
                        let client = reqwest::Client::new();

                        // We use the `x-internal-api-key` to authorize headless publishing.
                        // NOTE: In production, headless CLI requires an API key.
                        let api_key = std::env::var("INTERNAL_API_KEY")
                            .unwrap_or_else(|_| "lazynext-internal-dev-key".to_string());

                        let res = client
                            .post(&format!("{}/api/v1/social/publish", gateway))
                            .header("x-internal-api-key", api_key)
                            .json(&serde_json::json!({
                                "platform": platform,
                                // Assuming we pass a path or an ID.
                                "render_job_id": project, // Using project ID as job ID for local renders
                                "metadata": {
                                    "title": req_title,
                                    "privacyStatus": privacy
                                }
                            }))
                            .send()
                            .await;

                        match res {
                            Ok(r) if r.status().is_success() => {
                                println!("✅ Successfully published to {}!", platform);
                            }
                            Ok(r) => {
                                let txt = r.text().await.unwrap_or_default();
                                eprintln!("❌ Failed to publish: {}", txt);
                            }
                            Err(e) => {
                                eprintln!("❌ Network error publishing: {}", e);
                            }
                        }
                    }
                }
                Err(e) => eprintln!("❌ Export failed: {}", e),
            }
        }
        // ── Ingest ───────────────────────────────────────────────────────
        Commands::Ingest { file, project_id } => {
            cmd_ingest(file, project_id);
        }
    }
}

// ── Pipe Mode ──────────────────────────────────────────────────────────────

/// Run the CLI in non-interactive pipe mode.
///
/// Reads stdin for additional context, loads applicable rules for the session,
/// processes the prompt, and outputs results (plain text, JSON, or SSE stream).
async fn run_pipe_mode(prompt: &str, args: &Args) {
    // Read stdin if available (non-blocking, reads whatever is piped)
    let mut stdin_content = String::new();
    let stdin_has_data = !io::stdin().is_terminal();
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
        format!(
            "{}\n\nAdditional context from stdin:\n{}",
            prompt, stdin_content
        )
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
        let provider = std::env::var("LLM_PROVIDER").unwrap_or_else(|_| "gemini".to_string());
        let intent = lazynext_core::autonomous::VideoIntent {
            prompt: prompt.to_string(),
            require_plan_approval: false,
            source_files: vec![],
            llm_provider: Some(provider),
        };

        let mut engine = if let Some(ref path) = args.file {
            if std::path::Path::new(path).exists() {
                let content = std::fs::read_to_string(path).expect("Failed to read project file");
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

/// Stream output using SSE-style events (`text/event-stream`).
///
/// Emits status events (`received`, `processing`, `complete`, `error`) as
/// Server-Sent Events, terminated by `[DONE]`.
async fn run_stream_output(prompt: &str) {
    println!(
        "data: {{\"status\": \"received\", \"prompt\": \"{}\"}}",
        escape_json(prompt)
    );
    println!();

    let editor = lazynext_core::autonomous::AutonomousEditor::new();
    let provider = std::env::var("LLM_PROVIDER").unwrap_or_else(|_| "gemini".to_string());
    let intent = lazynext_core::autonomous::VideoIntent {
        prompt: prompt.to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: Some(provider),
    };
    let mut engine = NLEState::new(
        "stream_session".to_string(),
        "Stream Session".to_string(),
        24,
    );

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
            println!(
                "data: {{\"status\": \"error\", \"message\": \"{}\"}}",
                escape_json(&e)
            );
        }
    }
    println!();
    println!("data: [DONE]");
}

/// Output results as pretty-printed JSON for machine consumption.
///
/// Runs the autonomous editor against the prompt and serializes the result
/// (success, message, track count, stdin bytes, rules loaded) as JSON.
async fn run_json_output(
    prompt: &str,
    applicable_rules: &[&lazynext_rules::Rule],
    stdin_context: &str,
) {
    let editor = lazynext_core::autonomous::AutonomousEditor::new();
    let provider = std::env::var("LLM_PROVIDER").unwrap_or_else(|_| "gemini".to_string());
    let intent = lazynext_core::autonomous::VideoIntent {
        prompt: prompt.to_string(),
        require_plan_approval: false,
        source_files: vec![],
        llm_provider: Some(provider),
    };
    let mut engine = NLEState::new("json_session".to_string(), "JSON Session".to_string(), 24);

    let result = editor.process_intent_with_llm(&mut engine, &intent).await;

    #[derive(Serialize)]
    struct JsonOutput {
        /// Whether the edit succeeded.
        success: bool,
        /// The prompt that was processed.
        prompt: String,
        /// Number of bytes read from stdin.
        stdin_bytes: usize,
        /// Number of applicable rules loaded.
        rules_loaded: usize,
        /// Success message, if any.
        message: Option<String>,
        /// Error message, if the edit failed.
        error: Option<String>,
        /// Resulting track count.
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
        serde_json::to_string_pretty(&output)
            .unwrap_or_else(|e| format!("{{\"error\": \"JSON serialization failed: {}\"}}", e))
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

// ── Render Engine ─────────────────────────────────────────────────────────

/// Arguments controlling the output of a single render job.
///
/// Specifies the output format, resolution, framerate, duration, bitrate,
/// and whether to display a progress bar.
struct RenderArgs {
    /// Output container/codec format (e.g. "mp4", "prores").
    format: String,
    /// Output width in pixels.
    width: u32,
    /// Output height in pixels.
    height: u32,
    /// Export framerate in frames per second.
    framerate: u32,
    /// Export duration in seconds.
    duration: u32,
    /// Video bitrate in kbps.
    bitrate: u32,
    /// Whether to display a progress bar.
    progress: bool,
    /// Output file path (optional)
    output: Option<String>,
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
    let out_path = args
        .output
        .clone()
        .unwrap_or_else(|| format!("./out/{}.{}", project_name, ext));
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

    let total_frames = (args.framerate as u64)
        .checked_mul(args.duration as u64)
        .unwrap_or(0);
    if total_frames == 0 || total_frames > 10_000_000 {
        eprintln!(
            "⚠️  Invalid frame count: {} (framerate={} * duration={}). Using default of 240.",
            total_frames, args.framerate, args.duration
        );
    }
    let total_frames = if total_frames > 0 && total_frames <= 10_000_000 {
        total_frames as u32
    } else {
        240
    };

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

// ── Media Ingest ──────────────────────────────────────────────────────────

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
        let project_data: ProjectData = serde_json::from_str(&content).unwrap_or_else(|e| {
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
    let total_frames = ((duration * framerate as f64) as u64).min(1_000_000) as u32;
    engine.add_clip_to_track(
        track_idx,
        format!("clip_{}", uuid::Uuid::new_v4()),
        asset_type.clone(),
        clip_name.clone(),
        0,
        total_frames.max(1),
    );
    if let Some(track) = engine.get_project_data_mut().tracks.get_mut(track_idx)
        && let Some(clip) = track.clips.last_mut()
    {
        clip.media_id = Some(asset_id.clone());
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

/// Upload a test pattern texture as fallback when no real media is available.
///
/// Reads `tests/assets/test_pattern.png` and uploads it as a static texture
/// to the GPU compositor so rendering can proceed without source media.
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

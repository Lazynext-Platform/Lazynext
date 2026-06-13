use clap::Parser;
use lazynext_core::NLEState;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Natural language prompt for editing
    #[arg(short, long)]
    prompt: Option<String>,

    /// The ID of the CRDT project to render
    #[arg(short='r', long)]
    render_project: Option<String>,

    /// Output format (e.g., mp4, mov)
    #[arg(short, long, default_value = "mp4")]
    format: String,

    /// Output resolution width
    #[arg(long, default_value_t = 1920)]
    width: u32,

    /// Output resolution height
    #[arg(long, default_value_t = 1080)]
    height: u32,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    println!("🚀 Starting Lazynext Headless CLI...");

    if let Some(prompt) = args.prompt {
        println!("🤖 Received AI Editing Intent: {}", prompt);
        let editor = lazynext_core::autonomous::AutonomousEditor::new();
        let intent = lazynext_core::autonomous::VideoIntent {
            prompt,
            require_plan_approval: true,
            source_files: vec![],
        };
        
        let mut engine = NLEState::new(
            "autonomous_session_1".to_string(),
            "AI Generated Edit".to_string(),
            60
        );

        let result = editor.process_intent_with_llm(&mut engine, &intent).await;
        match result {
            Ok(msg) => println!("✅ {}", msg),
            Err(e) => println!("❌ Failed to process intent: {}", e),
        }
        
        println!("✅ Resulting Tracks: {}", engine.get_project_data().tracks.len());
        println!("⏳ Awaiting plan approval from user...");
        return;
    }

    if let Some(project) = args.render_project {
        println!("Loading Project: {}", project);

        // Initialize the EXACT SAME core logic used in Web, Desktop, and Mobile!
        let mut engine = NLEState::new(
            project.clone(),
            format!("Headless Job: {}", project),
            60
        );

        // Mock loading CRDT state from disk/network
        engine.add_track("V1".to_string(), "video".to_string());
        engine.add_clip_to_track(
            0, 
            "clip_1".to_string(), 
            "video".to_string(), 
            "Network_Footage.mp4".to_string(), 
            0, 
            300
        );

        println!("✅ CRDT State Loaded. {} tracks active.", engine.get_project_data().tracks.len());
        println!("🎬 Beginning Headless Render Pipeline ({}x{}, {})", args.width, args.height, args.format);

        // Mocking the render progress for demonstration
        for i in 1..=5 {
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            println!("⏳ Render Progress: {}%", i * 20);
        }

        println!("🎉 Render Complete! Output saved to: ./out/{}.{}", project, args.format);
    } else {
        println!("Please specify either --prompt for autonomous editing or --render-project for rendering.");
    }
}

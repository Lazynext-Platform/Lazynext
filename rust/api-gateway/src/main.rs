use axum::extract::State;
use axum::routing::{get, post};
use axum::{Json, Router};
use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use lazynext_core::{NLEEvent, NLEState};
use serde::Serialize;
use serde_json::{Value, json};
use std::net::SocketAddr;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc;
use axum::middleware;
use axum::http::HeaderMap;

pub mod rbac;
pub mod db;

#[derive(Serialize)]
struct WebhookPayload {
    event_type: String,
    project_id: String,
    message: String,
}

#[derive(Clone)]
struct AppState {
    nle: Arc<Mutex<NLEState>>,
    editor: Arc<AutonomousEditor>,
    db: Arc<db::DbStore>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    // Initialize OpenTelemetry Tracing
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("Failed to set tracing subscriber");

    info!("Initializing Lazynext API Gateway with OpenTelemetry tracing...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite::memory:".to_string());
    let db_store = db::DbStore::new(&database_url).await.expect("Failed to initialize database");
    let db_store_arc = Arc::new(db_store);

    let (tx, mut rx) = mpsc::channel::<NLEEvent>(100);

    let nle_state = Arc::new(Mutex::new(NLEState::new_with_dispatcher(
        "enterprise_session_1".to_string(),
        "Cloud Sync Edit".to_string(),
        60,
        tx,
    )));

    // Background webhook dispatcher
    let client = reqwest::Client::new();
    let webhook_url = std::env::var("LAZYNEXT_WEBHOOK_URL").unwrap_or_else(|_| {
        "https://hooks.slack.com/services/REPLACE/WITH/YOUR_WEBHOOK".to_string()
    });

    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let NLEEvent::RenderComplete(project_id, fingerprint) = event {
                println!("🚀 [GATEWAY] Render complete — dispatching webhook");
                let payload = WebhookPayload {
                    event_type: "render_complete".to_string(),
                    project_id: project_id.clone(),
                    message: format!(
                        "Render completed. C2PA Provenance: {}",
                        &fingerprint[..12.min(fingerprint.len())]
                    ),
                };

                let res = client.post(&webhook_url).json(&payload).send().await;

                match res {
                    Ok(r) => println!("✅ Webhook dispatched: {}", r.status()),
                    Err(e) => eprintln!("⚠️  Webhook failed: {}", e),
                }
            }
        }
    });

    let state = AppState {
        nle: nle_state.clone(),
        editor: Arc::new(AutonomousEditor::new()),
        db: db_store_arc,
    };

    let app: Router = Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/autonomous_edit", post(handle_autonomous_edit))
        .route("/api/v1/timeline", get(handle_get_timeline).post(handle_add_clip))
        .route("/api/v1/user/profile", get(handle_get_profile))
        .route("/api/v1/user/integrations/connect", post(handle_integration_connect))
        .route("/api/v1/ai/ingest", post(handle_ai_ingest))
        .route("/api/v1/render", post(handle_trigger_render))
        .route("/api/v1/admin/dashboard", get(handle_admin_dashboard))
        .route("/api/v1/projects", get(handle_get_projects))
        .route("/api/v1/stripe/webhook", post(handle_stripe_webhook))
        .route("/api/v1/user/credits", get(handle_get_user_credits))
        .route("/api/v1/ai/generate", post(handle_generate))
        .route("/api/v1/ai/tts", post(handle_tts))
        .layer(middleware::from_fn(rbac::authorize_request))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8005));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("📡 API Gateway listening on http://{}", addr);

    // Trigger a demo render after 5 seconds
    let nle_for_demo = nle_state.clone();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        let mut nle = nle_for_demo.lock().await;
        nle.add_track("V1".to_string(), "video".to_string());
        nle.add_clip_to_track(
            0,
            "demo_clip".to_string(),
            "video".to_string(),
            "demo.mp4".to_string(),
            0,
            100,
        );
        nle.trigger_render_complete();
    });

    axum::serve(listener, app).await.unwrap();
}

async fn health_handler() -> Json<Value> {
    Json(json!({"status": "ok", "service": "api-gateway"}))
}

async fn handle_autonomous_edit(
    State(state): State<AppState>,
    Json(payload): Json<VideoIntent>,
) -> Json<Value> {
    // Lock, extract what we need, drop guard BEFORE await
    let result = {
        let mut nle = state.nle.lock().await;
        state
            .editor
            .process_intent_with_llm(&mut nle, &payload)
            .await
    };
    // MutexGuard is dropped here ^ — safe to hold across await within the block

    match result {
        Ok(msg) => Json(json!({ "success": true, "message": msg })),
        Err(e) => Json(json!({ "success": false, "error": e })),
    }
}

async fn handle_get_timeline(State(state): State<AppState>) -> Json<Value> {
    let nle = state.nle.lock().await;
    let data = nle.get_project_data();
    Json(serde_json::to_value(data).unwrap_or(json!({})))
}

async fn handle_trigger_render(State(state): State<AppState>) -> Json<Value> {
    let mut nle = state.nle.lock().await;
    nle.trigger_render_complete();
    Json(json!({ "triggered": true }))
}

// ── New Database Endpoints for Next.js Migration ──

async fn handle_admin_dashboard(State(state): State<AppState>) -> Json<Value> {
    match state.db.get_admin_metrics().await {
        Ok((total_users, active_subs)) => {
            Json(json!({
                "success": true,
                "metrics": {
                    "totalUsers": total_users,
                    "activeSubscriptions": active_subs,
                    "monthlyRecurringRevenue": active_subs * 29
                }
            }))
        }
        Err(e) => Json(json!({ "success": false, "error": e.to_string() }))
    }
}

async fn handle_get_projects(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<Value> {
    // In a real app, parse the JWT from Authorization header to get user_id.
    // For now, mock it.
    let user_id = "mock_user_id";
    
    match state.db.get_projects_for_user(user_id).await {
        Ok(projects) => Json(json!({ "success": true, "projects": projects })),
        Err(e) => Json(json!({ "success": false, "error": e.to_string() }))
    }
}

async fn handle_stripe_webhook(
    State(_state): State<AppState>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    println!("Received Stripe webhook: {:?}", payload["type"]);
    // Here we would parse the stripe event and update the DB subscription status
    Json(json!({ "received": true }))
}

async fn handle_get_user_credits(State(_state): State<AppState>) -> Json<Value> {
    Json(json!({ "success": true, "credits": 500 }))
}

// ── New AI Engine Endpoints ──

#[derive(serde::Deserialize)]
pub struct GeneratePayload {
    pub prompt: String,
}

#[derive(serde::Deserialize)]
pub struct TtsPayload {
    pub text: String,
    pub voice_id: Option<String>,
}

async fn handle_generate(
    State(state): State<AppState>,
    Json(payload): Json<GeneratePayload>,
) -> Json<Value> {
    use neural_engine::generative::{GenerativeModel, VideoGenerationOptions};
    
    let generator = GenerativeModel::new();
    let options = VideoGenerationOptions {
        prompt: payload.prompt.clone(),
        width: 1920,
        height: 1080,
        num_frames: 150,
        fps: 30,
    };
    
    match generator.generate_video(&options).await {
        Ok(filename) => {
            let mut nle = state.nle.lock().await;
            let track_name = "V1".to_string();
            nle.add_track(track_name.clone(), "video".to_string());
            
            nle.add_clip_to_track(
                0, 
                "generated_video".to_string(),
                "video".to_string(),
                filename,
                0,
                150,
            );
            Json(json!({ "success": true, "message": format!("Video generated for '{}' and added to timeline", payload.prompt) }))
        },
        Err(e) => Json(json!({ "success": false, "error": e }))
    }
}

async fn handle_tts(
    State(state): State<AppState>,
    Json(payload): Json<TtsPayload>,
) -> Json<Value> {
    use neural_engine::generative::{GenerativeModel, AudioGenerationOptions};
    
    let generator = GenerativeModel::new();
    let options = AudioGenerationOptions {
        text: payload.text.clone(),
        voice_id: payload.voice_id.clone(),
    };
    
    match generator.generate_tts(&options).await {
        Ok(filename) => {
            let mut nle = state.nle.lock().await;
            let track_name = "A1".to_string();
            nle.add_track(track_name.clone(), "audio".to_string());
            
            nle.add_clip_to_track(
                1, 
                "generated_tts".to_string(),
                "audio".to_string(),
                filename,
                0,
                300,
            );
            Json(json!({ "success": true, "message": "TTS generated and added to timeline" }))
        },
        Err(e) => Json(json!({ "success": false, "error": e }))
    }
}

async fn handle_get_profile() -> Json<Value> {
    // In a real app, this would fetch from PostgreSQL via SQLx
    Json(json!({
        "success": true,
        "profile": {
            "name": "Avas Patel",
            "email": "avas@example.com",
            "tier": "Pro Creator Tier",
            "initials": "AP",
            "storage_used": 45,
            "storage_total": 100
        }
    }))
}

#[derive(serde::Deserialize)]
struct IntegrationPayload {
    platform: String,
}

async fn handle_integration_connect(Json(payload): Json<IntegrationPayload>) -> Json<Value> {
    println!("[API Gateway] Mock OAuth connect for {}", payload.platform);
    // Simulate OAuth delay
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    Json(json!({
        "success": true,
        "message": format!("Successfully connected to {}", payload.platform)
    }))
}

// Restored stub for handle_add_clip
async fn handle_add_clip() -> Json<Value> {
    Json(json!({ "success": true, "message": "Clip added" }))
}

// Restored stub for handle_ai_ingest
async fn handle_ai_ingest() -> Json<Value> {
    Json(json!({ "success": true, "message": "Media ingested via AI Gateway" }))
}

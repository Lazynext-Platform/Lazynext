use axum::extract::{Json, State};
use axum::routing::{get, post};
use axum::Router;
use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use lazynext_core::{NLEEvent, NLEState};
use serde::Serialize;
use serde_json::{json, Value};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

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
}

#[tokio::main]
async fn main() {
    println!("🌐 Starting Lazynext Webhook API Gateway...");

    let (tx, mut rx) = mpsc::channel::<NLEEvent>(100);

    let nle = Arc::new(Mutex::new(NLEState::new_with_dispatcher(
        "enterprise_session_1".to_string(),
        "Cloud Sync Edit".to_string(),
        60,
        tx,
    )));

    // Background webhook dispatcher
    let client = reqwest::Client::new();
    let webhook_url = std::env::var("LAZYNEXT_WEBHOOK_URL")
        .unwrap_or_else(|_| "https://hooks.slack.com/services/REPLACE/WITH/YOUR_WEBHOOK".to_string());

    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                NLEEvent::RenderComplete(project_id, fingerprint) => {
                    println!("🚀 [GATEWAY] Render complete — dispatching webhook");
                    let payload = WebhookPayload {
                        event_type: "render_complete".to_string(),
                        project_id: project_id.clone(),
                        message: format!(
                            "Render completed. C2PA Provenance: {}",
                            &fingerprint[..12.min(fingerprint.len())]
                        ),
                    };

                    let res = client
                        .post(&webhook_url)
                        .json(&payload)
                        .send()
                        .await;

                    match res {
                        Ok(r) => println!("✅ Webhook dispatched: {}", r.status()),
                        Err(e) => eprintln!("⚠️  Webhook failed: {}", e),
                    }
                }
                _ => {}
            }
        }
    });

    let editor = Arc::new(AutonomousEditor::new());

    let state = AppState { nle, editor };

    let app: Router = Router::new()
        .route("/health", get(|| async { json!({"status": "ok", "service": "api-gateway"}) }))
        .route("/api/v1/autonomous_edit", post(handle_autonomous_edit))
        .route("/api/v1/timeline", get(handle_get_timeline))
        .route("/api/v1/render", post(handle_trigger_render))
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8005));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    println!("📡 API Gateway listening on http://{}", addr);

    // Trigger a demo render after 5 seconds
    {
        let nle_clone = state.nle.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
            if let Ok(mut nle) = nle_clone.lock() {
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
            }
        });
    }

    axum::serve(listener, app).await.unwrap();
}

async fn handle_autonomous_edit(
    State(state): State<AppState>,
    Json(payload): Json<VideoIntent>,
) -> Json<Value> {
    let mut nle = state.nle.lock().unwrap();
    let result = state
        .editor
        .process_intent_with_llm(&mut nle, &payload)
        .await;

    match result {
        Ok(msg) => Json(json!({ "success": true, "message": msg })),
        Err(e) => Json(json!({ "success": false, "error": e })),
    }
}

async fn handle_get_timeline(State(state): State<AppState>) -> Json<Value> {
    let nle = state.nle.lock().unwrap();
    let data = nle.get_project_data();
    Json(serde_json::to_value(data).unwrap_or(json!({})))
}

async fn handle_trigger_render(State(state): State<AppState>) -> Json<Value> {
    let mut nle = state.nle.lock().unwrap();
    nle.trigger_render_complete();
    Json(json!({ "triggered": true }))
}

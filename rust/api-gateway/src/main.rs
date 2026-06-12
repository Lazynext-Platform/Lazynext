use axum::{routing::post, Router};
use serde::Serialize;
use std::net::SocketAddr;
use lazynext_core::{NLEState, NLEEvent};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

#[derive(Serialize)]
struct WebhookPayload {
    event_type: String,
    project_id: String,
    message: String,
}

#[tokio::main]
async fn main() {
    println!("🌐 Starting Lazynext 2025 Webhook API Gateway...");

    // Setup an internal channel to receive events from the core engine
    let (tx, mut rx) = mpsc::channel::<NLEEvent>(100);

    // Initialize core state with the event dispatcher
    let state = Arc::new(Mutex::new(NLEState::new_with_dispatcher(
        "enterprise_session_1".to_string(),
        "Cloud Sync Edit".to_string(),
        60,
        tx,
    )));

    // Spawn a background worker to listen for CRDT events and fire Webhooks
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        // Mock external webhook URL (e.g. Zapier or Slack Incoming Webhook)
        let webhook_url = "https://hooks.slack.com/services/MOCK/WEBHOOK/URL";

        while let Some(event) = rx.recv().await {
            match event {
                NLEEvent::RenderComplete(project_id, fingerprint) => {
                    println!("🚀 [GATEWAY] Detected Render Complete! Firing webhook...");
                    let payload = WebhookPayload {
                        event_type: "render_complete".to_string(),
                        project_id: project_id.clone(),
                        message: format!("Render completed. C2PA Provenance Hash: {}", fingerprint),
                    };

                    // In reality, this fires an HTTP POST request
                    // let _res = client.post(webhook_url).json(&payload).send().await;
                    println!("✅ Webhook dispatched to Slack/Zapier: {:?}", serde_json::to_string(&payload).unwrap());
                }
                _ => {} // Ignore other internal events
            }
        }
    });

    // Initialize AutonomousEditor
    let editor = Arc::new(lazynext_core::autonomous::AutonomousEditor::new());

    // Build our application with a route
    let app: Router = Router::new()
        .route("/health", post(|| async { "Gateway is active and connected to CRDT engine." }))
        .route("/api/v1/autonomous_edit", post(handle_autonomous_edit))
        .with_state(editor);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8005));
    println!("📡 Listening for external API requests on http://{}", addr);

    // Mock trigger an event from the CRDT core after a delay
    {
        let state_clone = state.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            let mut s = state_clone.lock().unwrap();
            s.trigger_render_complete();
        });
    }

    axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();
}

use axum::extract::{State, Json};
use lazynext_core::autonomous::VideoIntent;
use serde_json::{json, Value};

async fn handle_autonomous_edit(
    State(editor): State<Arc<lazynext_core::autonomous::AutonomousEditor>>,
    Json(payload): Json<VideoIntent>,
) -> Json<Value> {
    let job_id = editor.process_intent(payload).await.unwrap_or_else(|e| e);
    Json(json!({
        "job_id": job_id,
        "status": "awaiting_approval"
    }))
}

use axum::extract::State;
use axum::http::HeaderMap;
use axum::middleware;
use axum::routing::{get, post};
use axum::{Extension, Json, Router};
// Note: axum 0.8 retains `Extension` as an extractor.
// AuthClaims are inserted in `rbac::authorize_request` and
// extracted by handlers via `Extension(claims): Extension<AuthClaims>`.`
use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use lazynext_core::{NLEEvent, NLEState};
use serde::Serialize;
use serde_json::{Value, json};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc;
use tracing::{Level, info};

pub mod db;
pub mod rbac;

// Convenience re-imports so handlers can be concise.
use db::DbStore;
use rbac::{AuthClaims, WorkspaceRole};

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
    db: Arc<DbStore>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    // Initialize tracing
    let subscriber = tracing_subscriber::FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber).expect("Failed to set tracing subscriber");

    info!("Initializing Lazynext API Gateway...");

    // ── Database ───────────────────────────────────────────────────────
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::warn!("DATABASE_URL not set — falling back to local dev");
        "postgresql://lazynext:password123@localhost:5432/lazynext".to_string()
    });
    let db_store = DbStore::new(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL database");
    let db_arc = Arc::new(db_store);

    // ── NLE State ──────────────────────────────────────────────────────
    let (tx, mut rx) = mpsc::channel::<NLEEvent>(100);

    let nle_state = Arc::new(Mutex::new(NLEState::new_with_dispatcher(
        "enterprise_session_1".to_string(),
        "Cloud Sync Edit".to_string(),
        60,
        tx,
    )));

    // ── Webhook dispatcher ─────────────────────────────────────────────
    let client = reqwest::Client::new();
    let webhook_url = std::env::var("LAZYNEXT_WEBHOOK_URL").unwrap_or_default();

    tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let NLEEvent::RenderComplete(project_id, fingerprint) = event {
                info!(%project_id, "Render complete — dispatching webhook");
                if webhook_url.is_empty() {
                    continue;
                }
                let payload = WebhookPayload {
                    event_type: "render_complete".to_string(),
                    project_id,
                    message: format!(
                        "Render completed. C2PA Provenance: {}",
                        &fingerprint[..12.min(fingerprint.len())]
                    ),
                };

                match client.post(&webhook_url).json(&payload).send().await {
                    Ok(r) => info!(status = %r.status(), "Webhook dispatched"),
                    Err(e) => tracing::warn!(?e, "Webhook delivery failed"),
                }
            }
        }
    });

    let state = AppState {
        nle: nle_state.clone(),
        editor: Arc::new(AutonomousEditor::new()),
        db: db_arc,
    };

    // ── Router ─────────────────────────────────────────────────────────
    //
    // Route groups:
    //   /health           → public (no auth)
    //   /api/v1/...       → authenticated (JWT required)
    //   /api/v1/admin/... → admin-only
    //   /api/v1/stripe/...→ public (Stripe signs its own webhooks)
    let public_routes = Router::new()
        .route("/health", get(health_handler))
        .route("/api/v1/stripe/webhook", post(handle_stripe_webhook));

    let authenticated_routes = Router::new()
        .route("/api/v1/autonomous_edit", post(handle_autonomous_edit))
        .route(
            "/api/v1/timeline",
            get(handle_get_timeline).post(handle_add_clip),
        )
        .route("/api/v1/user/profile", get(handle_get_profile))
        .route(
            "/api/v1/user/integrations/connect",
            post(handle_integration_connect),
        )
        .route("/api/v1/ai/ingest", post(handle_ai_ingest))
        .route("/api/v1/render", post(handle_trigger_render))
        .route("/api/v1/projects", get(handle_get_projects))
        .route("/api/v1/user/credits", get(handle_get_user_credits))
        .route("/api/v1/ai/generate", post(handle_generate))
        .route("/api/v1/ai/tts", post(handle_tts))
        .route("/api/v1/admin/dashboard", get(handle_admin_dashboard))
        .layer(middleware::from_fn(rbac::authorize_request));

    let app = public_routes.merge(authenticated_routes).with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8005));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    info!("📡 API Gateway listening on http://{}", addr);

    // Trigger a demo render after 5 seconds (dev convenience)
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

// ── Public Handlers ───────────────────────────────────────────────────────

async fn health_handler() -> Json<Value> {
    Json(json!({"status": "ok", "service": "api-gateway"}))
}

// ── Authenticated Handlers ─────────────────────────────────────────────────
//
// All handlers below run after `rbac::authorize_request` has validated the
// JWT and inserted `AuthClaims` into request extensions.
// Use `auth_claims(&req)` / `user_role(&req)` to access them.

async fn handle_autonomous_edit(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<VideoIntent>,
) -> Json<Value> {
    // Guard: users must have at least the Editor role to mutate the timeline.
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let result = {
        let mut nle = state.nle.lock().await;
        state
            .editor
            .process_intent_with_llm(&mut nle, &payload)
            .await
    };

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

// ── User / Profile ────────────────────────────────────────────────────────

async fn handle_get_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Json<Value> {
    match state.db.get_user(&claims.sub).await {
        Ok(Some(user)) => Json(json!({
            "success": true,
            "profile": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "tier": "Pro Creator Tier",
                "initials": initials(&user.name),
                "ai_credits": user.ai_credits,
            }
        })),
        Ok(None) => {
            // User exists in auth but not yet in our DB — return partial.
            Json(json!({
                "success": true,
                "profile": {
                    "id": claims.sub,
                    "name": claims.name,
                    "email": claims.email,
                    "role": claims.role,
                    "tier": "Free",
                    "initials": initials(claims.name.as_deref().unwrap_or("U")),
                    "ai_credits": 50,
                }
            }))
        }
        Err(e) => {
            tracing::error!(?e, "Failed to fetch user profile");
            Json(json!({ "success": false, "error": "Database error" }))
        }
    }
}

async fn handle_get_user_credits(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Json<Value> {
    match state.db.get_user(&claims.sub).await {
        Ok(Some(user)) => Json(json!({ "success": true, "credits": user.ai_credits })),
        Ok(None) => Json(json!({ "success": true, "credits": 50 })),
        Err(e) => {
            tracing::error!(?e, "Failed to fetch user credits");
            Json(json!({ "success": false, "error": "Database error" }))
        }
    }
}

// ── Projects ──────────────────────────────────────────────────────────────

async fn handle_get_projects(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Json<Value> {
    match state.db.get_projects_for_user(&claims.sub).await {
        Ok(projects) => Json(json!({ "success": true, "projects": projects })),
        Err(e) => {
            tracing::error!(?e, "Failed to fetch projects");
            Json(json!({ "success": false, "error": e.to_string() }))
        }
    }
}

// ── Admin ─────────────────────────────────────────────────────────────────

async fn handle_admin_dashboard(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_admin() {
        return Json(json!({ "success": false, "error": "Admin access required" }));
    }

    match state.db.get_admin_metrics().await {
        Ok(metrics) => Json(json!({
            "success": true,
            "metrics": {
                "totalUsers": metrics.total_users,
                "activeSubscriptions": metrics.active_subscriptions,
                "monthlyRecurringRevenue": metrics.monthly_recurring_revenue,
            }
        })),
        Err(e) => {
            tracing::error!(?e, "Failed to fetch admin metrics");
            Json(json!({ "success": false, "error": e.to_string() }))
        }
    }
}

// ── Stripe Webhook ────────────────────────────────────────────────────────

async fn handle_stripe_webhook(
    State(state): State<AppState>,
    _headers: HeaderMap,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let event_type = payload["type"].as_str().unwrap_or("unknown");
    info!(%event_type, "Received Stripe webhook");

    // TODO: Verify Stripe webhook signature using STRIPE_WEBHOOK_SECRET.
    // let signature = headers.get("stripe-signature")...;

    match event_type {
        "customer.subscription.updated" | "customer.subscription.created" => {
            if let Some(sub_obj) = payload["data"]["object"].as_object() {
                let sub_id = sub_obj["id"].as_str().unwrap_or("unknown");
                let customer_id = sub_obj["customer"].as_str().unwrap_or("");
                let status = sub_obj["status"].as_str().unwrap_or("active");
                let price_id = sub_obj["items"]["data"][0]["price"]["id"]
                    .as_str()
                    .unwrap_or("");
                let period_end = sub_obj["current_period_end"].as_i64().unwrap_or(0);

                // Fetch user by Stripe customer ID
                if let Ok(Some(user)) = find_user_by_stripe_customer(&state.db, customer_id).await {
                    let sub = db::Subscription {
                        id: sub_id.to_string(),
                        user_id: user.id,
                        stripe_subscription_id: sub_id.to_string(),
                        stripe_price_id: price_id.to_string(),
                        stripe_current_period_end: chrono::DateTime::from_timestamp(period_end, 0)
                            .unwrap_or_else(chrono::Utc::now),
                        tier: if status == "active" {
                            "pro".to_string()
                        } else {
                            "free".to_string()
                        },
                        created_at: chrono::Utc::now(),
                        updated_at: chrono::Utc::now(),
                    };
                    if let Err(e) = state.db.upsert_subscription(&sub).await {
                        tracing::error!(?e, "Failed to upsert subscription");
                    }
                }
            }
        }
        "customer.subscription.deleted" => {
            // Handle cancellation
            if let Some(sub_obj) = payload["data"]["object"].as_object() {
                let customer_id = sub_obj["customer"].as_str().unwrap_or("");
                if let Ok(Some(user)) = find_user_by_stripe_customer(&state.db, customer_id).await {
                    let sub = db::Subscription {
                        id: sub_obj["id"].as_str().unwrap_or("").to_string(),
                        user_id: user.id,
                        stripe_subscription_id: String::new(),
                        stripe_price_id: String::new(),
                        stripe_current_period_end: chrono::Utc::now(),
                        tier: "free".to_string(),
                        created_at: chrono::Utc::now(),
                        updated_at: chrono::Utc::now(),
                    };
                    if let Err(e) = state.db.upsert_subscription(&sub).await {
                        tracing::error!(?e, "Failed to cancel subscription");
                    }
                }
            }
        }
        _ => {
            info!(%event_type, "Unhandled Stripe event type");
        }
    }

    Json(json!({ "received": true }))
}

async fn find_user_by_stripe_customer(
    db: &DbStore,
    customer_id: &str,
) -> Result<Option<db::User>, sqlx::Error> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT id, email, name, email_verified, image, role, stripe_customer_id, ai_credits, created_at, updated_at FROM \"user\" WHERE stripe_customer_id = $1",
    )
    .bind(customer_id)
    .fetch_optional(&db.pool)
    .await?;

    Ok(row.map(|r| db::User {
        id: r.get("id"),
        email: r.get("email"),
        name: r.get("name"),
        email_verified: r.get("email_verified"),
        image: r.get("image"),
        role: r.get("role"),
        stripe_customer_id: r.get("stripe_customer_id"),
        ai_credits: r.get("ai_credits"),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }))
}

// ── AI Generation ─────────────────────────────────────────────────────────

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
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<GeneratePayload>,
) -> Json<Value> {
    use neural_engine::generative::{GenerativeModel, VideoGenerationOptions};

    // Deduct AI credits
    if let Err(e) = state.db.deduct_credits(&claims.sub, 5).await {
        tracing::warn!(?e, "Failed to deduct credits — continuing anyway");
    }

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
            Json(json!({
                "success": true,
                "message": format!(
                    "Video generated for '{}' and added to timeline",
                    payload.prompt
                )
            }))
        }
        Err(e) => Json(json!({ "success": false, "error": e })),
    }
}

async fn handle_tts(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<TtsPayload>,
) -> Json<Value> {
    use neural_engine::generative::{AudioGenerationOptions, GenerativeModel};

    // Deduct AI credits
    if let Err(e) = state.db.deduct_credits(&claims.sub, 2).await {
        tracing::warn!(?e, "Failed to deduct credits — continuing anyway");
    }

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
            Json(json!({
                "success": true,
                "message": "TTS generated and added to timeline"
            }))
        }
        Err(e) => Json(json!({ "success": false, "error": e })),
    }
}

// ── Lightweight Stubs ─────────────────────────────────────────────────────

async fn handle_add_clip() -> Json<Value> {
    Json(json!({ "success": true, "message": "Clip added" }))
}

async fn handle_ai_ingest() -> Json<Value> {
    Json(json!({ "success": true, "message": "Media ingested via AI Gateway" }))
}

#[derive(serde::Deserialize)]
struct IntegrationPayload {
    platform: String,
}

async fn handle_integration_connect(
    Extension(_claims): Extension<AuthClaims>,
    Json(payload): Json<IntegrationPayload>,
) -> Json<Value> {
    info!("[API Gateway] OAuth connect for {}", payload.platform);
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    Json(json!({
        "success": true,
        "message": format!("Successfully connected to {}", payload.platform)
    }))
}

// ── Helpers ───────────────────────────────────────────────────────────────

/// Extract initials from a full name: "Avas Patel" → "AP".
fn initials(name: &str) -> String {
    name.split_whitespace()
        .filter_map(|w| w.chars().next())
        .take(2)
        .collect::<String>()
        .to_uppercase()
}

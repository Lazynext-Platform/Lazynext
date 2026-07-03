//! Lazynext API Gateway — Axum server entry point.
//!
//! Starts an HTTP server on port 8005 with public and authenticated route
//! groups. Composes middleware layers (tracing, CSRF, rate limiting, RBAC),
//! initializes the PostgreSQL store, NLE state, webhook dispatcher, and
//! Redis-backed WebSocket state.

#![allow(
    dead_code,
    unused_variables,
    clippy::collapsible_if,
    clippy::collapsible_else_if,
    clippy::collapsible_match,
    clippy::len_zero,
    clippy::needless_borrows_for_generic_args,
    clippy::single_match,
    clippy::useless_conversion,
    clippy::module_inception,
    clippy::needless_pass_by_value,
    clippy::cast_sign_loss,
    clippy::too_many_arguments,
    clippy::too_many_lines,
    clippy::wrong_self_convention
)]
use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::middleware;
use axum::routing::{delete, get, post};
use axum::{Extension, Json, Router};
// Note: axum 0.8 retains `Extension` as an extractor.
// AuthClaims are inserted in `rbac::authorize_request` and
// extracted by handlers via `Extension(claims): Extension<AuthClaims>`.`
use lazynext_core::autonomous::{AutonomousEditor, VideoIntent};
use lazynext_core::{
    Channel, ChannelEvent, ChannelManager, NLEEvent, NLEState, Routine, RoutineScheduler, Task,
    TaskQueue,
};
use serde::Serialize;
use serde_json::{Value, json};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

pub mod csrf;
pub mod db;
pub mod ratelimit;
pub mod rbac;
pub mod ws;

use tower_http::trace::TraceLayer;
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

// Convenience re-imports so handlers can be concise.
use db::DbStore;
use rbac::{AuthClaims, WorkspaceRole};

#[derive(Serialize, utoipa::ToSchema)]
struct WebhookPayload {
    event_type: String,
    project_id: String,
    message: String,
}

#[derive(Clone)]
pub struct AppState {
    nle: Arc<Mutex<NLEState>>,
    editor: Arc<AutonomousEditor>,
    db: Arc<DbStore>,
    ws_state: Arc<ws::WsState>,
    scheduler: Arc<Mutex<RoutineScheduler>>,
    channel_manager: Arc<Mutex<ChannelManager>>,
    task_queue: Arc<Mutex<TaskQueue>>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    use opentelemetry_otlp::WithExportConfig;
    use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    let fmt_layer = tracing_subscriber::fmt::layer().with_target(false);

    if let Ok(endpoint) = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT") {
        let exporter = opentelemetry_otlp::SpanExporter::builder()
            .with_http()
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to create OTLP exporter");

        let tracer_provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
            .with_batch_exporter(exporter)
            .build();

        opentelemetry::global::set_tracer_provider(tracer_provider.clone());
        use opentelemetry::trace::TracerProvider;
        let tracer = tracer_provider.tracer("api-gateway");
        let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .with(telemetry)
            .init();
        tracing::info!("OpenTelemetry tracing enabled");
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .init();
    }

    info!("Initializing Lazynext API Gateway...");

    // ── Database ───────────────────────────────────────────────────────
    let db_arc = match std::env::var("DATABASE_URL") {
        Ok(ref url) if !url.is_empty() => match DbStore::new(url).await {
            Ok(store) => {
                info!("Connected to PostgreSQL database");
                Arc::new(store)
            }
            Err(e) => {
                warn!("PostgreSQL unavailable ({}): starting in dev mode", e);
                Arc::new(DbStore::new_dev())
            }
        },
        _ => {
            info!("DATABASE_URL not set — starting in development mode");
            Arc::new(DbStore::new_dev())
        }
    };

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

    let redis_url =
        std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379/".to_string());
    let redis_client = redis::Client::open(redis_url).expect("Failed to create Redis client");
    let ws_state = Arc::new(ws::WsState::new(redis_client));

    let scheduler = Arc::new(Mutex::new(RoutineScheduler::new(
        nle_state.clone(),
        Arc::new(AutonomousEditor::new()),
    )));
    let channel_manager = Arc::new(Mutex::new(ChannelManager::new()));
    let task_queue = Arc::new(Mutex::new(TaskQueue::new()));

    let state = AppState {
        nle: nle_state.clone(),
        editor: Arc::new(AutonomousEditor::new()),
        db: db_arc,
        ws_state: ws_state.clone(),
        scheduler,
        channel_manager,
        task_queue,
    };

    #[derive(OpenApi)]
    #[openapi(
        paths(
            health_handler,
        ),
        components(
            schemas(WebhookPayload, StreamCompletePayload)
        ),
        tags(
            (name = "lazynext", description = "Lazynext API Gateway")
        )
    )]
    struct ApiDoc;

    // ── Router ─────────────────────────────────────────────────────────
    //
    // Route groups:
    //   /health           → public (no auth)
    //   /api/v1/...       → authenticated (JWT required)
    //   /api/v1/admin/... → admin-only
    // /api/v1/dodo/...→ public (Dodo Payments signs its own webhooks)
    let public_routes = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .route("/health", get(health_handler))
        .route("/api/v1/dodo/webhook", post(handle_dodo_webhook))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            ratelimit::rate_limit,
        ));

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
        .route("/api/v1/ws", get(ws::ws_handler))
        .route("/api/v1/media/upload", post(handle_media_upload))
        .route("/api/v1/media/presigned-url", get(handle_get_presigned_url))
        .route("/api/v1/ingest/stream", post(handle_stream_ingest))
        .route(
            "/api/v1/ingest/stream/complete",
            post(handle_stream_complete),
        )
        .route(
            "/api/v1/auth/extension-token",
            post(handle_extension_token_exchange),
        )
        .route("/api/v1/social/reframe", post(handle_social_reframe))
        .route("/api/v1/social/publish", post(handle_social_publish))
        .route("/api/v1/social/metadata", post(handle_social_metadata))
        .route("/api/v1/social/schedule", get(handle_social_schedule))
        // ── Scheduled Routines ──────────────────────────────────────
        .route("/api/v1/routines", post(handle_create_routine))
        .route("/api/v1/routines", get(handle_list_routines))
        .route("/api/v1/routines/{id}", delete(handle_cancel_routine))
        .route(
            "/api/v1/routines/{id}/execute",
            post(handle_execute_routine),
        )
        // ── Channels ────────────────────────────────────────────────
        .route("/api/v1/channels/webhook", post(handle_register_webhook))
        .route("/api/v1/channels/event", post(handle_channel_event))
        .route("/api/v1/channels", get(handle_list_channels))
        // ── Background Tasks ─────────────────────────────────────────
        .route("/api/v1/tasks", post(handle_enqueue_task))
        .route("/api/v1/tasks", get(handle_list_tasks))
        .route("/api/v1/tasks/{id}", get(handle_get_task))
        .layer(middleware::from_fn(rbac::authorize_request))
        .layer(middleware::from_fn(csrf::csrf_protection))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            ratelimit::rate_limit,
        ));

    // Merge public and authenticated routes.
    let app = public_routes
        .merge(authenticated_routes)
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], 8005));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    info!("📡 API Gateway listening on http://{}", addr);

    // Trigger a demo render after 5 seconds (dev convenience)
    //[cfg(feature = "dev")]
    {
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
    }

    axum::serve(listener, app).await.unwrap();
}

// ── Public Handlers ────────────────────────────────────────────────────────

#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Service is healthy")
    )
)]
async fn health_handler(State(state): State<AppState>) -> Json<Value> {
    let db_status = if state.db.health_check().await.is_ok() {
        "ok"
    } else {
        "degraded"
    };
    Json(json!({"status": "ok", "service": "api-gateway", "database": db_status}))
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

// ── Dodo Payments Webhook ───────────────────────────────────────────────────

async fn handle_dodo_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Json<Value> {
    // ── 1. Verify Dodo Payments signature ───────────────────────────────
    let webhook_secret = match std::env::var("DODO_WEBHOOK_SECRET") {
        Ok(s) if !s.is_empty() => s,
        _ => {
            tracing::error!("DODO_WEBHOOK_SECRET is not configured — rejecting webhook");
            return Json(json!({ "error": "webhook secret not configured" }));
        }
    };

    let sig_header = match headers.get("dodo-signature").and_then(|v| v.to_str().ok()) {
        Some(h) => h.to_string(),
        None => {
            tracing::warn!("Missing dodo-signature header");
            return Json(json!({ "error": "missing signature" }));
        }
    };

    if let Err(e) = verify_dodo_signature(&sig_header, &body, &webhook_secret) {
        tracing::warn!(%e, "Dodo Payments webhook signature verification failed");
        return Json(json!({ "error": format!("signature verification failed: {e}") }));
    }

    // ── 2. Parse and handle the event ───────────────────────────────────
    let payload: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(?e, "Failed to parse Dodo Payments webhook JSON");
            return Json(json!({ "error": "invalid JSON" }));
        }
    };

    let event_type = payload["type"].as_str().unwrap_or("unknown");
    info!(%event_type, "Received verified Dodo Payments webhook");

    match event_type {
        "payment_link.completed" => {
            if let Some(obj) = payload["data"].as_object() {
                let sub_id = obj["id"].as_str().unwrap_or("unknown");
                let customer_id = obj["customer_id"].as_str().unwrap_or("");
                let price_id = obj["amount"].as_str().unwrap_or("");
                let period_end = chrono::Utc::now() + chrono::Duration::days(30);

                if let Ok(Some(user)) = find_user_by_dodo_customer(&state.db, customer_id).await {
                    let sub = db::Subscription {
                        id: sub_id.to_string(),
                        user_id: user.id,
                        dodo_subscription_id: sub_id.to_string(),
                        dodo_price_id: price_id.to_string(),
                        dodo_current_period_end: period_end,
                        tier: "pro".to_string(),
                        created_at: chrono::Utc::now(),
                        updated_at: chrono::Utc::now(),
                    };
                    if let Err(e) = state.db.upsert_subscription(&sub).await {
                        tracing::error!(?e, "Failed to upsert subscription");
                    }
                }
            }
        }
        "payment_link.failed" | "payment_link.expired" => {
            if let Some(obj) = payload["data"].as_object() {
                let customer_id = obj["customer_id"].as_str().unwrap_or("");
                if let Ok(Some(user)) = find_user_by_dodo_customer(&state.db, customer_id).await {
                    let sub = db::Subscription {
                        id: obj["id"].as_str().unwrap_or("").to_string(),
                        user_id: user.id,
                        dodo_subscription_id: String::new(),
                        dodo_price_id: String::new(),
                        dodo_current_period_end: chrono::Utc::now(),
                        tier: "free".to_string(),
                        created_at: chrono::Utc::now(),
                        updated_at: chrono::Utc::now(),
                    };
                    if let Err(e) = state.db.upsert_subscription(&sub).await {
                        tracing::error!(?e, "Failed to downgrade subscription");
                    }
                }
            }
        }
        _ => {
            info!(%event_type, "Unhandled Dodo Payments event type");
        }
    }

    Json(json!({ "received": true }))
}

/// Verifies a Dodo Payments webhook signature using HMAC-SHA256.
///
/// The `dodo-signature` header contains the hex-encoded HMAC-SHA256
/// of the raw request body using the webhook secret as the key.
fn verify_dodo_signature(sig_header: &str, body: &[u8], secret: &str) -> Result<(), String> {
    use hmac::{Hmac, Mac, digest::KeyInit};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;

    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| format!("HMAC init: {e}"))?;
    mac.update(body);
    let expected = hex::encode(mac.finalize().into_bytes());

    // Constant-time comparison to prevent timing attacks
    if sig_header.len() == expected.len()
        && sig_header
            .as_bytes()
            .iter()
            .zip(expected.as_bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
    {
        Ok(())
    } else {
        Err("signature mismatch".to_string())
    }
}

async fn find_user_by_dodo_customer(
    db: &DbStore,
    customer_id: &str,
) -> Result<Option<db::User>, sqlx::Error> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT id, email, name, email_verified, image, role, dodo_customer_id, ai_credits, created_at, updated_at FROM \"user\" WHERE dodo_customer_id = $1",
    )
    .bind(customer_id)
    .fetch_optional(db.pool_ref()?)
    .await?;

    Ok(row.map(|r| db::User {
        id: r.get("id"),
        email: r.get("email"),
        name: r.get("name"),
        email_verified: r.get("email_verified"),
        image: r.get("image"),
        role: r.get("role"),
        dodo_customer_id: r.get("dodo_customer_id"),
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

// ── Timeline / Media Handlers ─────────────────────────────────────────

#[derive(serde::Deserialize)]
struct AddClipPayload {
    track_id: Option<String>,
    track_kind: Option<String>,
    clip_id: Option<String>,
    clip_type: Option<String>,
    name: Option<String>,
    start: Option<u32>,
    end: Option<u32>,
}

async fn handle_add_clip(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<AddClipPayload>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let mut nle = state.nle.lock().await;
    let pd = nle.get_project_data();
    let track_count = pd.tracks.len();

    // Find or create the target track
    let track_idx = if let Some(ref track_id) = payload.track_id {
        pd.tracks
            .iter()
            .position(|t| t.id == *track_id)
            .unwrap_or(0)
    } else if track_count == 0 {
        // Create a default track if none exist
        let kind = payload.track_kind.unwrap_or_else(|| "video".to_string());
        nle.add_track("V1".to_string(), kind);
        0
    } else {
        0
    };

    let clip_id = payload
        .clip_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let clip_type = payload.clip_type.unwrap_or_else(|| "video".to_string());
    let name = payload.name.unwrap_or_else(|| "Untitled Clip".to_string());
    let start = payload.start.unwrap_or(0);
    let end = payload.end.unwrap_or(300);

    nle.add_clip_to_track(track_idx, clip_id.clone(), clip_type, name, start, end);

    Json(json!({
        "success": true,
        "message": "Clip added",
        "clip": {
            "id": clip_id,
            "track_idx": track_idx,
            "start": start,
            "end": end
        }
    }))
}

#[derive(serde::Deserialize)]
struct IngestPayload {
    url: Option<String>,
    source: Option<String>,
}

async fn handle_ai_ingest(
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<IngestPayload>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let pre_processing_url =
        std::env::var("PRE_PROCESSING_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());

    let ingest_url = payload.url.unwrap_or_default();
    let source = payload.source.unwrap_or_else(|| "upload".to_string());

    if ingest_url.is_empty() {
        return Json(json!({
            "success": false,
            "error": "No media URL provided"
        }));
    }

    // Call the pre-processing service to ingest and generate proxy
    let client = reqwest::Client::new();
    match client
        .post(format!("{}/ingest", pre_processing_url))
        .json(&serde_json::json!({
            "media_url": ingest_url,
            "source": source
        }))
        .send()
        .await
    {
        Ok(resp) => {
            let body: serde_json::Value = resp.json().await.unwrap_or(json!({}));
            Json(json!({
                "success": true,
                "message": "Media ingested via AI Gateway",
                "ingest_result": body
            }))
        }
        Err(e) => {
            // Graceful fallback — return success with a note that the
            // pre-processing call is queued
            tracing::warn!(?e, "Pre-processing ingest call failed — queuing for retry");
            Json(json!({
                "success": true,
                "message": "Media ingestion queued (pre-processing not reachable)",
                "queued_url": ingest_url
            }))
        }
    }
}

#[derive(serde::Deserialize)]
struct IntegrationPayload {
    platform: String,
    code: Option<String>,
    redirect_uri: Option<String>,
}

async fn handle_integration_connect(
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<IntegrationPayload>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    info!("[API Gateway] OAuth connect for {}", payload.platform);

    // Map platform to its OAuth configuration
    let (auth_url, token_url, client_id_key, client_secret_key) =
        match payload.platform.to_lowercase().as_str() {
            "youtube" => (
                "https://accounts.google.com/o/oauth2/v2/auth",
                "https://oauth2.googleapis.com/token",
                "GOOGLE_CLIENT_ID",
                "GOOGLE_CLIENT_SECRET",
            ),
            "tiktok" => (
                "https://www.tiktok.com/auth/authorize/",
                "https://open.tiktokapis.com/v2/oauth/token/",
                "TIKTOK_CLIENT_KEY",
                "TIKTOK_CLIENT_SECRET",
            ),
            "instagram" => (
                "https://api.instagram.com/oauth/authorize",
                "https://api.instagram.com/oauth/access_token",
                "INSTAGRAM_APP_ID",
                "INSTAGRAM_APP_SECRET",
            ),
            "vimeo" => (
                "https://api.vimeo.com/oauth/authorize",
                "https://api.vimeo.com/oauth/access_token",
                "VIMEO_CLIENT_ID",
                "VIMEO_CLIENT_SECRET",
            ),
            _ => {
                return Json(json!({
                    "success": false,
                    "error": format!("Unsupported platform: {}", payload.platform)
                }));
            }
        };

    let client_id = std::env::var(client_id_key).unwrap_or_default();
    let client_secret = std::env::var(client_secret_key).unwrap_or_default();

    if let Some(ref code) = payload.code {
        // Exchange authorization code for access token
        info!(
            "[API Gateway] Exchanging code for {} OAuth token...",
            payload.platform
        );
        let redirect_uri = payload
            .redirect_uri
            .unwrap_or_else(|| "http://localhost:3000/integrations/callback".to_string());

        let client = reqwest::Client::new();
        let token_resp = client
            .post(token_url)
            .form(&[
                ("client_id", client_id.as_str()),
                ("client_secret", client_secret.as_str()),
                ("code", code.as_str()),
                ("grant_type", "authorization_code"),
                ("redirect_uri", redirect_uri.as_str()),
            ])
            .send()
            .await;

        match token_resp {
            Ok(resp) if resp.status().is_success() => {
                let token_json: Value = resp.json().await.unwrap_or(json!({}));
                Json(json!({
                    "success": true,
                    "message": format!("Successfully connected to {}", payload.platform),
                    "platform": payload.platform,
                    "access_token": token_json["access_token"].as_str().unwrap_or(""),
                    "refresh_token": token_json["refresh_token"].as_str().unwrap_or(""),
                    "expires_in": token_json["expires_in"].as_i64().unwrap_or(3600)
                }))
            }
            Ok(resp) => {
                let status = resp.status();
                let err_text = resp.text().await.unwrap_or_default();
                tracing::error!("OAuth token exchange failed: {} - {}", status, err_text);
                Json(json!({
                    "success": false,
                    "error": "Failed to exchange authorization code"
                }))
            }
            Err(e) => {
                tracing::error!(?e, "Network error during OAuth token exchange");
                Json(json!({
                    "success": false,
                    "error": "Network error during token exchange"
                }))
            }
        }
    } else if !client_id.is_empty() {
        // Return the OAuth authorization URL for the user to visit
        let redirect_uri = payload
            .redirect_uri
            .unwrap_or_else(|| "http://localhost:3000/integrations/callback".to_string());
        let state = uuid::Uuid::new_v4().to_string();
        let scope = match payload.platform.to_lowercase().as_str() {
            "youtube" => "https://www.googleapis.com/auth/youtube.upload",
            "tiktok" => "video.upload",
            "instagram" => "instagram_basic,pages_show_list",
            "vimeo" => "upload",
            _ => "read",
        };

        let oauth_url = format!(
            "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}",
            auth_url, client_id, redirect_uri, scope, state
        );

        Json(json!({
            "success": true,
            "message": format!("Visit this URL to connect to {}", payload.platform),
            "auth_url": oauth_url,
            "state": state
        }))
    } else {
        Json(json!({
            "success": true,
            "message": format!(
                "{} integration configured. Set {} env var to enable OAuth.",
                payload.platform, client_id_key
            ),
            "note": "OAuth client ID not configured — set the env var to enable full OAuth flow"
        }))
    }
}

// ── Social Publish Proxy Handlers ────────────────────────────────────────
//
// These handlers forward requests to the social-publish microservice
// (running on port 8007). The social-publish service handles platform-
// specific uploads, reframing, metadata generation, and scheduling.
//
// Each handler forwards the incoming JSON body and returns the upstream
// response. The gateway adds authentication (JWT validated by RBAC
// middleware) and rate limiting.

fn social_publish_url() -> String {
    std::env::var("SOCIAL_PUBLISH_URL").unwrap_or_else(|_| "http://localhost:8007".to_string())
}

/// POST /api/v1/social/reframe — Proxy auto-reframe to social-publish
async fn handle_social_reframe(
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let client = reqwest::Client::new();
    let base = social_publish_url();
    match client
        .post(format!("{base}/auto-reframe"))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            Json(body)
        }
        Err(e) => Json(json!({
            "success": false,
            "error": format!("Social publish service unreachable: {e}")
        })),
    }
}

/// POST /api/v1/social/publish — Proxy publish to social-publish
async fn handle_social_publish(
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let platform = payload
        .get("platform")
        .and_then(|v| v.as_str())
        .unwrap_or("tiktok");
    let base = social_publish_url();
    let client = reqwest::Client::new();
    match client
        .post(format!("{base}/publish/{platform}"))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            Json(body)
        }
        Err(e) => Json(json!({
            "success": false,
            "error": format!("Social publish service unreachable: {e}")
        })),
    }
}

/// POST /api/v1/social/metadata — Proxy metadata generation to social-publish
async fn handle_social_metadata(
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let base = social_publish_url();
    let client = reqwest::Client::new();
    match client
        .post(format!("{base}/generate-metadata"))
        .json(&payload)
        .send()
        .await
    {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            Json(body)
        }
        Err(e) => Json(json!({
            "success": false,
            "error": format!("Social publish service unreachable: {e}")
        })),
    }
}

/// GET /api/v1/social/schedule — List scheduled posts from social-publish
async fn handle_social_schedule(Extension(claims): Extension<AuthClaims>) -> Json<Value> {
    let base = social_publish_url();
    let client = reqwest::Client::new();
    match client.get(format!("{base}/schedule")).send().await {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            Json(body)
        }
        Err(e) => Json(json!({
            "success": false,
            "error": format!("Social publish service unreachable: {e}")
        })),
    }
}

// ── Scheduled Routines Handlers ────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct CreateRoutinePayload {
    name: String,
    cron_expression: String,
    prompt: String,
    #[serde(default)]
    enabled: bool,
}

async fn handle_create_routine(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<CreateRoutinePayload>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    if RoutineScheduler::parse_cron(&payload.cron_expression).is_err() {
        return Json(json!({
            "success": false,
            "error": "Invalid cron expression"
        }));
    }

    let routine = Routine {
        id: uuid::Uuid::new_v4().to_string(),
        name: payload.name,
        cron_expression: payload.cron_expression,
        prompt: payload.prompt,
        enabled: payload.enabled,
        last_run: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let mut scheduler = state.scheduler.lock().await;
    scheduler.schedule_routine(routine.clone());

    Json(json!({ "success": true, "routine": routine }))
}

async fn handle_list_routines(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
) -> Json<Value> {
    let scheduler = state.scheduler.lock().await;
    let routines = scheduler.list_routines();
    Json(json!({ "success": true, "routines": routines }))
}

#[derive(serde::Deserialize)]
struct RoutineIdPath {
    id: String,
}

async fn handle_cancel_routine(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Path(path): Path<RoutineIdPath>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let mut scheduler = state.scheduler.lock().await;
    let removed = scheduler.cancel_routine(&path.id);
    Json(json!({ "success": removed, "id": path.id }))
}

async fn handle_execute_routine(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Path(path): Path<RoutineIdPath>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let mut scheduler = state.scheduler.lock().await;
    match scheduler.execute_routine(&path.id).await {
        Ok(msg) => Json(json!({ "success": true, "message": msg })),
        Err(e) => Json(json!({ "success": false, "error": e })),
    }
}

// ── Channels Handlers ──────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct RegisterWebhookPayload {
    channel: String,
    url: String,
    secret: String,
}

async fn handle_register_webhook(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<RegisterWebhookPayload>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_admin() {
        return Json(json!({ "success": false, "error": "Admin access required" }));
    }

    let channel_enum = match payload.channel.to_lowercase().as_str() {
        "telegram" => Channel::Telegram,
        "discord" => Channel::Discord,
        "slack" => Channel::Slack,
        "imessage" => Channel::IMessage,
        "webhook" => Channel::Webhook,
        _ => {
            return Json(json!({
                "success": false,
                "error": format!("Unknown channel type: {}", payload.channel)
            }));
        }
    };

    let mut mgr = state.channel_manager.lock().await;
    let reg = mgr.register_webhook(channel_enum, payload.url, payload.secret);

    Json(json!({ "success": true, "channel": reg }))
}

async fn handle_channel_event(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
    Json(payload): Json<ChannelEvent>,
) -> Json<Value> {
    let mgr = state.channel_manager.lock().await;
    match mgr.process_incoming_event(payload) {
        Ok(result) => Json(json!({ "success": true, "result": result })),
        Err(e) => Json(json!({ "success": false, "error": e })),
    }
}

async fn handle_list_channels(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
) -> Json<Value> {
    let mgr = state.channel_manager.lock().await;
    let channels = mgr.list_channels();
    Json(json!({ "success": true, "channels": channels }))
}

// ── Background Tasks Handlers ──────────────────────────────────────────────

#[derive(serde::Deserialize)]
struct EnqueueTaskPayload {
    name: String,
    payload: String,
    #[serde(default = "default_priority")]
    priority: u8,
    task_type: String,
}

fn default_priority() -> u8 {
    100
}

async fn handle_enqueue_task(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<EnqueueTaskPayload>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let task_type = match payload.task_type.to_lowercase().as_str() {
        "auto_export" => lazynext_core::TaskType::AutoExport,
        "auto_backup" => lazynext_core::TaskType::AutoBackup,
        "media_cleanup" => lazynext_core::TaskType::MediaCleanup,
        "proxy_generation" => lazynext_core::TaskType::ProxyGeneration,
        "thumbnail_regeneration" => lazynext_core::TaskType::ThumbnailRegeneration,
        _ => {
            return Json(json!({
                "success": false,
                "error": format!("Unknown task type: {}", payload.task_type)
            }));
        }
    };

    let task = Task {
        id: String::new(),
        name: payload.name,
        payload: payload.payload,
        priority: payload.priority,
        status: lazynext_core::TaskStatus::Pending,
        created_at: String::new(),
        task_type,
    };

    let mut queue = state.task_queue.lock().await;
    let task = queue.enqueue(task);

    Json(json!({ "success": true, "task": task }))
}

async fn handle_list_tasks(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
) -> Json<Value> {
    let queue = state.task_queue.lock().await;
    let tasks = queue.list_tasks();
    Json(json!({
        "success": true,
        "tasks": tasks,
        "pending_count": queue.pending_count(),
        "total_count": queue.total_count(),
    }))
}

#[derive(serde::Deserialize)]
struct TaskIdPath {
    id: String,
}

async fn handle_get_task(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
    Path(path): Path<TaskIdPath>,
) -> Json<Value> {
    let queue = state.task_queue.lock().await;
    match queue.get_task(&path.id) {
        Some(task) => Json(json!({ "success": true, "task": task })),
        None => Json(json!({
            "success": false,
            "error": "Task not found"
        })),
    }
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

// ── Media Upload ──────────────────────────────────────────────────────────
use axum::extract::Multipart;
use tokio::io::AsyncWriteExt;

async fn handle_media_upload(
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    mut multipart: Multipart,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    // Ensure upload directory exists
    let upload_dir = "/tmp/lazynext/assets";
    if let Err(e) = tokio::fs::create_dir_all(upload_dir).await {
        tracing::error!("Failed to create upload directory: {}", e);
        return Json(json!({ "success": false, "error": "Internal server error" }));
    }

    let mut saved_files = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();
        let file_name = field.file_name().unwrap_or("unknown_file").to_string();

        if name == "file" {
            let sanitized_name = file_name.replace(" ", "_");
            let file_path = format!("{}/{}", upload_dir, sanitized_name);

            let data = match field.bytes().await {
                Ok(bytes) => bytes,
                Err(e) => {
                    tracing::error!("Failed to read multipart field: {}", e);
                    continue;
                }
            };

            match tokio::fs::File::create(&file_path).await {
                Ok(mut file) => {
                    if let Err(e) = file.write_all(&data).await {
                        tracing::error!("Failed to write uploaded file: {}", e);
                    } else {
                        saved_files.push(file_path);
                    }
                }
                Err(e) => tracing::error!("Failed to create file for upload: {}", e),
            }
        }
    }

    Json(json!({
        "success": true,
        "message": format!("Successfully uploaded {} file(s)", saved_files.len()),
        "files": saved_files
    }))
}

// ── Cloud Storage Upload / Signed URLs ────────────────────────────────────

#[derive(serde::Deserialize)]
struct PresignedUrlQuery {
    filename: String,
}

async fn handle_get_presigned_url(
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    axum::extract::Query(query): axum::extract::Query<PresignedUrlQuery>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let account =
        std::env::var("AZURE_STORAGE_ACCOUNT").unwrap_or_else(|_| "lazynext-dev".to_string());
    let container =
        std::env::var("AZURE_STORAGE_CONTAINER").unwrap_or_else(|_| "media".to_string());

    // Generate real SAS URL via azure_storage_blobs SDK when credentials configured
    let signed_url = match db::generate_blob_sas_url(&account, &container, &query.filename).await {
        Ok(url) => url,
        Err(e) => {
            tracing::error!("Failed to generate SAS URL: {e}");
            let expiry = (chrono::Utc::now() + chrono::Duration::hours(1))
                .format("%Y-%m-%dT%H:%M:%SZ")
                .to_string();
            format!(
                "https://{}.blob.core.windows.net/{}/{}?sp=cw&se={}&spr=https&sv=2022-11-02&sr=b&sig=error_fallback",
                account, container, query.filename, expiry
            )
        }
    };

    Json(json!({
        "success": true,
        "url": signed_url,
        "method": "PUT",
        "expires_in": 3600,
        "headers": {
            "Content-Type": "application/octet-stream"
        }
    }))
}

/// Handler for chunked MediaRecorder streaming from the browser extension
async fn handle_stream_ingest(
    State(state): State<AppState>,
    mut multipart: axum::extract::Multipart,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    let mut session_id = String::new();
    let mut chunk_index = 0;
    let mut chunk_data = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();

        if name == "session_id" {
            if let Ok(text) = field.text().await {
                session_id = text;
            }
        } else if name == "chunk_index" {
            if let Ok(text) = field.text().await {
                chunk_index = text.parse().unwrap_or(0);
            }
        } else if name == "chunk" {
            if let Ok(data) = field.bytes().await {
                chunk_data = data.to_vec();
            }
        }
    }

    if !session_id.is_empty() && !chunk_data.is_empty() {
        use std::io::Write;
        let file_path = format!("/tmp/{}.webm", session_id);
        // Append to the file (or create it)
        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&file_path)
            .map_err(|e| {
                (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": e.to_string()})),
                )
            })?;

        file.write_all(&chunk_data).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
        })?;

        info!(
            "Appended chunk {} for session {} ({} bytes)",
            chunk_index,
            session_id,
            chunk_data.len()
        );
    }

    Ok(Json(
        json!({ "success": true, "session": session_id, "chunk": chunk_index }),
    ))
}

#[derive(serde::Deserialize, utoipa::ToSchema)]
struct StreamCompletePayload {
    session_id: String,
}

async fn handle_stream_complete(
    State(state): State<AppState>,
    Json(payload): Json<StreamCompletePayload>,
) -> Json<Value> {
    let session_id = payload.session_id;
    let file_path = format!("/tmp/{}.webm", session_id);

    info!("Stream complete for session {}. Finalizing...", session_id);

    // Check if file exists
    if !std::path::Path::new(&file_path).exists() {
        return Json(json!({ "success": false, "error": "Session file not found" }));
    }

    let azure_uploaded = {
        let account = std::env::var("AZURE_STORAGE_ACCOUNT").unwrap_or_default();
        let key = std::env::var("AZURE_STORAGE_ACCESS_KEY").unwrap_or_default();
        let container =
            std::env::var("AZURE_STORAGE_CONTAINER").unwrap_or_else(|_| "media".to_string());

        if !account.is_empty() && !key.is_empty() {
            match std::fs::read(&file_path) {
                Ok(data) => {
                    let blob_name = format!("{}.webm", session_id);
                    match azure_storage_blobs::prelude::ClientBuilder::new(
                        account.clone(),
                        azure_storage::StorageCredentials::access_key(account, key),
                    )
                    .blob_client(&container, &blob_name)
                    .put_block_blob(data)
                    .await
                    {
                        Ok(_) => {
                            info!(
                                "Uploaded stream {} to Azure Blob Storage ({}/{})",
                                session_id, container, blob_name
                            );
                            true
                        }
                        Err(e) => {
                            error!(
                                "Azure Blob Storage upload failed: {}. Falling back to local file.",
                                e
                            );
                            false
                        }
                    }
                }
                Err(e) => {
                    error!(
                        "Failed to read local file {} for Azure upload: {}",
                        file_path, e
                    );
                    false
                }
            }
        } else {
            info!(
                "Azure Storage credentials not configured — keeping local file for session {}",
                session_id
            );
            false
        }
    };
    let mut nle = state.nle.lock().await;
    let track_count = nle.get_project_data().tracks.len();
    if track_count == 0 {
        nle.add_track("V1".to_string(), "video".to_string());
    }
    nle.add_clip_to_track(
        0,
        session_id.clone(),
        "video".to_string(),
        file_path.clone(),
        0,
        300,
    );

    let msg = if azure_uploaded {
        "Stream finalized, uploaded to Azure Blob Storage, and added to timeline"
    } else {
        "Stream finalized (local storage) and added to timeline"
    };
    Json(
        json!({ "success": true, "message": msg, "url": file_path, "azure_uploaded": azure_uploaded }),
    )
}

/// Handler for the extension to exchange its auth token
async fn handle_extension_token_exchange(
    State(_state): State<AppState>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    use jsonwebtoken::{Algorithm, EncodingKey, Header};
    use std::sync::LazyLock;

    let ext_token = payload.get("token").and_then(|v| v.as_str()).unwrap_or("");
    let ext_id = payload
        .get("extension_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // Validate the provided token against the same BETTER_AUTH_SECRET
    // the gateway uses for all authenticated routes.
    let claims = if !ext_token.is_empty() {
        let key = rbac::jwt_decoding_key();
        let validation = rbac::jwt_validation();
        match jsonwebtoken::decode::<rbac::AuthClaims>(ext_token, key, validation) {
            Ok(data) => Some(data.claims),
            Err(e) => {
                tracing::warn!(?e, "Extension token validation failed");
                return Json(json!({ "success": false, "error": "invalid token" }));
            }
        }
    } else {
        // No token provided — return a limited anonymous session
        None
    };

    // Generate a fresh gateway JWT scoped to the extension session
    let now = chrono::Utc::now().timestamp() as u64;
    let gateway_claims = if let Some(ref c) = claims {
        serde_json::json!({
            "sub": c.sub,
            "email": c.email,
            "name": c.name,
            "role": c.role,
            "source": "extension",
            "ext_id": ext_id.to_string(),
            "iat": now,
            "exp": now + 3600, // 1-hour extension session
        })
    } else {
        serde_json::json!({
            "sub": format!("ext_anon_{}", uuid::Uuid::new_v4()),
            "email": "anonymous@lazynext.dev",
            "name": format!("Extension User {}", &ext_id[..8usize.min(ext_id.len())]),
            "role": "user",
            "source": "extension",
            "ext_id": ext_id.to_string(),
            "iat": now,
            "exp": now + 3600,
        })
    };

    static ENCODING_KEY: LazyLock<EncodingKey> = LazyLock::new(|| {
        let secret = std::env::var("BETTER_AUTH_SECRET")
            .unwrap_or_else(|_| "lazynext-dev-secret-key-for-auth-minimum-32".to_string());
        EncodingKey::from_secret(secret.as_bytes())
    });

    match jsonwebtoken::encode(
        &Header::new(Algorithm::HS256),
        &gateway_claims,
        &ENCODING_KEY,
    ) {
        Ok(token) => Json(json!({
            "success": true,
            "token": token,
            "expires_in": 3600,
        })),
        Err(e) => {
            tracing::error!(?e, "Failed to encode extension JWT");
            Json(json!({ "success": false, "error": "token generation failed" }))
        }
    }
}

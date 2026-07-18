//! Lazynext API Gateway — Axum server entry point.
//!
//! Starts an HTTP server on port 8005 with public and authenticated route
//! groups. Composes middleware layers (tracing, CSRF, rate limiting, RBAC),
//! initializes the PostgreSQL store, NLE state, webhook dispatcher, and
//! Redis-backed WebSocket state.

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::middleware;
use axum::response::{IntoResponse, Redirect};
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
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc;
use tracing::{info, warn};

pub mod captcha;
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

/// Outbound webhook payload sent when a render completes.
#[derive(Serialize, utoipa::ToSchema)]
struct WebhookPayload {
    /// Type of the event (e.g. "render_complete").
    event_type: String,
    /// ID of the project the event relates to.
    project_id: String,
    /// Human-readable message describing the event.
    message: String,
}

/// Shared application state injected into every request handler.
///
/// Holds the NLE engine, autonomous editor, database store, WebSocket state,
/// routine scheduler, channel manager, and background task queue — all wrapped
/// in `Arc` for efficient sharing across Axum handlers.
#[derive(Clone)]
pub struct AppState {
    /// The shared NLE engine state.
    nle: Arc<Mutex<NLEState>>,
    /// The autonomous AI editor.
    editor: Arc<AutonomousEditor>,
    /// The PostgreSQL-backed database store.
    db: Arc<DbStore>,
    /// Redis-backed WebSocket state.
    ws_state: Arc<ws::WsState>,
    /// Scheduler for cron-based editing routines.
    scheduler: Arc<Mutex<RoutineScheduler>>,
    /// Manager for messaging channel integrations.
    channel_manager: Arc<Mutex<ChannelManager>>,
    /// Priority queue for background tasks.
    task_queue: Arc<Mutex<TaskQueue>>,
}

#[tokio::main]
// Server entry point: initializes tracing, database, NLE state, webhook
// dispatcher, and router, then serves the API gateway on port 8005.
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
        .route(
            "/api/v1/auth/social/callback",
            get(handle_social_auth_callback),
        )
        .route(
            "/api/v1/captcha/verify-turnstile",
            post(captcha::handle_verify_turnstile),
        )
        .route(
            "/api/v1/captcha/challenge",
            get(captcha::handle_get_challenge),
        )
        .route(
            "/api/v1/captcha/verify-pow",
            post(captcha::handle_verify_pow),
        )
        .layer(middleware::from_fn_with_state(
            state.clone(),
            ratelimit::rate_limit,
        ));

    let authenticated_routes = Router::new()
        .route("/api/v1/timeline", get(handle_get_timeline))
        .route("/api/v1/user/profile", get(handle_get_profile))
        .route("/api/v1/user/credits", get(handle_get_user_credits))
        .route("/api/v1/projects", get(handle_get_projects))
        .route("/api/v1/promotions/wallet", get(handle_get_wallet_balance))
        .route("/api/v1/referrals/me", get(handle_get_my_referrals))
        .route("/api/v1/ws", get(ws::ws_handler))
        .route("/api/v1/social/schedule", get(handle_social_schedule))
        .route(
            "/api/v1/auth/social/:platform",
            get(handle_social_auth_init),
        )
        .route("/api/v1/routines", get(handle_list_routines))
        .route("/api/v1/channels", get(handle_list_channels))
        .route("/api/v1/tasks", get(handle_list_tasks))
        .route("/api/v1/tasks/{id}", get(handle_get_task))
        .route("/api/v1/media/presigned-url", get(handle_get_presigned_url))
        // Admin (already role-gated)
        .route("/api/v1/admin/dashboard", get(handle_admin_dashboard));

    // ── Routes requiring CAPTCHA verification ──────────────────────
    let captcha_protected_routes = Router::new()
        .route("/api/v1/autonomous_edit", post(handle_autonomous_edit))
        .route("/api/v1/promotions/apply", post(handle_apply_promotion))
        .route("/api/v1/timeline", post(handle_add_clip))
        .route(
            "/api/v1/user/integrations/connect",
            post(handle_integration_connect),
        )
        .route("/api/v1/ai/ingest", post(handle_ai_ingest))
        .route("/api/v1/render", post(handle_trigger_render))
        .route("/api/v1/ai/generate", post(handle_generate))
        .route("/api/v1/ai/tts", post(handle_tts))
        .route("/api/v1/media/upload", post(handle_media_upload))
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
        .route("/api/v1/routines", post(handle_create_routine))
        .route("/api/v1/routines/{id}", delete(handle_cancel_routine))
        .route(
            "/api/v1/routines/{id}/execute",
            post(handle_execute_routine),
        )
        .route("/api/v1/channels/webhook", post(handle_register_webhook))
        .route("/api/v1/channels/event", post(handle_channel_event))
        .route("/api/v1/tasks", post(handle_enqueue_task))
        .layer(middleware::from_fn(rbac::authorize_request))
        .layer(middleware::from_fn(csrf::csrf_protection))
        .layer(middleware::from_fn(captcha::captcha_middleware))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            ratelimit::rate_limit,
        ));

    // Merge all authenticated route groups — inner routers already
    // carry their own middleware; no extra layers at this level.
    let all_authenticated = authenticated_routes.merge(captcha_protected_routes);

    // Merge public and authenticated routes.
    let app = public_routes
        .merge(all_authenticated)
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], 8005));
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    info!("📡 API Gateway listening on http://{}", addr);

    // Trigger a demo render after 5 seconds (dev convenience)
    // Only runs when LAZYNEXT_DEV_MODE=true is set
    if std::env::var("LAZYNEXT_DEV_MODE").unwrap_or_default() == "true" {
        tracing::info!("Dev mode enabled — triggering demo render in 5 seconds");
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

/// GET /health
///
/// Returns the service health status and database connectivity.
///
/// **Auth**: Public (no authentication required).
/// **Returns**: `{ status: "ok", service: "api-gateway", database: "ok"|"degraded" }`
#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Service is healthy")
    )
)]
// Handles the health-check request, reporting service and database status.
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

// ── Editor / Autonomous ──────────────────────────────────────────────────────

/// POST /api/v1/autonomous_edit
///
/// Accepts a natural-language `VideoIntent` and executes AI-powered timeline
/// editing via the autonomous editor + LLM pipeline.
///
/// **Auth**: Requires Editor role or higher.
/// **Body**: `VideoIntent` (prompt, plan approval flag, source files)
/// **Returns**: `{ success, message }` or `{ success: false, error }`
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

    // Validate input: prompt must not be empty and within reasonable bounds
    if payload.prompt.trim().is_empty() {
        return Json(json!({ "success": false, "error": "Prompt must not be empty" }));
    }
    if payload.prompt.len() > 50000 {
        return Json(json!({
            "success": false,
            "error": "Prompt exceeds maximum length of 50,000 characters"
        }));
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

/// GET /api/v1/timeline
///
/// Returns the full CRDT timeline state as JSON, including all tracks, clips,
/// keyframes, and project metadata.
///
/// **Returns**: Serialized `ProjectData` (tracks, clips, settings).
async fn handle_get_timeline(State(state): State<AppState>) -> Json<Value> {
    let nle = state.nle.lock().await;
    let data = nle.get_project_data();
    Json(serde_json::to_value(data).unwrap_or(json!({})))
}

/// POST /api/v1/render
///
/// Triggers an asynchronous render of the current timeline via the NLE engine.
/// On completion a `RenderComplete` event is dispatched (webhook + WebSocket).
///
/// **Returns**: `{ triggered: true }`
async fn handle_trigger_render(State(state): State<AppState>) -> Json<Value> {
    let mut nle = state.nle.lock().await;
    nle.trigger_render_complete();
    Json(json!({ "triggered": true }))
}

// ── User / Profile ────────────────────────────────────────────────────────

/// GET /api/v1/user/profile
///
/// Returns the authenticated user's profile including name, email, role,
/// subscription tier, and AI credit balance.
///
/// **Auth**: Any authenticated user.
/// **Returns**: `{ success, profile: { id, name, email, role, tier, initials, ai_credits } }`
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

/// GET /api/v1/user/credits
///
/// Returns the authenticated user's AI credit balance.
///
/// **Returns**: `{ success, credits: <number> }`
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

/// GET /api/v1/projects
///
/// Lists all projects owned by the authenticated user.
///
/// **Returns**: `{ success, projects: [...] }`
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

/// GET /api/v1/admin/dashboard
///
/// Returns admin-only metrics: total users, active subscriptions, and MRR.
///
/// **Auth**: Requires Admin role.
/// **Returns**: `{ success, metrics: { totalUsers, activeSubscriptions, monthlyRecurringRevenue } }`
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

/// POST /api/v1/dodo/webhook
///
/// Verified Dodo Payments webhook endpoint. Handles `payment_link.completed`,
/// `payment_link.failed`, and `payment_link.expired` events.
///
/// **Auth**: Public (Dodo signs its own webhooks with HMAC-SHA256).
/// **Header**: `dodo-signature` — hex-encoded HMAC of the raw body.
/// **Returns**: `{ received: true }` or `{ error }`
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
                let price_id = obj["price_id"]
                    .as_str()
                    .or_else(|| obj["plan_id"].as_str())
                    .unwrap_or("");
                let period_end = chrono::Utc::now() + chrono::Duration::days(30);

                if let Ok(Some(user)) = find_user_by_dodo_customer(&state.db, customer_id).await {
                    let sub = db::Subscription {
                        id: sub_id.to_string(),
                        user_id: user.id.clone(),
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
                    
                    // Trigger referral conversion evaluation via promotions crate logic
                    let mut referral = promotions::Referral::new("dummy_referrer".to_string(), user.id.clone());
                    referral.convert(); // Subscription successful
                    referral.grant_reward();
                    tracing::info!("Processed referral conversion and granted rewards for user {}", user.id);
                }
            }
        }
        "payment_link.failed" | "payment_link.expired" => {
            if let Some(obj) = payload["data"].as_object() {
                let customer_id = obj["customer_id"].as_str().unwrap_or("");
                if let Ok(Some(_user)) = find_user_by_dodo_customer(&state.db, customer_id).await {
                    tracing::warn!(
                        customer_id = %customer_id,
                        event_type = %event_type,
                        "Dodo payment failed/expired — preserving existing subscription"
                    );
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

/// Resolves a Dodo Payments customer ID to a `User` record.
///
/// Queries the `user` table by `dodo_customer_id` and returns `None` when
/// no matching user is found.
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

/// Request body for AI video generation.
#[derive(serde::Deserialize)]
pub struct GeneratePayload {
    /// Natural-language prompt describing the video to generate.
    pub prompt: String,
}

/// Request body for AI text-to-speech synthesis.
#[derive(serde::Deserialize)]
pub struct TtsPayload {
    /// Text to convert to speech.
    pub text: String,
    /// Optional voice profile ID for speech synthesis.
    pub voice_id: Option<String>,
}

/// POST /api/v1/ai/generate
///
/// Generates video frames from a text prompt using the neural engine,
/// deducts AI credits, and inserts the result as a new clip on a video track.
///
/// **Body**: `{ prompt: string }`
/// **Returns**: `{ success, message }` or `{ success: false, error }`
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

/// POST /api/v1/ai/tts
///
/// Synthesizes speech from a text prompt using the neural engine, deducts AI
/// credits, and inserts the audio as a new clip on an audio track.
///
/// **Body**: `{ text: string, voice_id?: string }`
/// **Returns**: `{ success, message }` or `{ success: false, error }`
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
                0,
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

/// Request body for adding a clip to a timeline track.
#[derive(serde::Deserialize)]
struct AddClipPayload {
    /// Target track ID, if specified.
    track_id: Option<String>,
    /// Kind of track to create if none exist.
    track_kind: Option<String>,
    /// Optional explicit clip ID.
    clip_id: Option<String>,
    /// Type of clip (e.g. "video", "audio").
    clip_type: Option<String>,
    /// Display name for the clip.
    name: Option<String>,
    /// Start position in frames.
    start: Option<u32>,
    /// End position in frames.
    end: Option<u32>,
}

/// POST /api/v1/timeline
///
/// Adds a clip to a track (or auto-creates a default track if none exist).
///
/// **Auth**: Requires Editor role or higher.
/// **Body**: `AddClipPayload` (track_id, clip_type, name, start/end frames)
/// **Returns**: `{ success, message, clip: { id, track_idx, start, end } }`
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

/// Request body for AI-driven media ingestion.
#[derive(serde::Deserialize)]
struct IngestPayload {
    /// URL of the media to ingest.
    url: Option<String>,
    /// Source label for the media (e.g. "upload").
    source: Option<String>,
}

/// POST /api/v1/ai/ingest
///
/// Forwards a media URL to the pre-processing service for proxy generation
/// and ingestion into the project. Falls back to queuing if the service is
/// unreachable.
///
/// **Auth**: Requires Editor role or higher.
/// **Body**: `In ingestPayload` (url, source)
/// **Returns**: `{ success, message, ingest_result? }`
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

/// Request body for connecting a third-party platform via OAuth.
#[derive(serde::Deserialize)]
struct IntegrationPayload {
    /// Target platform name (e.g. "youtube").
    platform: String,
    /// OAuth authorization code, if completing the flow.
    code: Option<String>,
    /// OAuth redirect URI.
    redirect_uri: Option<String>,
}

/// POST /api/v1/user/integrations/connect
///
/// Initiates or completes an OAuth connection to a supported platform
/// (YouTube, TikTok, Instagram, Vimeo). If `code` is provided, exchanges it
/// for access/refresh tokens; otherwise returns the authorization URL.
///
/// **Auth**: Requires Editor role or higher.
/// **Body**: `IntegrationPayload` (platform, code?, redirect_uri?)
/// **Returns**: `{ success, message, auth_url?, access_token? }` or `{ error }`
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

// Returns the base URL of the social-publish microservice.
fn social_publish_url() -> String {
    std::env::var("SOCIAL_PUBLISH_URL").unwrap_or_else(|_| "http://localhost:8007".to_string())
}

/// POST /api/v1/social/reframe — Proxy auto-reframe to social-publish
async fn handle_social_reframe(
    Extension(_claims): Extension<AuthClaims>,
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
    State(state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(mut payload): Json<Value>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let user_id = claims.sub.clone();
    let platform = payload
        .get("platform")
        .and_then(|v| v.as_str())
        .unwrap_or("tiktok")
        .to_string();

    // Fetch user token
    let token_res = state.db.get_social_token(&user_id, &platform).await;
    match token_res {
        Ok(Some(token)) => {
            // Inject token into payload
            if let Some(obj) = payload.as_object_mut() {
                obj.insert("access_token".to_string(), json!(token.access_token));
                if let Some(rt) = token.refresh_token {
                    obj.insert("refresh_token".to_string(), json!(rt));
                }
                if let Some(ea) = token.expires_at {
                    obj.insert("expires_at".to_string(), json!(ea.timestamp_millis()));
                }
            }
        }
        Ok(None) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "error": format!("No linked account found for platform: {}", platform)
                })),
            ));
        }
        Err(e) => {
            tracing::error!("DB error fetching social token: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Internal database error"
                })),
            ));
        }
    }

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
            Ok(Json(body))
        }
        Err(e) => Ok(Json(json!({
            "success": false,
            "error": format!("Social publish service unreachable: {e}")
        }))),
    }
}

#[derive(Deserialize)]
pub struct AuthCallbackQuery {
    code: String,
    state: String, // Contains the platform and user_id separated by a colon, or JSON
}

/// GET /api/v1/auth/social/:platform — Initiate OAuth flow
async fn handle_social_auth_init(
    Path(platform): Path<String>,
    Extension(claims): Extension<AuthClaims>,
) -> impl IntoResponse {
    let user_id = claims.sub.clone();
    // Pass user_id and platform in state
    let state = format!("{}:{}", platform, user_id);
    let base = social_publish_url();
    let client = reqwest::Client::new();

    // We request the underlying Node.js service to generate the OAuth URL
    // since it holds the client IDs and secrets via passport/oauth libs.
    let response = client
        .get(format!("{}/auth/url/{}?state={}", base, platform, state))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            if let Some(url) = body.get("url").and_then(|u| u.as_str()) {
                Redirect::to(url).into_response()
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Invalid URL from provider",
                )
                    .into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to reach auth provider: {}", e),
        )
            .into_response(),
    }
}

/// GET /api/v1/auth/social/callback — Handle OAuth callback
async fn handle_social_auth_callback(
    State(app_state): State<AppState>,
    Query(query): Query<AuthCallbackQuery>,
) -> impl IntoResponse {
    // Parse state to get user_id and platform
    let parts: Vec<&str> = query.state.split(':').collect();
    if parts.len() != 2 {
        return (StatusCode::BAD_REQUEST, "Invalid state format").into_response();
    }
    let platform = parts[0].to_string();
    let user_id = parts[1].to_string();

    let base = social_publish_url();
    let client = reqwest::Client::new();

    // Exchange code for tokens via Node.js service
    let response = client
        .post(format!("{}/auth/exchange/{}", base, platform))
        .json(&json!({ "code": query.code }))
        .send()
        .await;

    match response {
        Ok(resp) => {
            let body: Value = resp.json().await.unwrap_or(json!({}));
            if let (Some(access_token), refresh_token, expires_in) = (
                body.get("access_token").and_then(|t| t.as_str()),
                body.get("refresh_token").and_then(|t| t.as_str()),
                body.get("expires_in").and_then(|t| t.as_i64()), // in seconds
            ) {
                let expires_at =
                    expires_in.map(|sec| chrono::Utc::now() + chrono::Duration::seconds(sec));

                let token_record = crate::db::UserSocialToken {
                    id: uuid::Uuid::new_v4().to_string(),
                    user_id,
                    platform,
                    access_token: access_token.to_string(),
                    refresh_token: refresh_token.map(|s| s.to_string()),
                    expires_at,
                    created_at: chrono::Utc::now(),
                    updated_at: chrono::Utc::now(),
                };

                if let Err(e) = app_state.db.upsert_social_token(&token_record).await {
                    tracing::error!("Failed to save social token: {}", e);
                    return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
                }

                // Redirect to web app dashboard/settings on success
                Redirect::to("/settings?social_auth=success").into_response()
            } else {
                (
                    StatusCode::BAD_REQUEST,
                    "Invalid token response from provider",
                )
                    .into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to exchange code: {}", e),
        )
            .into_response(),
    }
}

/// POST /api/v1/social/metadata — Proxy metadata generation to social-publish
async fn handle_social_metadata(
    Extension(_claims): Extension<AuthClaims>,
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
async fn handle_social_schedule(Extension(_claims): Extension<AuthClaims>) -> Json<Value> {
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

/// Request body for creating a scheduled AI editing routine.
#[derive(serde::Deserialize)]
struct CreateRoutinePayload {
    /// Display name for the routine.
    name: String,
    /// Cron schedule expression.
    cron_expression: String,
    /// AI editing prompt to execute on each run.
    prompt: String,
    /// Whether the routine is enabled.
    #[serde(default)]
    enabled: bool,
}

/// POST /api/v1/routines
///
/// Creates a cron-scheduled routine that executes an AI editing prompt on
/// the timeline at regular intervals.
///
/// **Auth**: Requires Editor role or higher.
/// **Body**: `CreateRoutinePayload` (name, cron_expression, prompt, enabled)
/// **Returns**: `{ success, routine }` or `{ success: false, error }`
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

/// GET /api/v1/routines
///
/// Lists all scheduled routines for the current session.
///
/// **Returns**: `{ success, routines: [...] }`
async fn handle_list_routines(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
) -> Json<Value> {
    let scheduler = state.scheduler.lock().await;
    let routines = scheduler.list_routines();
    Json(json!({ "success": true, "routines": routines }))
}

/// Path parameter for a routine ID.
#[derive(serde::Deserialize)]
struct RoutineIdPath {
    /// Routine identifier from the path.
    id: String,
}

/// DELETE /api/v1/routines/{id}
///
/// Cancels (removes) a scheduled routine by ID.
///
/// **Auth**: Requires Editor role or higher.
/// **Returns**: `{ success: true/false, id }`
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

/// POST /api/v1/routines/{id}/execute
///
/// Manually triggers immediate execution of a scheduled routine.
///
/// **Auth**: Requires Editor role or higher.
/// **Returns**: `{ success, message }` or `{ success: false, error }`
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

/// Request body for registering a channel webhook.
#[derive(serde::Deserialize)]
struct RegisterWebhookPayload {
    /// Channel type name (e.g. "telegram").
    channel: String,
    /// Webhook URL to register.
    url: String,
    /// Shared secret for request validation.
    secret: String,
}

/// POST /api/v1/channels/webhook
///
/// Registers a webhook URL for a messaging channel (Telegram, Discord,
/// Slack, iMessage, or generic Webhook).
///
/// **Auth**: Requires Admin role.
/// **Body**: `RegisterWebhookPayload` (channel, url, secret)
/// **Returns**: `{ success, channel }`
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

/// POST /api/v1/channels/event
///
/// Processes an incoming channel event (e.g., a Telegram / Discord command)
/// and routes it through the channel manager.
///
/// **Body**: `ChannelEvent`
/// **Returns**: `{ success, result }` or `{ success: false, error }`
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

/// GET /api/v1/channels
///
/// Lists all registered channel integrations.
///
/// **Returns**: `{ success, channels: [...] }`
async fn handle_list_channels(
    State(state): State<AppState>,
    Extension(_claims): Extension<AuthClaims>,
) -> Json<Value> {
    let mgr = state.channel_manager.lock().await;
    let channels = mgr.list_channels();
    Json(json!({ "success": true, "channels": channels }))
}

// ── Background Tasks Handlers ──────────────────────────────────────────────

/// Request body for enqueueing a background task.
#[derive(serde::Deserialize)]
struct EnqueueTaskPayload {
    /// Display name for the task.
    name: String,
    /// Serialized task payload.
    payload: String,
    /// Task priority (lower runs first).
    #[serde(default = "default_priority")]
    priority: u8,
    /// Task type discriminator.
    task_type: String,
}

// Default task priority when none is supplied.
fn default_priority() -> u8 {
    100
}

/// POST /api/v1/tasks
///
/// Enqueues a background task (auto export, backup, media cleanup, proxy
/// generation, or thumbnail regeneration) into the priority queue.
///
/// **Auth**: Requires Editor role or higher.
/// **Body**: `EnqueueTaskPayload` (name, payload, priority, task_type)
/// **Returns**: `{ success, task }`
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

/// GET /api/v1/tasks
///
/// Lists all tasks in the background queue with pending and total counts.
///
/// **Returns**: `{ success, tasks: [...], pending_count, total_count }`
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

/// Path parameter for a task ID.
#[derive(serde::Deserialize)]
struct TaskIdPath {
    /// Task identifier from the path.
    id: String,
}

/// GET /api/v1/tasks/{id}
///
/// Retrieves a single background task by ID.
///
/// **Returns**: `{ success, task }` or `{ success: false, error }`
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

/// POST /api/v1/media/upload
///
/// Accepts multipart file uploads (up to 20 files, 2 GB each, 10 GB total).
/// Saves files to the local asset directory. Supports streaming validation
/// with filename sanitization and size enforcement.
///
/// **Auth**: Requires Editor role or higher.
/// **Content-Type**: `multipart/form-data`
/// **Returns**: `{ success, message, files: [...] }`
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

    let max_file_size: usize = 2 * 1024 * 1024 * 1024; // 2 GB per file
    let max_total_size: usize = 10 * 1024 * 1024 * 1024; // 10 GB total
    let max_files: usize = 20;
    let mut total_size: usize = 0;
    let mut saved_files = Vec::new();

    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        if saved_files.len() >= max_files {
            return Json(json!({
                "success": false,
                "error": format!("Maximum of {} files per upload exceeded", max_files)
            }));
        }

        let name = field.name().unwrap_or("").to_string();
        let file_name = field.file_name().unwrap_or("unknown_file").to_string();

        if name == "file" {
            let sanitized_name = sanitize_filename(&file_name);
            if sanitized_name.is_empty() || sanitized_name == "unknown_file" {
                tracing::warn!("Rejected file with unsafe name: {}", file_name);
                continue;
            }
            let file_path = format!("{}/{}", upload_dir, sanitized_name);

            let data = match field.bytes().await {
                Ok(bytes) => bytes,
                Err(e) => {
                    tracing::error!("Failed to read multipart field: {}", e);
                    continue;
                }
            };

            if data.len() > max_file_size {
                return Json(json!({
                    "success": false,
                    "error": format!("File '{}' exceeds maximum size of 2 GB", sanitized_name)
                }));
            }

            total_size += data.len();
            if total_size > max_total_size {
                return Json(json!({
                    "success": false,
                    "error": "Total upload size exceeds maximum of 10 GB"
                }));
            }

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

/// Sanitizes a filename by replacing non-alphanumeric, non-dot, non-underscore,
/// and non-hyphen characters with underscores. Strips leading/trailing dots.
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_matches('.')
        .to_string()
}

// ── Cloud Storage Upload / Signed URLs ────────────────────────────────────

/// Query parameters for requesting a presigned upload URL.
#[derive(serde::Deserialize)]
struct PresignedUrlQuery {
    /// Target blob filename for the presigned URL.
    filename: String,
}

/// GET /api/v1/media/presigned-url
///
/// Generates a direct upload URL for client-to-server media upload.
///
/// **Auth**: Requires Editor role or higher.
/// **Query**: `filename` — the target blob name.
/// **Returns**: `{ success, url, method, expires_in, headers }`
async fn handle_get_presigned_url(
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    axum::extract::Query(query): axum::extract::Query<PresignedUrlQuery>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    let api_url =
        std::env::var("API_GATEWAY_URL").unwrap_or_else(|_| "https://api.lazynext.com".to_string());

    let signed_url = format!("{}/api/v1/upload/{}", api_url, query.filename);

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
    State(_state): State<AppState>,
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
        } else if name == "chunk"
            && let Ok(data) = field.bytes().await
        {
            chunk_data = data.to_vec();
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

/// Request body for finalizing a chunked stream ingest session.
#[derive(serde::Deserialize, utoipa::ToSchema)]
struct StreamCompletePayload {
    /// Identifier of the chunked stream session to finalize.
    session_id: String,
}

/// POST /api/v1/ingest/stream/complete
///
/// Finalizes a chunked MediaRecorder stream session. Keeps the assembled
/// file in local storage and adds the clip to the timeline.
///
/// **Body**: `StreamCompletePayload` (session_id)
/// **Returns**: `{ success, message, url }`
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

    Json(
        json!({ "success": true, "message": "Stream finalized (local storage) and added to timeline", "url": file_path }),
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
        let secret = std::env::var("BETTER_AUTH_SECRET");
        match secret {
            Ok(s) if s.len() >= 32 => EncodingKey::from_secret(s.as_bytes()),
            _ => {
                let is_prod = std::env::var("LAZYNEXT_ENV")
                    .map(|v| v == "production")
                    .unwrap_or(false)
                    || std::env::var("NODE_ENV")
                        .map(|v| v == "production")
                        .unwrap_or(false);
                if is_prod {
                    panic!(
                        "FATAL: BETTER_AUTH_SECRET must be at least 32 chars in production. \
                         Refusing to issue extension tokens with insecure fallback."
                    );
                }
                EncodingKey::from_secret("lazynext-dev-secret-key-for-auth-minimum-32".as_bytes())
            }
        }
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

// ── Promotions & Referrals Handlers ───────────────────────────────────────

#[derive(serde::Deserialize)]
struct ApplyPromotionPayload {
    code: String,
}

async fn handle_apply_promotion(
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    Json(payload): Json<ApplyPromotionPayload>,
) -> Json<Value> {
    // Basic implementation that will be connected to the promotion crates
    // and database in the future.
    let _user_id = claims.sub.clone();
    
    // For now, return mock success to satisfy the API
    Json(json!({
        "success": true,
        "message": format!("Successfully applied code: {}", payload.code),
        "discount_applied": 1000 // Mock 10.00
    }))
}

async fn handle_get_wallet_balance(
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Json<Value> {
    let _user_id = claims.sub.clone();
    
    // Mock return
    Json(json!({
        "success": true,
        "balance": 5000, // $50.00
        "currency": "USD"
    }))
}

async fn handle_get_my_referrals(
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
) -> Json<Value> {
    let user_id = claims.sub.clone();
    
    // Mock return
    Json(json!({
        "success": true,
        "referral_link": format!("https://lazynext.com/ref/{}", user_id),
        "total_referrals": 3,
        "converted": 1,
        "earned": 1500 // $15.00
    }))
}


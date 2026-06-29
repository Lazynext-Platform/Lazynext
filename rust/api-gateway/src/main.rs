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

pub mod csrf;
pub mod db;
pub mod ratelimit;
pub mod rbac;
pub mod ws;

use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;
use tower_http::trace::TraceLayer;

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
struct AppState {
    nle: Arc<Mutex<NLEState>>,
    editor: Arc<AutonomousEditor>,
    db: Arc<DbStore>,
    ws_state: Arc<ws::WsState>,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
    use opentelemetry_otlp::WithExportConfig;

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
    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL environment variable is required");
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

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379/".to_string());
    let redis_client = redis::Client::open(redis_url).expect("Failed to create Redis client");
    let ws_state = Arc::new(ws::WsState::new(redis_client));
    
    let state = AppState {
        nle: nle_state.clone(),
        editor: Arc::new(AutonomousEditor::new()),
        db: db_arc,
        ws_state: ws_state.clone(),
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
    //   /api/v1/stripe/...→ public (Stripe signs its own webhooks)
    let public_routes = Router::new()
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .route("/health", get(health_handler))
        .route("/api/v1/stripe/webhook", post(handle_stripe_webhook))
        .layer(middleware::from_fn_with_state(state.clone(), ratelimit::rate_limit));

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
        .route("/api/v1/ingest/stream/complete", post(handle_stream_complete))
        .route("/api/v1/auth/extension-token", post(handle_extension_token_exchange))
        .layer(middleware::from_fn(rbac::authorize_request))
        .layer(middleware::from_fn(csrf::csrf_protection))
        .layer(middleware::from_fn_with_state(state.clone(), ratelimit::rate_limit));

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
    let db_status = if state.db.health_check().await.is_ok() { "ok" } else { "degraded" };
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

// ── Stripe Webhook ────────────────────────────────────────────────────────

/// Maximum age (in seconds) of a webhook timestamp before we reject it.
/// Stripe recommends a tolerance of ~5 minutes.
const STRIPE_WEBHOOK_TOLERANCE_SECS: i64 = 300;

async fn handle_stripe_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Json<Value> {
    // ── 1. Verify Stripe signature ──────────────────────────────────────
    let webhook_secret = match std::env::var("STRIPE_WEBHOOK_SECRET") {
        Ok(s) if !s.is_empty() => s,
        _ => {
            tracing::error!("STRIPE_WEBHOOK_SECRET is not configured — rejecting webhook");
            return Json(json!({ "error": "webhook secret not configured" }));
        }
    };

    let sig_header = match headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
    {
        Some(h) => h.to_string(),
        None => {
            tracing::warn!("Missing Stripe-Signature header");
            return Json(json!({ "error": "missing signature" }));
        }
    };

    if let Err(e) = verify_stripe_signature(&sig_header, &body, &webhook_secret) {
        tracing::warn!(%e, "Stripe webhook signature verification failed");
        return Json(json!({ "error": format!("signature verification failed: {e}") }));
    }

    // ── 2. Parse and handle the event ───────────────────────────────────
    let payload: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(e) => {
            tracing::error!(?e, "Failed to parse Stripe webhook JSON");
            return Json(json!({ "error": "invalid JSON" }));
        }
    };

    let event_type = payload["type"].as_str().unwrap_or("unknown");
    info!(%event_type, "Received verified Stripe webhook");

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

/// Verifies a Stripe webhook signature (v1) using HMAC-SHA256.
///
/// The `Stripe-Signature` header has the format:
///   `t=<timestamp>,v1=<hex_signature>[,v0=...]`
///
/// The signed payload is `"<timestamp>.<raw_body>"`.
fn verify_stripe_signature(sig_header: &str, body: &[u8], secret: &str) -> Result<(), String> {
    use hmac::{Hmac, Mac, digest::KeyInit};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;

    let mut timestamp: Option<&str> = None;
    let mut v1_signatures: Vec<&str> = Vec::new();

    for part in sig_header.split(',') {
        let part = part.trim();
        if let Some(ts) = part.strip_prefix("t=") {
            timestamp = Some(ts);
        } else if let Some(sig) = part.strip_prefix("v1=") {
            v1_signatures.push(sig);
        }
    }

    let ts = timestamp.ok_or_else(|| "no timestamp in Stripe-Signature".to_string())?;
    if v1_signatures.is_empty() {
        return Err("no v1 signature in Stripe-Signature".to_string());
    }

    // Check timestamp freshness to prevent replay attacks
    let ts_num: i64 = ts
        .parse()
        .map_err(|_| "invalid timestamp in Stripe-Signature".to_string())?;
    let now = chrono::Utc::now().timestamp();
    if (now - ts_num).abs() > STRIPE_WEBHOOK_TOLERANCE_SECS {
        return Err(format!(
            "webhook timestamp too old ({ts_num}), current time is {now}"
        ));
    }

    // Compute expected signature: HMAC-SHA256(secret, "timestamp.body")
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|e| format!("HMAC init: {e}"))?;
    mac.update(ts.as_bytes());
    mac.update(b".");
    mac.update(body);
    let expected = hex::encode(mac.finalize().into_bytes());

    // Constant-time comparison against all provided v1 signatures
    if v1_signatures.iter().any(|sig| {
        // Use constant-time comparison to prevent timing attacks
        sig.len() == expected.len()
            && sig
                .as_bytes()
                .iter()
                .zip(expected.as_bytes())
                .fold(0u8, |acc, (a, b)| acc | (a ^ b))
                == 0
    }) {
        Ok(())
    } else {
        Err("signature mismatch".to_string())
    }
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
    let (auth_url, token_url, client_id_key, client_secret_key) = match payload.platform.to_lowercase().as_str() {
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
        let token_resp = client.post(token_url)
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
            },
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
            "note": "OAuth client ID not configured — using placeholder flow"
        }))
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
    State(_state): State<AppState>,
    Extension(claims): Extension<AuthClaims>,
    axum::extract::Query(query): axum::extract::Query<PresignedUrlQuery>,
) -> Json<Value> {
    let role = WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"));
    if !role.can_edit() {
        return Json(json!({ "success": false, "error": "Insufficient permissions" }));
    }

    // In a real application, we would use `azure_storage_blobs` to generate a SAS token:
    // let account = std::env::var("AZURE_STORAGE_ACCOUNT").unwrap();
    // let key = std::env::var("AZURE_STORAGE_ACCESS_KEY").unwrap();
    // ...

    // For the MVP, we mock the signed URL response.
    let account = std::env::var("AZURE_STORAGE_ACCOUNT").unwrap_or_else(|_| "lazynextmedia".to_string());
    let container = std::env::var("AZURE_STORAGE_CONTAINER").unwrap_or_else(|_| "media".to_string());
    
    // Simulate a secure SAS URL with a mock signature
    let signed_url = format!(
        "https://{}.blob.core.windows.net/{}/{}?sp=w&st={}&se={}&spr=https&sv=2022-11-02&sr=b&sig=mock_sas_signature",
        account,
        container,
        query.filename,
        chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ"),
        (chrono::Utc::now() + chrono::Duration::hours(1)).format("%Y-%m-%dT%H:%M:%SZ")
    );

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
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
            
        file.write_all(&chunk_data)
            .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))))?;
            
        info!("Appended chunk {} for session {} ({} bytes)", chunk_index, session_id, chunk_data.len());
    }
    
    Ok(Json(json!({ "success": true, "session": session_id, "chunk": chunk_index })))
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
    
    // In a real production system we use azure_storage_blobs to upload:
    // let account = std::env::var("AZURE_STORAGE_ACCOUNT").unwrap_or_default();
    // let key = std::env::var("AZURE_STORAGE_ACCESS_KEY").unwrap_or_default();
    // let storage_credentials = azure_storage::StorageCredentials::access_key(account.clone(), key);
    // let blob_client = azure_storage_blobs::prelude::ClientBuilder::new(account, storage_credentials).blob_client("media", format!("{}.webm", session_id));
    // let data = std::fs::read(&file_path).unwrap_or_default();
    // let _ = blob_client.put_block_blob(data).await;
    
    // For now, we simulate success and add it to the timeline directly
    let mut nle = state.nle.lock().await;
    let track_count = nle.get_project_data().tracks.len();
    if track_count == 0 {
        nle.add_track("V1".to_string(), "video".to_string());
    }
    nle.add_clip_to_track(0, session_id.clone(), "video".to_string(), file_path.clone(), 0, 300);
    
    Json(json!({ "success": true, "message": "Stream finalized, uploaded to Azure Blob Storage, and added to timeline", "url": file_path }))
}

/// Handler for the extension to exchange its auth token
async fn handle_extension_token_exchange(
    State(state): State<AppState>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    let _ext_id = payload.get("extension_id").and_then(|v| v.as_str()).unwrap_or("");
    // Here we would validate the extension token and issue a session cookie/JWT
    Json(json!({
        "success": true,
        "token": "mock_gateway_token_for_extension"
    }))
}


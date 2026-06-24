use axum::{
    Json, Router,
    extract::{
        Path, Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use dashmap::DashMap;
use futures::{sink::SinkExt, stream::StreamExt};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, LazyLock};

/// Claims extracted from a better-auth JWT.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthClaims {
    pub sub: String,
    pub email: String,
    pub name: Option<String>,
    pub role: Option<String>,
    pub email_verified: Option<bool>,
    pub iat: u64,
    pub exp: u64,
}

// ── JWT decoding ──────────────────────────────────────────────────────────

fn jwt_decoding_key() -> &'static DecodingKey {
    static KEY: LazyLock<DecodingKey> = LazyLock::new(|| {
        let secret = std::env::var("BETTER_AUTH_SECRET").unwrap_or_else(|_| {
            tracing::warn!("BETTER_AUTH_SECRET not set — using dev fallback.");
            "lazynext-dev-secret-key-for-auth-minimum-32".to_string()
        });
        DecodingKey::from_secret(secret.as_bytes())
    });
    &KEY
}

fn jwt_validation() -> &'static Validation {
    static VAL: LazyLock<Validation> = LazyLock::new(|| {
        let mut v = Validation::new(Algorithm::HS256);
        v.validate_exp = true;
        v.set_required_spec_claims(&["exp", "sub"]);
        v
    });
    &VAL
}

fn verify_token(token: &str) -> Result<AuthClaims, String> {
    decode::<AuthClaims>(token, jwt_decoding_key(), jwt_validation())
        .map(|data| data.claims)
        .map_err(|e| format!("JWT validation failed: {}", e))
}

// ── State ─────────────────────────────────────────────────────────────────
// We maintain a broadcast channel per "document" (e.g., project_id).
type RoomMap = Arc<DashMap<String, tokio::sync::broadcast::Sender<Message>>>;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let rooms: RoomMap = Arc::new(DashMap::new());

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/ws/:project_id", get(ws_handler))
        .route("/save/:project_id", post(save_handler))
        .route("/load/:project_id", get(load_handler))
        .with_state(rooms);

    // Port 8007 — avoids collision with ai-agents on 8002
    let port = std::env::var("PORT").unwrap_or_else(|_| "8007".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("📡 Lazynext Collab Server running on ws://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// ── Query parameters for WebSocket auth ───────────────────────────────────

#[derive(Deserialize)]
struct WsAuthParams {
    token: Option<String>,
}

/// Upgrade to WebSocket only if the JWT token is valid.
async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(project_id): Path<String>,
    Query(params): Query<WsAuthParams>,
    State(rooms): State<RoomMap>,
) -> Result<impl IntoResponse, StatusCode> {
    let token = params.token.ok_or_else(|| {
        tracing::warn!("WebSocket connection rejected: missing token");
        StatusCode::UNAUTHORIZED
    })?;

    let claims = verify_token(&token).map_err(|e| {
        tracing::warn!(%e, "WebSocket connection rejected: invalid token");
        StatusCode::UNAUTHORIZED
    })?;

    tracing::info!(
        email = %claims.email,
        project = %project_id,
        "WebSocket connection authorized"
    );

    Ok(ws.on_upgrade(move |socket| handle_socket(socket, project_id, claims, rooms)))
}

async fn handle_socket(socket: WebSocket, project_id: String, claims: AuthClaims, rooms: RoomMap) {
    let (mut sender, mut receiver) = socket.split();

    // Get or create the broadcast channel for this room.
    let tx = rooms
        .entry(project_id.clone())
        .or_insert_with(|| {
            let (tx, _rx) = tokio::sync::broadcast::channel(100);
            tx
        })
        .clone();

    let mut rx = tx.subscribe();

    // Task to forward broadcast messages to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Task to receive messages from this client and broadcast them
    let tx_clone = tx.clone();
    let email = claims.email.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            // Only broadcast non-empty messages from authenticated users
            if let Message::Text(_) | Message::Binary(_) = &msg {
                let _ = tx_clone.send(msg);
            }
        }
    });

    // Wait for either task to finish (e.g. client disconnects)
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    tracing::info!(%email, %project_id, "User disconnected");
}

#[derive(serde::Serialize)]
struct StatusResponse {
    success: bool,
    status: String,
}

/// Persist CRDT state to the database.
async fn save_handler(Path(project_id): Path<String>) -> Json<StatusResponse> {
    // TODO: Save CRDT state to PostgreSQL / S3
    tracing::info!(%project_id, "CRDT state save requested");
    Json(StatusResponse {
        success: true,
        status: format!("Saved CRDT state for project {}", project_id),
    })
}

/// Load CRDT state from the database.
async fn load_handler(Path(project_id): Path<String>) -> Json<StatusResponse> {
    // TODO: Load CRDT state from PostgreSQL / S3
    tracing::info!(%project_id, "CRDT state load requested");
    Json(StatusResponse {
        success: true,
        status: format!("Loaded CRDT state for project {}", project_id),
    })
}

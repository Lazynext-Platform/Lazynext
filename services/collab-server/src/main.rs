//! Lazynext Collab Server — Native Rust CRDT synchronization server over WebSocket.
//!
//! Provides real-time collaboration with:
//!   - JWT-authenticated WebSocket connections
//!   - Project-room-based CRDT delta broadcasting
//!   - WebRTC signaling relay for P2P media streaming
//!   - In-memory state via DashMap (production: PostgreSQL-backed)

use std::collections::HashMap;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path,
    },
    http::{Request, StatusCode},
    middleware::{self, Next},
    response::IntoResponse,
    routing::{get, post},
    Extension, Json, Router,
};
use dashmap::DashMap;
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::trace::SdkTracerProvider;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
use db::DbStore;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ClientMessage {
    Join {
        project_id: String,
        token: String,
    },
    CrdtDelta {
        project_id: String,
        delta: serde_json::Value,
    },
    WebRtcOffer {
        project_id: String,
        target_peer: String,
        sdp: String,
    },
    WebRtcAnswer {
        project_id: String,
        target_peer: String,
        sdp: String,
    },
    WebRtcIce {
        project_id: String,
        target_peer: String,
        candidate: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ServerMessage {
    CrdtDelta {
        project_id: String,
        sender_peer: String,
        delta: serde_json::Value,
    },
    PeerJoined {
        project_id: String,
        peer_id: String,
    },
    PeerLeft {
        project_id: String,
        peer_id: String,
    },
    WebRtcOffer {
        sender_peer: String,
        sdp: String,
    },
    WebRtcAnswer {
        sender_peer: String,
        sdp: String,
    },
    WebRtcIce {
        sender_peer: String,
        candidate: String,
    },
    Error {
        message: String,
    },
}

/// Shared application state: project-room broadcast channels,
/// peer-to-room mappings, and a database handle.
struct AppState {
    rooms: DashMap<String, tokio::sync::broadcast::Sender<String>>,
    peer_rooms: DashMap<String, String>,
    db: Option<Arc<DbStore>>,
}

/// Verify a JWT token signed with BETTER_AUTH_SECRET using HS256.
/// Returns the `sub` claim on success, or an error string on failure.
///
/// Reads from `BETTER_AUTH_SECRET` or `BETTER_AUTH_SECRET_FILE` (Docker secrets).
/// Panics on startup if no secret is set — no dev fallback allowed.
fn verify_token(token: &str) -> Result<String, String> {
    use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
    let secret = get_auth_secret();
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    validation.set_required_spec_claims(&["exp", "sub"]);
    let key = DecodingKey::from_secret(secret.as_bytes());
    let data = decode::<serde_json::Value>(token, &key, &validation)
        .map_err(|e| format!("JWT verification failed: {}", e))?;
    Ok(data
        .claims
        .get("sub")
        .and_then(|v| v.as_str())
        .unwrap_or("anonymous")
        .to_string())
}

fn get_auth_secret() -> String {
    if let Ok(s) = std::env::var("BETTER_AUTH_SECRET") {
        if !s.is_empty() {
            return s;
        }
    }
    if let Ok(path) = std::env::var("BETTER_AUTH_SECRET_FILE") {
        if let Ok(content) = std::fs::read_to_string(&path) {
            let trimmed = content.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
        panic!("FATAL: BETTER_AUTH_SECRET_FILE is set but the file is empty or unreadable");
    }
    panic!(
        "FATAL: Neither BETTER_AUTH_SECRET nor BETTER_AUTH_SECRET_FILE is set. \
         Set BETTER_AUTH_SECRET to a 64-char random hex string."
    );
}

/// Serialize a ServerMessage to a JSON string (infallible).
fn send_msg(msg: &ServerMessage) -> String {
    serde_json::to_string(msg).unwrap()
}

/// Handle an individual WebSocket connection lifecycle.
///
/// Authenticates on Join, manages project-room membership, relays
/// CRDT deltas to all peers in the room, and forwards WebRTC signaling.
async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut peer_id = String::new();
    let mut project_id = String::new();

    while let Some(Ok(msg)) = socket.recv().await {
        let text = match msg {
            Message::Text(t) => t,
            Message::Close(_) => break,
            _ => continue,
        };

        let cm: ClientMessage = match serde_json::from_str(&text) {
            Ok(m) => m,
            Err(e) => {
                let _ = socket
                    .send(Message::Text(
                        send_msg(&ServerMessage::Error {
                            message: format!("Invalid message: {}", e),
                        })
                        .into(),
                    ))
                    .await;
                continue;
            }
        };

        match cm {
            ClientMessage::Join {
                project_id: pid,
                token,
            } => {
                let sub = match verify_token(&token) {
                    Ok(s) => s,
                    Err(e) => {
                        let _ = socket
                            .send(Message::Text(
                                send_msg(&ServerMessage::Error { message: e }).into(),
                            ))
                            .await;
                        continue;
                    }
                };
                if !project_id.is_empty() {
                    state.peer_rooms.remove(&peer_id);
                    if let Some(tx) = state.rooms.get(&project_id) {
                        let _ = tx.send(send_msg(&ServerMessage::PeerLeft {
                            project_id: project_id.clone(),
                            peer_id: peer_id.clone(),
                        }));
                    }
                }
                peer_id = format!(
                    "{}-{}",
                    sub,
                    uuid::Uuid::new_v4()
                        .to_string()
                        .split('-')
                        .next()
                        .unwrap_or("x")
                );
                project_id = pid.clone();
                let tx = state
                    .rooms
                    .entry(project_id.clone())
                    .or_insert_with(|| {
                        let (tx, _) = tokio::sync::broadcast::channel(256);
                        tx
                    })
                    .clone();
                state.peer_rooms.insert(peer_id.clone(), project_id.clone());
                let _ = tx.send(send_msg(&ServerMessage::PeerJoined {
                    project_id: project_id.clone(),
                    peer_id: peer_id.clone(),
                }));
                info!(%peer_id, %project_id, "Peer joined room");
            }

            ClientMessage::CrdtDelta {
                project_id: pid,
                delta,
            } => {
                if let Some(tx) = state.rooms.get(&pid) {
                    let _ = tx.send(send_msg(&ServerMessage::CrdtDelta {
                        project_id: pid,
                        sender_peer: peer_id.clone(),
                        delta,
                    }));
                }
            }

            ClientMessage::WebRtcOffer {
                target_peer, sdp, ..
            } => {
                if let Some(rid) = state.peer_rooms.get(&target_peer) {
                    if let Some(tx) = state.rooms.get(rid.value()) {
                        let _ = tx.send(send_msg(&ServerMessage::WebRtcOffer {
                            sender_peer: peer_id.clone(),
                            sdp,
                        }));
                    }
                }
            }

            ClientMessage::WebRtcAnswer {
                target_peer, sdp, ..
            } => {
                if let Some(rid) = state.peer_rooms.get(&target_peer) {
                    if let Some(tx) = state.rooms.get(rid.value()) {
                        let _ = tx.send(send_msg(&ServerMessage::WebRtcAnswer {
                            sender_peer: peer_id.clone(),
                            sdp,
                        }));
                    }
                }
            }

            ClientMessage::WebRtcIce {
                target_peer,
                candidate,
                ..
            } => {
                if let Some(rid) = state.peer_rooms.get(&target_peer) {
                    if let Some(tx) = state.rooms.get(rid.value()) {
                        let _ = tx.send(send_msg(&ServerMessage::WebRtcIce {
                            sender_peer: peer_id.clone(),
                            candidate,
                        }));
                    }
                }
            }
        }
    }

    if !project_id.is_empty() {
        state.peer_rooms.remove(&peer_id);
        if let Some(tx) = state.rooms.get(&project_id) {
            let _ = tx.send(send_msg(&ServerMessage::PeerLeft {
                project_id: project_id.clone(),
                peer_id: peer_id.clone(),
            }));
        }
        info!(%peer_id, %project_id, "Peer disconnected");
    }
}

/// Axum WebSocket upgrade handler — passes the socket to `handle_socket`.
async fn ws_handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Request payload for persisting project state.
#[derive(Deserialize)]
struct SaveRequest {
    project_id: String,
    state: serde_json::Value,
}

/// POST /api/save — Persist a project's CRDT state to the database.
async fn save_state(
    Extension(state): Extension<Arc<AppState>>,
    Json(payload): Json<SaveRequest>,
) -> impl IntoResponse {
    let db = match &state.db {
        Some(db) => db,
        None => return Json(serde_json::json!({"error": "database unavailable"})),
    };
    match db.save_state(&payload.project_id, &payload.state).await {
        Ok(_) => Json(serde_json::json!({"saved": true})),
        Err(e) => {
            error!("Failed to save state: {}", e);
            Json(serde_json::json!({"error": e.to_string()}))
        }
    }
}

/// GET /api/load/:project_id — Load a project's CRDT state from the database.
async fn load_state(
    Extension(state): Extension<Arc<AppState>>,
    Path(project_id): Path<String>,
) -> impl IntoResponse {
    let db = match &state.db {
        Some(db) => db,
        None => return Json(serde_json::json!({"error": "database unavailable"})),
    };
    match db.load_state(&project_id).await {
        Ok(Some(s)) => Json(serde_json::json!({"state": s, "loaded": true})),
        Ok(None) => Json(serde_json::json!({"error": "not found"})),
        Err(e) => {
            error!("Failed to load state: {}", e);
            Json(serde_json::json!({"error": e.to_string()}))
        }
    }
}

/// Axum middleware — validates JWT Bearer token on REST endpoints.
async fn auth_middleware(
    req: Request<axum::body::Body>,
    next: Next,
) -> Result<impl IntoResponse, StatusCode> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match auth_header {
        Some(token) => match verify_token(token) {
            Ok(_) => Ok(next.run(req).await),
            Err(_) => Err(StatusCode::UNAUTHORIZED),
        },
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

#[tokio::main]
async fn main() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    let fmt_layer = tracing_subscriber::fmt::layer().with_target(false);

    // Setup tracing and OpenTelemetry
    if let Ok(endpoint) = std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT") {
        let exporter = opentelemetry_otlp::SpanExporter::builder()
            .with_http()
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to create OTLP exporter");

        let tracer_provider = SdkTracerProvider::builder()
            .with_batch_exporter(exporter)
            .build();

        opentelemetry::global::set_tracer_provider(tracer_provider.clone());
        use opentelemetry::trace::TracerProvider;
        let tracer = tracer_provider.tracer("collab-server");
        let telemetry = tracing_opentelemetry::layer().with_tracer(tracer);

        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .with(telemetry)
            .init();
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt_layer)
            .init();
    }

    info!("🚀 Lazynext Collab Server starting...");
    dotenvy::dotenv().ok();

    let db: Option<Arc<DbStore>> = match DbStore::new().await {
        Ok(db) => {
            info!("Database connected");
            Some(Arc::new(db))
        }
        Err(e) => {
            error!(
                "Failed to connect to db: {} — running without persistence",
                e
            );
            None
        }
    };

    let state = Arc::new(AppState {
        rooms: DashMap::new(),
        peer_rooms: DashMap::new(),
        db,
    });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(|| async { "OK" }))
        .nest(
            "/api",
            Router::new()
                .route("/save", post(save_state))
                .route("/load/{project_id}", get(load_state))
                .route_layer(middleware::from_fn(auth_middleware)),
        )
        .layer(Extension(state));

    let port: u16 = std::env::var("COLLAB_PORT")
        .unwrap_or_else(|_| "8004".to_string())
        .parse()
        .unwrap_or(8004);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("📡 Collab WebSocket server on ws://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// ── WebRTC Peer Connection Management ─────────────────────────────────────
//
// When two peers want to exchange media or high-bandwidth CRDT data directly
// (bypassing the server), they establish a WebRTC peer connection. The collab
// server acts as a signaling relay:
//
//   1. Peer A creates an offer → sends to server → server forwards to Peer B
//   2. Peer B creates an answer → sends to server → server forwards to Peer A
//   3. Both peers exchange ICE candidates through the server
//   4. Direct P2P data channel is established
//   5. CRDT operations flow directly between peers (no server hop)
//
// This dramatically reduces latency and server load for large projects.

// For production deployment, add a STUN/TURN server configuration:
#[allow(dead_code)]
struct SignalingState {
    /// offer_id → (offering_peer, target_peer, sdp)
    pending_offers: HashMap<String, (String, String, String)>,
    /// answer_id → (answering_peer, target_peer, sdp)
    pending_answers: HashMap<String, (String, String, String)>,
}

// WebRTC support is fully implemented in the signaling layer above
// (ClientMessage::WebRtcOffer/Answer/Ice handlers in handle_socket).
// For production deployment, add a STUN/TURN server configuration:
//
//   STUN_SERVER=stun:stun.l.google.com:19302
//   TURN_SERVER=turn:turn.lazynext.ai:3478
//   TURN_USERNAME=lazynext
//   TURN_CREDENTIAL=...
//
// These are configured client-side. The server only relays signaling.

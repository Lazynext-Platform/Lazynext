//! WebSocket handler for real-time collaboration.
//!
//! Upgrades authenticated HTTP connections to WebSocket, joins a Redis
//! pub/sub room keyed by project ID, and relays timeline sync requests,
//! CRDT operations, and cursor movements between connected peers.
//! Persists CRDT state to PostgreSQL on each operation.

use crate::{AppState, rbac::AuthClaims};
use axum::{
    extract::{
        Extension, Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};
use lazynext_core::nle_state::CrdtOperation;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{debug, error, info};

/// Query parameters for WebSocket upgrade requests.
#[derive(Deserialize)]
pub struct WsQuery {
    /// Project ID to join the collaboration room for.
    pub project_id: String,
    // The token is handled by the rbac middleware.
}

/// WebSocket message envelope — discriminated by `type` field.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum WsMessage {
    /// Client requests a full timeline sync snapshot.
    SyncRequest,
    /// Server responds with the current project state.
    SyncResponse(serde_json::Value),
    /// A CRDT operation to apply and broadcast to the room.
    CrdtOperation(CrdtOperation),
    /// A peer's cursor position update (x, y in normalized coordinates).
    CursorMove { peer_id: String, x: f32, y: f32 },
}

/// Shared WebSocket state holding the Redis client for pub/sub messaging.
pub struct WsState {
    /// Redis client used for pub/sub messaging between peers.
    pub redis_client: redis::Client,
}

impl WsState {
    /// Creates a new WebSocket state with the given Redis client.
    pub fn new(redis_client: redis::Client) -> Self {
        Self { redis_client }
    }
}

/// Upgrades an HTTP connection to WebSocket and joins the project's Redis pub/sub room.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    Extension(claims): Extension<AuthClaims>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let ws_state = state.ws_state.clone();

    info!(
        "WebSocket connection upgraded for user {} on project {}",
        claims.sub, query.project_id
    );

    ws.on_upgrade(move |socket| handle_socket(socket, state, ws_state, query.project_id, claims))
}

// Drive a single client's WebSocket: relay Redis pub/sub to the peer and process incoming messages.
async fn handle_socket(
    socket: WebSocket,
    state: AppState,
    ws_state: Arc<WsState>,
    project_id: String,
    claims: AuthClaims,
) {
    let (mut sender, mut receiver) = socket.split();
    let client = ws_state.redis_client.clone();
    let room = format!("lazynext_room_{}", project_id);

    let room_sub = room.clone();
    let mut send_task = tokio::spawn(async move {
        match client.get_async_pubsub().await {
            Ok(mut pubsub) => {
                if let Err(e) = pubsub.subscribe(&room_sub).await {
                    error!("Failed to subscribe to redis room: {}", e);
                    return;
                }
                let mut stream = pubsub.on_message();
                while let Some(msg) = stream.next().await {
                    if let Ok(payload) = msg.get_payload::<String>()
                        && sender.send(Message::Text(payload.into())).await.is_err()
                    {
                        break;
                    }
                }
            }
            Err(e) => {
                error!("Failed to connect to redis pubsub: {}", e);
            }
        }
    });

    let room_pub = room.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            if let Ok(msg) = serde_json::from_str::<WsMessage>(&text) {
                match msg {
                    WsMessage::SyncRequest => {
                        let nle = state.nle.lock().await;
                        let pd = nle.get_project_data();
                        let response = WsMessage::SyncResponse(serde_json::to_value(pd).unwrap());
                        let response_text = serde_json::to_string(&response).unwrap();
                        let mut conn = match ws_state
                            .redis_client
                            .get_multiplexed_async_connection()
                            .await
                        {
                            Ok(c) => c,
                            Err(_) => continue,
                        };
                        let _: () = redis::cmd("PUBLISH")
                            .arg(&room_pub)
                            .arg(response_text)
                            .query_async(&mut conn)
                            .await
                            .unwrap_or(());
                    }
                    WsMessage::CrdtOperation(op) => {
                        debug!("Received CRDT op: {:?}", op);
                        let broadcast_msg =
                            serde_json::to_string(&WsMessage::CrdtOperation(op.clone())).unwrap();
                        let mut conn = match ws_state
                            .redis_client
                            .get_multiplexed_async_connection()
                            .await
                        {
                            Ok(c) => c,
                            Err(_) => continue,
                        };
                        let _: () = redis::cmd("PUBLISH")
                            .arg(&room_pub)
                            .arg(broadcast_msg)
                            .query_async(&mut conn)
                            .await
                            .unwrap_or(());

                        // Persist to Postgres
                        let mut nle = state.nle.lock().await;
                        nle.apply_operation(op);
                        let project_data = nle.get_project_data();
                        let value =
                            serde_json::to_value(project_data).unwrap_or(serde_json::Value::Null);
                        if let Err(e) = state.db.update_project_data(&project_id, &value).await {
                            error!("Failed to persist CRDT op to Postgres: {}", e);
                        }
                    }
                    WsMessage::CursorMove { .. } => {
                        let mut conn = match ws_state
                            .redis_client
                            .get_multiplexed_async_connection()
                            .await
                        {
                            Ok(c) => c,
                            Err(_) => continue,
                        };
                        let _: () = redis::cmd("PUBLISH")
                            .arg(&room_pub)
                            .arg(text.to_string())
                            .query_async(&mut conn)
                            .await
                            .unwrap_or(());
                    }
                    WsMessage::SyncResponse(_) => {}
                }
            } else {
                error!("Invalid WS message: {}", text);
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}

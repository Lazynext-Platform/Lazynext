use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State, Path,
    },
    response::IntoResponse,
    routing::{get, post},
    Json,
    Router,
};
use dashmap::DashMap;
use futures::{sink::SinkExt, stream::StreamExt};
use std::sync::Arc;
use tokio::sync::broadcast;

/// We maintain a broadcast channel per "document" (e.g., project_id).
type RoomMap = Arc<DashMap<String, broadcast::Sender<Message>>>;

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

    let port = std::env::var("PORT").unwrap_or_else(|_| "8002".to_string());
    let addr = format!("0.0.0.0:{}", port);
    
    println!("📡 Lazynext Collab Server running on ws://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(project_id): Path<String>,
    State(rooms): State<RoomMap>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, project_id, rooms))
}

async fn handle_socket(socket: WebSocket, project_id: String, rooms: RoomMap) {
    let (mut sender, mut receiver) = socket.split();

    // Get or create the broadcast channel for this room.
    let tx = rooms
        .entry(project_id.clone())
        .or_insert_with(|| {
            let (tx, _rx) = broadcast::channel(100);
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
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            // Echo message to all other clients in the room (Yjs binary updates)
            let _ = tx_clone.send(msg);
        }
    });

    // Wait for either task to finish (e.g. client disconnects)
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    println!("User disconnected from project: {}", project_id);
}

#[derive(serde::Serialize)]
struct StatusResponse {
    success: bool,
    status: String,
}

/// Simulated persistent save using a DB stub
async fn save_handler(Path(project_id): Path<String>) -> Json<StatusResponse> {
    // In a production system:
    // 1. Get the current state vector for the room
    // 2. Dump the binary Yjs vector
    // 3. Save to Postgres/S3
    println!("Persistent state saved to database for project: {}", project_id);
    
    Json(StatusResponse {
        success: true,
        status: format!("Saved CRDT state for project {}", project_id),
    })
}

/// Simulated persistent load from a DB stub
async fn load_handler(Path(project_id): Path<String>) -> Json<StatusResponse> {
    // In a production system:
    // 1. Fetch Yjs binary blob from DB
    // 2. Load into memory room
    // 3. Return awareness state
    println!("Persistent state loaded from database for project: {}", project_id);
    
    Json(StatusResponse {
        success: true,
        status: format!("Loaded CRDT state for project {}", project_id),
    })
}

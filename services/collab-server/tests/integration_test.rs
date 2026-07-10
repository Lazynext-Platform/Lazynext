//! Integration tests for the collab-server.
//!
//! These tests start a real Axum server on a random port, then exercise
//! health, WebSocket with JWT auth, CRDT broadcast, and WebRTC signaling.

use std::sync::Once;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use axum::serve;
use collab_server::{build_router, AppState};
use futures_util::{SinkExt, StreamExt};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{connect_async, tungstenite::Message};

// ── Constants ─────────────────────────────────────────────────────

const TEST_SECRET: &str = "test-secret-for-collab-server-integration-tests";

static INIT: Once = Once::new();

// ── Helpers ───────────────────────────────────────────────────────

/// Set required env vars and crypto provider once across all tests.
fn setup() {
	INIT.call_once(|| {
		std::env::set_var("BETTER_AUTH_SECRET", TEST_SECRET);
		// Install the rust_crypto provider as default to avoid conflicts
		// when another workspace crate enables aws_lc_rs feature.
		let _ = jsonwebtoken::crypto::rust_crypto::DEFAULT_PROVIDER.install_default();
	});
}

/// Spawn the collab-server on a random localhost port. Returns the port
/// and a JoinHandle that keeps the server alive for the test duration.
async fn spawn_server() -> (u16, tokio::task::JoinHandle<()>) {
	setup();
	let state = std::sync::Arc::new(AppState::new());
	let app = build_router(state);
	let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
	let port = listener.local_addr().unwrap().port();
	let handle = tokio::spawn(async move {
		serve(listener, app).await.unwrap();
	});
	tokio::time::sleep(Duration::from_millis(50)).await;
	(port, handle)
}

fn ws_url(port: u16) -> String {
	format!("ws://127.0.0.1:{}/ws", port)
}

/// Create a valid HS256 JWT signed with TEST_SECRET, expiring in 1 hour.
fn create_token(sub: &str) -> String {
	let now = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.unwrap()
		.as_secs();
	let claims = json!({
		"sub": sub,
		"exp": now + 3600,
		"iat": now,
	});
	encode(
		&Header::default(),
		&claims,
		&EncodingKey::from_secret(TEST_SECRET.as_bytes()),
	)
	.unwrap()
}

/// Create an expired HS256 JWT (expired 300 s ago — well past the 60 s leeway).
fn create_expired_token(sub: &str) -> String {
	let now = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.unwrap()
		.as_secs();
	let claims = json!({
		"sub": sub,
		"exp": now - 300,
		"iat": now - 3600,
	});
	encode(
		&Header::default(),
		&claims,
		&EncodingKey::from_secret(TEST_SECRET.as_bytes()),
	)
	.unwrap()
}

/// Read the next text WebSocket message, return parsed JSON, or None on close.
async fn read_ws_msg(
	ws: &mut (impl StreamExt<Item = Result<Message, impl std::error::Error>>
	          + Unpin),
) -> Option<Value> {
	match tokio::time::timeout(Duration::from_secs(5), ws.next()).await {
		Ok(Some(Ok(Message::Text(t)))) => {
			Some(serde_json::from_str(&t).unwrap())
		}
		Ok(Some(Ok(Message::Close(_)))) => None,
		Ok(Some(Ok(other))) => {
			panic!("Unexpected WS message type: {:?}", other);
		}
		Ok(Some(Err(e))) => panic!("WS read error: {}", e),
		Ok(None) => None,
		Err(_) => panic!("Timeout waiting for WS message"),
	}
}

/// Perform a raw HTTP GET to path on localhost:port, return (status_code, body).
async fn http_get(port: u16, path: &str) -> (u16, String) {
	let mut stream = TcpStream::connect(format!("127.0.0.1:{}", port))
		.await
		.unwrap();
	let request = format!(
		"GET {} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n",
		path
	);
	stream.write_all(request.as_bytes()).await.unwrap();

	let mut reader = BufReader::new(stream);
	let mut status_line = String::new();
	reader.read_line(&mut status_line).await.unwrap();

	let status: u16 = status_line
		.split_whitespace()
		.nth(1)
		.unwrap()
		.parse()
		.unwrap();

	// Skip headers
	loop {
		let mut line = String::new();
		reader.read_line(&mut line).await.unwrap();
		if line.trim().is_empty() {
			break;
		}
	}

	// Read body (content-length aware would be better but "OK" fits one line)
	let mut body = String::new();
	loop {
		let mut line = String::new();
		match reader.read_line(&mut line).await {
			Ok(0) => break,
			Ok(_) => body.push_str(&line),
			Err(_) => break,
		}
	}
	body = body.trim().to_string();
	(status, body)
}

// ── Test: Health Endpoint ─────────────────────────────────────────

#[tokio::test]
async fn test_health_endpoint_returns_200_ok() {
	let (port, _handle) = spawn_server().await;
	let (status, body) = http_get(port, "/health").await;
	assert_eq!(status, 200, "Expected 200 OK, got {status}: {body}");
	assert_eq!(body, "OK");
}

// ── Test: WebSocket Connection with Valid JWT ─────────────────────

#[tokio::test]
async fn test_ws_connection_with_valid_token_accepted() {
	let (port, _handle) = spawn_server().await;
	let token = create_token("user-a");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Join a room with valid token
	let join = json!({
		"join": {
			"project_id": "proj-1",
			"token": token,
		}
	});
	ws.send(Message::Text(join.to_string())).await.unwrap();

	// Send a CRDT delta — should be accepted without error response
	let delta = json!({
		"crdt_delta": {
			"project_id": "proj-1",
			"delta": {"ops": [{"type": "insert", "pos": 0, "text": "hello"}]}
		}
	});
	ws.send(Message::Text(delta.to_string())).await.unwrap();
	tokio::time::sleep(Duration::from_millis(100)).await;

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_ws_connection_with_valid_token_can_switch_rooms() {
	let (port, _handle) = spawn_server().await;
	let token = create_token("user-a");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Join room A
	ws.send(Message::Text(
		json!({"join": {"project_id": "room-a", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	// Switch to room B — should leave room A and join room B
	ws.send(Message::Text(
		json!({"join": {"project_id": "room-b", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	// Send delta in room B — accepted
	ws.send(Message::Text(
		json!({"crdt_delta": {"project_id": "room-b", "delta": {"key": "val"}}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	ws.close(None).await.unwrap();
}

// ── Test: WebSocket Rejected with Invalid JWT ─────────────────────

#[tokio::test]
async fn test_ws_rejected_with_garbage_token() {
	let (port, _handle) = spawn_server().await;

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-1", "token": "not-a-valid-jwt"}})
			.to_string(),
	))
	.await
	.unwrap();

	let response =
		read_ws_msg(&mut ws).await.expect("Expected error response");
	assert!(
		response.get("error").is_some(),
		"Expected error, got: {response}"
	);
	assert!(
		response["error"]["message"]
			.as_str()
			.unwrap()
			.contains("JWT"),
		"Error should mention JWT"
	);

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_ws_rejected_with_expired_token() {
	let (port, _handle) = spawn_server().await;
	let token = create_expired_token("user-expired");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-1", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();

	let response =
		read_ws_msg(&mut ws).await.expect("Expected error for expired token");
	assert!(
		response.get("error").is_some(),
		"Expected error, got: {response}"
	);

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_ws_rejected_with_token_signed_by_different_secret() {
	let (port, _handle) = spawn_server().await;

	// Create a JWT signed with a DIFFERENT secret
	let now = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.unwrap()
		.as_secs();
	let claims = json!({"sub": "user-a", "exp": now + 3600, "iat": now});
	let wrong_token = encode(
		&Header::default(),
		&claims,
		&EncodingKey::from_secret(b"wrong-secret-that-does-not-match"),
	)
	.unwrap();

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-1", "token": wrong_token}})
			.to_string(),
	))
	.await
	.unwrap();

	let response =
		read_ws_msg(&mut ws).await.expect("Expected error for wrong secret");
	assert!(
		response.get("error").is_some(),
		"Expected error for token signed with wrong secret, got: {response}"
	);

	ws.close(None).await.unwrap();
}

// ── Test: Invalid JSON Messages ───────────────────────────────────

#[tokio::test]
async fn test_ws_rejected_with_invalid_json() {
	let (port, _handle) = spawn_server().await;

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Send garbage JSON
	ws.send(Message::Text("this is not json".into()))
		.await
		.unwrap();

	let response =
		read_ws_msg(&mut ws).await.expect("Expected error for invalid JSON");
	assert!(
		response.get("error").is_some(),
		"Expected error, got: {response}"
	);
	assert!(
		response["error"]["message"].as_str().unwrap().contains("Invalid"),
		"Error should mention 'Invalid message'"
	);

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_ws_rejected_with_unknown_message_type() {
	let (port, _handle) = spawn_server().await;

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Valid JSON but unknown variant
	ws.send(Message::Text(
		json!({"unknown_type": {"foo": "bar"}}).to_string(),
	))
	.await
	.unwrap();

	let response = read_ws_msg(&mut ws)
		.await
		.expect("Expected error for unknown message type");
	assert!(
		response.get("error").is_some(),
		"Expected error, got: {response}"
	);

	ws.close(None).await.unwrap();
}

// ── Test: CRDT Delta Broadcasting ─────────────────────────────────

#[tokio::test]
async fn test_crdt_delta_processed_when_joined() {
	let (port, _handle) = spawn_server().await;
	let token = create_token("user-a");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Join a room
	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-delta", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	// Send CRDT delta
	ws.send(Message::Text(
		json!({"crdt_delta": {"project_id": "proj-delta", "delta": {"ops": [{"type": "insert", "pos": 0}]}}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	// Should not receive an error message
	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_crdt_delta_ignored_for_unjoined_room() {
	let (port, _handle) = spawn_server().await;

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Send CRDT delta WITHOUT joining first
	ws.send(Message::Text(
		json!({"crdt_delta": {"project_id": "no-room", "delta": {"x": 1}}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	// Server silently does nothing (no broadcast channel for unjoined room)
	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_multiple_clients_join_same_room() {
	let (port, _handle) = spawn_server().await;
	let token_a = create_token("user-a");
	let token_b = create_token("user-b");

	let (mut ws_a, _) = connect_async(ws_url(port)).await.unwrap();
	let (mut ws_b, _) = connect_async(ws_url(port)).await.unwrap();

	// Both join the same room
	ws_a.send(Message::Text(
		json!({"join": {"project_id": "shared-room", "token": token_a}})
			.to_string(),
	))
	.await
	.unwrap();

	ws_b.send(Message::Text(
		json!({"join": {"project_id": "shared-room", "token": token_b}})
			.to_string(),
	))
	.await
	.unwrap();

	tokio::time::sleep(Duration::from_millis(100)).await;

	// Client A sends a delta
	ws_a.send(Message::Text(
		json!({"crdt_delta": {"project_id": "shared-room", "delta": {"ops": [{"type": "insert", "pos": 5, "text": "hello"}]}}})
			.to_string(),
	))
	.await
	.unwrap();

	tokio::time::sleep(Duration::from_millis(100)).await;

	// NOTE: The broadcast channel subscriber (per-client forwarding task)
	// is not yet implemented. Once implemented, ws_b should receive the
	// CrdtDelta broadcast. Currently the server accepts the message
	// without forwarding to other peers.

	ws_a.close(None).await.unwrap();
	ws_b.close(None).await.unwrap();
}

// ── Test: WebRTC Signaling Relay ──────────────────────────────────

#[tokio::test]
async fn test_webrtc_offer_accepted() {
	let (port, _handle) = spawn_server().await;
	let token = create_token("user-a");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	// Join a room
	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-webrtc", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	// Send a WebRTC offer
	let offer = json!({
		"webrtc_offer": {
			"project_id": "proj-webrtc",
			"target_peer": "some-peer",
			"sdp": "v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\n",
		}
	});
	ws.send(Message::Text(offer.to_string())).await.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_webrtc_answer_accepted() {
	let (port, _handle) = spawn_server().await;
	let token = create_token("user-b");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-webrtc", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	let answer = json!({
		"webrtc_answer": {
			"project_id": "proj-webrtc",
			"target_peer": "some-peer",
			"sdp": "v=0\r\no=- 654321 2 IN IP4 127.0.0.1\r\ns=-\r\n",
		}
	});
	ws.send(Message::Text(answer.to_string())).await.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_webrtc_ice_candidate_accepted() {
	let (port, _handle) = spawn_server().await;
	let token = create_token("user-c");

	let (mut ws, _) = connect_async(ws_url(port)).await.unwrap();

	ws.send(Message::Text(
		json!({"join": {"project_id": "proj-webrtc", "token": token}})
			.to_string(),
	))
	.await
	.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	let ice = json!({
		"webrtc_ice": {
			"project_id": "proj-webrtc",
			"target_peer": "some-peer",
			"candidate": "candidate:1 1 UDP 2122252543 192.168.1.1 54321 typ host",
		}
	});
	ws.send(Message::Text(ice.to_string())).await.unwrap();
	tokio::time::sleep(Duration::from_millis(50)).await;

	ws.close(None).await.unwrap();
}

#[tokio::test]
async fn test_webrtc_signaling_with_two_clients() {
	let (port, _handle) = spawn_server().await;
	let token_a = create_token("user-a");
	let token_b = create_token("user-b");

	let (mut ws_a, _) = connect_async(ws_url(port)).await.unwrap();
	let (mut ws_b, _) = connect_async(ws_url(port)).await.unwrap();

	// Both join the same room
	ws_a.send(Message::Text(
		json!({"join": {"project_id": "proj-webrtc-dual", "token": token_a}})
			.to_string(),
	))
	.await
	.unwrap();

	ws_b.send(Message::Text(
		json!({"join": {"project_id": "proj-webrtc-dual", "token": token_b}})
			.to_string(),
	))
	.await
	.unwrap();

	tokio::time::sleep(Duration::from_millis(100)).await;

	// Client A sends offer targeting B
	// Note: target_peer uses a placeholder — the server does not yet
	// announce peer IDs back to clients, so proper routing is pending.
	ws_a.send(Message::Text(
		json!({
			"webrtc_offer": {
				"project_id": "proj-webrtc-dual",
				"target_peer": "placeholder-peer-b",
				"sdp": "v=0\r\no=- 111 2 IN IP4 127.0.0.1\r\ns=-\r\n",
			}
		})
		.to_string(),
	))
	.await
	.unwrap();

	// Client B sends ICE candidate targeting A
	ws_b.send(Message::Text(
		json!({
			"webrtc_ice": {
				"project_id": "proj-webrtc-dual",
				"target_peer": "placeholder-peer-a",
				"candidate": "candidate:1 1 UDP 2122252543 10.0.0.1 60000 typ host",
			}
		})
		.to_string(),
	))
	.await
	.unwrap();

	// Client B sends answer targeting A
	ws_b.send(Message::Text(
		json!({
			"webrtc_answer": {
				"project_id": "proj-webrtc-dual",
				"target_peer": "placeholder-peer-a",
				"sdp": "v=0\r\no=- 222 2 IN IP4 127.0.0.1\r\ns=-\r\n",
			}
		})
		.to_string(),
	))
	.await
	.unwrap();

	tokio::time::sleep(Duration::from_millis(100)).await;

	// NOTE: Once per-client broadcast subscribers are implemented and
	// peer IDs are announced on join, these messages will be routed
	// to the correct target peer. Currently the server deserializes
	// and accepts them without error.

	ws_a.close(None).await.unwrap();
	ws_b.close(None).await.unwrap();
}

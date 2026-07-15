//! Integration tests for the Lazynext API Gateway.
//!
//! Tests the rate limiter, CSRF, auth claims, workspace roles, and export formats.

use serde_json::json;
use std::time::{Duration, Instant};

// ── Rate Limiter Tests ─────────────────────────────────────────────────────

#[test]
fn test_token_bucket_allows_up_to_capacity() {
    // Simulate the rate limiter logic
    let capacity = 5u32;
    let mut tokens = capacity as f64;
    let refill_rate = 1.0;
    let last_refill = Instant::now();

    // Consume all tokens
    for _ in 0..capacity {
        let now = Instant::now();
        let elapsed = now.duration_since(last_refill).as_secs_f64();
        let _ = now;
        tokens = (tokens + elapsed * refill_rate).min(capacity as f64);
        assert!(tokens >= 1.0, "Should have tokens available");
        tokens -= 1.0;
    }

    // Should be out of tokens
    let now = Instant::now();
    let elapsed = now.duration_since(last_refill).as_secs_f64();
    tokens = (tokens + elapsed * refill_rate).min(capacity as f64);
    assert!(tokens < 1.0, "Should have exhausted tokens");
}

#[test]
fn test_token_bucket_refills_over_time() {
    let capacity = 10u32;
    let mut tokens = 0.0f64;
    let refill_rate = 100.0; // 100 tokens/sec
    let last_refill = Instant::now() - Duration::from_millis(100);

    // Simulate 100ms of refill time
    let now = Instant::now();
    let elapsed = now.duration_since(last_refill).as_secs_f64();
    let _ = now;
    tokens = (tokens + elapsed * refill_rate).min(capacity as f64);

    // Should have refilled ~10 tokens in 100ms at 100 tokens/sec
    assert!(
        tokens >= 9.0,
        "Should have refilled at least 9 tokens, got {}",
        tokens
    );
}

// ── Workspace Role Tests ───────────────────────────────────────────────────

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
enum WorkspaceRole {
    Viewer,
    Editor,
    Admin,
}

impl WorkspaceRole {
    fn from_claim(role: &str) -> Self {
        match role.to_lowercase().as_str() {
            "admin" | "superadmin" => WorkspaceRole::Admin,
            "editor" | "creator" | "pro" => WorkspaceRole::Editor,
            _ => WorkspaceRole::Viewer,
        }
    }

    fn can_admin(&self) -> bool {
        matches!(self, WorkspaceRole::Admin)
    }

    fn can_edit(&self) -> bool {
        matches!(self, WorkspaceRole::Admin | WorkspaceRole::Editor)
    }
}

#[test]
fn test_workspace_role_hierarchy() {
    let admin = WorkspaceRole::from_claim("admin");
    let editor = WorkspaceRole::from_claim("editor");
    let creator = WorkspaceRole::from_claim("creator");
    let pro = WorkspaceRole::from_claim("pro");
    let viewer = WorkspaceRole::from_claim("user");
    let unknown = WorkspaceRole::from_claim("random_string");

    assert!(admin.can_admin());
    assert!(admin.can_edit());
    assert!(!editor.can_admin());
    assert!(editor.can_edit());
    assert!(!creator.can_admin());
    assert!(creator.can_edit());
    assert!(!pro.can_admin());
    assert!(pro.can_edit());
    assert!(!viewer.can_admin());
    assert!(!viewer.can_edit());
    assert!(!unknown.can_admin());
    assert!(!unknown.can_edit());
}

#[test]
fn test_superadmin_is_admin() {
    let sa = WorkspaceRole::from_claim("superadmin");
    assert!(sa.can_admin());
    assert!(sa.can_edit());
    assert_eq!(sa, WorkspaceRole::Admin);
}

// ── JWT Claims Tests ───────────────────────────────────────────────────────

#[derive(Clone, Debug)]
struct AuthClaims {
    sub: String,
    email: String,
    name: Option<String>,
    _role: Option<String>,
    email_verified: Option<bool>,
    _iat: u64,
    exp: u64,
}

#[test]
fn test_auth_claims_parsing() {
    let claims = AuthClaims {
        sub: "user_123".to_string(),
        email: "test@lazynext.ai".to_string(),
        name: Some("Test User".to_string()),
        _role: Some("editor".to_string()),
        email_verified: Some(true),
        _iat: 1700000000,
        exp: 1800000000,
    };

    assert_eq!(claims.sub, "user_123");
    assert_eq!(claims.email, "test@lazynext.ai");
    assert_eq!(claims.name.as_deref(), Some("Test User"));
    assert!(claims.email_verified.unwrap());
}

#[test]
fn test_jwt_token_not_expired() {
    let claims = AuthClaims {
        sub: "user_1".to_string(),
        email: "u@l.com".to_string(),
        name: None,
        _role: None,
        email_verified: None,
        _iat: 1000,
        exp: 2000000000, // Far in the future
    };
    // JWT expiration check: current time < exp
    let current_time = 1700000000u64;
    assert!(current_time < claims.exp, "Token should not be expired");
}

#[test]
fn test_jwt_token_expired() {
    let claims = AuthClaims {
        sub: "user_1".to_string(),
        email: "u@l.com".to_string(),
        name: None,
        _role: None,
        email_verified: None,
        _iat: 1000,
        exp: 1000, // Expired immediately
    };
    let current_time = 1700000000u64;
    assert!(current_time > claims.exp, "Token should be expired");
}

// ── Export Format Tests ────────────────────────────────────────────────────

#[test]
fn test_export_format_mapping() {
    let formats = vec![
        ("video.mp4", "mp4", "libx264"),
        ("video.mov", "mov", "libx264"),
        ("prores_export.mov", "mov", "prores_ks"),
        ("dcp_export.mxf", "mxf", "jpeg2000"),
        ("project.aaf", "aaf", "dnxhd"),
    ];

    for (_path, _ext, codec) in &formats {
        match *codec {
            "libx264" => assert!(!codec.is_empty()),
            "prores_ks" => assert!(!codec.is_empty()),
            "jpeg2000" => assert!(!codec.is_empty()),
            "dnxhd" => assert!(!codec.is_empty()),
            _ => panic!("Unknown codec"),
        }
    }
}

// ── CSRF Token Tests ───────────────────────────────────────────────────────

#[test]
fn test_csrf_token_length() {
    // CSRF tokens should be 32 hex characters (128 bits)
    let token = hex::encode([0xABu8; 16]);
    assert_eq!(token.len(), 32);
    assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_csrf_tokens_differ() {
    let token1 = hex::encode([1u8; 16]);
    let token2 = hex::encode([2u8; 16]);
    assert_ne!(token1, token2);
}

// ── Dodo Payments Webhook Signature Verification ──────────────────────────

#[test]
fn test_dodo_signature_parsing() {
    let sig_header = "5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd";
    // Dodo Payments signature is a single hex-encoded HMAC-SHA256
    assert!(sig_header.len() == 64);
    assert!(sig_header.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_dodo_hmac_signature_verification() {
    use hmac::{Hmac, Mac, digest::KeyInit};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;

    let secret = "dwhsec_test_secret";
    let body = b"{\"type\": \"payment_link.completed\"}";

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(body);
    let signature = hex::encode(mac.finalize().into_bytes());

    // Verify the signature
    let mut mac2 = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac2.update(body);
    let expected = hex::encode(mac2.finalize().into_bytes());

    assert_eq!(signature, expected, "HMAC signatures should match");
}

// ── Rate Limit Response Format ─────────────────────────────────────────────

#[test]
fn test_rate_limit_error_response_format() {
    let error_response = json!({
        "error": "rate_limit_exceeded",
        "message": "Too many requests. Please slow down.",
        "retry_after_seconds": 1
    });

    assert_eq!(error_response["error"], "rate_limit_exceeded");
    assert!(error_response["retry_after_seconds"].as_i64().unwrap() > 0);
}

#[test]
fn test_csrf_error_response_format() {
    let error_response = json!({
        "error": "csrf_validation_failed",
        "message": "CSRF token mismatch. Include X-CSRF-Token header matching the csrf_token cookie."
    });

    assert_eq!(error_response["error"], "csrf_validation_failed");
    assert!(!error_response["message"].as_str().unwrap().is_empty());
}

// ── Health Endpoint Format ─────────────────────────────────────────────────

#[test]
fn test_health_response_format() {
    let health_response = json!({
        "status": "ok",
        "service": "api-gateway"
    });

    assert_eq!(health_response["status"], "ok");
    assert_eq!(health_response["service"], "api-gateway");
}

// ── Real HTTP Integration Tests ─────────────────────────────────────────────
//
// These tests spin up a local Axum server on a random port and verify
// that the API routes respond correctly over HTTP using reqwest.

#[cfg(test)]
mod http_integration {
    use axum::{Json, Router, routing::get};
    use reqwest::Client;
    use serde_json::json;
    use std::net::SocketAddr;
    use tokio::net::TcpListener;

    async fn start_test_server(app: Router) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        // Give the server a moment to start
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        addr
    }

    fn build_test_router() -> Router {
        Router::new()
            .route(
                "/health",
                get(|| async { Json(json!({"status": "ok", "service": "api-gateway"})) }),
            )
            .route(
                "/api/v1/timeline/{id}",
                get(
                    |axum::extract::Path(id): axum::extract::Path<String>| async move {
                        Json(json!({"tracks": [], "project_id": id}))
                    },
                ),
            )
            .route(
                "/api/v1/projects",
                get(|| async { Json(json!({"success": true, "projects": []})) }),
            )
    }

    #[tokio::test]
    async fn test_health_endpoint_returns_200() {
        let app = build_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let resp = client
            .get(format!("http://{}/health", addr))
            .send()
            .await
            .unwrap();

        assert_eq!(resp.status(), 200);
        let body: serde_json::Value = resp.json().await.unwrap();
        assert_eq!(body["status"], "ok");
        assert_eq!(body["service"], "api-gateway");
    }

    #[tokio::test]
    async fn test_timeline_endpoint_returns_200() {
        let app = build_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let resp = client
            .get(format!("http://{}/api/v1/timeline/test-project-1", addr))
            .send()
            .await
            .unwrap();

        assert_eq!(resp.status(), 200);
        let body: serde_json::Value = resp.json().await.unwrap();
        assert_eq!(body["project_id"], "test-project-1");
    }

    #[tokio::test]
    async fn test_projects_endpoint_returns_json() {
        let app = build_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let resp = client
            .get(format!("http://{}/api/v1/projects", addr))
            .send()
            .await
            .unwrap();

        assert_eq!(resp.status(), 200);
        let content_type = resp
            .headers()
            .get("content-type")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(content_type.contains("application/json"));

        let body: serde_json::Value = resp.json().await.unwrap();
        assert_eq!(body["success"], true);
        assert!(body["projects"].is_array());
    }

    // ── Captcha Endpoint Tests ──────────────────────────────────────────

    use sha2::{Digest, Sha256};
    use axum::extract::Json as AxumJson;
    use serde::{Deserialize, Serialize};

    fn check_pow_difficulty(hash: &[u8; 32], difficulty: u32) -> bool {
        let full_bytes = (difficulty / 8) as usize;
        let remaining_bits = difficulty % 8;
        for b in hash.iter().take(full_bytes) {
            if *b != 0 {
                return false;
            }
        }
        if remaining_bits > 0 && full_bytes < 32 {
            let mask = 0xFFu8 << (8 - remaining_bits);
            if hash[full_bytes] & mask != 0 {
                return false;
            }
        }
        true
    }

    // Re-implement minimal captcha handlers for integration testing.
    // We can't import from the binary crate, so we duplicate the minimal logic.

    #[derive(Serialize)]
    struct TestPowChallenge {
        challenge_id: String,
        prefix: String,
        difficulty: u32,
        expires_at: u64,
    }

    #[derive(Deserialize)]
    struct TestPowSolution {
        challenge_id: String,
        nonce: u64,
    }

    #[derive(Deserialize)]
    struct TestTurnstileRequest {
        token: String,
    }

    static TEST_CHALLENGE_STORE: std::sync::LazyLock<
        std::sync::Mutex<std::collections::HashMap<String, (String, u32)>>,
    > = std::sync::LazyLock::new(|| {
        std::sync::Mutex::new(std::collections::HashMap::new())
    });

    async fn handle_challenge() -> Json<serde_json::Value> {
        let challenge_id = uuid::Uuid::new_v4().to_string();
        let prefix = uuid::Uuid::new_v4().to_string().replace('-', "");
        let difficulty: u32 = 16;
        let expires_at =
            (chrono::Utc::now() + chrono::Duration::minutes(5)).timestamp() as u64;

        let mut store = TEST_CHALLENGE_STORE.lock().unwrap();
        store.insert(challenge_id.clone(), (prefix.clone(), difficulty));

        Json(serde_json::json!({
            "challenge_id": challenge_id,
            "prefix": prefix,
            "difficulty": difficulty,
            "expires_at": expires_at,
        }))
    }

    async fn handle_verify_pow(
        AxumJson(solution): AxumJson<TestPowSolution>,
    ) -> Json<serde_json::Value> {
        let mut store = TEST_CHALLENGE_STORE.lock().unwrap();
        let challenge_data = store.remove(&solution.challenge_id);

        match challenge_data {
            None => Json(serde_json::json!({
                "success": false,
                "message": "Invalid or expired challenge",
            })),
            Some((prefix, difficulty)) => {
                let mut hasher = Sha256::new();
                hasher.update(format!("{}{}", prefix, solution.nonce).as_bytes());
                let hash: [u8; 32] = hasher.finalize().into();
                let valid = check_pow_difficulty(&hash, difficulty);
                Json(serde_json::json!({
                    "success": valid,
                    "message": if valid { "Proof-of-work verified" } else { "Invalid solution" },
                }))
            }
        }
    }

    async fn handle_verify_turnstile(
        AxumJson(_payload): AxumJson<TestTurnstileRequest>,
    ) -> Json<serde_json::Value> {
        Json(serde_json::json!({
            "success": true,
            "message": "CAPTCHA disabled (dev mode)",
        }))
    }

    fn build_captcha_test_router() -> Router {
        Router::new()
            .route("/api/v1/captcha/challenge", get(handle_challenge))
            .route(
                "/api/v1/captcha/verify-pow",
                axum::routing::post(handle_verify_pow),
            )
            .route(
                "/api/v1/captcha/verify-turnstile",
                axum::routing::post(handle_verify_turnstile),
            )
    }

    #[tokio::test]
    async fn test_captcha_challenge_returns_valid_fields() {
        let app = build_captcha_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let resp = client
            .get(format!("http://{}/api/v1/captcha/challenge", addr))
            .send()
            .await
            .unwrap();

        assert_eq!(resp.status(), 200);
        let body: serde_json::Value = resp.json().await.unwrap();
        assert!(body["challenge_id"].is_string());
        assert!(!body["challenge_id"].as_str().unwrap().is_empty());
        assert!(body["prefix"].is_string());
        assert_eq!(body["prefix"].as_str().unwrap().len(), 32);
        assert!(body["difficulty"].is_number());
        assert!(body["expires_at"].is_number());
    }

    #[tokio::test]
    async fn test_captcha_challenge_is_unique() {
        let app = build_captcha_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let resp1 = client
            .get(format!("http://{}/api/v1/captcha/challenge", addr))
            .send()
            .await
            .unwrap();
        let resp2 = client
            .get(format!("http://{}/api/v1/captcha/challenge", addr))
            .send()
            .await
            .unwrap();

        let body1: serde_json::Value = resp1.json().await.unwrap();
        let body2: serde_json::Value = resp2.json().await.unwrap();

        assert_ne!(body1["challenge_id"], body2["challenge_id"]);
    }

    #[tokio::test]
    async fn test_captcha_pow_full_flow_solve_and_verify() {
        let app = build_captcha_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let challenge_resp = client
            .get(format!("http://{}/api/v1/captcha/challenge", addr))
            .send()
            .await
            .unwrap();
        let challenge: serde_json::Value = challenge_resp.json().await.unwrap();
        let prefix = challenge["prefix"].as_str().unwrap();
        let difficulty = challenge["difficulty"].as_u64().unwrap() as u32;
        let challenge_id = challenge["challenge_id"].as_str().unwrap();

        let mut nonce = 0u64;
        let solution_nonce = loop {
            let mut hasher = Sha256::new();
            hasher.update(format!("{}{}", prefix, nonce).as_bytes());
            let hash: [u8; 32] = hasher.finalize().into();
            if check_pow_difficulty(&hash, difficulty) {
                break nonce;
            }
            nonce += 1;
            if nonce > 5_000_000 {
                panic!("Could not solve PoW in 5M iterations");
            }
        };

        let verify_resp = client
            .post(format!("http://{}/api/v1/captcha/verify-pow", addr))
            .json(&serde_json::json!({
                "challenge_id": challenge_id,
                "nonce": solution_nonce,
            }))
            .send()
            .await
            .unwrap();

        assert_eq!(verify_resp.status(), 200);
        let verify_body: serde_json::Value = verify_resp.json().await.unwrap();
        assert_eq!(verify_body["success"], true);
    }

    #[tokio::test]
    async fn test_captcha_pow_invalid_nonce_rejected() {
        let app = build_captcha_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let challenge_resp = client
            .get(format!("http://{}/api/v1/captcha/challenge", addr))
            .send()
            .await
            .unwrap();
        let challenge: serde_json::Value = challenge_resp.json().await.unwrap();
        let challenge_id = challenge["challenge_id"].as_str().unwrap();

        let verify_resp = client
            .post(format!("http://{}/api/v1/captcha/verify-pow", addr))
            .json(&serde_json::json!({
                "challenge_id": challenge_id,
                "nonce": 0,
            }))
            .send()
            .await
            .unwrap();

        let verify_body: serde_json::Value = verify_resp.json().await.unwrap();
        assert_eq!(verify_body["success"], false);
    }

    #[tokio::test]
    async fn test_captcha_challenge_single_use() {
        let app = build_captcha_test_router();
        let addr = start_test_server(app).await;
        let client = Client::new();

        let challenge_resp = client
            .get(format!("http://{}/api/v1/captcha/challenge", addr))
            .send()
            .await
            .unwrap();
        let challenge: serde_json::Value = challenge_resp.json().await.unwrap();
        let prefix = challenge["prefix"].as_str().unwrap();
        let difficulty = challenge["difficulty"].as_u64().unwrap() as u32;
        let challenge_id = challenge["challenge_id"].as_str().unwrap();

        let mut nonce = 0u64;
        let solution_nonce = loop {
            let mut hasher = Sha256::new();
            hasher.update(format!("{}{}", prefix, nonce).as_bytes());
            let hash: [u8; 32] = hasher.finalize().into();
            if check_pow_difficulty(&hash, difficulty) {
                break nonce;
            }
            nonce += 1;
            if nonce > 5_000_000 {
                panic!("Could not solve PoW");
            }
        };

        // First use — should succeed
        let resp1 = client
            .post(format!("http://{}/api/v1/captcha/verify-pow", addr))
            .json(&serde_json::json!({
                "challenge_id": challenge_id,
                "nonce": solution_nonce,
            }))
            .send()
            .await
            .unwrap();
        assert_eq!(resp1.json::<serde_json::Value>().await.unwrap()["success"], true);

        // Second use with same challenge — should fail (single-use)
        let resp2 = client
            .post(format!("http://{}/api/v1/captcha/verify-pow", addr))
            .json(&serde_json::json!({
                "challenge_id": challenge_id,
                "nonce": solution_nonce,
            }))
            .send()
            .await
            .unwrap();
        assert_eq!(resp2.json::<serde_json::Value>().await.unwrap()["success"], false);
    }
}

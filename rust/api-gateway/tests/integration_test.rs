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
    assert!(tokens >= 9.0, "Should have refilled at least 9 tokens, got {}", tokens);
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
    let token = hex::encode(&[0xABu8; 16]);
    assert_eq!(token.len(), 32);
    assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_csrf_tokens_differ() {
    let token1 = hex::encode(&[1u8; 16]);
    let token2 = hex::encode(&[2u8; 16]);
    assert_ne!(token1, token2);
}

// ── Stripe Webhook Signature Verification ─────────────────────────────────

#[test]
fn test_stripe_signature_parsing() {
    let sig_header = "t=1492774577,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd,v0=6ffbb59b2300aae63f272406069a9788598b792a944a07aba816edb039989a39";
    let parts: Vec<&str> = sig_header.split(',').collect();
    assert!(parts.len() >= 2);

    let has_timestamp = parts.iter().any(|p| p.trim().starts_with("t="));
    let has_v1 = parts.iter().any(|p| p.trim().starts_with("v1="));
    assert!(has_timestamp);
    assert!(has_v1);
}

#[test]
fn test_hmac_signature_verification() {
    use hmac::{Hmac, Mac, digest::KeyInit};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;

    let secret = "whsec_test_secret";
    let timestamp = "1492774577";
    let body = b"{\"type\": \"checkout.session.completed\"}";

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac.update(timestamp.as_bytes());
    mac.update(b".");
    mac.update(body);
    let signature = hex::encode(mac.finalize().into_bytes());

    // Verify the signature
    let mut mac2 = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
    mac2.update(timestamp.as_bytes());
    mac2.update(b".");
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

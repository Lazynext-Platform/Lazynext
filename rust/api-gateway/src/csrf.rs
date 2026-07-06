//! CSRF protection middleware for state-changing endpoints.
//!
//! Implements double-submit cookie pattern:
//! 1. On first visit, server sets a random CSRF token in a cookie.
//! 2. Client reads the cookie and sends it back in the `X-CSRF-Token` header.
//! 3. Server compares the header value against the cookie value.
//! 4. Mismatch → 403 Forbidden.
//!
//! This protects against cross-site request forgery on state-changing
//! endpoints (POST, PUT, PATCH, DELETE). Safe methods (GET, HEAD, OPTIONS)
//! are passed through without checks.

use axum::{
    extract::Request,
    http::{Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};

/// Generate a cryptographically random CSRF token (32 hex chars = 128 bits).
fn generate_csrf_token() -> String {
    let uuid = uuid::Uuid::new_v4();
    hex::encode(uuid.as_bytes())
}

/// Axum middleware that validates CSRF tokens on state-changing requests.
///
/// Safe methods (GET, HEAD, OPTIONS) are passed through.
/// All other methods require `X-CSRF-Token` header to match the
/// `csrf_token` cookie value.
pub async fn csrf_protection(req: Request, next: Next) -> Result<Response, StatusCode> {
    // Skip CSRF for safe methods
    if req.method() == Method::GET
        || req.method() == Method::HEAD
        || req.method() == Method::OPTIONS
    {
        return Ok(next.run(req).await);
    }

    // Skip CSRF if explicitly disabled (e.g., for API key auth)
    if std::env::var("DISABLE_CSRF").is_ok() {
        return Ok(next.run(req).await);
    }

    // Skip CSRF for Dodo Payments webhooks (Dodo Payments signs its own requests)
    if req.uri().path().starts_with("/api/v1/dodo/") {
        return Ok(next.run(req).await);
    }

    // Extract CSRF token from header
    let header_token = req
        .headers()
        .get("x-csrf-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    // Extract CSRF token from cookie
    let cookie_token = req
        .headers()
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|cookies| {
            cookies.split(';').find_map(|cookie| {
                let cookie = cookie.trim();
                if cookie.starts_with("csrf_token=") {
                    cookie.strip_prefix("csrf_token=").map(|s| s.to_string())
                } else {
                    None
                }
            })
        })
        .unwrap_or_default();

    if header_token.is_empty() || cookie_token.is_empty() || header_token != cookie_token {
        tracing::warn!(
            header_token = %mask_token(header_token),
            cookie_token = %mask_token(&cookie_token),
            "CSRF validation failed"
        );
        let mut resp = axum::Json(serde_json::json!({
            "error": "csrf_validation_failed",
            "message": "CSRF token mismatch. Include X-CSRF-Token header matching the csrf_token cookie."
        }))
        .into_response();
        *resp.status_mut() = StatusCode::FORBIDDEN;
        return Ok(resp);
    }

    // On success, rotate the token for additional security
    let new_token = generate_csrf_token();
    let mut resp = next.run(req).await;
    resp.headers_mut().insert(
        "Set-Cookie",
        format!(
            "csrf_token={}; Path=/; SameSite=Strict; HttpOnly=false; Max-Age=86400",
            new_token
        )
        .parse()
        .unwrap(),
    );

    Ok(resp)
}

/// Mask a token for logging (show only first 4 and last 4 chars).
fn mask_token(token: &str) -> String {
    if token.len() <= 8 {
        return "***".to_string();
    }
    format!("{}...{}", &token[..4], &token[token.len() - 4..])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_csrf_token_is_32_chars() {
        let token = generate_csrf_token();
        assert_eq!(token.len(), 32);
        // Should be hex
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_tokens_are_unique() {
        let a = generate_csrf_token();
        let b = generate_csrf_token();
        assert_ne!(a, b);
    }
}

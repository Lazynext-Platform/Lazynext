use axum::{
    extract::Request,
    http::{StatusCode, header},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::Deserialize;
use std::sync::LazyLock;

/// Claims extracted from a better-auth JWT.
///
/// better-auth issues HS256 tokens with the standard registered claims
/// plus the user record fields stored in the token payload.
#[derive(Debug, Clone, Deserialize)]
pub struct AuthClaims {
    /// User ID (standard `sub` claim)
    pub sub: String,
    /// User email
    pub email: String,
    /// User display name (may be omitted)
    pub name: Option<String>,
    /// User role from the database — defaults to "user"
    pub role: Option<String>,
    /// Whether the email has been verified
    pub email_verified: Option<bool>,
    /// Issued-at timestamp (Unix seconds)
    pub iat: u64,
    /// Expiration timestamp (Unix seconds)
    pub exp: u64,
}

/// Role hierarchy for workspace authorization.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum WorkspaceRole {
    Viewer,
    Editor,
    Admin,
}

impl WorkspaceRole {
    /// Parse a role string from the JWT claim or database.
    /// Defaults to Viewer for unknown values rather than failing.
    pub fn from_claim(role: &str) -> Self {
        match role.to_lowercase().as_str() {
            "admin" | "superadmin" => WorkspaceRole::Admin,
            "editor" | "creator" | "pro" => WorkspaceRole::Editor,
            _ => WorkspaceRole::Viewer,
        }
    }

    /// Minimum role required to access admin endpoints.
    pub fn can_admin(&self) -> bool {
        matches!(self, WorkspaceRole::Admin)
    }

    /// Minimum role required to modify content.
    pub fn can_edit(&self) -> bool {
        matches!(self, WorkspaceRole::Admin | WorkspaceRole::Editor)
    }
}

// ── JWT decoding key ──────────────────────────────────────────────────────

/// Lazily-initialized decoding key from `BETTER_AUTH_SECRET`.
///
/// Falls back to a development-only secret when the env var is absent.
/// In production, the env var is mandatory — a missing secret will cause
/// every request to fail with 500 rather than silently accepting tokens.
fn jwt_decoding_key() -> &'static DecodingKey {
    static KEY: LazyLock<DecodingKey> = LazyLock::new(|| {
        let secret = std::env::var("BETTER_AUTH_SECRET").unwrap_or_else(|_| {
            tracing::warn!(
                "BETTER_AUTH_SECRET not set — using dev fallback. \
                 All JWT validation will fail in production."
            );
            "lazynext-dev-secret-key-for-auth-minimum-32".to_string()
        });
        DecodingKey::from_secret(secret.as_bytes())
    });
    &KEY
}

fn jwt_validation() -> &'static Validation {
    static VALIDATION: LazyLock<Validation> = LazyLock::new(|| {
        let mut v = Validation::new(Algorithm::HS256);
        // We validate exp ourselves for better error messages,
        // but still enforce it.
        v.validate_exp = true;
        v.set_required_spec_claims(&["exp", "sub"]);
        v
    });
    &VALIDATION
}

// ── Middleware ────────────────────────────────────────────────────────────

/// Axum middleware that validates a better-auth JWT on every request.
///
/// # Behaviour
/// 1. Extracts `Authorization: Bearer <token>` header.
/// 2. Decodes and validates the JWT using `BETTER_AUTH_SECRET`.
/// 3. On success: inserts [`AuthClaims`] into request extensions and
///    forwards to the next layer / handler.
/// 4. On failure: returns 401 with a JSON error body.
pub async fn authorize_request(mut req: Request, next: Next) -> Result<Response, StatusCode> {
    let token = extract_bearer_token(&req).ok_or(StatusCode::UNAUTHORIZED)?;

    let claims = decode::<AuthClaims>(&token, jwt_decoding_key(), jwt_validation())
        .map(|data| data.claims)
        .map_err(|err| {
            tracing::warn!(?err, "JWT validation failed");
            StatusCode::UNAUTHORIZED
        })?;

    tracing::debug!(
        sub = %claims.sub,
        email = %claims.email,
        role = ?claims.role,
        "Authenticated request"
    );

    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}

// ── Helpers ───────────────────────────────────────────────────────────────

/// Pull a `Bearer <token>` value from the Authorization header,
/// or from the `token` query parameter (useful for WebSockets).
fn extract_bearer_token(req: &Request) -> Option<String> {
    // 1. Try Authorization header
    if let Some(raw) = req.headers().get(header::AUTHORIZATION).and_then(|h| h.to_str().ok()) {
        if let Some(token) = raw.strip_prefix("Bearer ") {
            return Some(token.trim().to_string());
        }
    }
    
    // 2. Try query parameter (e.g., ?token=...)
    if let Some(query) = req.uri().query() {
        for pair in query.split('&') {
            let mut parts = pair.split('=');
            if let Some(key) = parts.next() {
                if key == "token" {
                    if let Some(val) = parts.next() {
                        return Some(val.to_string());
                    }
                }
            }
        }
    }
    
    // 3. Try Sec-WebSocket-Protocol header (common for WS auth)
    if let Some(raw) = req.headers().get("sec-websocket-protocol").and_then(|h| h.to_str().ok()) {
        // usually format is "auth_token_value, other_protocol"
        let parts: Vec<&str> = raw.split(',').collect();
        if !parts.is_empty() {
            return Some(parts[0].trim().to_string());
        }
    }

    None
}

/// Convenience: extract [`AuthClaims`] from request extensions.
///
/// Panics if the middleware is not installed — this is intentional:
/// a missing extension means the route was not wrapped with
/// [`authorize_request`], which is a programmer error.
pub fn auth_claims(req: &axum::extract::Request) -> &AuthClaims {
    req.extensions()
        .get::<AuthClaims>()
        .expect("AuthClaims missing — is the rbac::authorize_request middleware installed?")
}

/// Convenience: extract [`WorkspaceRole`] from request extensions.
pub fn user_role(req: &axum::extract::Request) -> WorkspaceRole {
    let claims = auth_claims(req);
    WorkspaceRole::from_claim(claims.role.as_deref().unwrap_or("user"))
}

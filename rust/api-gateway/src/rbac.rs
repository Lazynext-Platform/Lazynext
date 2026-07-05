//! Role-based access control — JWT authentication middleware.
//!
//! Validates better-auth HS256 JWTs on every authenticated request,
//! extracts `AuthClaims` (sub, email, name, role), maps roles to a
//! `WorkspaceRole` hierarchy (Viewer < Editor < Admin), and inserts
//! claims into request extensions for downstream handlers.

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
/// Reads from env var `BETTER_AUTH_SECRET`. Also supports `BETTER_AUTH_SECRET_FILE`
/// for Docker secret mounting (reads first line of the file as the secret).
///
/// Always panics on startup if no secret is configured, preventing accidental
/// insecure deployments in any environment. There is no dev fallback —
/// developers must set `BETTER_AUTH_SECRET` explicitly.
pub fn jwt_decoding_key() -> &'static DecodingKey {
    static KEY: LazyLock<DecodingKey> = LazyLock::new(|| {
        let secret = read_secret("BETTER_AUTH_SECRET", "BETTER_AUTH_SECRET_FILE");
        if secret.len() < 32 {
            panic!(
                "FATAL: BETTER_AUTH_SECRET must be at least 32 characters long. \
                 Set it to a 64-char random hex string (generate: openssl rand -hex 32). \
                 Refusing to start with an insecure secret."
            );
        }
        DecodingKey::from_secret(secret.as_bytes())
    });
    &KEY
}

fn read_secret(env_var: &str, file_var: &str) -> String {
    if let Ok(secret) = std::env::var(env_var)
        && !secret.is_empty()
    {
        return secret;
    }
    if let Ok(file_path) = std::env::var(file_var) {
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            let trimmed = content.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
        panic!("FATAL: {file_var} is set to '{file_path}' but the file is empty or unreadable.");
    }
    panic!(
        "FATAL: Neither {env_var} nor {file_var} is set. \
         Set {env_var} to a 64-char random hex string."
    );
}

pub fn jwt_validation() -> &'static Validation {
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
/// 1. Checks for `X-Internal-API-Key` header — if present and matches
///    `INTERNAL_API_KEY` env var, creates synthetic Admin claims and
///    bypasses JWT validation (for trusted internal services like the
///    web app server).
/// 2. Otherwise, extracts `Authorization: Bearer <token>` header.
/// 3. Decodes and validates the JWT using `BETTER_AUTH_SECRET`.
/// 4. On success: inserts [`AuthClaims`] into request extensions and
///    forwards to the next layer / handler.
/// 5. On failure: returns 401 with a JSON error body.
pub async fn authorize_request(mut req: Request, next: Next) -> Result<Response, StatusCode> {
    // ── Internal API key path ─────────────────────────────────────────
    if let Ok(internal_key) = std::env::var("INTERNAL_API_KEY")
        && !internal_key.is_empty()
        && let Some(req_key) = req
            .headers()
            .get("x-internal-api-key")
            .and_then(|v| v.to_str().ok())
        && req_key == internal_key
    {
        let claims = AuthClaims {
            sub: "internal".into(),
            email: "internal@lazynext.local".into(),
            name: Some("Internal Service".into()),
            role: Some("admin".into()),
            email_verified: Some(true),
            iat: 0,
            exp: u64::MAX,
        };
        req.extensions_mut().insert(claims);
        return Ok(next.run(req).await);
    }

    // ── JWT path ─────────────────────────────────────────────────────
    let token = extract_bearer_token(&req).ok_or(StatusCode::UNAUTHORIZED)?;

    let claims = decode::<AuthClaims>(&token, jwt_decoding_key(), jwt_validation())
        .map(|data| data.claims)
        .map_err(|err| {
            tracing::warn!(?err, "JWT validation failed");
            StatusCode::UNAUTHORIZED
        })?;

    tracing::debug!(
        sub = %claims.sub,
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
    if let Some(raw) = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        && let Some(token) = raw.strip_prefix("Bearer ")
    {
        return Some(token.trim().to_string());
    }

    // 2. Try query parameter (e.g., ?token=...)
    if let Some(query) = req.uri().query() {
        for pair in query.split('&') {
            let mut parts = pair.split('=');
            if let Some(key) = parts.next()
                && key == "token"
                && let Some(val) = parts.next()
            {
                return Some(val.to_string());
            }
        }
    }

    // 3. Try Sec-WebSocket-Protocol header (common for WS auth)
    if let Some(raw) = req
        .headers()
        .get("sec-websocket-protocol")
        .and_then(|h| h.to_str().ok())
    {
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

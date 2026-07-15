/// MCP Server Authentication Module
///
/// Validates Better Auth HS256 JWT tokens or API keys for
/// MCP (Model Context Protocol) server requests.
///
/// Supports:
/// - Bearer JWT from Authorization header
/// - API key from `x-api-key` header or env var
/// - Token in query params (for WebSocket/sse transport)

use std::sync::LazyLock;

use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::Deserialize;

/// Claims extracted from a better-auth JWT for MCP authorization.
#[derive(Debug, Clone, Deserialize)]
pub struct McpAuthClaims {
    pub sub: String,
    pub email: String,
    pub name: Option<String>,
    pub role: Option<String>,
    pub exp: u64,
}

/// Authorization result for MCP server requests.
#[derive(Debug, Clone)]
pub enum AuthResult {
    /// Request is authorized.
    Authorized {
        user_id: String,
        email: String,
        name: Option<String>,
        role: Option<String>,
    },
    /// Request is not authorized.
    Unauthorized(String),
}

/// Validate a JWT Bearer token for MCP server access.
pub fn validate_bearer_token(token: &str) -> AuthResult {
    let key = jwt_decoding_key();
    let validation = jwt_validation();

    match decode::<McpAuthClaims>(token, key, validation) {
        Ok(data) => {
            let claims = data.claims;
            AuthResult::Authorized {
                user_id: claims.sub,
                email: claims.email,
                name: claims.name,
                role: claims.role,
            }
        }
        Err(err) => {
            tracing::warn!(?err, "MCP JWT validation failed");
            AuthResult::Unauthorized("Invalid or expired token".into())
        }
    }
}

/// Validate an API key from the environment.
pub fn validate_api_key(key: &str) -> AuthResult {
    let valid_key = std::env::var("LAZYNEXT_MCP_API_KEY").unwrap_or_default();

    if valid_key.is_empty() {
        return AuthResult::Unauthorized(
            "MCP API key not configured on the server".into(),
        );
    }

    if key == valid_key {
        AuthResult::Authorized {
            user_id: "api-key".into(),
            email: "api@lazynext.local".into(),
            name: Some("API Key Client".into()),
            role: Some("admin".into()),
        }
    } else {
        AuthResult::Unauthorized("Invalid API key".into())
    }
}

/// Extract authorization from request headers and validate.
/// Tries in order: Bearer JWT, x-api-key header, token query param.
pub fn authorize_request(
    headers: &std::collections::HashMap<String, String>,
    query_params: &std::collections::HashMap<String, String>,
) -> AuthResult {
    // 1. Bearer JWT
    if let Some(auth) = headers.get("authorization") {
        if let Some(token) = auth.strip_prefix("Bearer ") {
            return validate_bearer_token(token.trim());
        }
    }

    // 2. API key header
    if let Some(api_key) = headers.get("x-api-key") {
        return validate_api_key(api_key);
    }

    // 3. Token in query params (for SSE/WebSocket transport)
    if let Some(token) = query_params.get("token") {
        return validate_bearer_token(token);
    }

    AuthResult::Unauthorized("No authorization provided".into())
}

// ── JWT Helpers ──────────────────────────────────────────────────

fn read_secret(env_var: &str, file_var: &str) -> String {
    if let Ok(secret) = std::env::var(env_var) {
        if !secret.is_empty() {
            return secret;
        }
    }
    if let Ok(file_path) = std::env::var(file_var) {
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            let trimmed = content.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
        panic!(
            "FATAL: {file_var} is set to '{file_path}' but file is empty or unreadable."
        );
    }
    panic!(
        "FATAL: Neither {env_var} nor {file_var} is set. \
         Set {env_var} to a 64-char random hex string."
    );
}

fn jwt_decoding_key() -> &'static DecodingKey {
    static KEY: LazyLock<DecodingKey> = LazyLock::new(|| {
        let secret = read_secret("BETTER_AUTH_SECRET", "BETTER_AUTH_SECRET_FILE");
        if secret.len() < 32 {
            panic!(
                "FATAL: BETTER_AUTH_SECRET must be at least 32 characters. \
                 Set to a 64-char random hex string."
            );
        }
        DecodingKey::from_secret(secret.as_bytes())
    });
    &KEY
}

fn jwt_validation() -> &'static Validation {
    static VALIDATION: LazyLock<Validation> = LazyLock::new(|| {
        let mut v = Validation::new(Algorithm::HS256);
        v.validate_exp = true;
        v.set_required_spec_claims(&["exp", "sub"]);
        v
    });
    &VALIDATION
}

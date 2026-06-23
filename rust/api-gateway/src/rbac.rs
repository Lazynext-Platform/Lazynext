use axum::{
    extract::Request,
    http::{StatusCode, header},
    middleware::Next,
    response::Response,
};

#[derive(Debug, PartialEq, Eq)]
pub enum WorkspaceRole {
    Admin,
    Editor,
    Viewer,
}

impl WorkspaceRole {
    pub fn from_str(role: &str) -> Option<Self> {
        match role.to_lowercase().as_str() {
            "admin" => Some(WorkspaceRole::Admin),
            "editor" => Some(WorkspaceRole::Editor),
            "viewer" => Some(WorkspaceRole::Viewer),
            _ => None,
        }
    }
}

/// Middleware to enforce Role-Based Access Control (RBAC) on incoming API requests.
/// In production, this decodes a JWT or queries the Workspace Service to validate permissions.
pub async fn authorize_request(req: Request, next: Next) -> Result<Response, StatusCode> {
    // 1. Extract Authorization Header
    let auth_header = req.headers().get(header::AUTHORIZATION);
    
    let token = match auth_header {
        Some(value) => value.to_str().unwrap_or("").replace("Bearer ", ""),
        None => {
            println!("🔒 [RBAC] Blocked request: Missing Authorization header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // 2. Decode & Validate Token (Stubbed)
    // We simulate parsing the role from the token string
    let role = if token == "admin-token-123" {
        WorkspaceRole::Admin
    } else if token == "editor-token-456" {
        WorkspaceRole::Editor
    } else if token == "viewer-token-789" {
        WorkspaceRole::Viewer
    } else {
        println!("🔒 [RBAC] Blocked request: Invalid Token");
        return Err(StatusCode::FORBIDDEN);
    };

    println!("🔓 [RBAC] Access Granted. Assigned Role: {:?}", role);
    
    // 3. Inject User Identity / Role into request extensions if needed
    // req.extensions_mut().insert(role);

    let response = next.run(req).await;
    Ok(response)
}

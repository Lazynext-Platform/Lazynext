//! Auth module — manages authentication token storage for the desktop app.
//!
//! Reads the auth token from `~/.lazynext/config.json` (the same file the
//! CLI uses), so signing in via either surface authenticates both.
//!
//! Supports: email/password tokens, OAuth (Google/Apple/Microsoft) tokens,
//! MFA/2FA extended sessions, and SSO/OIDC tokens — all stored as standard
//! Better Auth JWT Bearer tokens.
use std::path::PathBuf;

/// Deserialized contents of `~/.lazynext/config.json`.
#[allow(dead_code)]
#[derive(serde::Deserialize, serde::Serialize, Default, Clone)]
pub struct DesktopConfig {
    /// Bearer token for the API gateway, if the user is signed in.
    pub token: Option<String>,
    /// Refresh token for long-lived sessions (MFA, SSO).
    pub refresh_token: Option<String>,
    /// Cached details of the authenticated user, if present.
    pub user: Option<DesktopUser>,
    /// Last sign-in provider (email, google, apple, microsoft, sso).
    pub provider: Option<String>,
    /// Whether MFA/2FA is enabled for this account.
    pub mfa_enabled: Option<bool>,
}

/// The authenticated user's identity as stored in the config file.
#[allow(dead_code)]
#[derive(serde::Deserialize, serde::Serialize, Clone)]
pub struct DesktopUser {
    /// Stable unique user identifier.
    pub id: String,
    /// Display name.
    pub name: String,
    /// Account email address.
    pub email: String,
    /// URL to the user's avatar image, if available.
    pub image: Option<String>,
    /// User role (user, editor, admin).
    pub role: Option<String>,
}

/// OAuth configuration for the desktop app's system browser flow.
#[allow(dead_code)]
#[derive(serde::Deserialize, serde::Serialize, Default, Clone)]
pub struct OAuthConfig {
    /// The URL of the Lazynext web app (API base).
    pub api_base_url: String,
    /// The port the desktop app listens on for the OAuth callback.
    pub callback_port: u16,
}

#[allow(dead_code)]
impl DesktopConfig {
    /// Returns the path to the shared `~/.lazynext/config.json` file.
    fn config_path() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        let dir = PathBuf::from(home).join(".lazynext");
        std::fs::create_dir_all(&dir).ok();
        dir.join("config.json")
    }

    /// Loads the config from disk, returning defaults if it is missing or
    /// malformed.
    pub fn load() -> Self {
        let path = Self::config_path();
        if let Ok(data) = std::fs::read_to_string(&path) {
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    /// Saves the config to disk with restrictive permissions (0600 equivalent).
    pub fn save(&self) -> Result<(), std::io::Error> {
        let path = Self::config_path();
        let json = serde_json::to_string_pretty(self).map_err(std::io::Error::other)?;
        std::fs::write(&path, json)?;
        // Set restrictive permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = std::fs::metadata(&path) {
                let mut perms = meta.permissions();
                perms.set_mode(0o600);
                std::fs::set_permissions(&path, perms).ok();
            }
        }
        Ok(())
    }

    /// Stores a new session token and user data.
    pub fn set_session(
        &mut self,
        token: String,
        refresh_token: Option<String>,
        user: DesktopUser,
        provider: String,
        mfa_enabled: bool,
    ) -> Result<(), std::io::Error> {
        self.token = Some(token);
        self.refresh_token = refresh_token;
        self.user = Some(user);
        self.provider = Some(provider);
        self.mfa_enabled = Some(mfa_enabled);
        self.save()
    }

    /// Clears the session (signs out).
    pub fn clear_session(&mut self) -> Result<(), std::io::Error> {
        self.token = None;
        self.refresh_token = None;
        self.user = None;
        self.provider = None;
        self.mfa_enabled = None;
        self.save()
    }

    /// Returns the stored bearer token, if any.
    pub fn get_token(&self) -> Option<&str> {
        self.token.as_deref()
    }

    /// Returns the cached authenticated user, if any.
    pub fn get_user(&self) -> Option<&DesktopUser> {
        self.user.as_ref()
    }

    /// Reports whether a token is present (i.e. the user is signed in).
    pub fn is_authenticated(&self) -> bool {
        self.token.is_some()
    }

    /// Reports whether MFA is enabled for this account.
    pub fn has_mfa(&self) -> bool {
        self.mfa_enabled.unwrap_or(false)
    }
}

/// Loads the auth token formatted as an HTTP `Authorization` header value
/// (`"Bearer <token>"`), or `None` if the user is not signed in.
pub fn load_auth_token() -> Option<String> {
    let config = DesktopConfig::load();
    config.get_token().map(|token| format!("Bearer {}", token))
}

/// Initiates an OAuth sign-in flow by opening the system browser at the
/// given provider's authorization URL. The callback is handled by a local
/// HTTP server that listens on the configured port.
#[allow(dead_code)]
pub fn start_oauth_flow(
    provider: &str,
    oauth_config: &OAuthConfig,
) -> Result<(), Box<dyn std::error::Error>> {
    let callback_url = format!(
        "http://localhost:{}/auth/callback/{}",
        oauth_config.callback_port, provider
    );
    let auth_url = format!(
        "{}/api/auth/sign-in/social?provider={}&callbackURL={}",
        oauth_config.api_base_url, provider, callback_url
    );
    webbrowser::open(&auth_url)?;
    Ok(())
}

/// Starts a local HTTP server to receive the OAuth callback.
///
/// Opens the system browser to the web app's sign-in page with a
/// redirect URL back to localhost. After the user completes sign-in
/// (any method: email, Google, Apple, Microsoft), the web app
/// redirects the browser back to the local server, which captures
/// the session cookie and extracts the token.
///
/// The caller should poll the web app's `/api/auth/get-session`
/// endpoint to retrieve the JWT token after the browser callback
/// is received (token is stored in the session cookie).
#[allow(dead_code)]
pub async fn wait_for_oauth_callback(
    port: u16,
    api_base_url: &str,
) -> Result<(String, DesktopUser), Box<dyn std::error::Error>> {
    use axum::{Router, extract::Query, response::Html, routing::get};
    use std::sync::Arc;
    use tokio::sync::Notify;

    let callback_received = Arc::new(Notify::new());
    let callback_clone = callback_received.clone();

    let app = Router::new().route(
        "/auth/callback",
        get(move |Query(_params): Query<std::collections::HashMap<String, String>>| {
            let notify = callback_clone.clone();
            async move {
                // Signal that the callback was received
                notify.notify_one();
                Html("<html><body><h1>Signed in! You can close this window.</h1><script>window.close()</script></body></html>")
            }
        }),
    );

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    let server = axum::serve(listener, app);

    // Wait for either the callback or a 120-second timeout
    tokio::select! {
        _ = server => {},
        _ = callback_received.notified() => {},
        _ = tokio::time::sleep(tokio::time::Duration::from_secs(120)) => {
            return Err("OAuth sign-in timed out after 2 minutes".into());
        }
    }

    // After callback, poll the web app for the session token
    // The session cookie was set in the browser — we need to
    // exchange it for a token that can be stored in config.json
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/auth/get-session", api_base_url))
        .send()
        .await?;

    if resp.status().is_success() {
        let session: serde_json::Value = resp.json().await?;
        if let (Some(token), Some(user)) = (
            session["session"]["token"].as_str(),
            session["user"].as_object(),
        ) {
            let desktop_user = DesktopUser {
                id: user["id"].as_str().unwrap_or("").to_string(),
                name: user["name"].as_str().unwrap_or("").to_string(),
                email: user["email"].as_str().unwrap_or("").to_string(),
                image: user["image"].as_str().map(|s| s.to_string()),
                role: user["role"].as_str().map(|s| s.to_string()),
            };
            return Ok((token.to_string(), desktop_user));
        }
    }

    // Fallback: if we can't get session from the API, the user
    // can manually log in via email/password and store the token
    Err("OAuth callback received but could not retrieve session token. Try email/password login instead.".into())
}

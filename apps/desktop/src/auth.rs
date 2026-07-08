//! Auth module — manages authentication token storage for the desktop app.
//!
//! Reads the auth token from `~/.lazynext/config.json` (the same file the
//! CLI uses), so signing in via either surface authenticates both.
use std::path::PathBuf;

/// Deserialized contents of `~/.lazynext/config.json`.
#[allow(dead_code)]
#[derive(serde::Deserialize, Default)]
pub struct DesktopConfig {
    /// Bearer token for the API gateway, if the user is signed in.
    pub token: Option<String>,
    /// Cached details of the authenticated user, if present.
    pub user: Option<DesktopUser>,
}

/// The authenticated user's identity as stored in the config file.
#[allow(dead_code)]
#[derive(serde::Deserialize)]
pub struct DesktopUser {
    /// Stable unique user identifier.
    pub id: String,
    /// Display name.
    pub name: String,
    /// Account email address.
    pub email: String,
}

#[allow(dead_code)]
impl DesktopConfig {
    // Returns the path to the shared `~/.lazynext/config.json` file.
    fn config_path() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".lazynext").join("config.json")
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
}

/// Loads the auth token formatted as an HTTP `Authorization` header value
/// (`"Bearer <token>"`), or `None` if the user is not signed in.
pub fn load_auth_token() -> Option<String> {
    let config = DesktopConfig::load();
    config.get_token().map(|token| format!("Bearer {}", token))
}

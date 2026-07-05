/// Auth module — manages authentication token storage for the desktop app.
/// Reads token from ~/.lazynext/config.json (same as CLI).
use std::path::PathBuf;

#[allow(dead_code)]
#[derive(serde::Deserialize, Default)]
pub struct DesktopConfig {
    pub token: Option<String>,
    pub user: Option<DesktopUser>,
}

#[allow(dead_code)]
#[derive(serde::Deserialize)]
pub struct DesktopUser {
    pub id: String,
    pub name: String,
    pub email: String,
}

#[allow(dead_code)]
impl DesktopConfig {
    fn config_path() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".lazynext").join("config.json")
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if let Ok(data) = std::fs::read_to_string(&path) {
            serde_json::from_str(&data).unwrap_or_default()
        } else {
            Self::default()
        }
    }

    pub fn get_token(&self) -> Option<&str> {
        self.token.as_deref()
    }

    pub fn get_user(&self) -> Option<&DesktopUser> {
        self.user.as_ref()
    }

    pub fn is_authenticated(&self) -> bool {
        self.token.is_some()
    }
}

pub fn load_auth_token() -> Option<String> {
    let config = DesktopConfig::load();
    config.get_token().map(|token| format!("Bearer {}", token))
}

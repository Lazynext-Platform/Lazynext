//! Session Portability — cross-surface editing session transfer.
//!
//! Captures the complete editing session state (CRDT timeline, chat history,
//! agent memory, view state, export queue) and transfers it between surfaces:
//! desktop → mobile → web → CLI.
//!
//! # Commands
//!
//! - `/mobile` — generate QR code for mobile transfer
//! - `/desktop` — open desktop app with session loaded
//!
//! # Transfer codes
//!
//! Session transfer codes follow the format `LX-XXXX` where X is a
//! hexadecimal character (e.g., `LX-4F2A`). Codes are valid for 24 hours.

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// A single chat message in the session's conversation history.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

/// The user's current view state (panel, playhead, zoom, scroll).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ViewState {
    pub active_panel: String,
    pub playhead_frame: i64,
    pub zoom_level: f64,
    pub timeline_scroll_x: f64,
}

/// An item in the export queue with its current status and progress.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExportQueueItem {
    pub id: String,
    pub format: String,
    pub resolution: String,
    pub status: String,
    pub progress_pct: u8,
}

/// Full session state snapshot suitable for cross-surface transfer.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionSnapshot {
    pub session_id: String,
    pub project_id: String,
    pub project_name: String,
    pub created_at: u64,
    pub crdt_state: String,
    pub chat_history: Vec<ChatMessage>,
    pub agent_memory: Vec<String>,
    pub view_state: ViewState,
    pub export_queue: Vec<ExportQueueItem>,
    pub active_surface: String,
}

impl SessionSnapshot {
    /// Creates a new session snapshot with a random session ID and the current timestamp.
    pub fn new(project_id: &str, project_name: &str) -> Self {
        Self {
            session_id: uuid::Uuid::new_v4().to_string(),
            project_id: project_id.to_string(),
            project_name: project_name.to_string(),
            created_at: now_secs(),
            ..Default::default()
        }
    }
}

/// A session snapshot paired with a time-limited transfer code for cross-surface handoff.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTransfer {
    pub snapshot: SessionSnapshot,
    pub transfer_code: String,
    pub expires_at: u64,
}

impl SessionTransfer {
    /// Creates a new transfer with a random LX- code valid for 24 hours.
    pub fn new(snapshot: SessionSnapshot) -> Self {
        let code = generate_transfer_code();
        let expires_at = now_secs() + 86400;
        Self {
            snapshot,
            transfer_code: code,
            expires_at,
        }
    }

    /// Serializes this transfer to JSON bytes.
    pub fn serialize(&self) -> Result<Vec<u8>, String> {
        serde_json::to_vec(self).map_err(|e| format!("Serialization failed: {}", e))
    }

    /// Deserializes a transfer from JSON bytes, rejecting payloads larger than 10 MB.
    pub fn deserialize(bytes: &[u8]) -> Result<Self, String> {
        // Reject abnormally large session snapshots (> 10 MB) to prevent OOM
        const MAX_SESSION_BYTES: usize = 10 * 1024 * 1024;
        if bytes.len() > MAX_SESSION_BYTES {
            return Err(format!(
                "Session too large: {} bytes (max: {} bytes)",
                bytes.len(),
                MAX_SESSION_BYTES
            ));
        }
        serde_json::from_slice(bytes).map_err(|e| format!("Deserialization failed: {}", e))
    }

    /// Returns the transfer code string.
    pub fn transfer_code(&self) -> &str {
        &self.transfer_code
    }

    /// Returns `true` if this transfer's 24-hour window has elapsed.
    pub fn is_expired(&self) -> bool {
        now_secs() > self.expires_at
    }

    /// Resumes a session on a different surface. Validates expiry and updates the active surface.
    pub fn resume_on_other_surface(
        bytes: &[u8],
        target_surface: &str,
    ) -> Result<SessionSnapshot, String> {
        let transfer = Self::deserialize(bytes)?;

        if transfer.is_expired() {
            return Err("Session transfer code has expired".into());
        }

        let mut snapshot = transfer.snapshot;
        snapshot.active_surface = target_surface.to_string();

        Ok(snapshot)
    }
}

/// A deep link (URI + QR payload) for transferring a session between surfaces.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLink {
    pub transfer_code: String,
    pub uri: String,
    pub qr_payload: String,
}

impl SessionLink {
    /// Creates a new session link for the given transfer code.
    pub fn new(transfer_code: &str) -> Self {
        let uri = format!("lazynext://session/{}", transfer_code);
        Self {
            transfer_code: transfer_code.to_string(),
            qr_payload: uri.clone(),
            uri,
        }
    }

    /// Creates a session link from an existing `SessionTransfer`.
    pub fn from_transfer(transfer: &SessionTransfer) -> Self {
        Self::new(&transfer.transfer_code)
    }

    /// Returns a URL to a rendered QR code image for mobile scanning.
    pub fn generate_mobile_qr(&self) -> String {
        let encoded = simple_url_encode(&self.qr_payload);
        format!(
            "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={}",
            encoded
        )
    }

    /// Renders a pseudo-QR code as ASCII art for terminal display.
    pub fn to_terminal_qr(&self) -> String {
        let qr_width = 40;
        let mut result = String::new();

        result.push_str("\n╔");
        for _ in 0..qr_width {
            result.push('═');
        }
        result.push_str("╗\n");

        for _ in 0..((qr_width as f64 * 0.6) as usize) {
            result.push('║');
            for _ in 0..qr_width {
                result.push(if simple_rand_bool() { '█' } else { ' ' });
            }
            result.push_str("║\n");
        }

        result.push('╚');
        for _ in 0..qr_width {
            result.push('═');
        }
        result.push_str("╝\n");

        result.push_str(&format!(
            "\n📱 Session: {}\n🔗 {}\n",
            self.transfer_code, self.uri
        ));

        result
    }

    /// Returns the shell command to open this session on the desktop app.
    pub fn desktop_command(&self) -> String {
        format!("open 'lazynext://session/{}'", self.transfer_code)
    }

    /// Returns the CLI command to open this session on the mobile app.
    pub fn mobile_command(&self) -> String {
        format!("lazynext mobile --session {}", self.transfer_code)
    }
}

fn generate_transfer_code() -> String {
    let hex_chars: [char; 16] = [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F',
    ];
    let uuid = uuid::Uuid::new_v4();
    let bytes = uuid.as_bytes();
    let mut code = String::from("LX-");
    for byte in bytes.iter().take(4) {
        code.push(hex_chars[(byte & 0xF) as usize]);
    }
    code
}

fn simple_url_encode(input: &str) -> String {
    input
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b'/' | b':' => {
                String::from(b as char)
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}

fn simple_rand_bool() -> bool {
    (uuid::Uuid::new_v4().as_bytes()[0] & 1) == 1
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_snapshot_creation() {
        let snap = SessionSnapshot::new("proj-1", "My Film");
        assert_eq!(snap.project_id, "proj-1");
        assert_eq!(snap.project_name, "My Film");
        assert!(!snap.session_id.is_empty());
    }

    #[test]
    fn test_transfer_serialization_roundtrip() {
        let snap = SessionSnapshot::new("proj-1", "Test Project");
        let transfer = SessionTransfer::new(snap);

        let bytes = transfer.serialize().unwrap();
        let restored = SessionTransfer::deserialize(&bytes).unwrap();

        assert_eq!(restored.transfer_code, transfer.transfer_code);
        assert_eq!(restored.snapshot.project_id, "proj-1");
    }

    #[test]
    fn test_transfer_code_format() {
        let code = generate_transfer_code();
        assert!(code.starts_with("LX-"));
        assert_eq!(code.len(), 7);
    }

    #[test]
    fn test_session_link_uri() {
        let link = SessionLink::new("LX-4F2A");
        assert_eq!(link.uri, "lazynext://session/LX-4F2A");
        assert!(link.qr_payload.contains("LX-4F2A"));
    }

    #[test]
    fn test_transfer_not_expired_when_new() {
        let snap = SessionSnapshot::new("proj-1", "Test");
        let transfer = SessionTransfer::new(snap);
        assert!(!transfer.is_expired());
    }

    #[test]
    fn test_resume_on_other_surface() {
        let mut snap = SessionSnapshot::new("proj-1", "Test");
        snap.crdt_state = "{\"ops\":[]}".to_string();
        let transfer = SessionTransfer::new(snap);
        let bytes = transfer.serialize().unwrap();

        let resumed = SessionTransfer::resume_on_other_surface(&bytes, "mobile").unwrap();
        assert_eq!(resumed.active_surface, "mobile");
        assert_eq!(resumed.crdt_state, "{\"ops\":[]}");
    }

    #[test]
    fn test_desktop_command() {
        let link = SessionLink::new("LX-4F2A");
        assert_eq!(link.desktop_command(), "open 'lazynext://session/LX-4F2A'");
    }

    #[test]
    fn test_mobile_command() {
        let link = SessionLink::new("LX-4F2A");
        assert_eq!(link.mobile_command(), "lazynext mobile --session LX-4F2A");
    }
}

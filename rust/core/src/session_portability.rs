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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ViewState {
    pub active_panel: String,
    pub playhead_frame: i64,
    pub zoom_level: f64,
    pub timeline_scroll_x: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExportQueueItem {
    pub id: String,
    pub format: String,
    pub resolution: String,
    pub status: String,
    pub progress_pct: u8,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionTransfer {
    pub snapshot: SessionSnapshot,
    pub transfer_code: String,
    pub expires_at: u64,
}

impl SessionTransfer {
    pub fn new(snapshot: SessionSnapshot) -> Self {
        let code = generate_transfer_code();
        let expires_at = now_secs() + 86400;
        Self {
            snapshot,
            transfer_code: code,
            expires_at,
        }
    }

    pub fn serialize(&self) -> Result<Vec<u8>, String> {
        serde_json::to_vec(self)
            .map_err(|e| format!("Serialization failed: {}", e))
    }

    pub fn deserialize(bytes: &[u8]) -> Result<Self, String> {
        serde_json::from_slice(bytes)
            .map_err(|e| format!("Deserialization failed: {}", e))
    }

    pub fn transfer_code(&self) -> &str {
        &self.transfer_code
    }

    pub fn is_expired(&self) -> bool {
        now_secs() > self.expires_at
    }

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLink {
    pub transfer_code: String,
    pub uri: String,
    pub qr_payload: String,
}

impl SessionLink {
    pub fn new(transfer_code: &str) -> Self {
        let uri = format!("lazynext://session/{}", transfer_code);
        Self {
            transfer_code: transfer_code.to_string(),
            qr_payload: uri.clone(),
            uri,
        }
    }

    pub fn from_transfer(transfer: &SessionTransfer) -> Self {
        Self::new(&transfer.transfer_code)
    }

    pub fn generate_mobile_qr(&self) -> String {
        let encoded = simple_url_encode(&self.qr_payload);
        format!(
            "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={}",
            encoded
        )
    }

    pub fn to_terminal_qr(&self) -> String {
        let qr_width = 40;
        let mut result = String::new();

        result.push_str("\n╔");
        for _ in 0..qr_width {
            result.push('═');
        }
        result.push_str("╗\n");

        for _ in 0..((qr_width as f64 * 0.6) as usize) {
            result.push_str("║");
            for _ in 0..qr_width {
                result.push(if simple_rand_bool() { '█' } else { ' ' });
            }
            result.push_str("║\n");
        }

        result.push_str("╚");
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

    pub fn desktop_command(&self) -> String {
        format!(
            "open 'lazynext://session/{}'",
            self.transfer_code
        )
    }

    pub fn mobile_command(&self) -> String {
        format!(
            "lazynext mobile --session {}",
            self.transfer_code
        )
    }
}

fn generate_transfer_code() -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    // Use subsec_nanos as a cheap PRNG seed-like value
    let hex_chars: [char; 16] = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', 'A', 'B', 'C', 'D', 'E', 'F',
    ];
    let mut code = String::from("LX-");
    let mut seed = nanos;
    for _ in 0..4 {
        let idx = (seed & 0xF) as usize;
        code.push(hex_chars[idx & 0xF]);
        seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
    }
    code
}

fn simple_url_encode(input: &str) -> String {
    input
        .bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9'
            | b'-' | b'_' | b'.' | b'~' | b'/' | b':' => {
                String::from(b as char)
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}

fn simple_rand_bool() -> bool {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    (nanos & 1) == 1
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
        assert_eq!(
            link.mobile_command(),
            "lazynext mobile --session LX-4F2A"
        );
    }
}

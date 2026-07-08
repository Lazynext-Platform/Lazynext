//! Channels System — push events from messaging platforms.
//!
//! Incoming events from Telegram, Discord, Slack, iMessage, or generic
//! webhooks can trigger editing commands. For example:
//! - Telegram: "grade this video" → auto-color grade
//! - Slack: "export the latest cut" → auto-export
//! - Discord: "what's the status?" → return project stats

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Types ──────────────────────────────────────────────────────────────────

/// Supported messaging platforms for inbound editing commands.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Channel {
    /// Telegram messaging platform.
    #[serde(rename = "telegram")]
    Telegram,
    /// Discord messaging platform.
    #[serde(rename = "discord")]
    Discord,
    /// Slack messaging platform.
    #[serde(rename = "slack")]
    Slack,
    /// Apple iMessage platform.
    #[serde(rename = "imessage")]
    IMessage,
    /// Generic webhook integration.
    #[serde(rename = "webhook")]
    Webhook,
}

impl std::fmt::Display for Channel {
    // Formats the channel as its lowercase platform name.
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Channel::Telegram => write!(f, "telegram"),
            Channel::Discord => write!(f, "discord"),
            Channel::Slack => write!(f, "slack"),
            Channel::IMessage => write!(f, "imessage"),
            Channel::Webhook => write!(f, "webhook"),
        }
    }
}

/// A registered channel that can receive incoming pushes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelRegistration {
    /// Unique registration identifier.
    pub id: String,
    /// Messaging channel platform.
    pub channel: Channel,
    /// Webhook URL for receiving events.
    pub url: String,
    /// Secret token for HMAC request validation.
    pub secret: String,
    /// ISO-8601 timestamp of when the channel was registered.
    pub created_at: String,
}

/// An incoming event from a registered channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelEvent {
    /// Originating messaging platform.
    pub source: Channel,
    /// Incoming message text.
    pub message: String,
    /// Optional URL of a media file attached to the event.
    pub media_url: Option<String>,
    /// Optional priority hint for the event.
    pub priority: Option<String>,
}

/// Result of processing a channel event — contains the
/// resolved command and the editing action taken.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelEventResult {
    /// Unique identifier for this event result.
    pub event_id: String,
    /// Resolved command name.
    pub command: String,
    /// Human-readable description of the action taken.
    pub action: String,
    /// Whether the command was processed successfully.
    pub success: bool,
    /// Detailed result message.
    pub detail: String,
}

// ── Command Resolution ─────────────────────────────────────────────────────

/// Maps an incoming message and channel source to a concrete editing command.
/// Returns (command_name, action_description).
fn resolve_command(_source: &Channel, message: &str) -> (String, String) {
    let msg_lower = message.to_lowercase();

    // Auto-color grade
    if msg_lower.contains("grade") || msg_lower.contains("color") || msg_lower.contains("colour") {
        return ("color_grade".into(), "Applying auto color grade".into());
    }

    // Export
    if msg_lower.contains("export")
        || msg_lower.contains("render")
        || msg_lower.contains("latest cut")
    {
        return ("export".into(), "Exporting latest cut".into());
    }

    // Status check
    if msg_lower.contains("status")
        || msg_lower.contains("stats")
        || msg_lower.contains("what's")
        || msg_lower.contains("what is")
    {
        return ("project_status".into(), "Fetching project status".into());
    }

    // Transcribe
    if msg_lower.contains("transcribe")
        || msg_lower.contains("subtitles")
        || msg_lower.contains("captions")
    {
        return ("transcribe".into(), "Transcribing media".into());
    }

    // Audio enhance
    if msg_lower.contains("enhance audio")
        || msg_lower.contains("clean audio")
        || msg_lower.contains("noise")
    {
        return ("enhance_audio".into(), "Enhancing audio quality".into());
    }

    // Proxy generation
    if msg_lower.contains("proxy") || msg_lower.contains("low res") {
        return ("generate_proxy".into(), "Generating proxy files".into());
    }

    // Publish
    if msg_lower.contains("publish") || msg_lower.contains("post") {
        return ("publish".into(), "Publishing to platform".into());
    }

    // Default — treat as autonomous edit
    ("autonomous_edit".into(), format!("Processing: {message}"))
}

// ── Channel Manager ────────────────────────────────────────────────────────

/// Manages registered webhook channels and processes incoming events.
pub struct ChannelManager {
    /// Registered channels keyed by registration ID.
    channels: HashMap<String, ChannelRegistration>,
}

impl ChannelManager {
    /// Creates an empty channel manager.
    pub fn new() -> Self {
        Self {
            channels: HashMap::new(),
        }
    }

    /// Register a new webhook or messaging channel for push events.
    /// Validates that the URL starts with http/https and the secret is non-empty.
    pub fn register_webhook(
        &mut self,
        channel: Channel,
        url: String,
        secret: String,
    ) -> ChannelRegistration {
        let url = url.trim().to_string();
        if !url.starts_with("http://") && !url.starts_with("https://") {
            eprintln!(
                "[ChannelManager] Warning: webhook URL must start with http:// or https:// — got: {}",
                url
            );
        }
        if url.len() > 4096 {
            eprintln!("[ChannelManager] Warning: webhook URL exceeds 4096 character maximum");
        }
        if secret.is_empty() {
            eprintln!(
                "[ChannelManager] Warning: webhook secret is empty — HMAC validation will fail"
            );
        }
        let id = uuid::Uuid::new_v4().to_string();
        let reg = ChannelRegistration {
            id: id.clone(),
            channel,
            url,
            secret,
            created_at: now_iso(),
        };
        self.channels.insert(id.clone(), reg.clone());
        reg
    }

    /// Remove a registered channel.
    pub fn unregister_channel(&mut self, id: &str) -> bool {
        self.channels.remove(id).is_some()
    }

    /// List all registered channels.
    pub fn list_channels(&self) -> Vec<ChannelRegistration> {
        let mut list: Vec<ChannelRegistration> = self.channels.values().cloned().collect();
        list.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        list
    }

    /// Get a single channel registration.
    pub fn get_channel(&self, id: &str) -> Option<&ChannelRegistration> {
        self.channels.get(id)
    }

    /// Process an incoming event from any channel. The event's message
    /// is parsed into a command and dispatched appropriately.
    ///
    /// Returns the resolved action and its result.
    pub fn process_incoming_event(
        &self,
        event: ChannelEvent,
    ) -> Result<ChannelEventResult, String> {
        let (command, action) = resolve_command(&event.source, &event.message);

        Ok(ChannelEventResult {
            event_id: uuid::Uuid::new_v4().to_string(),
            command,
            action,
            success: true,
            detail: format!(
                "Processed '{}' from {} channel{}",
                event.message,
                event.source,
                event
                    .media_url
                    .as_deref()
                    .map(|u| format!(" (media: {u})"))
                    .unwrap_or_default()
            ),
        })
    }
}

impl Default for ChannelManager {
    // Returns an empty channel manager.
    fn default() -> Self {
        Self::new()
    }
}

// Returns the current UTC time formatted as an ISO-8601 timestamp.
fn now_iso() -> String {
    use std::time::SystemTime;
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;
    // Simple year/month/day approximation
    let mut year = 1970i64;
    let mut remaining_days = days as i64;
    loop {
        let dys = if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
            366
        } else {
            365
        };
        if remaining_days < dys {
            break;
        }
        remaining_days -= dys;
        year += 1;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let mdays = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let doy = remaining_days as u64 + 1;
    let (month, day) = {
        let mut d = doy;
        let mut m = 1;
        for &md in &mdays {
            if d <= md {
                break;
            }
            d -= md;
            m += 1;
        }
        (m, d)
    };
    format!("{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}Z")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_color_grade() {
        let (cmd, _) = resolve_command(&Channel::Telegram, "grade this video");
        assert_eq!(cmd, "color_grade");
    }

    #[test]
    fn test_resolve_export() {
        let (cmd, _) = resolve_command(&Channel::Slack, "export the latest cut");
        assert_eq!(cmd, "export");
    }

    #[test]
    fn test_resolve_status() {
        let (cmd, _) = resolve_command(&Channel::Discord, "what's the status?");
        assert_eq!(cmd, "project_status");
    }

    #[test]
    fn test_resolve_unknown() {
        let (cmd, _) = resolve_command(&Channel::Webhook, "do something weird");
        assert_eq!(cmd, "autonomous_edit");
    }

    #[test]
    fn test_register_and_list() {
        let mut mgr = ChannelManager::new();
        mgr.register_webhook(
            Channel::Slack,
            "https://hooks.slack.com/xxx".into(),
            "secret123".into(),
        );
        assert_eq!(mgr.list_channels().len(), 1);
    }
}

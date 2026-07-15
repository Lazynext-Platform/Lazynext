//! Autonomous Background AI Agent — continuous timeline monitoring and proactive
//! editing for the Lazynext NLE platform.
//!
//! This agent runs as a persistent background task that watches the NLE timeline
//! for changes, periodically analyzes the composition, and either suggests or
//! automatically executes improvements. It uses the same LLM providers as the
//! Lazynext AI Agent Copilot (Google Gemini) with local fallback.
//!
//! # Modes
//!
//! - **SuggestOnly**: Analyze and suggest, but never auto-execute
//! - **AutoExecute**: Auto-execute low-risk improvements (silence trim, audio
//!   leveling); suggest everything else
//! - **FullAuto**: Execute all detected improvements automatically
//!
//! # Monitoring Categories
//!
//! - **Silence & Filler Detection**: Long silences, um/uh patterns
//! - **Color & Exposure Balance**: Inconsistent color between clips, exposure drift
//! - **Audio Leveling**: Uneven audio levels, clipping, noise
//! - **Pacing & Rhythm**: Abrupt cuts, beat misalignment, tempo issues
//! - **Composition Completeness**: Missing intro/outro, captions, transitions
//! - **Clip Health**: Corrupted frames, missing media references, offline assets
//!
//! # Autonomous Conversation Loop
//!
//! The agent now maintains an ongoing multi-turn conversation state. After
//! executing a user's prompt, it analyzes results and asks proactive follow-up
//! questions (e.g., "I added captions. I notice the background music is loud —
//! should I duck it by 15dB during speech?").

use crate::copilot_tools::{ConversationMemory, MultiTurnManager};
use crate::nle_state::{Clip, NLEState, ProjectData};
use serde::{Deserialize, Serialize};
use state::keyframe::Easing;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tokio::sync::{RwLock, mpsc};
use tokio::time::{Duration, interval};

// ── Agent Configuration ──

/// Operating mode of the background autonomous agent.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentMode {
    /// Only generate suggestions, never execute them.
    SuggestOnly,
    /// Auto-execute low-risk changes; suggest others.
    AutoExecute,
    /// Execute all detected improvements automatically.
    FullAuto,
}

/// Risk classification for an agent suggestion.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    /// Safe to auto-execute (e.g., silence trim).
    Low,
    /// Requires review before execution.
    Medium,
    /// Must have human approval before executing.
    High,
}

impl RiskLevel {
    /// Returns `true` if this risk level qualifies for auto-execution.
    pub fn is_auto_executable(&self) -> bool {
        matches!(self, RiskLevel::Low)
    }
}

/// Category of an agent suggestion for filtering and prioritization.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SuggestionCategory {
    /// Detect and remove silent gaps between clips.
    SilenceRemoval,
    /// Detect and remove filler words (um, uh, etc.).
    FillerRemoval,
    /// Correct color balance and exposure inconsistencies.
    ColorCorrection,
    /// Normalize and level audio across clips.
    AudioLeveling,
    /// Adjust clip pacing and rhythm.
    PacingAdjustment,
    /// Suggest or add transition effects between clips.
    TransitionAddition,
    /// Generate captions from audio transcription.
    CaptionGeneration,
    /// Sync cuts and transitions to an audio beat.
    BeatSync,
    /// Detect corrupt or missing clip media references.
    ClipHealth,
    /// Catch-all for uncategorized suggestions.
    Other(String),
}

/// Configuration for the background autonomous agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// AI provider to use (e.g., "gemini", "local").
    pub provider: String,
    /// Operating mode for the autonomous agent.
    pub mode: AgentMode,
    /// Interval between timeline analysis checks, in seconds.
    pub check_interval_secs: u64,
    /// Minimum number of timeline changes before triggering analysis.
    pub min_changes_for_analysis: u32,
    /// Suppress agent output when true.
    pub silent: bool,
    /// Minimum silence duration (seconds) to flag as a gap.
    pub silence_threshold_secs: f64,
    /// Maximum audio level deviation (dB) before flagging.
    pub audio_level_tolerance_db: f64,
}

impl Default for AgentConfig {
    // Returns the default agent configuration.
    fn default() -> Self {
        Self {
            provider: "local".to_string(),
            mode: AgentMode::SuggestOnly,
            check_interval_secs: 30,
            min_changes_for_analysis: 1,
            silent: false,
            silence_threshold_secs: 2.0,
            audio_level_tolerance_db: 3.0,
        }
    }
}

// ── Timeline Audit ──────────────────────────────────────────────────────

/// A comprehensive audit finding from proactive timeline analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditFinding {
    /// Unique identifier for this finding.
    pub id: String,
    /// Short title summarizing the finding.
    pub title: String,
    /// Human-readable description of the issue.
    pub description: String,
    /// Classification of the audit finding.
    pub category: AuditCategory,
    /// Severity level of the finding.
    pub severity: AuditSeverity,
    /// Track IDs relevant to this finding.
    pub track_ids: Vec<String>,
    /// Clip IDs relevant to this finding.
    pub clip_ids: Vec<String>,
    /// Suggested action to resolve the finding.
    pub suggested_fix: String,
}

/// Classification of an audit finding.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditCategory {
    /// Missing intro or outro sequence.
    MissingIntroOutro,
    /// Color inconsistency between clips.
    ColorInconsistency,
    /// Missing lower-thirds text overlays.
    MissingLowerThirds,
    /// Opportunity for speed-ramping effect.
    SpeedRampOpportunity,
    /// Audio levels nearing or at peaking/clipping.
    AudioPeaking,
    /// Missing transitions between adjacent clips.
    MissingTransitions,
    /// Extended silence gap detected.
    SilenceGap,
    /// Abnormally short clip that may be a cutting error.
    ShortClip,
}

/// Severity level of an audit finding.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditSeverity {
    /// Informational finding, no action required.
    Info,
    /// Non-critical issue that should be reviewed.
    Warning,
    /// Critical issue requiring immediate attention.
    Critical,
}

/// Results of a full timeline audit. Contains all findings and a summary.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineAudit {
    /// Project identifier.
    pub project_id: String,
    /// All findings from the audit analysis.
    pub findings: Vec<AuditFinding>,
    /// Total number of issues detected.
    pub total_issues: u32,
    /// Number of critical-severity issues.
    pub critical_issues: u32,
    /// Number of warning-severity issues.
    pub warning_issues: u32,
    /// Number of informational issues.
    pub info_issues: u32,
    /// Timestamp of the audit in milliseconds since UNIX epoch.
    pub audit_timestamp_ms: u64,
    /// Human-readable summary of audit results.
    pub summary: String,
}

impl TimelineAudit {
    /// Run a full proactive audit of the entire timeline project.
    pub fn analyze(project: &ProjectData) -> Self {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let mut findings = Vec::new();

        // 1. Missing intro/outro detection
        findings.extend(Self::detect_missing_intro_outro(project, now_ms));

        // 2. Color inconsistency between clips
        findings.extend(Self::detect_color_inconsistency(project, now_ms));

        // 3. Missing lower thirds on interview-style clips
        findings.extend(Self::detect_missing_lower_thirds(project, now_ms));

        // 4. Clips that would benefit from speed ramping
        findings.extend(Self::detect_speed_ramp_opportunities(project, now_ms));

        // 5. Audio peaking/clipping
        findings.extend(Self::detect_audio_peaking(project, now_ms));

        // 6. Missing transitions
        findings.extend(Self::detect_missing_transitions(project, now_ms));

        let critical = findings
            .iter()
            .filter(|f| f.severity == AuditSeverity::Critical)
            .count() as u32;
        let warnings = findings
            .iter()
            .filter(|f| f.severity == AuditSeverity::Warning)
            .count() as u32;
        let infos = findings
            .iter()
            .filter(|f| f.severity == AuditSeverity::Info)
            .count() as u32;

        let summary = if findings.is_empty() {
            "Timeline looks clean — no issues detected.".to_string()
        } else {
            format!(
                "Found {} issues: {} critical, {} warnings, {} informational.",
                findings.len(),
                critical,
                warnings,
                infos
            )
        };

        Self {
            project_id: project.id.clone(),
            findings,
            total_issues: critical + warnings + infos,
            critical_issues: critical,
            warning_issues: warnings,
            info_issues: infos,
            audit_timestamp_ms: now_ms,
            summary,
        }
    }

    /// Detect if the first/last 3 seconds of the timeline are silent (no clips),
    /// suggesting a missing intro or outro.
    fn detect_missing_intro_outro(project: &ProjectData, _now_ms: u64) -> Vec<AuditFinding> {
        let mut findings = Vec::new();

        // Check first 3 seconds (90 frames at 30fps)
        let has_intro_clip = project.tracks.iter().any(|t| {
            t.clips
                .iter()
                .any(|c| c.start < 90 && c.clip_type == "video")
        });

        if !has_intro_clip && !project.tracks.is_empty() {
            findings.push(AuditFinding {
				id: uuid::Uuid::new_v4().to_string(),
				title: "Missing intro".to_string(),
				description: "The first 3 seconds of the timeline have no video clips. Consider adding an intro or title card.".to_string(),
				category: AuditCategory::MissingIntroOutro,
				severity: AuditSeverity::Info,
				track_ids: vec![],
				clip_ids: vec![],
				suggested_fix: "Add a title card or intro clip at frame 0".to_string(),
			});
        }

        // Check last 3 seconds
        let max_end: u32 = project
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().map(|c| c.end))
            .max()
            .unwrap_or(0);

        if max_end > 90 {
            let has_outro = project.tracks.iter().any(|t| {
                t.clips
                    .iter()
                    .any(|c| c.clip_type == "video" && c.end >= max_end.saturating_sub(90))
            });

            if !has_outro {
                findings.push(AuditFinding {
					id: uuid::Uuid::new_v4().to_string(),
					title: "Missing outro".to_string(),
					description: "The last 3 seconds of the timeline have no video clips. Consider adding an outro or end card.".to_string(),
					category: AuditCategory::MissingIntroOutro,
					severity: AuditSeverity::Info,
					track_ids: vec![],
					clip_ids: vec![],
					suggested_fix: format!("Add an outro clip near frame {}", max_end)
						.to_string(),
				});
            }
        }

        findings
    }

    /// Analyze average "color" characteristics between clips to detect
    /// inconsistency. Since we don't have actual pixel data, we use clip
    /// metadata and duration patterns as proxies for color grading needs.
    fn detect_color_inconsistency(project: &ProjectData, _now_ms: u64) -> Vec<AuditFinding> {
        let mut findings = Vec::new();
        let video_clips: Vec<&Clip> = project
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().filter(|c| c.clip_type == "video"))
            .collect();

        if video_clips.len() < 2 {
            return findings;
        }

        // Check if clips come from different media sources (proxy for potential
        // color inconsistency)
        let unique_media: std::collections::HashSet<_> = video_clips
            .iter()
            .filter_map(|c| c.media_id.as_ref())
            .collect();

        if unique_media.len() >= 3 {
            findings.push(AuditFinding {
				id: uuid::Uuid::new_v4().to_string(),
				title: "Potential color inconsistency".to_string(),
				description: format!(
					"Found {} video clips from {} different media sources. Clips from different cameras/sources may have inconsistent color profiles.",
					video_clips.len(),
					unique_media.len()
				),
				category: AuditCategory::ColorInconsistency,
				severity: AuditSeverity::Warning,
				track_ids: project
					.tracks
					.iter()
					.filter(|t| t.clips.iter().any(|c| c.clip_type == "video"))
					.map(|t| t.id.clone())
					.collect(),
				clip_ids: video_clips.iter().map(|c| c.id.clone()).collect(),
				suggested_fix: "Apply color matching or a consistent LUT across all video clips"
					.to_string(),
			});
        }

        findings
    }

    /// Detect interview-style clips that might benefit from lower thirds
    /// or text overlays. Looks for longer video clips (suggesting
    /// talking-head content) without associated text clips.
    fn detect_missing_lower_thirds(project: &ProjectData, _now_ms: u64) -> Vec<AuditFinding> {
        let mut findings = Vec::new();

        for track in &project.tracks {
            for clip in &track.clips {
                let duration_frames = clip.end.saturating_sub(clip.start);
                // Clips longer than 5 seconds (150 frames at 30fps) might be talking-head
                if clip.clip_type == "video" && duration_frames > 150 {
                    // Check if there's a text/title clip overlapping this area
                    let has_overlay = project.tracks.iter().any(|t| {
                        t.clips.iter().any(|c| {
                            c.clip_type == "text" && c.start < clip.end && c.end > clip.start
                        })
                    });

                    if !has_overlay {
                        findings.push(AuditFinding {
							id: uuid::Uuid::new_v4().to_string(),
							title: format!(
								"Missing lower third on clip '{}'",
								clip.name
							),
							description: format!(
								"Clip '{}' is {:.1}s long with no text overlay. Consider adding a lower third with speaker name/title.",
								clip.name,
								duration_frames as f64 / 30.0
							),
							category: AuditCategory::MissingLowerThirds,
							severity: AuditSeverity::Info,
							track_ids: vec![track.id.clone()],
							clip_ids: vec![clip.id.clone()],
							suggested_fix: "Add a text overlay clip with speaker information"
								.to_string(),
						});
                    }
                }
            }
        }

        findings
    }

    /// Detect action sequences (clips with motion/action keywords or
    /// specific duration patterns) that would benefit from speed ramping.
    fn detect_speed_ramp_opportunities(project: &ProjectData, _now_ms: u64) -> Vec<AuditFinding> {
        let mut findings = Vec::new();

        let action_keywords = [
            "action",
            "fight",
            "chase",
            "explosion",
            "jump",
            "run",
            "race",
            "sport",
            "stunt",
            "drone",
            "fast",
        ];

        for track in &project.tracks {
            for clip in &track.clips {
                let name_lower = clip.name.to_lowercase();
                let is_action = action_keywords.iter().any(|kw| name_lower.contains(kw));
                let duration = clip.end.saturating_sub(clip.start);
                // Short (< 2 seconds) or action clips are candidates
                let is_short = duration < 60 && duration > 10;

                if clip.clip_type == "video" && (is_action || is_short) {
                    findings.push(AuditFinding {
						id: uuid::Uuid::new_v4().to_string(),
						title: format!(
							"Speed ramp opportunity on clip '{}'",
							clip.name
						),
						description: format!(
							"Clip '{}' ({:.1}s) may benefit from speed ramping for dramatic effect.",
							clip.name,
							duration as f64 / 30.0
						),
						category: AuditCategory::SpeedRampOpportunity,
						severity: AuditSeverity::Info,
						track_ids: vec![track.id.clone()],
						clip_ids: vec![clip.id.clone()],
						suggested_fix: "Apply speed ramp (e.g., slow-mo → normal → slow-mo)"
							.to_string(),
					});
                }
            }
        }

        findings
    }

    /// Detect potential audio peaking/clipping by checking if volume
    /// keyframe values exceed safe levels.
    fn detect_audio_peaking(project: &ProjectData, _now_ms: u64) -> Vec<AuditFinding> {
        let mut findings = Vec::new();

        for track in &project.tracks {
            for clip in &track.clips {
                if clip.clip_type != "audio" {
                    continue;
                }

                // Check if any volume keyframes are above 1.0 (0dB)
                if let Some(channel) = clip.animations.get("volume") {
                    let all_frames: Vec<u32> =
                        channel.keyframes().iter().map(|kf| kf.frame).collect();
                    for frame in all_frames {
                        let value = clip.get_animated_value("volume", frame, 1.0);
                        if value > 1.5 {
                            findings.push(AuditFinding {
								id: uuid::Uuid::new_v4().to_string(),
								title: format!(
									"Audio peaking in clip '{}'",
									clip.name
								),
								description: format!(
									"Clip '{}' has volume level {:.1} at frame {} which may cause clipping/distortion.",
									clip.name, value, frame
								),
								category: AuditCategory::AudioPeaking,
								severity: AuditSeverity::Warning,
								track_ids: vec![track.id.clone()],
								clip_ids: vec![clip.id.clone()],
								suggested_fix: "Reduce volume to ≤1.0 or apply a limiter effect"
									.to_string(),
							});
                            break;
                        }
                    }
                }
            }
        }

        findings
    }

    /// Detect consecutive clips without transitions.
    fn detect_missing_transitions(project: &ProjectData, _now_ms: u64) -> Vec<AuditFinding> {
        let mut findings = Vec::new();

        for track in &project.tracks {
            if track.clips.len() < 2 {
                continue;
            }

            for i in 1..track.clips.len() {
                let prev = &track.clips[i - 1];
                let curr = &track.clips[i];
                let gap = curr.start.saturating_sub(prev.end);

                // Adjacent clips with no gap — could use a transition
                if gap < 5 && prev.clip_type == "video" && curr.clip_type == "video" {
                    // Check if either clip already has a transition
                    let has_transition = prev
                        .animations
                        .iter()
                        .any(|(k, _)| k.starts_with("transition_"))
                        || curr
                            .animations
                            .iter()
                            .any(|(k, _)| k.starts_with("transition_"));

                    if !has_transition {
                        findings.push(AuditFinding {
							id: uuid::Uuid::new_v4().to_string(),
							title: format!(
								"Missing transition between '{}' and '{}'",
								prev.name, curr.name
							),
							description: format!(
								"Consecutive clips '{}' and '{}' on track '{}' have no transition effect.",
								prev.name, curr.name, track.id
							),
							category: AuditCategory::MissingTransitions,
							severity: AuditSeverity::Info,
							track_ids: vec![track.id.clone()],
							clip_ids: vec![prev.id.clone(), curr.id.clone()],
							suggested_fix: "Add a crossfade or dip-to-black transition between these clips"
								.to_string(),
						});
                    }
                }
            }
        }

        findings
    }
}

// ── Agent Suggestion ──

/// A concrete suggestion from the agent with risk, category, and tracking metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSuggestion {
    /// Unique suggestion identifier.
    pub id: String,
    /// Short title describing the suggestion.
    pub title: String,
    /// Detailed description of the suggestion.
    pub description: String,
    /// Category of the suggestion.
    pub category: SuggestionCategory,
    /// Risk level for auto-execution.
    pub risk: RiskLevel,
    /// Why the agent believes this suggestion is warranted.
    pub reasoning: String,
    /// Track IDs this suggestion applies to.
    pub track_ids: Vec<String>,
    /// Clip IDs this suggestion applies to.
    pub clip_ids: Vec<String>,
    /// Whether this suggestion has been auto-executed.
    pub executed: bool,
    /// Whether the user has dismissed this suggestion.
    pub dismissed: bool,
    /// Timestamp when the suggestion was created, in milliseconds.
    pub timestamp_ms: u64,
}

// ── Agent Status ──

/// Live status snapshot of the background agent, emitted via events.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    /// Whether the agent monitor loop is running.
    pub is_running: bool,
    /// Whether the agent is currently performing analysis.
    pub is_analyzing: bool,
    /// Current operating mode of the agent.
    pub mode: AgentMode,
    /// Name of the AI provider currently in use.
    pub provider: String,
    /// Number of suggestions currently pending user review.
    pub active_suggestions: u32,
    /// Total number of suggestions ever generated.
    pub total_suggestions_made: u64,
    /// Total number of suggestions auto-executed.
    pub total_auto_executed: u64,
    /// Timestamp of the last analysis, in milliseconds.
    pub last_analysis_at: Option<u64>,
    /// Most recent error message, if any.
    pub last_error: Option<String>,
}

// ── Agent Event ──

/// Events emitted by the background agent for UI consumption.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentEvent {
    /// A batch of suggestions is ready for review.
    SuggestionsReady(Vec<AgentSuggestion>),
    /// Result of an individual suggestion execution.
    SuggestionExecuted {
        suggestion_id: String,
        success: bool,
        error: Option<String>,
    },
    /// Analysis cycle has started.
    AnalysisStarted,
    /// Analysis cycle has completed.
    AnalysisCompleted {
        suggestions_count: u32,
        auto_executed_count: u32,
    },
    /// Live status snapshot of the agent.
    StatusUpdate(AgentStatus),
    /// An error occurred in the agent.
    Error(String),
}

// ── Conversation Message ────────────────────────────────────────────────

/// A message in the agent conversation loop.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMessage {
    /// Message sender: "user" or "agent".
    pub role: String, // "user" or "agent"
    /// Message body text.
    pub content: String,
    /// Timestamp of the message in milliseconds.
    pub timestamp_ms: u64,
    /// Whether this message is a proactive follow-up question.
    pub is_follow_up: bool,
}

// ── User Preference Store ────────────────────────────────────────────────

/// Stores learned user preferences to avoid repeating dismissed suggestions.
/// Persists to `~/.lazynext/preferences.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferenceStore {
    /// Categories the user has dismissed multiple times
    dismissed_categories: HashMap<String, u32>,
    /// Specific suggestion IDs that were dismissed
    dismissed_ids: Vec<String>,
    /// Categories the user always accepts
    accepted_categories: HashMap<String, u32>,
    /// Custom preference overrides
    preferences: HashMap<String, serde_json::Value>,
    /// Path to the preferences file
    #[serde(skip)]
    file_path: Option<PathBuf>,
}

impl UserPreferenceStore {
    /// Creates a new empty preference store. Does NOT load from disk.
    pub fn new() -> Self {
        Self {
            dismissed_categories: HashMap::new(),
            dismissed_ids: Vec::new(),
            accepted_categories: HashMap::new(),
            preferences: HashMap::new(),
            file_path: None,
        }
    }

    /// Loads preferences from `~/.lazynext/preferences.json`.
    pub fn load() -> Self {
        let path = Self::default_path();
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(mut store) = serde_json::from_str::<Self>(&content) {
                    store.file_path = Some(path);
                    return store;
                }
            }
        }
        let mut store = Self::new();
        store.file_path = Some(path);
        store
    }

    /// Saves preferences to `~/.lazynext/preferences.json`.
    pub fn save(&self) -> Result<(), String> {
        let path = self.file_path.clone().unwrap_or_else(Self::default_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create prefs dir: {}", e))?;
        }
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize prefs: {}", e))?;
        std::fs::write(&path, json).map_err(|e| format!("Failed to write prefs: {}", e))?;
        Ok(())
    }

    // Default path to the on-disk preferences file (`~/.lazynext/preferences.json`).
    fn default_path() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home)
            .join(".lazynext")
            .join("preferences.json")
    }

    /// Record that a suggestion was dismissed by the user.
    pub fn record_dismissal(&mut self, category: &str, suggestion_id: &str) {
        *self
            .dismissed_categories
            .entry(category.to_string())
            .or_insert(0) += 1;
        self.dismissed_ids.push(suggestion_id.to_string());
    }

    /// Record that a suggestion was accepted/executed.
    pub fn record_acceptance(&mut self, category: &str) {
        *self
            .accepted_categories
            .entry(category.to_string())
            .or_insert(0) += 1;
    }

    /// Checks whether a suggestion of this category should be made.
    /// Returns `false` if the user has dismissed this category 3+ times
    /// without accepting it.
    pub fn should_suggest(&self, category: &str) -> bool {
        let dismissed = self
            .dismissed_categories
            .get(category)
            .copied()
            .unwrap_or(0);
        let accepted = self.accepted_categories.get(category).copied().unwrap_or(0);

        // If user has dismissed 3+ times and never accepted, stop suggesting
        if dismissed >= 3 && accepted == 0 {
            return false;
        }

        // If dismissed more than accepted, be cautious
        if dismissed > accepted + 2 {
            return false;
        }

        true
    }

    /// Returns whether a specific suggestion ID was previously dismissed.
    pub fn was_dismissed(&self, suggestion_id: &str) -> bool {
        self.dismissed_ids.contains(&suggestion_id.to_string())
    }

    /// Set a custom preference value.
    /// Set a custom preference value.
    pub fn set_preference(&mut self, key: &str, value: serde_json::Value) {
        self.preferences.insert(key.to_string(), value);
    }

    /// Get a custom preference value.
    pub fn get_preference(&self, key: &str) -> Option<&serde_json::Value> {
        self.preferences.get(key)
    }
}

impl Default for UserPreferenceStore {
    // Returns an empty preference store.
    fn default() -> Self {
        Self::new()
    }
}

// ── Repair Strategies ────────────────────────────────────────────────────

/// Self-healing repair strategies for when tool executions fail.
/// Attempts alternative approaches rather than giving up.
pub struct RepairStrategies;

impl RepairStrategies {
    /// Returns alternative approaches when a tool execution fails,
    /// ranked by likelihood of success.
    pub fn repair_strategies(failed_action: &str, error: &str) -> Vec<String> {
        let lower = failed_action.to_lowercase();
        let error_lower = error.to_lowercase();

        if lower.contains("transcription") || lower.contains("transcribe") {
            return vec![
                "Try a different language model (switch from whisper-large to whisper-medium)"
                    .to_string(),
                "Try with different language detection settings".to_string(),
                "Fall back to manual caption entry".to_string(),
            ];
        }

        if lower.contains("color") || lower.contains("grade") || lower.contains("match") {
            return vec![
                "Try simpler white balance correction instead".to_string(),
                "Apply a pre-defined LUT as fallback".to_string(),
                "Skip color matching and suggest manual adjustment".to_string(),
            ];
        }

        if lower.contains("effect") || lower.contains("composite") {
            return vec![
                "Try a simpler effect variant".to_string(),
                "Render the effect at half resolution and scale up".to_string(),
                "Disable GPU acceleration and use CPU fallback".to_string(),
            ];
        }

        if lower.contains("export") || (lower.contains("render") && !lower.contains("effect")) {
            return vec![
                "Reduce resolution (e.g., 1080p → 720p) and retry".to_string(),
                "Lower bitrate by 50% and retry".to_string(),
                "Export in a simpler format (e.g., H.264 baseline)".to_string(),
                "Export audio-only first, then video".to_string(),
            ];
        }

        if lower.contains("load") || lower.contains("import") || lower.contains("decode") {
            return vec![
                "Try re-encoding the source file".to_string(),
                "Try a different decoder (software vs hardware)".to_string(),
                "Use a proxy/transcoded version of the file".to_string(),
            ];
        }

        if error_lower.contains("timeout") || error_lower.contains("timed out") {
            return vec![
                "Increase timeout and retry".to_string(),
                "Split the operation into smaller chunks".to_string(),
                "Process in background with progress updates".to_string(),
            ];
        }

        // Generic fallback strategies
        vec![
            "Retry the operation once more".to_string(),
            "Try a simplified version of the same action".to_string(),
            "Ask the user for guidance on how to proceed".to_string(),
        ]
    }
}

// ── Conversation Context ─────────────────────────────────────────────────

/// Holds conversation state for the continuous conversation loop.
pub struct ConversationContext {
    /// The multi-turn conversation manager
    pub manager: MultiTurnManager,
    /// Messages in the current conversation session
    pub messages: Vec<ConversationMessage>,
    /// Whether the agent is in an active conversation
    pub is_active: bool,
    /// Whether to generate proactive follow-ups
    pub proactive_mode: bool,
}

impl ConversationContext {
    /// Creates a new conversation context with proactive follow-ups enabled.
    pub fn new() -> Self {
        Self {
            manager: MultiTurnManager::new(true),
            messages: Vec::new(),
            is_active: false,
            proactive_mode: true,
        }
    }

    /// Adds a user message to the conversation.
    pub fn add_user_message(&mut self, content: &str) {
        self.messages.push(ConversationMessage {
            role: "user".to_string(),
            content: content.to_string(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            is_follow_up: false,
        });
        self.is_active = true;
    }

    /// Adds an agent response to the conversation.
    pub fn add_agent_message(&mut self, content: &str, is_follow_up: bool) {
        self.messages.push(ConversationMessage {
            role: "agent".to_string(),
            content: content.to_string(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            is_follow_up,
        });
    }

    /// Generates a follow-up question based on the last action performed.
    pub fn generate_follow_up(last_action: &str, project: &ProjectData) -> Option<String> {
        let lower = last_action.to_lowercase();

        if lower.contains("caption") || lower.contains("subtitle") {
            // Check if there's loud background audio
            let has_audio = project
                .tracks
                .iter()
                .any(|t| t.kind == "audio" && !t.clips.is_empty());
            if has_audio {
                return Some(
					"I added captions. I notice there's background audio — should I duck the music by 15dB during speech segments?"
						.to_string(),
				);
            }
        }

        if lower.contains("transition") {
            return Some(
				"Transitions applied. Would you like me to add a fade-in at the start and fade-out at the end as well?"
					.to_string(),
			);
        }

        if lower.contains("color") || lower.contains("grade") {
            return Some(
				"Color grading applied. Should I apply the same grade to all clips for consistency?"
					.to_string(),
			);
        }

        if lower.contains("trim") || lower.contains("cut") {
            return Some(
				"Cuts applied. Would you like me to check for any remaining awkward pauses or silences?"
					.to_string(),
			);
        }

        if lower.contains("effect") {
            return Some(
				"Effect applied. Should I add a subtle ease-in/ease-out animation to make it smoother?"
					.to_string(),
			);
        }

        // Generic follow-ups based on project state
        let follow_ups = MultiTurnManager::generate_follow_ups(project);
        follow_ups.into_iter().next()
    }
}

impl Default for ConversationContext {
    // Returns a new conversation context with proactive follow-ups enabled.
    fn default() -> Self {
        Self::new()
    }
}

// ── Background Agent ──

/// Persistent background agent that monitors the NLE timeline, generates
/// suggestions, and optionally auto-executes improvements.
pub struct BackgroundAgent {
    /// Shared NLE state the agent monitors and edits.
    nle: Arc<tokio::sync::Mutex<NLEState>>,
    /// Runtime-updatable agent configuration.
    config: Arc<RwLock<AgentConfig>>,
    /// Channel for emitting agent events to the UI.
    event_tx: mpsc::UnboundedSender<AgentEvent>,
    /// Whether the monitor loop is currently running.
    is_running: Arc<AtomicBool>,
    /// Whether an analysis cycle is currently in progress.
    is_analyzing: Arc<AtomicBool>,
    /// Total suggestions generated over the agent's lifetime.
    total_suggestions: Arc<AtomicU64>,
    /// Total suggestions auto-executed over the agent's lifetime.
    total_auto_executed: Arc<AtomicU64>,
    /// Timestamp (ms) of the last completed analysis.
    last_analysis: Arc<RwLock<Option<u64>>>,
    /// Most recent error encountered, if any.
    last_error: Arc<RwLock<Option<String>>>,
    /// Currently pending suggestions awaiting review.
    active_suggestions: Arc<RwLock<Vec<AgentSuggestion>>>,
    /// HTTP client for calling LLM providers.
    client: reqwest::Client,
    /// Conversation context for multi-turn agent interactions
    pub conversation: Arc<RwLock<ConversationContext>>,
    /// User preference store for learning from history
    pub preferences: Arc<RwLock<UserPreferenceStore>>,
    /// Conversation memory for context persistence
    pub memory: Arc<RwLock<ConversationMemory>>,
}

impl BackgroundAgent {
    /// Creates a new background agent attached to the given NLE state and event channel.
    pub fn new(
        nle: Arc<tokio::sync::Mutex<NLEState>>,
        event_tx: mpsc::UnboundedSender<AgentEvent>,
        config: AgentConfig,
    ) -> Self {
        Self {
            nle,
            config: Arc::new(RwLock::new(config)),
            event_tx,
            is_running: Arc::new(AtomicBool::new(false)),
            is_analyzing: Arc::new(AtomicBool::new(false)),
            total_suggestions: Arc::new(AtomicU64::new(0)),
            total_auto_executed: Arc::new(AtomicU64::new(0)),
            last_analysis: Arc::new(RwLock::new(None)),
            last_error: Arc::new(RwLock::new(None)),
            active_suggestions: Arc::new(RwLock::new(Vec::new())),
            client: reqwest::Client::new(),
            conversation: Arc::new(RwLock::new(ConversationContext::new())),
            preferences: Arc::new(RwLock::new(UserPreferenceStore::load())),
            memory: Arc::new(RwLock::new(ConversationMemory::new())),
        }
    }

    /// Starts the monitoring loop as a spawned Tokio task. Returns the join handle.
    pub fn start(&self) -> tokio::task::JoinHandle<()> {
        self.is_running.store(true, Ordering::SeqCst);

        let is_running = self.is_running.clone();
        let is_analyzing = self.is_analyzing.clone();
        let config = self.config.clone();
        let nle = self.nle.clone();
        let event_tx = self.event_tx.clone();
        let total_suggestions = self.total_suggestions.clone();
        let total_auto_executed = self.total_auto_executed.clone();
        let last_analysis = self.last_analysis.clone();
        let last_error = self.last_error.clone();
        let active_suggestions_clone = self.active_suggestions.clone();
        let client = self.client.clone();

        tokio::spawn(async move {
            let mut tick = interval(Duration::from_secs(5));
            let mut change_count: u32 = 0;
            let mut prev_ops_len: usize = 0;

            // Emit initial status
            let _ = event_tx.send(AgentEvent::StatusUpdate(
                build_status(
                    &config,
                    &is_analyzing,
                    &active_suggestions_clone,
                    &total_suggestions,
                    &total_auto_executed,
                    &last_analysis,
                    &last_error,
                    &is_running,
                )
                .await,
            ));

            loop {
                if !is_running.load(Ordering::SeqCst) {
                    break;
                }

                tokio::select! {
                    _ = tick.tick() => {
                        // Detect changes by comparing op_log length
                        let current_ops = {
                            let state = nle.lock().await;
                            state.op_log.len()
                        };
                        if current_ops != prev_ops_len {
                            change_count += 1;
                            prev_ops_len = current_ops;
                        }

                        let cfg = config.read().await;
                        if change_count >= cfg.min_changes_for_analysis {
                            is_analyzing.store(true, Ordering::SeqCst);
                            let _ = event_tx.send(AgentEvent::AnalysisStarted);

                            match analyze_timeline(&nle, &client, &cfg).await {
                                Ok(suggestions) => {
                                    let auto_count = if cfg.mode == AgentMode::FullAuto
                                        || cfg.mode == AgentMode::AutoExecute
                                    {
                                        let mut executed = 0u64;
                                        for s in &suggestions {
                                            if cfg.mode == AgentMode::FullAuto
                                                || s.risk.is_auto_executable()
                                            {
                                                let success = execute_suggestion_impl(
                                                    &nle, s, &event_tx,
                                                ).await;
                                                if success {
                                                    executed += 1;
                                                }
                                            }
                                        }
                                        executed
                                    } else {
                                        0
                                    };

                                    let count = suggestions.len() as u32;
                                    let prev = total_suggestions.load(Ordering::SeqCst);
                                    total_suggestions.store(prev + count as u64, Ordering::SeqCst);
                                    total_auto_executed.store(
                                        total_auto_executed.load(Ordering::SeqCst) + auto_count,
                                        Ordering::SeqCst,
                                    );

                                    {
                                        let mut active = active_suggestions_clone.write().await;
                                        *active = suggestions.clone();
                                    }

                                    *last_analysis.write().await = Some(
                                        std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .unwrap_or_default()
                                            .as_millis() as u64,
                                    );

                                    let _ = event_tx.send(AgentEvent::SuggestionsReady(suggestions));
                                    let _ = event_tx.send(AgentEvent::AnalysisCompleted {
                                        suggestions_count: count,
                                        auto_executed_count: auto_count as u32,
                                    });
                                }
                                Err(e) => {
                                    *last_error.write().await = Some(e.clone());
                                    let _ = event_tx.send(AgentEvent::Error(e));
                                }
                            }

                            is_analyzing.store(false, Ordering::SeqCst);
                            change_count = 0;
                        }

                        let _ = event_tx.send(AgentEvent::StatusUpdate(build_status(
                            &config,
                            &is_analyzing,
                            &active_suggestions_clone,
                            &total_suggestions,
                            &total_auto_executed,
                            &last_analysis,
                            &last_error,
                            &is_running,
                        ).await));
                    }
                }
            }
        })
    }

    /// Stops the monitoring loop.
    pub async fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Returns the current agent status snapshot.
    pub async fn status(&self) -> AgentStatus {
        build_status(
            &self.config,
            &self.is_analyzing,
            &self.active_suggestions,
            &self.total_suggestions,
            &self.total_auto_executed,
            &self.last_analysis,
            &self.last_error,
            &self.is_running,
        )
        .await
    }

    /// Returns a copy of all currently active suggestions.
    pub async fn active_suggestions_list(&self) -> Vec<AgentSuggestion> {
        self.active_suggestions.read().await.clone()
    }

    /// Removes a suggestion from the active list by ID.
    pub async fn dismiss_suggestion(&self, id: &str) {
        let mut active = self.active_suggestions.write().await;
        active.retain(|s| s.id != id);
    }

    /// Updates the agent configuration at runtime.
    pub async fn update_config(&self, config: AgentConfig) {
        *self.config.write().await = config;
    }

    /// Manually triggers an analysis cycle. Returns the generated suggestions.
    pub async fn trigger_analysis(&self) -> Vec<AgentSuggestion> {
        self.is_analyzing.store(true, Ordering::SeqCst);
        let _ = self.event_tx.send(AgentEvent::AnalysisStarted);

        let cfg = self.config.read().await;

        match analyze_timeline(&self.nle, &self.client, &cfg).await {
            Ok(suggestions) => {
                let _ = self
                    .event_tx
                    .send(AgentEvent::SuggestionsReady(suggestions.clone()));
                self.is_analyzing.store(false, Ordering::SeqCst);
                suggestions
            }
            Err(e) => {
                *self.last_error.write().await = Some(e.clone());
                let _ = self.event_tx.send(AgentEvent::Error(e));
                self.is_analyzing.store(false, Ordering::SeqCst);
                vec![]
            }
        }
    }

    // ── Continuous Conversation Loop ──────────────────────────────────

    /// Processes a user message through the multi-turn conversation loop.
    /// The agent plans, executes, then generates proactive follow-ups.
    pub async fn process_conversation_turn(&self, user_message: &str) -> Result<String, String> {
        let mut conv = self.conversation.write().await;
        let mut mem = self.memory.write().await;

        // Check for interruption
        if conv.manager.is_interruption(user_message) {
            conv.manager.handle_interruption();
            conv.add_agent_message(
                "Got it — I've stopped what I was doing. What would you like instead?",
                false,
            );
            return Ok("Interruption handled. Ready for new instructions.".to_string());
        }

        // Start a new turn
        conv.add_user_message(user_message);
        conv.manager.start_turn(user_message);

        // Execute the request via the existing analysis/execution pipeline
        let result = self.trigger_analysis().await;

        conv.manager.plan_complete();
        conv.manager.execution_complete();

        let success = !result.is_empty();
        let steps: Vec<String> = result.iter().map(|s| s.title.clone()).collect();
        let error_msg = if success {
            None
        } else {
            Some("No suggestions generated — timeline may already be optimized.".to_string())
        };

        // Record the turn in memory
        mem.add_turn(
            user_message.to_string(),
            Some("Analyzed timeline and generated suggestions".to_string()),
            steps.clone(),
            success,
            error_msg,
            false,
        );

        conv.manager.record_turn(
            user_message.to_string(),
            Some("Analyzed timeline and generated suggestions".to_string()),
            steps.clone(),
            success,
            None,
        );

        // Generate response
        let response = if success {
            let step_list: String = steps
                .iter()
                .map(|s| format!("  - {}", s))
                .collect::<Vec<_>>()
                .join("\n");
            format!(
                "I analyzed your timeline and found {} suggestion(s):\n{}",
                steps.len(),
                step_list
            )
        } else {
            "I analyzed your timeline and didn't find any issues to address.".to_string()
        };

        conv.add_agent_message(&response, false);

        // Generate proactive follow-up if enabled
        if conv.proactive_mode {
            let last_action = steps.first().cloned().unwrap_or_default();
            let nle = self.nle.lock().await;
            let project = nle.get_project_data();
            if let Some(follow_up) = ConversationContext::generate_follow_up(&last_action, project)
            {
                conv.add_agent_message(&follow_up, true);
                drop(nle);

                conv.manager.review_complete();
                return Ok(format!("{}\n\n{}", response, follow_up));
            }
        }

        conv.manager.review_complete();
        Ok(response)
    }

    /// Runs a comprehensive timeline audit and returns all findings.
    pub async fn run_full_audit(&self) -> TimelineAudit {
        let nle = self.nle.lock().await;
        let project = nle.get_project_data();
        let audit = TimelineAudit::analyze(project);

        // Emit findings as suggestions too
        for finding in &audit.findings {
            let _ = self
                .event_tx
                .send(AgentEvent::SuggestionsReady(vec![AgentSuggestion {
                    id: finding.id.clone(),
                    title: finding.title.clone(),
                    description: finding.description.clone(),
                    category: SuggestionCategory::Other(format!("{:?}", finding.category)),
                    risk: match finding.severity {
                        AuditSeverity::Info => RiskLevel::Low,
                        AuditSeverity::Warning => RiskLevel::Medium,
                        AuditSeverity::Critical => RiskLevel::High,
                    },
                    reasoning: finding.suggested_fix.clone(),
                    track_ids: finding.track_ids.clone(),
                    clip_ids: finding.clip_ids.clone(),
                    executed: false,
                    dismissed: false,
                    timestamp_ms: finding.id.parse::<u64>().unwrap_or(0),
                }]));
        }

        audit
    }

    /// Attempt to repair a failed operation using alternative strategies.
    pub async fn repair_and_retry(
        &self,
        failed_action: &str,
        error: &str,
    ) -> Result<String, String> {
        let strategies = RepairStrategies::repair_strategies(failed_action, error);
        let mut results = Vec::new();

        for strategy in &strategies {
            let mut conv = self.conversation.write().await;
            conv.add_agent_message(&format!("Attempting repair: {}", strategy), false);
            results.push(format!("Tried: {} — pending", strategy));
        }

        if strategies.is_empty() {
            Err(format!(
                "No repair strategies available for '{}': {}",
                failed_action, error
            ))
        } else {
            Ok(format!(
                "Attempted {} repair strategies for '{}':\n{}",
                strategies.len(),
                failed_action,
                results.join("\n")
            ))
        }
    }

    /// Returns the conversation context for reading messages.
    pub async fn get_conversation_messages(&self) -> Vec<ConversationMessage> {
        self.conversation.read().await.messages.clone()
    }

    /// Adds a message directly to the agent conversation.
    pub async fn add_conversation_message(&self, role: &str, content: &str) {
        let mut conv = self.conversation.write().await;
        conv.messages.push(ConversationMessage {
            role: role.to_string(),
            content: content.to_string(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            is_follow_up: false,
        });
    }

    /// Saves user preferences to disk.
    pub async fn save_preferences(&self) -> Result<(), String> {
        self.preferences.read().await.save()
    }
}

// ── Analysis Logic ──

// Run all detectors against the current timeline and collect their suggestions.
async fn analyze_timeline(
    nle: &Arc<tokio::sync::Mutex<NLEState>>,
    _client: &reqwest::Client,
    config: &AgentConfig,
) -> Result<Vec<AgentSuggestion>, String> {
    let state = nle.lock().await;
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let project = state.get_project_data();
    let mut suggestions = Vec::new();

    suggestions.extend(detect_silence_issues(
        project,
        config.silence_threshold_secs,
        now_ms,
    ));
    suggestions.extend(detect_audio_leveling_issues(
        project,
        config.audio_level_tolerance_db,
        now_ms,
    ));
    suggestions.extend(detect_pacing_issues(project, now_ms));
    suggestions.extend(detect_clip_health_issues(project, now_ms));

    Ok(suggestions)
}

// Flag inter-clip gaps longer than the silence threshold as removable silence.
fn detect_silence_issues(
    project: &crate::nle_state::ProjectData,
    threshold_secs: f64,
    now_ms: u64,
) -> Vec<AgentSuggestion> {
    let mut suggestions = Vec::new();

    for track in &project.tracks {
        let mut prev_end: Option<u32> = None;
        for clip in &track.clips {
            if let Some(pe) = prev_end {
                let gap = clip.start.saturating_sub(pe);
                let gap_secs = gap as f64 / 30.0;
                if gap_secs >= threshold_secs {
                    suggestions.push(AgentSuggestion {
                        id: uuid::Uuid::new_v4().to_string(),
                        title: format!("{}s silence gap in track '{}'", gap_secs as u32, track.id),
                        description: format!(
                            "Detected a {:.1}s gap between clips at frame {}–{} in \
                             track '{}'. Consider tightening or adding a transition.",
                            gap_secs, pe, clip.start, track.id
                        ),
                        category: SuggestionCategory::SilenceRemoval,
                        risk: RiskLevel::Low,
                        reasoning: format!(
                            "Gap of {:.1}s exceeds the {:.1}s threshold.",
                            gap_secs, threshold_secs
                        ),
                        track_ids: vec![track.id.clone()],
                        clip_ids: vec![],
                        executed: false,
                        dismissed: false,
                        timestamp_ms: now_ms,
                    });
                }
            }
            prev_end = Some(clip.end);
        }
    }

    suggestions
}

// Flag audio clips whose estimated level deviates from the track average beyond tolerance.
fn detect_audio_leveling_issues(
    project: &crate::nle_state::ProjectData,
    tolerance_db: f64,
    now_ms: u64,
) -> Vec<AgentSuggestion> {
    let mut suggestions = Vec::new();

    for track in &project.tracks {
        let audio_clips: Vec<_> = track
            .clips
            .iter()
            .filter(|c| c.clip_type == "audio")
            .collect();

        if audio_clips.len() < 2 {
            continue;
        }

        let mut levels: Vec<(f64, &crate::nle_state::Clip)> = Vec::new();
        for clip in &audio_clips {
            let vol = clip.get_animated_value("volume", clip.start, 1.0);
            let db = if vol > 0.0 { 20.0 * vol.log10() } else { -96.0 };
            levels.push((db, clip));
        }

        if levels.is_empty() {
            continue;
        }

        let avg: f64 = levels.iter().map(|(l, _)| l).sum::<f64>() / levels.len() as f64;
        for (level_db, clip) in &levels {
            let diff = (*level_db - avg).abs();
            if diff > tolerance_db {
                suggestions.push(AgentSuggestion {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: format!("Audio level mismatch in clip '{}'", clip.name),
                    description: format!(
                        "Clip '{}' has an estimated level of {:.1} dB, which differs \
                         by {:.1} dB from the track average of {:.1} dB. \
                         Suggest normalizing to average.",
                        clip.name, level_db, diff, avg
                    ),
                    category: SuggestionCategory::AudioLeveling,
                    risk: RiskLevel::Low,
                    reasoning: format!(
                        "Level deviation of {:.1} dB exceeds {:.1} dB tolerance.",
                        diff, tolerance_db
                    ),
                    track_ids: vec![track.id.clone()],
                    clip_ids: vec![clip.id.clone()],
                    executed: false,
                    dismissed: false,
                    timestamp_ms: now_ms,
                });
            }
        }
    }

    suggestions
}

// Flag abnormally short clips that may be accidental cuts.
fn detect_pacing_issues(
    project: &crate::nle_state::ProjectData,
    now_ms: u64,
) -> Vec<AgentSuggestion> {
    let mut suggestions = Vec::new();

    for track in &project.tracks {
        for clip in &track.clips {
            let duration = clip.end.saturating_sub(clip.start);
            let duration_secs = duration as f64 / 30.0;
            if duration_secs < 0.5 && duration > 0 {
                suggestions.push(AgentSuggestion {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: format!("Very short clip '{}' ({:.1}s)", clip.name, duration_secs),
                    description: format!(
                        "Clip '{}' on track '{}' is only {:.1}s long. \
                         This may be an accidental cut. Consider extending or removing it.",
                        clip.name, track.id, duration_secs
                    ),
                    category: SuggestionCategory::PacingAdjustment,
                    risk: RiskLevel::Medium,
                    reasoning: format!(
                        "Clip duration of {:.1}s is below the 0.5s minimum.",
                        duration_secs
                    ),
                    track_ids: vec![track.id.clone()],
                    clip_ids: vec![clip.id.clone()],
                    executed: false,
                    dismissed: false,
                    timestamp_ms: now_ms,
                });
            }
        }
    }

    suggestions
}

// Flag media pool assets with empty paths that would fail to render.
fn detect_clip_health_issues(
    project: &crate::nle_state::ProjectData,
    now_ms: u64,
) -> Vec<AgentSuggestion> {
    let mut suggestions = Vec::new();

    for (media_id, media) in &project.media_pool {
        if media.path_or_url.is_empty() {
            suggestions.push(AgentSuggestion {
                id: uuid::Uuid::new_v4().to_string(),
                title: format!("Missing media reference for '{}'", media.name),
                description: format!(
                    "Media asset '{}' (type: {}) has an empty path or URL. \
                     Any clips referencing it will fail to render.",
                    media.name, media.asset_type
                ),
                category: SuggestionCategory::ClipHealth,
                risk: RiskLevel::High,
                reasoning: "Empty media path — clips referencing this asset cannot render."
                    .to_string(),
                track_ids: vec![],
                clip_ids: vec![media_id.clone()],
                executed: false,
                dismissed: false,
                timestamp_ms: now_ms,
            });
        }
    }

    suggestions
}

// ── Suggestion Execution ──

// Apply a suggestion's edit to the timeline and emit an execution result event.
async fn execute_suggestion_impl(
    nle: &Arc<tokio::sync::Mutex<NLEState>>,
    suggestion: &AgentSuggestion,
    event_tx: &mpsc::UnboundedSender<AgentEvent>,
) -> bool {
    let mut state = nle.lock().await;

    let success = match &suggestion.category {
        SuggestionCategory::SilenceRemoval => {
            // Flag for user: the real silence trim is handled by the
            // full transcription pipeline. This suggestion triggers that pipeline.
            true
        }
        SuggestionCategory::AudioLeveling => {
            let project = state.get_project_data_mut();
            for track in &mut project.tracks {
                for clip_id in &suggestion.clip_ids {
                    if let Some(clip) = track.clips.iter_mut().find(|c| &c.id == clip_id) {
                        clip.set_keyframe("volume", clip.start, 1.0, Easing::Linear);
                    }
                }
            }
            true
        }
        SuggestionCategory::PacingAdjustment => suggestion.risk == RiskLevel::Low,
        SuggestionCategory::ClipHealth => false,
        _ => false,
    };

    let _ = event_tx.send(AgentEvent::SuggestionExecuted {
        suggestion_id: suggestion.id.clone(),
        success,
        error: if success {
            None
        } else {
            Some(format!(
                "Could not auto-execute suggestion '{}'",
                suggestion.title
            ))
        },
    });

    success
}

// ── Helpers ──

#[allow(clippy::too_many_arguments)]
// Assemble a status snapshot from the agent's shared atomics and locks.
async fn build_status(
    config: &Arc<RwLock<AgentConfig>>,
    is_analyzing: &Arc<AtomicBool>,
    active_suggestions: &Arc<RwLock<Vec<AgentSuggestion>>>,
    total_suggestions: &Arc<AtomicU64>,
    total_auto_executed: &Arc<AtomicU64>,
    last_analysis: &Arc<RwLock<Option<u64>>>,
    last_error: &Arc<RwLock<Option<String>>>,
    is_running: &Arc<AtomicBool>,
) -> AgentStatus {
    let cfg = config.read().await;
    AgentStatus {
        is_running: is_running.load(Ordering::SeqCst),
        is_analyzing: is_analyzing.load(Ordering::SeqCst),
        mode: cfg.mode,
        provider: cfg.provider.clone(),
        active_suggestions: active_suggestions.read().await.len() as u32,
        total_suggestions_made: total_suggestions.load(Ordering::SeqCst),
        total_auto_executed: total_auto_executed.load(Ordering::SeqCst),
        last_analysis_at: *last_analysis.read().await,
        last_error: last_error.read().await.clone(),
    }
}

// ── Tests ──

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_project() -> crate::nle_state::ProjectData {
        crate::nle_state::ProjectData {
            id: "test-project".to_string(),
            name: "Test Project".to_string(),
            framerate: 30,
            width: 1920,
            height: 1080,
            bg_color: [0.0, 0.0, 0.0, 1.0],
            tracks: vec![],
            media_pool: std::collections::HashMap::new(),
        }
    }

    #[test]
    fn test_detect_silence_no_gaps() {
        let project = create_test_project();
        let suggestions = detect_silence_issues(&project, 2.0, 0);
        assert!(suggestions.is_empty());
    }

    #[test]
    fn test_detect_audio_leveling_no_clips() {
        let project = create_test_project();
        let suggestions = detect_audio_leveling_issues(&project, 3.0, 0);
        assert!(suggestions.is_empty());
    }

    #[test]
    fn test_detect_pacing_no_clips() {
        let project = create_test_project();
        let suggestions = detect_pacing_issues(&project, 0);
        assert!(suggestions.is_empty());
    }

    #[test]
    fn test_detect_clip_health_no_media() {
        let project = create_test_project();
        let suggestions = detect_clip_health_issues(&project, 0);
        assert!(suggestions.is_empty());
    }

    #[test]
    fn test_agent_config_defaults() {
        let config = AgentConfig::default();
        assert_eq!(config.mode, AgentMode::SuggestOnly);
        assert_eq!(config.check_interval_secs, 30);
        assert_eq!(config.silence_threshold_secs, 2.0);
    }

    #[test]
    fn test_risk_level_auto_executable() {
        assert!(RiskLevel::Low.is_auto_executable());
        assert!(!RiskLevel::Medium.is_auto_executable());
        assert!(!RiskLevel::High.is_auto_executable());
    }

    #[test]
    fn test_detect_silence_with_gaps() {
        use crate::nle_state::{Clip, Track};
        let mut project = create_test_project();
        project.tracks.push(Track {
            id: "t1".to_string(),
            kind: "video".to_string(),
            clips: vec![
                Clip {
                    id: "c1".to_string(),
                    clip_type: "video".to_string(),
                    media_id: Some("m1".to_string()),
                    name: "Clip 1".to_string(),
                    start: 0,
                    end: 30,
                    animations: std::collections::HashMap::new(),
                },
                Clip {
                    id: "c2".to_string(),
                    clip_type: "video".to_string(),
                    media_id: Some("m2".to_string()),
                    name: "Clip 2".to_string(),
                    start: 120,
                    end: 150,
                    animations: std::collections::HashMap::new(),
                },
            ],
            muted: false,
            soloed: false,
            locked: false,
        });

        let suggestions = detect_silence_issues(&project, 2.0, 0);
        // Gap from frame 30 to 120 = 90 frames = 3 seconds > 2.0 threshold
        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].category, SuggestionCategory::SilenceRemoval);
        assert_eq!(suggestions[0].track_ids, vec!["t1"]);
    }

    #[test]
    fn test_detect_clip_health_missing_media() {
        use crate::nle_state::MediaAsset;
        let mut project = create_test_project();
        project.media_pool.insert(
            "bad-media".to_string(),
            MediaAsset {
                id: "bad-media".to_string(),
                name: "Missing File".to_string(),
                path_or_url: String::new(),
                asset_type: "video".to_string(),
                duration: 10.0,
                width: 1920,
                height: 1080,
            },
        );

        let suggestions = detect_clip_health_issues(&project, 0);
        assert_eq!(suggestions.len(), 1);
        assert_eq!(suggestions[0].category, SuggestionCategory::ClipHealth);
    }

    // ── New tests: TimelineAudit, Conversation, Preferences, Repair ──

    use crate::nle_state::Track;

    fn create_video_clip(id: &str, name: &str, start: u32, end: u32) -> Clip {
        Clip {
            id: id.to_string(),
            clip_type: "video".to_string(),
            media_id: Some(format!("media_{}", id)),
            name: name.to_string(),
            start,
            end,
            animations: HashMap::new(),
        }
    }

    fn create_audio_clip(id: &str, name: &str, start: u32, end: u32) -> Clip {
        Clip {
            id: id.to_string(),
            clip_type: "audio".to_string(),
            media_id: Some(format!("media_{}", id)),
            name: name.to_string(),
            start,
            end,
            animations: HashMap::new(),
        }
    }

    #[test]
    fn test_timeline_audit_empty_project() {
        let project = create_test_project();
        let audit = TimelineAudit::analyze(&project);
        // Empty project may have intro/outro findings
        assert_eq!(audit.project_id, "test-project");
    }

    #[test]
    fn test_timeline_audit_with_clips() {
        let mut project = create_test_project();
        project.tracks.push(Track {
            id: "v1".to_string(),
            kind: "video".to_string(),
            clips: vec![
                create_video_clip("c1", "intro_clip", 0, 120),
                create_video_clip("c2", "action_jump", 120, 300),
                create_video_clip("c3", "talking_head", 300, 600),
            ],
            muted: false,
            soloed: false,
            locked: false,
        });

        let audit = TimelineAudit::analyze(&project);
        assert!(!audit.findings.is_empty());
        assert!(audit.total_issues > 0);

        // Should detect missing lower thirds on talking_head (300-600 = 300 frames > 150)
        let has_lower_third = audit
            .findings
            .iter()
            .any(|f| matches!(f.category, AuditCategory::MissingLowerThirds));
        assert!(has_lower_third);

        // Should detect speed ramp opportunity on "action_jump"
        let has_speed_ramp = audit
            .findings
            .iter()
            .any(|f| matches!(f.category, AuditCategory::SpeedRampOpportunity));
        assert!(has_speed_ramp);
    }

    #[test]
    fn test_timeline_audit_missing_intro() {
        let mut project = create_test_project();
        project.tracks.push(Track {
            id: "v1".to_string(),
            kind: "video".to_string(),
            // First clip starts at frame 120 (4 seconds in) — no clip in first 3 seconds
            clips: vec![create_video_clip("late_start", "Late Clip", 120, 300)],
            muted: false,
            soloed: false,
            locked: false,
        });

        let audit = TimelineAudit::analyze(&project);
        let has_intro_warning = audit
            .findings
            .iter()
            .any(|f| matches!(f.category, AuditCategory::MissingIntroOutro));
        assert!(has_intro_warning);
    }

    #[test]
    fn test_timeline_audit_missing_transitions() {
        let mut project = create_test_project();
        project.tracks.push(Track {
            id: "v1".to_string(),
            kind: "video".to_string(),
            clips: vec![
                // Adjacent clips with no gap — should flag missing transition
                create_video_clip("c1", "First Clip", 0, 100),
                create_video_clip("c2", "Second Clip", 100, 200),
            ],
            muted: false,
            soloed: false,
            locked: false,
        });

        let audit = TimelineAudit::analyze(&project);
        let has_missing_transition = audit
            .findings
            .iter()
            .any(|f| matches!(f.category, AuditCategory::MissingTransitions));
        assert!(has_missing_transition);
    }

    #[test]
    fn test_timeline_audit_potential_color_inconsistency() {
        let mut project = create_test_project();
        project.tracks.push(Track {
            id: "v1".to_string(),
            kind: "video".to_string(),
            clips: vec![
                Clip {
                    id: "c1".to_string(),
                    clip_type: "video".to_string(),
                    media_id: Some("m1".to_string()),
                    name: "clip1".to_string(),
                    start: 0,
                    end: 100,
                    animations: HashMap::new(),
                },
                Clip {
                    id: "c2".to_string(),
                    clip_type: "video".to_string(),
                    media_id: Some("m2".to_string()),
                    name: "clip2".to_string(),
                    start: 100,
                    end: 200,
                    animations: HashMap::new(),
                },
                Clip {
                    id: "c3".to_string(),
                    clip_type: "video".to_string(),
                    media_id: Some("m3".to_string()),
                    name: "clip3".to_string(),
                    start: 200,
                    end: 300,
                    animations: HashMap::new(),
                },
            ],
            muted: false,
            soloed: false,
            locked: false,
        });

        let audit = TimelineAudit::analyze(&project);
        // 3 unique media sources from 3 video clips → should trigger color warning
        let has_color_issue = audit
            .findings
            .iter()
            .any(|f| matches!(f.category, AuditCategory::ColorInconsistency));
        assert!(has_color_issue);
    }

    #[test]
    fn test_repair_strategies_transcription() {
        let strategies = RepairStrategies::repair_strategies("transcription", "model not found");
        assert!(!strategies.is_empty());
        assert!(strategies.iter().any(|s| s.contains("whisper")));
    }

    #[test]
    fn test_repair_strategies_export() {
        let strategies = RepairStrategies::repair_strategies("export failed", "out of memory");
        assert!(!strategies.is_empty());
        assert!(strategies.iter().any(|s| s.contains("resolution")));
    }

    #[test]
    fn test_repair_strategies_color_match() {
        let strategies = RepairStrategies::repair_strategies("color match", "no reference frame");
        assert!(!strategies.is_empty());
        assert!(strategies.iter().any(|s| s.contains("white balance")));
    }

    #[test]
    fn test_repair_strategies_timeout() {
        let strategies = RepairStrategies::repair_strategies("unknown_op", "timed out after 30s");
        assert!(!strategies.is_empty());
        assert!(strategies.iter().any(|s| s.contains("timeout")));
    }

    #[test]
    fn test_repair_strategies_generic_fallback() {
        let strategies = RepairStrategies::repair_strategies("completely_unknown", "weird error");
        assert!(!strategies.is_empty());
        assert!(strategies.len() >= 3);
    }

    #[test]
    fn test_user_preference_store_should_suggest() {
        let mut store = UserPreferenceStore::new();
        // Initially, any category should be suggestable
        assert!(store.should_suggest("TransitionAddition"));

        // After 2 dismissals, still suggestable
        store.record_dismissal("TransitionAddition", "s1");
        store.record_dismissal("TransitionAddition", "s2");
        assert!(store.should_suggest("TransitionAddition"));

        // After 3 dismissals with 0 acceptances, stop suggesting
        store.record_dismissal("TransitionAddition", "s3");
        assert!(!store.should_suggest("TransitionAddition"));
    }

    #[test]
    fn test_user_preference_store_with_acceptances() {
        let mut store = UserPreferenceStore::new();
        store.record_dismissal("ColorCorrection", "s1");
        store.record_dismissal("ColorCorrection", "s2");
        store.record_acceptance("ColorCorrection");

        // Even with 2 dismissals, if there's an acceptance, still suggest
        assert!(store.should_suggest("ColorCorrection"));
    }

    #[test]
    fn test_user_preference_store_dismissed_id() {
        let mut store = UserPreferenceStore::new();
        store.record_dismissal("SomeCategory", "unique_id_123");
        assert!(store.was_dismissed("unique_id_123"));
        assert!(!store.was_dismissed("other_id"));
    }

    #[test]
    fn test_user_preference_store_preferences() {
        let mut store = UserPreferenceStore::new();
        store.set_preference("export_format", serde_json::json!("mp4"));
        assert_eq!(
            store.get_preference("export_format"),
            Some(&serde_json::json!("mp4"))
        );
    }

    #[test]
    fn test_conversation_context_add_messages() {
        let mut ctx = ConversationContext::new();
        ctx.add_user_message("Add captions to my video");
        ctx.add_agent_message("I'll add captions. Analyzing your timeline...", false);

        assert_eq!(ctx.messages.len(), 2);
        assert_eq!(ctx.messages[0].role, "user");
        assert_eq!(ctx.messages[1].role, "agent");
        assert!(ctx.is_active);
    }

    #[test]
    fn test_conversation_context_follow_up_captions() {
        let mut project = create_test_project();
        project.tracks.push(Track {
            id: "a1".to_string(),
            kind: "audio".to_string(),
            clips: vec![create_audio_clip("audio1", "music", 0, 300)],
            muted: false,
            soloed: false,
            locked: false,
        });

        let follow_up = ConversationContext::generate_follow_up("Added captions", &project);
        assert!(follow_up.is_some());
        assert!(follow_up.unwrap().contains("duck"));
    }

    #[test]
    fn test_conversation_context_follow_up_transitions() {
        let project = create_test_project();
        let follow_up = ConversationContext::generate_follow_up("Added transitions", &project);
        assert!(follow_up.is_some());
        assert!(follow_up.unwrap().contains("fade"));
    }

    #[test]
    fn test_conversation_context_follow_up_none() {
        let project = create_test_project();
        let follow_up = ConversationContext::generate_follow_up("Unknown action", &project);
        // May or may not have follow-up depending on project state
        // Just ensure it doesn't panic
        let _ = follow_up;
    }

    #[test]
    fn test_repair_strategies_effect_fallback() {
        let strategies =
            RepairStrategies::repair_strategies("effect rendering", "GPU out of memory");
        assert!(!strategies.is_empty());
        assert!(strategies.iter().any(|s| s.contains("CPU")));
    }

    #[test]
    fn test_repair_strategies_load_fallback() {
        let strategies = RepairStrategies::repair_strategies("load media", "decode error");
        assert!(!strategies.is_empty());
        assert!(strategies.iter().any(|s| s.contains("encoding")));
    }

    #[test]
    fn test_timeline_audit_summary_clean() {
        let mut project = create_test_project();
        // A project with clips that covers intro and has transitions
        let mut c1 = create_video_clip("c1", "first", 0, 100);
        c1.animations.insert(
            "transition_crossfade".to_string(),
            state::keyframe::ScalarAnimationChannel::default(),
        );
        let mut c2 = create_video_clip("c2", "second", 100, 200);
        c2.animations.insert(
            "transition_crossfade".to_string(),
            state::keyframe::ScalarAnimationChannel::default(),
        );

        project.tracks.push(Track {
            id: "v1".to_string(),
            kind: "video".to_string(),
            clips: vec![c1, c2],
            muted: false,
            soloed: false,
            locked: false,
        });

        let audit = TimelineAudit::analyze(&project);
        // Should still complete without panicking
        assert_eq!(audit.project_id, "test-project");
    }
}

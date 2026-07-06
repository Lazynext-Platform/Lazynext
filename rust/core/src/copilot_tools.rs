//! AI copilot tools for the Lazynext video editor.
//!
//! This module provides agentic workflow patterns for video editing:
//! universal timeline search, slash commands, persistent conversation memory,
//! multi-turn conversation state management, and revision history with rollback.
//!
//! # Components
//!
//! - **TimelineSearch**: Fuzzy search across clips, tracks, effects, transcripts
//! - **SlashCommand**: Command parser and executor (e.g., `/edit`, `/export`)
//! - **ConversationMemory**: Persistent multi-turn conversation storage
//! - **MultiTurnManager**: Conversation state machine with follow-up generation
//! - **RevisionHistory**: Auto-snapshot, diff, and rollback for AI-initiated edits

use crate::nle_state::{Clip, ProjectData};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Universal Timeline Search ──────────────────────────────────────────────

/// A single search result from the universal timeline search.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// The display name of the matched item
    pub name: String,
    /// The type of item matched (clip, track, effect, transcript, media)
    pub item_type: String,
    /// The ID of the matched item
    pub item_id: String,
    /// Relevance score 0.0–1.0 (higher = better match)
    pub score: f64,
    /// A short snippet of context around the match
    pub context_snippet: String,
    /// The track ID, if this is a clip
    pub track_id: Option<String>,
}

/// Universal timeline search engine. Searches across all clips by name,
/// metadata, transcript text, and effect names using fuzzy matching.
pub struct TimelineSearch;

impl TimelineSearch {
    /// Searches the entire timeline for clips matching the query.
    /// Returns results ranked by relevance score (descending).
    pub fn search(project: &ProjectData, query: &str) -> Vec<SearchResult> {
        let mut results = Vec::new();
        let query_lower = query.to_lowercase();

        for track in &project.tracks {
            for clip in &track.clips {
                // Search clip name
                let name_score = Self::fuzzy_match(&clip.name.to_lowercase(), &query_lower);
                if name_score > 0.0 {
                    results.push(SearchResult {
                        name: clip.name.clone(),
                        item_type: "clip".to_string(),
                        item_id: clip.id.clone(),
                        score: name_score,
                        context_snippet: format!(
                            "Clip '{}' on track '{}' (frames {}-{})",
                            clip.name, track.id, clip.start, clip.end
                        ),
                        track_id: Some(track.id.clone()),
                    });
                }

                // Search clip type (could match "audio", "video", "text")
                let type_score = Self::fuzzy_match(&clip.clip_type.to_lowercase(), &query_lower);
                if type_score > 0.3 && name_score == 0.0 {
                    results.push(SearchResult {
                        name: clip.name.clone(),
                        item_type: clip.clip_type.clone(),
                        item_id: clip.id.clone(),
                        score: type_score * 0.7,
                        context_snippet: format!("{} clip on track '{}'", clip.clip_type, track.id),
                        track_id: Some(track.id.clone()),
                    });
                }

                // Search effect names from animation channels
                for prop in clip.animations.keys() {
                    if Self::fuzzy_match(&prop.to_lowercase(), &query_lower) > 0.3 {
                        results.push(SearchResult {
                            name: format!("{} (effect: {})", clip.name, prop),
                            item_type: "effect".to_string(),
                            item_id: clip.id.clone(),
                            score: Self::fuzzy_match(&prop.to_lowercase(), &query_lower),
                            context_snippet: format!(
                                "Effect '{}' on clip '{}' (track '{}')",
                                prop, clip.name, track.id
                            ),
                            track_id: Some(track.id.clone()),
                        });
                    }
                }
            }

            // Search track names
            let track_score = Self::fuzzy_match(&track.id.to_lowercase(), &query_lower);
            if track_score > 0.0 {
                results.push(SearchResult {
                    name: track.id.clone(),
                    item_type: "track".to_string(),
                    item_id: track.id.clone(),
                    score: track_score,
                    context_snippet: format!(
                        "Track '{}' (kind: {}, {} clips)",
                        track.id,
                        track.kind,
                        track.clips.len()
                    ),
                    track_id: Some(track.id.clone()),
                });
            }
        }

        // Search media pool
        for (media_id, media) in &project.media_pool {
            let media_score = Self::fuzzy_match(&media.name.to_lowercase(), &query_lower);
            if media_score > 0.0 {
                results.push(SearchResult {
                    name: media.name.clone(),
                    item_type: "media".to_string(),
                    item_id: media_id.clone(),
                    score: media_score,
                    context_snippet: format!(
                        "Media '{}' (type: {}, {}x{})",
                        media.name, media.asset_type, media.width, media.height
                    ),
                    track_id: None,
                });
            }
        }

        // Sort by score descending
        results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results
    }

    /// Simple fuzzy matching based on character overlap and substring matching.
    /// Returns a score from 0.0 (no match) to 1.0 (exact match).
    fn fuzzy_match(text: &str, query: &str) -> f64 {
        if query.is_empty() {
            return 0.0;
        }
        if text == query {
            return 1.0;
        }
        if text.contains(query) {
            return 0.9;
        }

        // Count matching characters in order (fuzzy)
        let mut matched = 0usize;
        let text_chars: Vec<char> = text.chars().collect();
        let query_chars: Vec<char> = query.chars().collect();
        let mut qi = 0usize;

        for &tc in &text_chars {
            if qi < query_chars.len() && tc == query_chars[qi] {
                matched += 1;
                qi += 1;
            }
        }

        if matched == 0 {
            return 0.0;
        }

        let coverage = matched as f64 / query_chars.len() as f64;
        let brevity = query_chars.len() as f64 / text_chars.len().max(1) as f64;
        (coverage * 0.7 + brevity * 0.3).min(0.85)
    }
}

// ── Slash Commands ─────────────────────────────────────────────────────────

/// All supported slash commands for timeline navigation and editing.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SlashCommand {
    /// Open a specific clip for detailed editing
    Edit { clip_name_or_id: String },
    /// Export the project with specific settings
    Export {
        format: Option<String>,
        bitrate_kbps: Option<u32>,
    },
    /// Jump to a timestamp or clip
    Jump { target: String },
    /// Apply a specific effect to a clip
    Effect {
        effect_name: String,
        clip_target: Option<String>,
    },
    /// Show A/B comparison of two clips
    Compare { clip_a: String, clip_b: String },
    /// Undo the last operation
    Undo,
    /// Redo the last undone operation
    Redo,
    /// Run full project analysis
    Analyze,
    /// Toggle agent mode (suggest / auto / full)
    Agent { mode: Option<String> },
}

/// A parsed slash command with the resolved command type and raw arguments.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedSlashCommand {
    pub command: SlashCommand,
    pub raw_text: String,
}

/// Slash command parser. Extracts commands from text input using prefix
/// matching on `/command`.
pub struct SlashParser;

impl SlashParser {
    /// Parse a text input string into a `ParsedSlashCommand`.
    /// Returns `None` if the input doesn't start with `/` or doesn't
    /// match any known command.
    pub fn parse(input: &str) -> Option<ParsedSlashCommand> {
        let trimmed = input.trim();
        if !trimmed.starts_with('/') {
            return None;
        }

        let parts: Vec<&str> = trimmed[1..].splitn(2, ' ').collect();
        let cmd_name = parts[0].to_lowercase();
        let args_str = parts.get(1).copied().unwrap_or("");

        let command = match cmd_name.as_str() {
            "edit" => SlashCommand::Edit {
                clip_name_or_id: args_str.to_string(),
            },
            "export" => Self::parse_export_args(args_str),
            "jump" | "goto" => SlashCommand::Jump {
                target: args_str.to_string(),
            },
            "effect" | "fx" => {
                let mut fx_parts = args_str.splitn(2, ' ');
                let effect_name = fx_parts.next().unwrap_or("").to_string();
                let clip_target = fx_parts.next().map(|s| s.to_string());
                SlashCommand::Effect {
                    effect_name,
                    clip_target,
                }
            }
            "compare" | "diff" => {
                let mut cmp_parts = args_str.splitn(2, ' ');
                SlashCommand::Compare {
                    clip_a: cmp_parts.next().unwrap_or("").to_string(),
                    clip_b: cmp_parts.next().unwrap_or("").to_string(),
                }
            }
            "undo" => SlashCommand::Undo,
            "redo" => SlashCommand::Redo,
            "analyze" | "audit" => SlashCommand::Analyze,
            "agent" => SlashCommand::Agent {
                mode: if args_str.is_empty() {
                    None
                } else {
                    Some(args_str.to_string())
                },
            },
            _ => return None,
        };

        Some(ParsedSlashCommand {
            command,
            raw_text: trimmed.to_string(),
        })
    }

    fn parse_export_args(args: &str) -> SlashCommand {
        let mut format = None;
        let mut bitrate = None;

        for part in args.split_whitespace() {
            if let Some(val) = part.strip_prefix("format=") {
                format = Some(val.to_string());
            } else if let Some(val) = part.strip_prefix("bitrate=") {
                bitrate = val.parse::<u32>().ok();
            } else if !part.is_empty() && format.is_none() {
                format = Some(part.to_string());
            }
        }

        SlashCommand::Export {
            format,
            bitrate_kbps: bitrate,
        }
    }
}

// ── Conversation Memory ────────────────────────────────────────────────────

/// A single turn in the conversation between user and AI agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationTurn {
    /// Incrementing turn number
    pub turn_id: u64,
    /// The user's natural language prompt
    pub user_prompt: String,
    /// The agent's plan (actions it decided to take)
    pub ai_plan: Option<String>,
    /// Summary of steps executed
    pub executed_steps: Vec<String>,
    /// Whether this turn was successful
    pub success: bool,
    /// Error message if the turn failed
    pub error: Option<String>,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// Whether this turn triggered a follow-up question
    pub had_follow_up: bool,
}

/// Summarized memory for older conversation turns.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySummary {
    /// Summary text of what was discussed/accomplished
    pub summary: String,
    /// The range of turn IDs covered by this summary
    pub turn_range: (u64, u64),
    /// Key decisions made in this span
    pub key_decisions: Vec<String>,
}

/// Persistent conversation memory that stores up to 50 recent turns
/// and auto-summarizes older interactions.
pub struct ConversationMemory {
    /// Recent turns (most recent first)
    turns: Vec<ConversationTurn>,
    /// Summarized older turns
    summaries: Vec<MemorySummary>,
    /// Next turn ID to assign
    next_turn_id: u64,
    /// Maximum recent turns before summarization triggers
    max_recent_turns: usize,
    /// Number of most recent turns to keep after summarization
    keep_recent: usize,
}

impl ConversationMemory {
    /// Creates a new empty conversation memory.
    pub fn new() -> Self {
        Self {
            turns: Vec::new(),
            summaries: Vec::new(),
            next_turn_id: 1,
            max_recent_turns: 50,
            keep_recent: 10,
        }
    }

    /// Adds a new turn to the conversation memory.
    /// If the memory exceeds `max_recent_turns`, older turns are summarized.
    pub fn add_turn(
        &mut self,
        user_prompt: String,
        ai_plan: Option<String>,
        executed_steps: Vec<String>,
        success: bool,
        error: Option<String>,
        had_follow_up: bool,
    ) {
        let turn = ConversationTurn {
            turn_id: self.next_turn_id,
            user_prompt,
            ai_plan,
            executed_steps,
            success,
            error,
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            had_follow_up,
        };

        self.turns.push(turn);
        self.next_turn_id += 1;

        // Auto-summarize if over limit
        if self.turns.len() > self.max_recent_turns {
            self.summarize_old_turns();
        }
    }

    /// Returns recent turns for context injection into new prompts.
    pub fn recent_turns(&self) -> &[ConversationTurn] {
        &self.turns
    }

    /// Returns all summaries of older conversations.
    pub fn summaries(&self) -> &[MemorySummary] {
        &self.summaries
    }

    /// Generates a context string summarizing what's been done so far.
    pub fn context_for_prompt(&self) -> String {
        let mut ctx = String::from("Here's what we've done so far:\n");

        for summary in &self.summaries {
            ctx.push_str(&format!(
                "- [Turns {}-{}] {}\n",
                summary.turn_range.0, summary.turn_range.1, summary.summary
            ));
        }

        for turn in &self.turns {
            let outcome = if turn.success { "successful" } else { "failed" };
            ctx.push_str(&format!(
                "- Turn {}: \"{}\" → {} ({})\n",
                turn.turn_id,
                turn.user_prompt,
                outcome,
                turn.executed_steps.join(", "),
            ));
        }

        ctx
    }

    /// Number of turns stored (including summarized)
    pub fn total_turns(&self) -> u64 {
        self.next_turn_id.saturating_sub(1)
    }

    /// Summarizes the oldest turns into a `MemorySummary`.
    fn summarize_old_turns(&mut self) {
        let num_to_summarize = self.turns.len().saturating_sub(self.keep_recent);
        if num_to_summarize == 0 {
            return;
        }

        let to_summarize: Vec<ConversationTurn> = self.turns.drain(..num_to_summarize).collect();

        if to_summarize.is_empty() {
            return;
        }

        let first_id = to_summarize.first().map(|t| t.turn_id).unwrap_or(0);
        let last_id = to_summarize.last().map(|t| t.turn_id).unwrap_or(0);

        let prompt_summaries: Vec<String> =
            to_summarize.iter().map(|t| t.user_prompt.clone()).collect();

        let key_decisions: Vec<String> = to_summarize
            .iter()
            .filter(|t| t.success && !t.executed_steps.is_empty())
            .map(|t| t.executed_steps[0].clone())
            .collect();

        let summary_text = prompt_summaries.join("; ");

        let summary = MemorySummary {
            summary: if summary_text.len() > 200 {
                let truncated: String = summary_text.chars().take(200).collect();
                format!("{}...", truncated)
            } else {
                summary_text
            },
            turn_range: (first_id, last_id),
            key_decisions,
        };

        self.summaries.push(summary);
    }

    /// Serializes the entire memory to a JSON string.
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(&MemoryData {
            turns: self.turns.clone(),
            summaries: self.summaries.clone(),
            next_turn_id: self.next_turn_id,
        })
    }

    /// Deserializes memory from a JSON string.
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        let data: MemoryData = serde_json::from_str(json)?;
        Ok(Self {
            turns: data.turns,
            summaries: data.summaries,
            next_turn_id: data.next_turn_id,
            max_recent_turns: 50,
            keep_recent: 10,
        })
    }
}

impl Default for ConversationMemory {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Serialize, Deserialize)]
struct MemoryData {
    turns: Vec<ConversationTurn>,
    summaries: Vec<MemorySummary>,
    next_turn_id: u64,
}

// ── Multi-Turn Conversation Manager ────────────────────────────────────────

/// The states in the multi-turn conversation state machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConversationState {
    /// Waiting for user input
    Idle,
    /// Agent is planning a response/action
    Planning,
    /// Agent is executing actions
    Executing,
    /// Agent is reviewing results and generating follow-ups
    Reviewing,
}

/// Manages the conversation state machine for multi-turn AI interactions.
/// Handles turn completion detection, follow-up generation, and interruptions.
pub struct MultiTurnManager {
    state: ConversationState,
    /// The current session's conversation memory
    memory: ConversationMemory,
    /// Whether the agent should proactively suggest follow-up questions
    pub proactive_follow_ups: bool,
    /// Tracks last user prompt for interruption detection
    last_user_prompt: Option<String>,
}

impl MultiTurnManager {
    /// Creates a new `MultiTurnManager` in the `Idle` state.
    pub fn new(proactive_follow_ups: bool) -> Self {
        Self {
            state: ConversationState::Idle,
            memory: ConversationMemory::new(),
            proactive_follow_ups,
            last_user_prompt: None,
        }
    }

    /// Returns the current conversation state.
    pub fn current_state(&self) -> ConversationState {
        self.state
    }

    /// Starts processing a new user prompt. Transitions from `Idle` or
    /// `Reviewing` to `Planning`.
    pub fn start_turn(&mut self, prompt: &str) {
        self.state = ConversationState::Planning;
        self.last_user_prompt = Some(prompt.to_string());
    }

    /// Transitions from `Planning` to `Executing`.
    pub fn plan_complete(&mut self) {
        if self.state == ConversationState::Planning {
            self.state = ConversationState::Executing;
        }
    }

    /// Transitions from `Executing` to `Reviewing`.
    pub fn execution_complete(&mut self) {
        if self.state == ConversationState::Executing {
            self.state = ConversationState::Reviewing;
        }
    }

    /// Transitions from `Reviewing` back to `Idle`.
    pub fn review_complete(&mut self) {
        if self.state == ConversationState::Reviewing {
            self.state = ConversationState::Idle;
        }
    }

    /// Records a completed turn in the conversation memory.
    pub fn record_turn(
        &mut self,
        user_prompt: String,
        ai_plan: Option<String>,
        executed_steps: Vec<String>,
        success: bool,
        error: Option<String>,
    ) {
        self.memory
            .add_turn(user_prompt, ai_plan, executed_steps, success, error, false);
    }

    /// Generates contextual follow-up questions based on the project state.
    /// Returns a list of suggested follow-up prompts the user might want.
    pub fn generate_follow_ups(project: &ProjectData) -> Vec<String> {
        let mut follow_ups = Vec::new();

        // Check for common patterns that warrant follow-ups
        let has_audio = project
            .tracks
            .iter()
            .any(|t| t.kind == "audio" && !t.clips.is_empty());
        let has_video = project
            .tracks
            .iter()
            .any(|t| t.kind == "video" && !t.clips.is_empty());
        let total_clips: usize = project.tracks.iter().map(|t| t.clips.len()).sum();

        if has_audio && has_video {
            follow_ups.push(
				"I notice you have both audio and video tracks. Would you like me to check for audio sync issues?"
					.to_string(),
			);
        }

        if total_clips > 5 {
            follow_ups.push(
				"Your timeline has several clips. Should I analyze the pacing and suggest better clip ordering?"
					.to_string(),
			);
        }

        if total_clips == 0 && project.media_pool.is_empty() {
            follow_ups.push(
                "Your project is empty. Would you like me to help you import media files?"
                    .to_string(),
            );
        }

        if total_clips > 0 && total_clips < 3 {
            follow_ups.push(
                "You have a few clips. Should I suggest adding transitions between them?"
                    .to_string(),
            );
        }

        follow_ups
    }

    /// Detects if a new user prompt interrupts the current turn.
    pub fn is_interruption(&self, new_prompt: &str) -> bool {
        if let Some(ref _last) = self.last_user_prompt {
            // Check for interruption keywords
            let lower = new_prompt.to_lowercase();
            lower.contains("wait")
                || lower.contains("instead")
                || lower.contains("stop")
                || lower.contains("actually")
                || lower.contains("no, ")
        } else {
            false
        }
    }

    /// Handles an interruption by resetting the state to `Idle`.
    pub fn handle_interruption(&mut self) {
        self.state = ConversationState::Idle;
    }

    /// Returns a reference to the conversation memory.
    pub fn memory(&self) -> &ConversationMemory {
        &self.memory
    }

    /// Returns a mutable reference to the conversation memory.
    pub fn memory_mut(&mut self) -> &mut ConversationMemory {
        &mut self.memory
    }

    /// Builds a context string for the LLM from conversation history.
    pub fn build_context(&self) -> String {
        self.memory.context_for_prompt()
    }
}

impl Default for MultiTurnManager {
    fn default() -> Self {
        Self::new(true)
    }
}

// ── Revision History ───────────────────────────────────────────────────────

/// A named snapshot of the full project state, used for revision tracking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevisionSnapshot {
    /// Unique revision ID
    pub id: String,
    /// Human-readable name/description
    pub name: String,
    /// Full project data at this revision point
    pub project_data: ProjectData,
    /// Unix timestamp in milliseconds when this snapshot was created
    pub timestamp_ms: u64,
    /// Whether this snapshot was created automatically (by AI) or manually
    pub is_auto: bool,
}

/// Diff between two revisions, showing what changed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevisionDiff {
    /// ID of the older revision
    pub from_id: String,
    /// ID of the newer revision
    pub to_id: String,
    /// Tracks that were added
    pub tracks_added: Vec<String>,
    /// Tracks that were removed
    pub tracks_removed: Vec<String>,
    /// Clips that were added (track_id, clip_id)
    pub clips_added: Vec<(String, String)>,
    /// Clips that were removed (track_id, clip_id)
    pub clips_removed: Vec<(String, String)>,
    /// Total number of clips changed
    pub clip_count_change: i64,
    /// Summary of what changed
    pub summary: String,
}

/// Manages revision snapshots of the project state, enabling named revision
/// points, diffing, and rollback.
pub struct RevisionHistory {
    snapshots: Vec<RevisionSnapshot>,
    /// Maximum number of snapshots to retain
    max_snapshots: usize,
}

impl RevisionHistory {
    pub fn new(max_snapshots: usize) -> Self {
        Self {
            snapshots: Vec::new(),
            max_snapshots,
        }
    }

    /// Creates a new snapshot of the current project state.
    /// Returns the revision ID.
    pub fn snapshot(&mut self, name: &str, project_data: &ProjectData, is_auto: bool) -> String {
        let id = uuid::Uuid::new_v4().to_string();
        let snapshot = RevisionSnapshot {
            id: id.clone(),
            name: name.to_string(),
            project_data: project_data.clone(),
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            is_auto,
        };

        self.snapshots.push(snapshot);

        // Prune old snapshots if over limit
        while self.snapshots.len() > self.max_snapshots {
            self.snapshots.remove(0);
        }

        id
    }

    /// Returns the most recent snapshot, if any.
    pub fn latest(&self) -> Option<&RevisionSnapshot> {
        self.snapshots.last()
    }

    /// Returns a snapshot by ID.
    pub fn get(&self, id: &str) -> Option<&RevisionSnapshot> {
        self.snapshots.iter().find(|s| s.id == id)
    }

    /// Lists all revision snapshots.
    pub fn list(&self) -> &[RevisionSnapshot] {
        &self.snapshots
    }

    /// Computes a diff between two revisions.
    pub fn diff(&self, from_id: &str, to_id: &str) -> Option<RevisionDiff> {
        let from = self.get(from_id)?;
        let to = self.get(to_id)?;

        let from_track_ids: std::collections::HashSet<&str> = from
            .project_data
            .tracks
            .iter()
            .map(|t| t.id.as_str())
            .collect();
        let to_track_ids: std::collections::HashSet<&str> = to
            .project_data
            .tracks
            .iter()
            .map(|t| t.id.as_str())
            .collect();

        let tracks_added: Vec<String> = to_track_ids
            .difference(&from_track_ids)
            .map(|s| s.to_string())
            .collect();
        let tracks_removed: Vec<String> = from_track_ids
            .difference(&to_track_ids)
            .map(|s| s.to_string())
            .collect();

        let from_clips: HashMap<&str, &Clip> = from
            .project_data
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().map(move |c| (c.id.as_str(), c)))
            .collect();
        let to_clips: HashMap<&str, &Clip> = to
            .project_data
            .tracks
            .iter()
            .flat_map(|t| t.clips.iter().map(move |c| (c.id.as_str(), c)))
            .collect();

        let from_clip_set: std::collections::HashSet<&str> = from_clips.keys().copied().collect();
        let to_clip_set: std::collections::HashSet<&str> = to_clips.keys().copied().collect();

        let clips_added: Vec<(String, String)> = to_clip_set
            .difference(&from_clip_set)
            .filter_map(|&cid| {
                let _c = to_clips.get(cid)?;
                let tid = to
                    .project_data
                    .tracks
                    .iter()
                    .find(|t| t.clips.iter().any(|cl| cl.id == cid))
                    .map(|t| t.id.clone())?;
                Some((tid, cid.to_string()))
            })
            .collect();
        let clips_removed: Vec<(String, String)> = from_clip_set
            .difference(&to_clip_set)
            .filter_map(|&cid| {
                let _c = from_clips.get(cid)?;
                let tid = from
                    .project_data
                    .tracks
                    .iter()
                    .find(|t| t.clips.iter().any(|cl| cl.id == cid))
                    .map(|t| t.id.clone())?;
                Some((tid, cid.to_string()))
            })
            .collect();

        let clip_count_change = to_clips.len() as i64 - from_clips.len() as i64;

        let mut summary_parts = Vec::new();
        if !clips_added.is_empty() {
            summary_parts.push(format!("{} clips added", clips_added.len()));
        }
        if !clips_removed.is_empty() {
            summary_parts.push(format!("{} clips removed", clips_removed.len()));
        }
        if !tracks_added.is_empty() {
            summary_parts.push(format!("{} tracks added", tracks_added.len()));
        }
        if !tracks_removed.is_empty() {
            summary_parts.push(format!("{} tracks removed", tracks_removed.len()));
        }
        let summary = if summary_parts.is_empty() {
            "No visible changes".to_string()
        } else {
            summary_parts.join(", ")
        };

        Some(RevisionDiff {
            from_id: from_id.to_string(),
            to_id: to_id.to_string(),
            tracks_added,
            tracks_removed,
            clips_added,
            clips_removed,
            clip_count_change,
            summary,
        })
    }

    /// Rolls back the project state to a specific revision.
    /// Returns the restored `ProjectData`.
    pub fn rollback_to(&self, id: &str) -> Option<ProjectData> {
        self.get(id).map(|s| s.project_data.clone())
    }

    /// Rolls back to the most recent snapshot.
    pub fn rollback_to_latest(&self) -> Option<ProjectData> {
        self.latest().map(|s| s.project_data.clone())
    }

    /// Number of stored snapshots.
    pub fn count(&self) -> usize {
        self.snapshots.len()
    }
}

impl Default for RevisionHistory {
    fn default() -> Self {
        Self::new(100)
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::nle_state::Track;

    fn create_test_project() -> ProjectData {
        ProjectData {
            id: "test-proj".to_string(),
            name: "Test Project".to_string(),
            framerate: 30,
            width: 1920,
            height: 1080,
            bg_color: [0.0, 0.0, 0.0, 1.0],
            tracks: vec![Track {
                id: "t1".to_string(),
                kind: "video".to_string(),
                clips: vec![
                    Clip {
                        id: "c1".to_string(),
                        clip_type: "video".to_string(),
                        media_id: None,
                        name: "intro".to_string(),
                        start: 0,
                        end: 90,
                        animations: HashMap::new(),
                    },
                    Clip {
                        id: "c2".to_string(),
                        clip_type: "audio".to_string(),
                        media_id: None,
                        name: "background_music".to_string(),
                        start: 0,
                        end: 300,
                        animations: HashMap::new(),
                    },
                ],
                muted: false,
                soloed: false,
                locked: false,
            }],
            media_pool: HashMap::new(),
        }
    }

    #[test]
    fn test_timeline_search_clip_by_name() {
        let project = create_test_project();
        let results = TimelineSearch::search(&project, "intro");
        assert!(!results.is_empty());
        assert_eq!(results[0].item_type, "clip");
        assert_eq!(results[0].item_id, "c1");
    }

    #[test]
    fn test_timeline_search_no_match() {
        let project = create_test_project();
        let results = TimelineSearch::search(&project, "zzzz_nonexistent_zzzz");
        assert!(results.is_empty());
    }

    #[test]
    fn test_timeline_search_partial_match() {
        let project = create_test_project();
        let results = TimelineSearch::search(&project, "music");
        assert!(!results.is_empty());
        assert_eq!(results[0].name, "background_music");
    }

    #[test]
    fn test_fuzzy_match_exact() {
        assert!((TimelineSearch::fuzzy_match("intro", "intro") - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_fuzzy_match_contains() {
        let score = TimelineSearch::fuzzy_match("background_music", "music");
        assert!(score > 0.8);
    }

    #[test]
    fn test_fuzzy_match_no_match() {
        let score = TimelineSearch::fuzzy_match("video", "zzzzz");
        assert!(score < 0.2);
    }

    #[test]
    fn test_slash_parser_edit() {
        let cmd = SlashParser::parse("/edit intro_clip").unwrap();
        assert!(
            matches!(cmd.command, SlashCommand::Edit { clip_name_or_id } if clip_name_or_id == "intro_clip")
        );
    }

    #[test]
    fn test_slash_parser_export_with_format() {
        let cmd = SlashParser::parse("/export format=mp4 bitrate=5000").unwrap();
        match cmd.command {
            SlashCommand::Export {
                format,
                bitrate_kbps,
            } => {
                assert_eq!(format, Some("mp4".to_string()));
                assert_eq!(bitrate_kbps, Some(5000));
            }
            _ => panic!("Expected Export command"),
        }
    }

    #[test]
    fn test_slash_parser_undo() {
        let cmd = SlashParser::parse("/undo").unwrap();
        assert!(matches!(cmd.command, SlashCommand::Undo));
    }

    #[test]
    fn test_slash_parser_unknown_command() {
        assert!(SlashParser::parse("/nonexistent_cmd").is_none());
    }

    #[test]
    fn test_slash_parser_not_a_command() {
        assert!(SlashParser::parse("just a regular message").is_none());
    }

    #[test]
    fn test_slash_parser_agent() {
        let cmd = SlashParser::parse("/agent full").unwrap();
        match cmd.command {
            SlashCommand::Agent { mode } => assert_eq!(mode, Some("full".to_string())),
            _ => panic!("Expected Agent command"),
        }
    }

    #[test]
    fn test_slash_parser_agent_no_args() {
        let cmd = SlashParser::parse("/agent").unwrap();
        match cmd.command {
            SlashCommand::Agent { mode } => assert_eq!(mode, None),
            _ => panic!("Expected Agent command"),
        }
    }

    #[test]
    fn test_conversation_memory_add_and_context() {
        let mut mem = ConversationMemory::new();
        mem.add_turn(
            "Add captions".to_string(),
            Some("Plan: detect silence, add text track".to_string()),
            vec!["Added caption track".to_string()],
            true,
            None,
            false,
        );

        let ctx = mem.context_for_prompt();
        assert!(ctx.contains("Add captions"));
        assert!(ctx.contains("Added caption track"));
    }

    #[test]
    fn test_conversation_memory_serialization() {
        let mut mem = ConversationMemory::new();
        mem.add_turn(
            "Test prompt".to_string(),
            None,
            vec!["Test step".to_string()],
            true,
            None,
            false,
        );

        let json = mem.to_json().unwrap();
        let restored = ConversationMemory::from_json(&json).unwrap();
        assert_eq!(restored.total_turns(), 1);
    }

    #[test]
    fn test_conversation_memory_summarization() {
        let mut mem = ConversationMemory::new();
        mem.max_recent_turns = 5;
        mem.keep_recent = 2;

        for i in 0..10 {
            mem.add_turn(
                format!("Prompt {}", i),
                None,
                vec![format!("Step {}", i)],
                true,
                None,
                false,
            );
        }

        // Should have summarized older turns, kept 2 recent
        assert_eq!(mem.turns.len(), 2);
        assert!(!mem.summaries().is_empty());
    }

    #[test]
    fn test_multi_turn_state_machine() {
        let mut mgr = MultiTurnManager::new(true);
        assert_eq!(mgr.current_state(), ConversationState::Idle);

        mgr.start_turn("add a transition");
        assert_eq!(mgr.current_state(), ConversationState::Planning);

        mgr.plan_complete();
        assert_eq!(mgr.current_state(), ConversationState::Executing);

        mgr.execution_complete();
        assert_eq!(mgr.current_state(), ConversationState::Reviewing);

        mgr.review_complete();
        assert_eq!(mgr.current_state(), ConversationState::Idle);
    }

    #[test]
    fn test_multi_turn_follow_ups() {
        let project = create_test_project();
        let follow_ups = MultiTurnManager::generate_follow_ups(&project);
        // Project has both video and audio clips
        assert!(!follow_ups.is_empty());
    }

    #[test]
    fn test_multi_turn_interruption_detection() {
        let mut mgr = MultiTurnManager::new(true);
        mgr.start_turn("add captions to my video");

        assert!(mgr.is_interruption("wait, instead add subtitles"));
        assert!(mgr.is_interruption("actually, just add music"));
        assert!(mgr.is_interruption("no, do something else"));
        assert!(!mgr.is_interruption("also add music"));
    }

    #[test]
    fn test_revision_history_snapshot() {
        let project = create_test_project();
        let mut history = RevisionHistory::default();

        let id = history.snapshot("before-edit", &project, true);
        assert!(!id.is_empty());
        assert_eq!(history.count(), 1);
        assert!(history.latest().is_some());
    }

    #[test]
    fn test_revision_history_diff() {
        let project = create_test_project();
        let mut history = RevisionHistory::default();

        let id1 = history.snapshot("v1", &project, true);

        let mut project2 = project.clone();
        project2.tracks[0].clips.push(Clip {
            id: "c3".to_string(),
            clip_type: "video".to_string(),
            media_id: None,
            name: "new_clip".to_string(),
            start: 100,
            end: 200,
            animations: HashMap::new(),
        });

        let id2 = history.snapshot("v2", &project2, true);

        let diff = history.diff(&id1, &id2).unwrap();
        assert_eq!(diff.clips_added.len(), 1);
        assert!(diff.summary.contains("1 clips added"));
    }

    #[test]
    fn test_revision_history_rollback() {
        let project = create_test_project();
        let mut history = RevisionHistory::default();
        let id = history.snapshot("checkpoint", &project, true);

        let restored = history.rollback_to(&id).unwrap();
        assert_eq!(restored.id, project.id);
        assert_eq!(restored.tracks.len(), project.tracks.len());
    }

    #[test]
    fn test_revision_history_pruning() {
        let project = create_test_project();
        let mut history = RevisionHistory::new(3);

        for i in 0..5 {
            history.snapshot(&format!("v{}", i), &project, true);
        }

        // Should have pruned to max 3
        assert!(history.count() <= 3);
    }
}

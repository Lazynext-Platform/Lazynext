//! Auto Memory — persistent learning accumulation across sessions.
//!
//! `AutoMemory` tracks insights learned during editing sessions, persists
//! them to `~/.lazynext/memory/MEMORY.md`, and provides fuzzy retrieval
//! so the AI agent can recall user preferences, project conventions, and
//! past decisions.
//!
//! Memories automatically decay after 90 days of disuse.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

/// A single memory entry with insight text, timestamp, optional context, and a reference counter.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub insight: String,
    pub timestamp: u64,
    pub context: Option<String>,
    pub reference_count: u32,
}

impl MemoryEntry {
    /// Creates a new memory entry with the current timestamp and reference count of 1.
    pub fn new(insight: &str, context: Option<&str>) -> Self {
        Self {
            insight: insight.to_string(),
            timestamp: now_secs(),
            context: context.map(|s| s.to_string()),
            reference_count: 1,
        }
    }

    /// Returns the number of days since this memory entry was created.
    pub fn age_days(&self) -> u64 {
        let now = now_secs();
        now.saturating_sub(self.timestamp) / 86400
    }
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

/// Persistent memory store that accumulates insights across editing sessions.
/// Automatically decays entries older than 90 days with low reference counts.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AutoMemory {
    memories: Vec<MemoryEntry>,
    #[serde(skip)]
    dirty: bool,
}

impl AutoMemory {
    /// Creates an empty memory store.
    pub fn new() -> Self {
        Self {
            memories: Vec::new(),
            dirty: false,
        }
    }

    /// Records a new insight (or increments the reference count if already known).
    pub fn learn(&mut self, insight: &str) {
        self.learn_with_context(insight, None);
    }

    /// Records an insight with optional context (e.g., "project_structure").
    /// Truncates insights to 2 KB.
    pub fn learn_with_context(&mut self, insight: &str, context: Option<&str>) {
        let insight = insight.trim();
        if insight.is_empty() {
            return;
        }
        // Truncate to 2KB to prevent memory bloat
        let insight = if insight.len() > 2048 {
            &insight[..2048]
        } else {
            insight
        };
        if let Some(existing) = self.memories.iter_mut().find(|m| m.insight == insight) {
            existing.reference_count += 1;
            existing.timestamp = now_secs();
        } else {
            self.memories.push(MemoryEntry::new(insight, context));
        }
        self.dirty = true;
    }

    /// Generates a sorted Markdown summary of all memories, limited to 200 lines / 25 KB.
    pub fn summarize(&self) -> String {
        let mut summary = String::from("# Lazynext Memory\n\n");
        summary.push_str(&format!(
            "> Auto-generated: {} entries\n\n",
            self.memories.len()
        ));

        let mut entries: Vec<&MemoryEntry> = self.memories.iter().collect();
        entries.sort_by_key(|e| std::cmp::Reverse(e.reference_count));

        let mut total_bytes = 0usize;
        let max_bytes = 25 * 1024;
        let max_lines = 200;

        for (line_count, entry) in entries.iter().enumerate() {
            if line_count >= max_lines || total_bytes >= max_bytes {
                break;
            }
            let line = format!("- {}", entry.insight);
            total_bytes += line.len();
            summary.push_str(&line);
            summary.push('\n');
        }

        summary
    }

    /// Returns up to 10 memories relevant to the query, scored by word overlap.
    pub fn get_relevant_memories(&self, query: &str) -> Vec<String> {
        let query_lower = query.to_lowercase();
        let query_words: Vec<&str> = query_lower.split_whitespace().collect();

        if query_words.is_empty() {
            return Vec::new();
        }

        let mut scored: Vec<(usize, &MemoryEntry)> = self
            .memories
            .iter()
            .map(|entry| {
                let insight_lower = entry.insight.to_lowercase();
                let score = query_words
                    .iter()
                    .filter(|word| insight_lower.contains(*word))
                    .count();
                (score, entry)
            })
            .collect();

        scored.sort_by_key(|(score, _)| std::cmp::Reverse(*score));
        scored.retain(|(score, _)| *score > 0);

        scored
            .into_iter()
            .take(10)
            .map(|(_, entry)| entry.insight.clone())
            .collect()
    }

    /// Removes stale memories: entries older than 90 days with fewer than 3 references.
    pub fn decay(&mut self) {
        let before = self.memories.len();
        self.memories.retain(|m| {
            let keep = m.age_days() < 90 || m.reference_count >= 3;
            if !keep {
                self.dirty = true;
            }
            keep
        });
        if self.memories.len() < before {
            self.dirty = true;
        }
    }

    /// Scans the project directory for known frameworks and auto-records insights.
    pub fn generate_project_insights(&mut self, project_dir: &str) {
        if let Ok(entries) = fs::read_dir(project_dir) {
            let mut has_react = false;
            let mut has_tailwind = false;
            let mut has_cargo = false;
            let mut has_next = false;
            let mut has_python = false;
            let mut has_ffmpeg = false;

            for entry in entries.flatten() {
                let name = entry.file_name();
                let name_str = name.to_string_lossy();
                if name_str == "Cargo.toml" {
                    has_cargo = true;
                }
                if name_str == "package.json" {
                    // Guard against reading massive files (max 1 MB)
                    let metadata = match entry.metadata() {
                        Ok(m) => m,
                        Err(_) => continue,
                    };
                    if metadata.len() > 1_048_576 {
                        continue;
                    }
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let Some(deps) = json.get("dependencies") {
                                if deps.get("react").is_some() {
                                    has_react = true;
                                }
                                if deps.get("next").is_some() {
                                    has_next = true;
                                }
                                if deps.get("tailwindcss").is_some() {
                                    has_tailwind = true;
                                }
                            }
                        }
                    }
                }
                if name_str == "requirements.txt" || name_str == "pyproject.toml" {
                    has_python = true;
                }
            }

            if let Ok(ws_toml) = fs::read_to_string(PathBuf::from(project_dir).join("Cargo.toml")) {
                if ws_toml.contains("ffmpeg") {
                    has_ffmpeg = true;
                }
            }

            if has_cargo {
                self.learn_with_context("Project is a Rust workspace", Some("project_structure"));
            }
            if has_react {
                self.learn_with_context("Project uses React", Some("project_structure"));
            }
            if has_next {
                self.learn_with_context("Project uses Next.js", Some("project_structure"));
            }
            if has_tailwind {
                self.learn_with_context("Project uses TailwindCSS", Some("project_structure"));
            }
            if has_python {
                self.learn_with_context("Project uses Python", Some("project_structure"));
            }
            if has_ffmpeg {
                self.learn_with_context(
                    "Project uses FFMPEG for media processing",
                    Some("project_structure"),
                );
            }
        }
    }

    /// Persists the memory summary to `~/.lazynext/memory/MEMORY.md`.
    pub fn store_to_file(&self) -> Result<(), String> {
        let dir = memory_dir()?;
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create memory dir: {}", e))?;

        let path = dir.join("MEMORY.md");
        let content = self.summarize();

        fs::write(&path, content).map_err(|e| format!("Failed to write memory file: {}", e))?;

        Ok(())
    }

    /// Loads memories from `~/.lazynext/memory/MEMORY.md`, parsing bullet-pointed entries.
    pub fn load_from_file() -> Result<Self, String> {
        let dir = memory_dir()?;
        let path = dir.join("MEMORY.md");

        if !path.exists() {
            return Ok(Self::new());
        }

        let content =
            fs::read_to_string(&path).map_err(|e| format!("Failed to read memory file: {}", e))?;

        let mut memory = Self::new();
        for line in content.lines() {
            let trimmed = line.trim();
            if let Some(stripped) = trimmed.strip_prefix("- ") {
                memory.learn(stripped);
            }
        }

        Ok(memory)
    }

    /// Returns the number of stored memory entries.
    pub fn len(&self) -> usize {
        self.memories.len()
    }

    /// Returns `true` if no memories are stored.
    pub fn is_empty(&self) -> bool {
        self.memories.is_empty()
    }
}

fn memory_dir() -> Result<PathBuf, String> {
    let home = dirs_fallback().ok_or_else(|| "Cannot determine home directory".to_string())?;
    Ok(home.join(".lazynext").join("memory"))
}

fn dirs_fallback() -> Option<PathBuf> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .ok()
        .or_else(|| {
            std::env::var("HOMEDRIVE").ok().and_then(|drive| {
                std::env::var("HOMEPATH")
                    .ok()
                    .map(|path| PathBuf::from(format!("{}{}", drive, path)))
            })
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_learn_new_insight() {
        let mut mem = AutoMemory::new();
        mem.learn("Export format is always ProRes 422 HQ");
        assert_eq!(mem.len(), 1);
    }

    #[test]
    fn test_learn_duplicate_increments_count() {
        let mut mem = AutoMemory::new();
        mem.learn("Project uses React 19");
        mem.learn("Project uses React 19");
        assert_eq!(mem.len(), 1);
        assert_eq!(mem.memories[0].reference_count, 2);
    }

    #[test]
    fn test_get_relevant_memories() {
        let mut mem = AutoMemory::new();
        mem.learn("Export format is always ProRes 422 HQ");
        mem.learn("User prefers J-cuts over L-cuts");
        mem.learn("Default framerate is 24fps");

        let results = mem.get_relevant_memories("export prores");
        assert!(!results.is_empty());
        assert!(results.iter().any(|m| m.contains("ProRes")));
    }

    #[test]
    fn test_get_relevant_memories_no_match() {
        let mut mem = AutoMemory::new();
        mem.learn("Export format is always ProRes 422 HQ");

        let results = mem.get_relevant_memories("python django");
        assert!(results.is_empty());
    }

    #[test]
    fn test_summarize_format() {
        let mut mem = AutoMemory::new();
        mem.learn("Export format is always ProRes 422 HQ");
        mem.learn("User prefers J-cuts");

        let summary = mem.summarize();
        assert!(summary.contains("# Lazynext Memory"));
        assert!(summary.contains("ProRes"));
        assert!(summary.contains("J-cuts"));
    }

    #[test]
    fn test_decay_keeps_frequent() {
        let mut mem = AutoMemory::new();
        mem.learn("Frequent insight");
        mem.learn("Frequent insight");
        mem.learn("Frequent insight");
        mem.memories[0].timestamp = 0;

        mem.decay();
        assert_eq!(mem.len(), 1);
    }

    #[test]
    fn test_load_from_nonexistent() {
        // Ensure clean state by removing any test file first
        if let Ok(dir) = memory_dir() {
            let path = dir.join("MEMORY.md");
            let _ = std::fs::remove_file(&path);
        }
        let mem = AutoMemory::load_from_file().unwrap();
        assert!(mem.is_empty());
    }

    #[test]
    fn test_store_and_load() {
        let mut mem = AutoMemory::new();
        mem.learn("Test memory persistence");
        mem.store_to_file().unwrap();

        let loaded = AutoMemory::load_from_file().unwrap();
        assert!(!loaded.is_empty());
        assert!(
            loaded
                .memories
                .iter()
                .any(|m| m.insight.contains("Test memory persistence"))
        );

        // Clean up after test
        if let Ok(dir) = memory_dir() {
            let path = dir.join("MEMORY.md");
            let _ = std::fs::remove_file(&path);
        }
    }
}

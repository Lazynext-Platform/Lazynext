//! Lazynext Rules Engine — hierarchical, path-scoped AI rules.
//!
//! Loads `.lazynext/rules/*.md` files with YAML frontmatter and
//! matches them against file paths and contextual conditions so
//! the AI agent only sees rules relevant to the file it's working on.
//!
//! # Rule file format
//!
//! ```markdown
//! ---
//! paths: "rust/core/src/**"
//! priority: 10
//! description: "Rust core conventions"
//! when:
//!   mode: "ai-editing"
//! ---
//! # Rust Core Rules
//!
//! - All business logic goes here
//! - Use tracing for logging
//! ```
//!
//! # Usage
//!
//! ```ignore
//! use lazynext_rules::{RuleSet, RuleContext};
//!
//! let ruleset = RuleSet::load_from_directory(".lazynext/rules")?;
//! let applicable = ruleset.get_applicable_rules(
//!     "rust/core/src/engine.rs",
//!     Some(&RuleContext { mode: Some("ai-editing".into()), ..Default::default() }),
//! );
//! ```

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// A single rule loaded from a `.lazynext/rules/*.md` file.
///
/// Rules combine YAML frontmatter (paths, priority, conditions) with
/// markdown body content that is injected into the AI agent's context
/// when the rule matches the current file and context.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    /// Comma-separated glob pattern(s) matching target file paths.
    /// When `None`, the rule is global and applies to all files.
    pub paths: Option<String>,
    /// Lower numbers = higher priority. Rules are sorted ascending.
    pub priority: i32,
    /// Human-readable description of the rule.
    pub description: String,
    /// Optional condition map filtering by context (e.g. `mode: "ai-editing"`).
    #[serde(default)]
    pub when: Option<HashMap<String, String>>,
    /// The markdown body content injected into the AI context.
    #[serde(skip)]
    pub content: String,
    /// Path to the source file this rule was loaded from.
    #[serde(skip)]
    pub source_file: PathBuf,
}

/// Contextual conditions used to filter rules by `when` clauses.
///
/// Only rules whose `when` conditions match the current context are
/// returned by [`RuleSet::get_applicable_rules`]. All fields are
/// optional — a `None` field never constrains the match.
#[derive(Debug, Clone, Default)]
pub struct RuleContext {
    /// Current editor mode (e.g. `"ai-editing"`, `"export"`).
    pub mode: Option<String>,
    /// What the user is editing (e.g. `"timeline"`, `"code"`).
    pub editing: Option<String>,
    /// The current task type (e.g. `"refactor"`, `"fix"`).
    pub task: Option<String>,
    /// The UI surface being used (e.g. `"web"`, `"native"`).
    pub surface: Option<String>,
}

/// A collection of [`Rule`]s loaded from a directory, sorted by priority.
///
/// Provides methods to query rules by file path glob patterns and
/// contextual conditions. Rules without `paths` or `when` fields
/// are treated as global and always match.
#[derive(Debug, Clone, Default)]
pub struct RuleSet {
    rules: Vec<Rule>,
}

impl RuleSet {
    /// Create an empty rule set.
    pub fn new() -> Self {
        Self { rules: Vec::new() }
    }

    /// Load all `.md` rule files from a directory, sorted by priority.
    ///
    /// Each file must have YAML frontmatter between `---` markers.
    /// Files without frontmatter are skipped with a warning.
    /// Returns an empty set if the directory does not exist.
    pub fn load_from_directory<P: AsRef<Path>>(dir: P) -> Result<Self, String> {
        let dir = dir.as_ref();
        if !dir.is_dir() {
            return Ok(Self::new());
        }

        let mut rules = Vec::new();

        let entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read rules directory '{}': {}", dir.display(), e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) != Some("md") {
                continue;
            }

            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read rule file '{}': {}", path.display(), e))?;

            match parse_rule_file(&content, &path) {
                Ok(rule) => rules.push(rule),
                Err(e) => {
                    eprintln!("Warning: skipping rule file '{}': {}", path.display(), e);
                }
            }
        }

        rules.sort_by_key(|r| r.priority);

        Ok(Self { rules })
    }

    /// Return rules that have no path filter and no `when` conditions.
    ///
    /// These are applied to every file regardless of context.
    pub fn get_global_rules(&self) -> Vec<&Rule> {
        self.rules
            .iter()
            .filter(|r| r.paths.is_none() && r.when.is_none())
            .collect()
    }

    /// Return rules matching the given file path and optional context.
    ///
    /// A rule matches when its `paths` glob matches `file_path` (or `paths`
    /// is `None`) AND its `when` conditions match the context (or `when`
    /// is `None`). Rules are returned in priority order (lowest first).
    pub fn get_applicable_rules(
        &self,
        file_path: &str,
        context: Option<&RuleContext>,
    ) -> Vec<&Rule> {
        let default_ctx = RuleContext::default();
        let ctx = context.unwrap_or(&default_ctx);

        self.rules
            .iter()
            .filter(|rule| {
                let path_match = match &rule.paths {
                    None => true,
                    Some(patterns) => patterns.split(',').any(|pat| {
                        let pat = pat.trim();
                        match glob::Pattern::new(pat) {
                            Ok(g) => g.matches(file_path),
                            Err(_) => false,
                        }
                    }),
                };

                let when_match = match &rule.when {
                    None => true,
                    Some(conditions) => conditions.iter().any(|(key, val)| match key.as_str() {
                        "mode" => ctx.mode.as_deref() == Some(val.as_str()),
                        "editing" => ctx.editing.as_deref() == Some(val.as_str()),
                        "task" => ctx.task.as_deref() == Some(val.as_str()),
                        "surface" => ctx.surface.as_deref() == Some(val.as_str()),
                        _ => true,
                    }),
                };

                path_match && when_match
            })
            .collect()
    }

    /// Add a rule to the set and re-sort by priority.
    pub fn add_rule(&mut self, rule: Rule) {
        self.rules.push(rule);
        self.rules.sort_by_key(|r| r.priority);
    }

    /// Return the number of rules in the set.
    pub fn len(&self) -> usize {
        self.rules.len()
    }

    /// Return `true` if the rule set contains no rules.
    pub fn is_empty(&self) -> bool {
        self.rules.is_empty()
    }
}

fn parse_rule_file(content: &str, source: &Path) -> Result<Rule, String> {
    let mut lines_iter = content.lines().enumerate();
    let mut frontmatter_lines = String::new();
    let mut in_frontmatter;
    let mut body_start = 0;

    // Check for opening --- on first line
    match lines_iter.next() {
        Some((_, line)) if line.trim() == "---" => {
            in_frontmatter = true;
        }
        _ => {
            return Err("No frontmatter found (expected YAML between --- markers)".into());
        }
    }

    for (i, line) in lines_iter.by_ref() {
        if line.trim() == "---" {
            in_frontmatter = false;
            body_start = i + 1;
            break;
        }
        if in_frontmatter {
            frontmatter_lines.push_str(line);
            frontmatter_lines.push('\n');
        }
    }

    if in_frontmatter {
        return Err("Unclosed frontmatter (missing closing ---)".into());
    }

    if frontmatter_lines.trim().is_empty() {
        return Err("Empty frontmatter".into());
    }

    let mut rule: Rule = serde_yaml::from_str(&frontmatter_lines)
        .map_err(|e| format!("Invalid YAML frontmatter: {}", e))?;

    let body: String = content
        .lines()
        .skip(body_start)
        .collect::<Vec<&str>>()
        .join("\n");

    rule.content = body.trim().to_string();
    rule.source_file = source.to_path_buf();

    Ok(rule)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn setup_rules_dir(rules: &[(&str, &str)]) -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        for (filename, content) in rules {
            let path = dir.path().join(filename);
            let mut f = fs::File::create(&path).unwrap();
            f.write_all(content.as_bytes()).unwrap();
        }
        dir
    }

    #[test]
    fn test_parse_single_rule() {
        let content = "---\npaths: \"rust/core/src/**\"\npriority: 10\ndescription: \"Core rules\"\n---\n\n# Core Rules\nUse tracing for logging.";
        let rule = parse_rule_file(content, Path::new("test.md")).unwrap();
        assert_eq!(rule.paths.as_deref(), Some("rust/core/src/**"));
        assert_eq!(rule.priority, 10);
        assert_eq!(rule.description, "Core rules");
        assert!(rule.content.contains("Use tracing"));
    }

    #[test]
    fn test_parse_rule_with_when() {
        let content = "---\npaths: \"**\"\npriority: 5\ndescription: \"AI editing\"\nwhen:\n  mode: \"ai-editing\"\n---\n\n# AI Rules\nPrefer non-destructive edits.";
        let rule = parse_rule_file(content, Path::new("ai.md")).unwrap();
        let when = rule.when.unwrap();
        assert_eq!(when.get("mode").map(|s| s.as_str()), Some("ai-editing"));
    }

    #[test]
    fn test_no_frontmatter_fails() {
        let content = "# Just markdown, no frontmatter";
        assert!(parse_rule_file(content, Path::new("nofm.md")).is_err());
    }

    #[test]
    fn test_load_empty_directory() {
        let dir = setup_rules_dir(&[]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();
        assert!(ruleset.is_empty());
    }

    #[test]
    fn test_global_rules() {
        let dir = setup_rules_dir(&[(
            "global.md",
            "---\npriority: 1\ndescription: \"Global rule\"\n---\n\nAlways apply.",
        )]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();
        let globals = ruleset.get_global_rules();
        assert_eq!(globals.len(), 1);
    }

    #[test]
    fn test_path_matching() {
        let dir = setup_rules_dir(&[
            (
                "web.md",
                "---\npaths: \"apps/web/src/**\"\npriority: 10\ndescription: \"Web rules\"\n---\n\nUse Tailwind.",
            ),
            (
                "rust.md",
                "---\npaths: \"rust/**\"\npriority: 10\ndescription: \"Rust rules\"\n---\n\nUse tracing.",
            ),
        ]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();

        let web_rules = ruleset.get_applicable_rules("apps/web/src/components/Button.tsx", None);
        assert_eq!(web_rules.len(), 1);
        assert_eq!(web_rules[0].description, "Web rules");

        let rust_rules = ruleset.get_applicable_rules("rust/core/src/engine.rs", None);
        assert_eq!(rust_rules.len(), 1);
        assert_eq!(rust_rules[0].description, "Rust rules");

        let no_match = ruleset.get_applicable_rules("scripts/deploy.sh", None);
        assert!(no_match.is_empty());
    }

    #[test]
    fn test_when_condition() {
        let dir = setup_rules_dir(&[(
            "ai.md",
            "---\npaths: \"**\"\npriority: 5\ndescription: \"AI rules\"\nwhen:\n  mode: \"ai-editing\"\n---\n\nAI editing rules.",
        )]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();

        let ctx = RuleContext {
            mode: Some("ai-editing".into()),
            ..Default::default()
        };
        let applicable = ruleset.get_applicable_rules("any/file.txt", Some(&ctx));
        assert_eq!(applicable.len(), 1);

        let no_ctx = ruleset.get_applicable_rules("any/file.txt", None);
        assert!(no_ctx.is_empty());
    }

    #[test]
    fn test_when_no_match() {
        let dir = setup_rules_dir(&[(
            "export.md",
            "---\npaths: \"**\"\npriority: 5\ndescription: \"Export rules\"\nwhen:\n  mode: \"export\"\n---\n\nExport rules.",
        )]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();

        let ctx = RuleContext {
            mode: Some("ai-editing".into()),
            ..Default::default()
        };
        let applicable = ruleset.get_applicable_rules("any/file.txt", Some(&ctx));
        assert!(applicable.is_empty());
    }

    #[test]
    fn test_priority_ordering() {
        let dir = setup_rules_dir(&[
            (
                "high.md",
                "---\npaths: \"rust/**\"\npriority: 1\ndescription: \"High priority\"\n---\n\nHigh.",
            ),
            (
                "low.md",
                "---\npaths: \"rust/**\"\npriority: 99\ndescription: \"Low priority\"\n---\n\nLow.",
            ),
        ]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();
        let applicable = ruleset.get_applicable_rules("rust/core/src/main.rs", None);
        assert_eq!(applicable.len(), 2);
        assert_eq!(applicable[0].priority, 1);
        assert_eq!(applicable[1].priority, 99);
    }

    #[test]
    fn test_multiple_path_patterns() {
        let dir = setup_rules_dir(&[(
            "multipath.md",
            "---\npaths: \"apps/web/**, rust/core/src/**\"\npriority: 10\ndescription: \"Multi-path rules\"\n---\n\nMulti-path.",
        )]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();

        assert_eq!(
            ruleset
                .get_applicable_rules("apps/web/src/App.tsx", None)
                .len(),
            1
        );
        assert_eq!(
            ruleset
                .get_applicable_rules("rust/core/src/engine.rs", None)
                .len(),
            1
        );
        assert!(
            ruleset
                .get_applicable_rules("services/api/main.py", None)
                .is_empty()
        );
    }

    #[test]
    fn test_glob_patterns() {
        let dir = setup_rules_dir(&[(
            "tsx.md",
            "---\npaths: \"*.tsx\"\npriority: 10\ndescription: \"TSX rules\"\n---\n\nTSX rules.",
        )]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();

        assert_eq!(
            ruleset
                .get_applicable_rules("src/components/Button.tsx", None)
                .len(),
            1
        );
        assert!(
            ruleset
                .get_applicable_rules("src/utils/helpers.ts", None)
                .is_empty()
        );
    }

    #[test]
    fn test_rule_without_paths_is_global() {
        let dir = setup_rules_dir(&[(
            "nopath.md",
            "---\npriority: 1\ndescription: \"No path rule\"\n---\n\nAlways loaded.",
        )]);
        let ruleset = RuleSet::load_from_directory(dir.path()).unwrap();
        let globals = ruleset.get_global_rules();
        assert_eq!(globals.len(), 1);
        let applicable = ruleset.get_applicable_rules("any/file.rs", None);
        assert_eq!(applicable.len(), 1);
    }
}

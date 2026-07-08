//! Scheduled Routines Engine — cron-based background editing tasks.
//!
//! Scheduled routines — lets users schedule recurring editing tasks.
//! recurring editing prompts (e.g. "auto-export latest cut every night at
//! 2am") that run through the autonomous editor automatically.
//!
//! Persistence: All routines are saved to `~/.lazynext/routines.json`.

use crate::NLEState;
use crate::autonomous::{AutonomousEditor, VideoIntent};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

// ── Types ──────────────────────────────────────────────────────────────────

/// A scheduled editing routine with a cron expression and autonomous prompt.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Routine {
    /// Unique routine identifier.
    pub id: String,
    /// Human-readable routine name.
    pub name: String,
    /// Cron expression controlling when the routine runs.
    pub cron_expression: String,
    /// Autonomous editor prompt to execute.
    pub prompt: String,
    /// Whether the routine is currently active.
    pub enabled: bool,
    /// ISO 8601 timestamp of the last execution, if any.
    pub last_run: Option<String>,
    /// ISO 8601 timestamp of when the routine was created.
    pub created_at: String,
}

/// Parsed cron expression → five fields.
#[derive(Debug, Clone)]
pub struct CronSchedule {
    /// Minute field (0–59).
    pub minute: CronField,
    /// Hour field (0–23).
    pub hour: CronField,
    /// Day-of-month field (1–31).
    pub day_of_month: CronField,
    /// Month field (1–12).
    pub month: CronField,
    /// Day-of-week field (0–6, Sunday = 0).
    pub day_of_week: CronField,
}

/// A single field in a cron expression, supporting wildcards, lists, ranges, and steps.
#[derive(Debug, Clone, PartialEq)]
pub enum CronField {
    /// Matches every value.
    Any,
    /// Matches exactly this value.
    Single(u32),
    /// Matches any value in the list.
    List(Vec<u32>),
    /// Matches any value in the inclusive range.
    Range(u32, u32),
    /// Matches values starting from a base with a step interval.
    Step(u32, u32), // start, step (e.g. */5)
}

// ── Scheduler ──────────────────────────────────────────────────────────────

/// Manages scheduled routines, persisting them to disk and executing them on cron ticks.
pub struct RoutineScheduler {
    /// Registered routines keyed by routine ID.
    routines: HashMap<String, Routine>,
    /// Path to the persisted `routines.json` file.
    storage_path: PathBuf,
    /// Shared NLE state the routines operate on.
    nle: Arc<Mutex<NLEState>>,
    /// Autonomous editor used to execute routine prompts.
    editor: Arc<AutonomousEditor>,
}

impl RoutineScheduler {
    /// Creates a new scheduler, loading any persisted routines from disk.
    pub fn new(nle: Arc<Mutex<NLEState>>, editor: Arc<AutonomousEditor>) -> Self {
        let home = dirs_fallback();
        let dir = home.join(".lazynext");
        let _ = std::fs::create_dir_all(&dir);
        let storage_path = dir.join("routines.json");

        let routines = Self::load_from_disk(&storage_path);

        Self {
            routines,
            storage_path,
            nle,
            editor,
        }
    }

    // ── Persistence ────────────────────────────────────────────────────

    // Loads persisted routines from disk, backing up any corrupted file.
    fn load_from_disk(path: &PathBuf) -> HashMap<String, Routine> {
        match std::fs::read_to_string(path) {
            Ok(contents) => {
                match serde_json::from_str::<Vec<Routine>>(&contents) {
                    Ok(list) => list.into_iter().map(|r| (r.id.clone(), r)).collect(),
                    Err(e) => {
                        eprintln!(
                            "[RoutineScheduler] Failed to parse routines file '{}': {} — routines reset to empty. Previous routines file backed up.",
                            path.display(),
                            e
                        );
                        // Attempt to back up corrupted file
                        let backup = format!("{}.corrupted.", path.display());
                        let _ = std::fs::write(&backup, &contents);
                        HashMap::new()
                    }
                }
            }
            Err(_) => HashMap::new(),
        }
    }

    // Serializes all routines to disk as pretty-printed JSON.
    fn save_to_disk(&self) {
        let list: Vec<&Routine> = self.routines.values().collect();
        if let Ok(json) = serde_json::to_string_pretty(&list) {
            let _ = std::fs::write(&self.storage_path, json);
        }
    }

    // ── Public API ─────────────────────────────────────────────────────

    /// Registers a new routine and saves to disk.
    pub fn schedule_routine(&mut self, routine: Routine) {
        self.routines.insert(routine.id.clone(), routine);
        self.save_to_disk();
    }

    /// Removes a routine by ID; returns true if it existed.
    pub fn cancel_routine(&mut self, id: &str) -> bool {
        let removed = self.routines.remove(id).is_some();
        if removed {
            self.save_to_disk();
        }
        removed
    }

    /// Returns all routines sorted by creation time.
    pub fn list_routines(&self) -> Vec<Routine> {
        let mut list: Vec<Routine> = self.routines.values().cloned().collect();
        list.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        list
    }

    /// Returns the routine with the given ID, if it exists.
    pub fn get_routine(&self, id: &str) -> Option<Routine> {
        self.routines.get(id).cloned()
    }

    /// Manually trigger a routine — runs its prompt through the
    /// autonomous editor immediately.
    pub async fn execute_routine(&mut self, id: &str) -> Result<String, String> {
        let routine = self
            .routines
            .get(id)
            .cloned()
            .ok_or_else(|| format!("Routine {id} not found"))?;

        if !routine.enabled {
            return Err(format!("Routine {id} is disabled"));
        }

        let intent = VideoIntent {
            prompt: routine.prompt.clone(),
            require_plan_approval: false,
            source_files: vec![],
            llm_provider: None,
        };

        let result = {
            let mut nle = self.nle.lock().await;
            self.editor.process_intent_with_llm(&mut nle, &intent).await
        };

        // Update last_run timestamp
        if let Some(r) = self.routines.get_mut(id) {
            r.last_run = Some(now_iso());
        }
        self.save_to_disk();

        result
    }

    /// Spawns a background task that ticks every 30 seconds, checks
    /// all enabled routines against their cron expression, and runs
    /// any that are due.
    pub fn start_scheduler(mut self) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;
                let due_ids: Vec<String> = self
                    .routines
                    .values()
                    .filter(|r| r.enabled && Self::is_due(&r.cron_expression))
                    .map(|r| r.id.clone())
                    .collect();

                for id in due_ids {
                    if let Err(e) = self.execute_routine(&id).await {
                        eprintln!("[RoutineScheduler] Routine {id} failed: {e}");
                    }
                }
            }
        });
    }

    // ── Cron Helpers ───────────────────────────────────────────────────

    /// Parses a five-field cron expression into a `CronSchedule`.
    pub fn parse_cron(expr: &str) -> Result<CronSchedule, String> {
        let parts: Vec<&str> = expr.split_whitespace().collect();
        if parts.len() != 5 {
            return Err(format!(
                "Cron expression must have 5 fields, got {}",
                parts.len()
            ));
        }

        Ok(CronSchedule {
            minute: parse_field(parts[0], 0, 59)?,
            hour: parse_field(parts[1], 0, 23)?,
            day_of_month: parse_field(parts[2], 1, 31)?,
            month: parse_field(parts[3], 1, 12)?,
            day_of_week: parse_field(parts[4], 0, 6)?,
        })
    }

    /// Quick check: does the given cron expression match "right now"?
    /// Uses the system clock.
    pub fn is_due(expr: &str) -> bool {
        let schedule = match Self::parse_cron(expr) {
            Ok(s) => s,
            Err(_) => return false,
        };

        let now = now_components();
        field_matches(&schedule.minute, now.minute)
            && field_matches(&schedule.hour, now.hour)
            && field_matches(&schedule.day_of_month, now.day)
            && field_matches(&schedule.month, now.month)
            && field_matches(&schedule.day_of_week, now.weekday)
    }
}

// ── Cron Field Parsing ─────────────────────────────────────────────────────

// Parses a single cron field, validating it against the [min, max] range.
fn parse_field(s: &str, min: u32, max: u32) -> Result<CronField, String> {
    if s == "*" {
        return Ok(CronField::Any);
    }

    // Step values: */5 or 1/5
    if let Some((base, step_str)) = s.split_once('/') {
        let step: u32 = step_str
            .parse()
            .map_err(|_| format!("Invalid step: {step_str}"))?;
        if step == 0 {
            return Err(format!("Step value must not be zero: {s}"));
        }
        // Validate step against range
        if step > max.saturating_sub(min) + 1 {
            return Err(format!("Step {step} exceeds range [{min},{max}]"));
        }
        let start: u32 = if base == "*" {
            min
        } else {
            let parsed: u32 = base.parse().map_err(|_| format!("Invalid base: {base}"))?;
            if parsed < min || parsed > max {
                return Err(format!("Step base {parsed} out of bounds [{min},{max}]"));
            }
            parsed
        };
        return Ok(CronField::Step(start, step));
    }

    // Range: 1-5
    if let Some((low, high)) = s.split_once('-') {
        let l: u32 = low
            .parse()
            .map_err(|_| format!("Invalid range start: {low}"))?;
        let h: u32 = high
            .parse()
            .map_err(|_| format!("Invalid range end: {high}"))?;
        if l < min || h > max || l > h {
            return Err(format!("Range {l}-{h} out of bounds [{min},{max}]"));
        }
        return Ok(CronField::Range(l, h));
    }

    // Comma-separated list: 1,3,5
    if s.contains(',') {
        let vals: Result<Vec<u32>, _> = s.split(',').map(|v| v.parse()).collect();
        let vals = vals.map_err(|_| format!("Invalid list: {s}"))?;
        for v in &vals {
            if *v < min || *v > max {
                return Err(format!("Value {v} out of bounds [{min},{max}]"));
            }
        }
        return Ok(CronField::List(vals));
    }

    // Single value
    let v: u32 = s.parse().map_err(|_| format!("Invalid value: {s}"))?;
    if v < min || v > max {
        return Err(format!("Value {v} out of bounds [{min},{max}]"));
    }
    Ok(CronField::Single(v))
}

// Returns whether a cron field matches the given current value.
fn field_matches(field: &CronField, current: u32) -> bool {
    match field {
        CronField::Any => true,
        CronField::Single(v) => *v == current,
        CronField::List(vals) => vals.contains(&current),
        CronField::Range(l, h) => current >= *l && current <= *h,
        CronField::Step(start, step) => {
            if current >= *start {
                (current - start).is_multiple_of(*step)
            } else {
                false
            }
        }
    }
}

// ── Time Helpers ───────────────────────────────────────────────────────────

#[derive(Debug)]
struct TimeComponents {
    /// Minute of the hour (0–59).
    minute: u32,
    /// Hour of the day (0–23).
    hour: u32,
    /// Day of the month (1–31).
    day: u32,
    /// Month of the year (1–12).
    month: u32,
    /// Day of the week (0 = Sunday).
    weekday: u32, // 0 = Sunday
}

// Computes the current time broken into cron-matchable components.
fn now_components() -> TimeComponents {
    // Use chrono if available; fall back to a simple epoch-based calc
    #[allow(unused_imports)]
    use std::time::SystemTime;

    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();

    // Simple Gregorian calendar math (good enough for cron matching)
    let days_since_epoch = secs / 86400;
    let secs_in_day = secs % 86400;

    let minute = ((secs_in_day % 3600) / 60) as u32;
    let hour = (secs_in_day / 3600) as u32;
    let weekday = ((days_since_epoch + 4) % 7) as u32; // 1970-01-01 was Thursday

    // Approximate month/day (simplified — accurate enough for cron)
    let (year_approx, day_of_year) = approx_year_and_doy(days_since_epoch);
    let (month, day) = doy_to_month_day(day_of_year, is_leap(year_approx));

    TimeComponents {
        minute,
        hour,
        day: day as u32,
        month: month as u32,
        weekday,
    }
}

// Converts days-since-epoch into a (year, 1-based day-of-year) pair.
fn approx_year_and_doy(days: u64) -> (u64, u64) {
    let mut year = 1970u64;
    let mut remaining = days as i64;
    while remaining >= days_in_year(year) {
        remaining -= days_in_year(year);
        year += 1;
    }
    (year, remaining as u64 + 1) // day-of-year is 1-based
}

// Returns the number of days in the given year.
fn days_in_year(y: u64) -> i64 {
    if is_leap(y) { 366 } else { 365 }
}

// Returns whether the given year is a leap year.
fn is_leap(y: u64) -> bool {
    (y.is_multiple_of(4) && !y.is_multiple_of(100)) || y.is_multiple_of(400)
}

// Converts a day-of-year into a (month, day) pair.
fn doy_to_month_day(doy: u64, leap: bool) -> (u64, u64) {
    let days_per_month = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    let mut d = doy;
    for (i, &m_days) in days_per_month.iter().enumerate() {
        if d <= m_days as u64 {
            return (i as u64 + 1, d);
        }
        d -= m_days as u64;
    }
    (12, 31)
}

// Returns the current UTC time as an ISO 8601 string.
fn now_iso() -> String {
    #[allow(unused_imports)]
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let tc = now_components();
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        approx_year_and_doy(secs / 86400).0,
        tc.month,
        tc.day,
        tc.hour,
        tc.minute,
        secs % 60
    )
}

// Resolves the user's home directory, falling back to the current directory.
fn dirs_fallback() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_cron_any() {
        let s = RoutineScheduler::parse_cron("* * * * *").unwrap();
        assert_eq!(s.minute, CronField::Any);
        assert_eq!(s.hour, CronField::Any);
    }

    #[test]
    fn test_parse_cron_specific() {
        let s = RoutineScheduler::parse_cron("30 2 * * 1").unwrap();
        assert_eq!(s.minute, CronField::Single(30));
        assert_eq!(s.hour, CronField::Single(2));
        assert_eq!(s.day_of_week, CronField::Single(1));
    }

    #[test]
    fn test_parse_cron_range() {
        let s = RoutineScheduler::parse_cron("0-30 9-17 * * *").unwrap();
        assert_eq!(s.minute, CronField::Range(0, 30));
        assert_eq!(s.hour, CronField::Range(9, 17));
    }

    #[test]
    fn test_parse_cron_list() {
        let s = RoutineScheduler::parse_cron("0,15,30,45 * * * *").unwrap();
        assert_eq!(s.minute, CronField::List(vec![0, 15, 30, 45]));
    }

    #[test]
    fn test_parse_cron_step() {
        let s = RoutineScheduler::parse_cron("*/5 * * * *").unwrap();
        assert_eq!(s.minute, CronField::Step(0, 5));
    }

    #[test]
    fn test_field_matches_any() {
        assert!(field_matches(&CronField::Any, 42));
    }

    #[test]
    fn test_field_matches_single() {
        assert!(field_matches(&CronField::Single(5), 5));
        assert!(!field_matches(&CronField::Single(5), 6));
    }

    #[test]
    fn test_field_matches_range() {
        assert!(field_matches(&CronField::Range(1, 5), 3));
        assert!(!field_matches(&CronField::Range(1, 5), 7));
    }

    #[test]
    fn test_field_matches_list() {
        assert!(field_matches(&CronField::List(vec![0, 15, 30]), 15));
        assert!(!field_matches(&CronField::List(vec![0, 15, 30]), 20));
    }

    #[test]
    fn test_field_matches_step() {
        assert!(field_matches(&CronField::Step(0, 5), 10));
        assert!(!field_matches(&CronField::Step(0, 5), 7));
        assert!(field_matches(&CronField::Step(2, 5), 7));
    }
}

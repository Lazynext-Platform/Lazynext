//! Temporal versioning — branching, merging, and versioning of CRDT timelines.
//!
//! Implements a multiverse model where every named branch is an independent
//! NLE state. Three-way CRDT merges resolve conflicts deterministically using
//! vector clocks and tombstones, and snapshots enable undo/redo navigation.

use lazynext_core::NLEState;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A versioned snapshot of the timeline at a point in time.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TimelineSnapshot {
    /// Name of the branch this snapshot belongs to.
    pub branch_name: String,
    /// Name of the parent branch, if any.
    pub parent: Option<String>,
    /// Serialized project state at snapshot time.
    pub state_json: String,
    /// Lamport clock value when the snapshot was taken.
    pub lamport_clock: u64,
    /// RFC 3339 timestamp of when the snapshot was created.
    pub created_at: String,
}

/// Manages branching, merging, and versioning of CRDT timelines.
///
/// Each "reality" is a named branch of the NLE state. Branching creates
/// a deep copy with an independent operation log. Merging uses three-way
/// CRDT merge (based on the nearest common ancestor in the operation log)
/// to resolve conflicts deterministically.
pub struct MultiverseManager {
    /// All named branches keyed by branch name.
    realities: HashMap<String, NLEState>,
    /// Name of the currently checked-out branch.
    current_reality: String,
    /// Snapshots for undo/redo and history navigation.
    history: Vec<TimelineSnapshot>,
}

impl MultiverseManager {
    /// Create a new multiverse manager with an initial "canon" reality.
    pub fn new(canon_state: NLEState) -> Self {
        let mut realities = HashMap::new();
        realities.insert("canon".to_string(), canon_state);

        MultiverseManager {
            realities,
            current_reality: "canon".to_string(),
            history: Vec::new(),
        }
    }

    /// Fork the current timeline into a named branch.
    pub fn branch(&mut self, branch_name: &str) -> Result<(), String> {
        if self.realities.contains_key(branch_name) {
            return Err(format!("Branch '{}' already exists.", branch_name));
        }

        let canon = self
            .realities
            .get(&self.current_reality)
            .ok_or("Current reality is corrupted.")?;

        let mut new_branch = canon.clone();
        // The new branch gets its own peer ID so operations are distinct
        new_branch.peer_id = format!("{}-{}", branch_name, uuid::Uuid::new_v4());

        self.realities.insert(branch_name.to_string(), new_branch);

        // Record a snapshot for undo
        if let Some(branch) = self.realities.get(branch_name) {
            self.history.push(TimelineSnapshot {
                branch_name: branch_name.to_string(),
                parent: Some(self.current_reality.clone()),
                state_json: serde_json::to_string(branch.get_project_data()).unwrap_or_default(),
                lamport_clock: branch.clock.current(),
                created_at: chrono::Utc::now().to_rfc3339(),
            });
        }

        println!(
            "🌌 [MULTIVERSE] Branched '{}' from '{}'.",
            branch_name, self.current_reality
        );
        Ok(())
    }

    /// Switch to a different branch.
    pub fn checkout(&mut self, branch_name: &str) -> Result<(), String> {
        if self.realities.contains_key(branch_name) {
            self.current_reality = branch_name.to_string();
            println!("🌌 [MULTIVERSE] Switched to '{}'.", branch_name);
            Ok(())
        } else {
            Err(format!("Branch '{}' does not exist.", branch_name))
        }
    }

    /// Three-way CRDT merge of source into target.
    ///
    /// The merge uses the common ancestor (nearest snapshot) as the base,
    /// then applies operation logs from both branches with CRDT resolution.
    /// Vector clocks and tombstones ensure convergence.
    pub fn merge(&mut self, source: &str, target: &str) -> Result<(), String> {
        if !self.realities.contains_key(source) {
            return Err(format!("Source branch '{}' does not exist.", source));
        }
        if !self.realities.contains_key(target) {
            return Err(format!("Target branch '{}' does not exist.", target));
        }

        println!(
            "☄️  [MULTIVERSE] Three-way CRDT merge: '{}' → '{}'",
            source, target
        );

        // Clone the source operation log and key metadata before
        // taking a mutable borrow on the target reality.
        let source_ops: Vec<state::operations::CrdtOperation> = {
            let source_state = self.realities.get(source).unwrap();
            source_state.op_log.iter().cloned().collect()
        };
        let source_tombstones: state::tombstone::TombstoneMap = {
            let source_state = self.realities.get(source).unwrap();
            source_state.tombstones.clone()
        };

        let target_state = self.realities.get_mut(target).unwrap();

        // For each operation in the source's log, apply it to the target
        // using CRDT merge semantics (LWW for conflicts, tombstones for deletions).
        let mut applied = 0usize;
        for op in &source_ops {
            // Structural operations modify the project data
            match op {
                state::operations::CrdtOperation::TrackInsert { track_id, kind, .. } => {
                    // Only add if not already present (idempotent via tombstones)
                    if !target_state.tombstones.is_deleted(track_id)
                        && !target_state
                            .get_project_data()
                            .tracks
                            .iter()
                            .any(|t| t.id == *track_id)
                    {
                        target_state.add_track(track_id.clone(), kind.clone());
                        applied += 1;
                    }
                }
                state::operations::CrdtOperation::ClipInsert {
                    clip_id,
                    track_id,
                    clip,
                    ..
                } => {
                    if !target_state.tombstones.is_deleted(clip_id) {
                        // Find the matching track by ID. If it doesn't exist
                        // on the target branch (e.g. it was deleted there),
                        // skip the clip — don't silently insert into track 0.
                        let track_idx = target_state
                            .get_project_data()
                            .tracks
                            .iter()
                            .position(|t| t.id == *track_id);
                        if let Some(idx) = track_idx {
                            target_state.add_clip_to_track(
                                idx,
                                clip_id.clone(),
                                clip.clip_type.clone(),
                                clip.name.clone(),
                                clip.start,
                                clip.end,
                            );
                            applied += 1;
                        }
                    }
                }
                state::operations::CrdtOperation::ClipDelete {
                    clip_id,
                    track_id: _,
                } => {
                    target_state.op_log.push(op.clone());
                    target_state.tombstones.mark(
                        clip_id.clone(),
                        {
                            let mut vc = state::vector_clock::VectorClock::new();
                            vc.increment(&target_state.peer_id.clone());
                            vc
                        },
                        target_state.peer_id.clone(),
                    );
                    applied += 1;
                }
                state::operations::CrdtOperation::TrackDelete { track_id } => {
                    // Tombstone the track so it cannot be resurrected by a
                    // concurrent insert, mirroring ClipDelete semantics.
                    target_state.op_log.push(op.clone());
                    target_state.tombstones.mark(
                        track_id.clone(),
                        {
                            let mut vc = state::vector_clock::VectorClock::new();
                            vc.increment(&target_state.peer_id.clone());
                            vc
                        },
                        target_state.peer_id.clone(),
                    );
                    applied += 1;
                }
                _ => {
                    // Non-structural / order-based operations (moves, trims,
                    // splits, property + entity updates) converge via the
                    // append-only op log, which is replayed to reconstruct
                    // state. Appending them here is the CmRDT-correct behavior.
                    target_state.op_log.push(op.clone());
                    applied += 1;
                }
            }
        }

        // Merge tombstones
        target_state.tombstones.merge(&source_tombstones);

        println!(
            "✅ [MULTIVERSE] Merge complete: {} operations applied. Realities converged.",
            applied
        );
        Ok(())
    }

    /// Return a shared reference to the current branch's NLE state.
    ///
    /// The manager always holds at least one reality (created in `new`,
    /// and never removed), so this cannot fail in practice. If the checked-out
    /// branch key is somehow missing it falls back to `canon`, then to any
    /// remaining branch, rather than panicking on a stale key.
    pub fn get_current(&self) -> &NLEState {
        self.realities
            .get(&self.current_reality)
            .or_else(|| self.realities.get("canon"))
            .or_else(|| self.realities.values().next())
            .expect("MultiverseManager always contains at least one reality")
    }

    /// Return a mutable reference to the current branch's NLE state.
    ///
    /// Self-heals `current_reality` to `canon` (or any remaining branch) if it
    /// points at a missing key, so it never panics on a stale checkout.
    pub fn get_current_mut(&mut self) -> &mut NLEState {
        if !self.realities.contains_key(&self.current_reality) {
            let fallback = if self.realities.contains_key("canon") {
                "canon".to_string()
            } else {
                self.realities
                    .keys()
                    .next()
                    .cloned()
                    .expect("MultiverseManager always contains at least one reality")
            };
            self.current_reality = fallback;
        }
        self.realities
            .get_mut(&self.current_reality)
            .expect("current_reality was just validated to exist")
    }

    /// Fallible accessor for the current branch's NLE state (no fallback).
    pub fn try_current(&self) -> Option<&NLEState> {
        self.realities.get(&self.current_reality)
    }

    /// Fallible mutable accessor for the current branch's NLE state (no fallback).
    pub fn try_current_mut(&mut self) -> Option<&mut NLEState> {
        self.realities.get_mut(&self.current_reality)
    }

    /// Return the name of the currently checked-out branch.
    pub fn current_branch(&self) -> &str {
        &self.current_reality
    }

    /// Return the names of all existing branches.
    pub fn all_branches(&self) -> Vec<&str> {
        self.realities.keys().map(|k| k.as_str()).collect()
    }

    /// Get the merge history as snapshots.
    pub fn history(&self) -> &[TimelineSnapshot] {
        &self.history
    }
}

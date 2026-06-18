use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::vector_clock::VectorClock;

/// Records a deleted entity so peers don't resurrect it during merge.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TombstoneEntry {
    /// The vector clock at the time of deletion.
    pub deleted_at: VectorClock,
    /// Which peer requested the deletion.
    pub deleted_by: String,
}

/// A map of tombstones for GC-safe deletion tracking.
///
/// When an entity is deleted in a CRDT, we can't simply remove it —
/// a concurrent operation from another peer could resurrect it.
/// Tombstones mark entities as deleted so they stay deleted after merge.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TombstoneMap {
    inner: HashMap<String, TombstoneEntry>,
}

impl TombstoneMap {
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }

    /// Record that `id` was deleted at the given vector clock.
    pub fn mark(&mut self, id: String, clock: VectorClock, deleted_by: String) {
        self.inner.insert(
            id,
            TombstoneEntry {
                deleted_at: clock,
                deleted_by,
            },
        );
    }

    /// Check if an entity has been tombstoned (deleted).
    pub fn is_deleted(&self, id: &str) -> bool {
        self.inner.contains_key(id)
    }

    /// Returns true if this tombstone is safe to garbage-collect.
    ///
    /// A tombstone is safe to GC when every peer's clock in `horizon`
    /// has passed the deletion point, meaning no concurrent operations
    /// from before the deletion can arrive.
    pub fn should_gc(&self, id: &str, horizon: &VectorClock) -> bool {
        match self.inner.get(id) {
            Some(entry) => entry.deleted_at.happens_before(horizon),
            None => false,
        }
    }

    /// Remove all tombstones that are safe to GC given the current horizon.
    /// Returns the number of entries removed.
    pub fn gc(&mut self, horizon: &VectorClock) -> usize {
        let before = self.inner.len();
        self.inner.retain(|id, _| !self.should_gc(id, horizon));
        before - self.inner.len()
    }

    pub fn len(&self) -> usize {
        self.inner.len()
    }

    pub fn is_empty(&self) -> bool {
        self.inner.is_empty()
    }

    /// Merge tombstones from another map (union — once deleted, always deleted).
    pub fn merge(&mut self, other: &TombstoneMap) {
        for (id, entry) in &other.inner {
            self.inner.entry(id.clone()).or_insert_with(|| entry.clone());
        }
    }
}

impl Default for TombstoneMap {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vector_clock::VectorClock;

    #[test]
    fn test_mark_and_check() {
        let mut tm = TombstoneMap::new();
        let mut clock = VectorClock::new();
        clock.increment(&"peer-a".into());

        tm.mark("clip-1".into(), clock, "peer-a".into());
        assert!(tm.is_deleted("clip-1"));
        assert!(!tm.is_deleted("clip-2"));
    }

    #[test]
    fn test_gc_safety() {
        let mut tm = TombstoneMap::new();
        let mut del_clock = VectorClock::new();
        del_clock.increment(&"peer-a".into()); // del_clock: {a:1}
        tm.mark("clip-1".into(), del_clock.clone(), "peer-a".into());

        // Horizon at {a:0} — hasn't passed deletion yet
        let mut horizon = VectorClock::new();
        assert!(!tm.should_gc("clip-1", &horizon));

        // Horizon at {a:2} — all peers past deletion
        horizon.increment(&"peer-a".into());
        horizon.increment(&"peer-a".into()); // {a:2}
        assert!(tm.should_gc("clip-1", &horizon));

        let removed = tm.gc(&horizon);
        assert_eq!(removed, 1);
        assert!(tm.is_empty());
    }
}

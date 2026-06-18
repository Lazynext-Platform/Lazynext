use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Unique identifier for a peer in the CRDT network.
pub type PeerId = String;

/// A vector clock that tracks logical time per peer for causal ordering.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct VectorClock {
    inner: HashMap<PeerId, u64>,
}

impl VectorClock {
    pub fn new() -> Self {
        Self {
            inner: HashMap::new(),
        }
    }

    /// Increment the clock entry for `peer`, returning the new value.
    pub fn increment(&mut self, peer: &PeerId) -> u64 {
        let entry = self.inner.entry(peer.clone()).or_insert(0);
        *entry += 1;
        *entry
    }

    /// Element-wise maximum merge with another clock.
    /// After merge, every peer's counter is the max of both clocks.
    pub fn merge(&mut self, other: &VectorClock) {
        for (peer, &count) in &other.inner {
            let entry = self.inner.entry(peer.clone()).or_insert(0);
            *entry = (*entry).max(count);
        }
    }

    /// Get the current clock value for a peer (0 if unknown).
    pub fn get(&self, peer: &PeerId) -> u64 {
        self.inner.get(peer).copied().unwrap_or(0)
    }

    /// Returns true if this clock happens-before `other`.
    /// Condition: ∀ peer: self[peer] <= other[peer] AND
    ///             ∃ peer: self[peer] < other[peer]
    pub fn happens_before(&self, other: &VectorClock) -> bool {
        let mut strictly_less = false;

        // Check all peers in self
        for (peer, &self_count) in &self.inner {
            let other_count = other.inner.get(peer).copied().unwrap_or(0);
            if self_count > other_count {
                return false;
            }
            if self_count < other_count {
                strictly_less = true;
            }
        }

        // Also check peers only in other (our count is implicitly 0)
        for (peer, &other_count) in &other.inner {
            if !self.inner.contains_key(peer) && other_count > 0 {
                strictly_less = true;
            }
        }

        strictly_less
    }

    /// Returns true if neither clock happens-before the other.
    pub fn concurrent_with(&self, other: &VectorClock) -> bool {
        !self.happens_before(other) && !other.happens_before(self)
    }

    /// Number of peers tracked in this clock.
    pub fn peer_count(&self) -> usize {
        self.inner.len()
    }

    /// Returns a summary string for debugging.
    pub fn summary(&self) -> String {
        let mut entries: Vec<_> = self.inner.iter().collect();
        entries.sort_by_key(|(k, _)| k.clone());
        entries
            .iter()
            .map(|(k, v)| format!("{}:{}", k, v))
            .collect::<Vec<_>>()
            .join(", ")
    }
}

impl Default for VectorClock {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_increment() {
        let mut vc = VectorClock::new();
        assert_eq!(vc.increment(&"A".into()), 1);
        assert_eq!(vc.increment(&"A".into()), 2);
        assert_eq!(vc.increment(&"B".into()), 1);
    }

    #[test]
    fn test_merge() {
        let mut a = VectorClock::new();
        a.increment(&"A".into());
        a.increment(&"A".into());

        let mut b = VectorClock::new();
        b.increment(&"B".into());
        b.increment(&"B".into());
        b.increment(&"B".into());

        a.merge(&b);
        assert_eq!(a.get(&"A".into()), 2);
        assert_eq!(a.get(&"B".into()), 3);
    }

    #[test]
    fn test_happens_before() {
        let mut a = VectorClock::new();
        a.increment(&"A".into()); // A:1

        let mut b = a.clone();
        b.increment(&"A".into()); // A:2

        assert!(a.happens_before(&b));
        assert!(!b.happens_before(&a));
    }

    #[test]
    fn test_concurrent() {
        let mut a = VectorClock::new();
        a.increment(&"A".into());

        let mut b = VectorClock::new();
        b.increment(&"B".into());

        assert!(a.concurrent_with(&b));
        assert!(!a.happens_before(&b));
        assert!(!b.happens_before(&a));
    }

    #[test]
    fn test_equal_clocks() {
        let mut a = VectorClock::new();
        a.increment(&"A".into());
        let b = a.clone();

        assert!(!a.happens_before(&b));
        assert!(!b.happens_before(&a));
        assert!(!a.concurrent_with(&b)); // equal is not concurrent
    }
}

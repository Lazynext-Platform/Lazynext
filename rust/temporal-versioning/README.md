# Temporal Versioning — Timeline Branching & Merging

Provides Git-like branching, checkout, and three-way CRDT merge for Lazynext timelines.

## Concepts

| Concept | Description |
|---------|-------------|
| **Multiverse** | Collection of named timeline branches |
| **Branch** | Independent fork of the timeline state |
| **Checkout** | Switch between branches (replaces active state) |
| **Merge** | Three-way CRDT merge with tombstone-aware conflict resolution |
| **Snapshot** | Immutable record of a branch at a point in time |

## API

```rust
use temporal_versioning::MultiverseManager;

let mut multiverse = MultiverseManager::new(initial_state);

multiverse.branch("feature/edit")?;    // Fork a branch
multiverse.checkout("feature/edit")?;  // Switch to it
multiverse.merge("feature/edit")?;     // Merge back

let history = multiverse.history();    // Full snapshot log
```

## Merge Algorithm

Three-way merge with vector clock conflict resolution:
1. Clone source operation log and tombstones
2. Apply `TrackInsert`, `ClipInsert`, `ClipDelete` operations to target
3. Tombstone-aware idempotency checks (skip deleted entities)
4. Track existence validation (skip clips on deleted tracks)
5. Vector clock increment on deletions

## Status

Production-ready. All tests pass including the explicit regression test for merge-skips-clip-on-missing-track.

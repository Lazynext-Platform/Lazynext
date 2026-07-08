# Architecture Deep-Dive: CRDT Collaboration Model

This document explains how Lazynext achieves conflict-free, real-time
collaborative editing. It is a companion to the high-level crate summary in
[developer-guide.md](../developer-guide.md#rustcratesstate--crdt-state) and
covers the *why* and *how* of the state layer in `rust/crates/state`.

---

## Why CRDTs

Multiple editors (humans, AI agents, and remote peers) can mutate the same
timeline simultaneously. A central lock would serialize edits and add latency;
last-write-wins on the whole document would lose concurrent work. Lazynext
instead models the timeline as a **Conflict-free Replicated Data Type (CRDT)**
so that every replica converges to the same state regardless of the order in
which operations arrive — without a coordinator.

Two complementary strategies are used:

| Strategy | Type | Where | Purpose |
|----------|------|-------|---------|
| State-based merge | CvRDT | `CRDTTimeline::apply_delta` | Full-snapshot reconciliation (e.g. on reconnect) |
| Operation-based merge | CmRDT | `CRDTTimeline::apply_operation` | Low-latency per-edit propagation |

---

## Core primitives (`rust/crates/state`)

### 1. LWW-Register (`crdt.rs`)

The atomic unit of convergence. Each mutable clip property is wrapped in a
`LWWRegister<T>` carrying `(value, timestamp, client_id)`. Merge keeps the
entry with the greater timestamp; ties break deterministically on `client_id`
(lexicographic). Because the tiebreaker is total and deterministic, all
replicas resolve identical conflicts identically.

```
merge(a, b) = a  if a.timestamp > b.timestamp
            = b  if b.timestamp > a.timestamp
            = max_by(client_id)  if timestamps equal
```

### 2. Vector clock (`vector_clock.rs`)

Tracks logical time per peer (`HashMap<PeerId, u64>`) to establish causal
ordering. Used to decide whether two operations are concurrent (neither
happens-before the other) or causally related.

### 3. Tombstones (`tombstone.rs`)

A `TombstoneMap` records deletions with the vector clock at deletion time.
Without tombstones, a concurrent insert from another peer could "resurrect" a
deleted clip after merge. `apply_operation` checks the tombstone map before
honouring a `ClipInsert` and rejects resurrection (`is_deleted → return false`).

### 4. Operation log (`operations.rs`)

`CrdtOperationLog` is an append-only list of `CrdtOperation` values. Each
operation carries `OperationMeta { lamport, peer_id, sequence }`. The operation
enum covers the full editing surface:

- Clip ops: `ClipInsert`, `ClipDelete`, `ClipMove`, `ClipTrim`, `ClipSplit`
- Track ops: `TrackInsert`, `TrackDelete`
- Entity ops: `EntityInsert`, `EntityDelete`, `PropertyUpdate`

### 5. Entity graph (`entity_graph.rs`)

The full NLE scene graph (tracks → clips → effects → keyframes) represented as
a traversable CRDT structure, so structured edits converge alongside clip-level
LWW registers.

---

## Convergence guarantees

The `crdt.rs` test module proves the essential CRDT properties:

| Property | Test | Meaning |
|----------|------|---------|
| Commutativity | `operation_ordering_converges` | Applying ops in different orders yields the same state |
| Idempotence | `merge_with_empty_delta_is_idempotent` | Re-merging a delta changes nothing |
| Conflict resolution | `concurrent_inserts_converge` | Two peers inserting the same clip converge via LWW |
| Deletion safety | `tombstone_prevents_resurrection` | A deleted clip stays deleted after a concurrent insert |

These four properties together are sufficient for eventual consistency.

---

## End-to-end sync flow

```
Editor A                         Transport                     Editor B
────────                         ─────────                     ────────
1. User edits timeline
2. UI dispatches command  ──▶ WASM engine builds CrdtOperation
3. apply_operation(local)      (updates local CRDTTimeline)
4. serialize op ─────────────▶ WebSocket (ai-agents :8002)
                                or native WS (collab-server :8004)
                            ─────────────────────────────────▶ 5. receive op
                                                                6. apply_operation(remote)
                                                                7. tombstone/clock checks
                                                                8. syncTimelineFromEngine()
                                                                   hydrates React state
```

- **Web**: operations cross the Rust↔JS boundary via the WASM bridge
  (`rust/wasm/src/crdt_wasm.rs`, `crdt_bridge.rs`). `apply_crdt_delta` in
  `editor_core` performs the state-based merge; `crdt-sync.ts` on the frontend
  drives React state from the merged engine output.
- **Desktop/native**: `collab-server` (Rust, :8004) relays operations and
  performs the same merge natively — no WASM needed.

---

## Transport duality (known trade-off)

Two sync transports currently coexist:

- **Socket.IO via `ai-agents` (:8002)** — used by the web app; also carries AI
  Copilot traffic.
- **Raw WebSocket via `collab-server` (:8004)** — native Rust CRDT sync +
  WebRTC signaling for voice/presence.

Both apply the *same* `CRDTTimeline` merge logic, so convergence holds
regardless of transport. Consolidating to a single transport is tracked in the
roadmap.

---

## Extending the model

To add a new collaborative edit type:

1. Add a variant to `CrdtOperation` in `operations.rs` (document each field).
2. Handle it in `CRDTTimeline::apply_operation` (`crdt.rs`) — decide LWW vs.
   structural handling, and consult tombstones for anything that inserts.
3. If it deletes, call `tombstones.mark(...)`.
4. Add a convergence test mirroring the existing four-property tests.
5. Expose it through the WASM bridge if the web app needs to originate it.

See also: [architecture-compositor.md](architecture-compositor.md) for how
converged state is rendered, and [architecture-data-flow.md](architecture-data-flow.md)
for the full cross-process picture.

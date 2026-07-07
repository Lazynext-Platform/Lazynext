# Lazynext State

CRDT-powered collaborative data model — the single source of truth for all timeline data in Lazynext.

## Overview

Every edit — whether from a human, an AI agent, or a remote peer — is represented as a CRDT operation that converges deterministically across all replicas without requiring a central coordinator.

## Modules

- **CRDT timeline** (`crdt`) — LWW-Register + operation-based CRDT for real-time multi-user editing
- **Entity graph** (`entity_graph`) — Full NLE scene graph (tracks, clips, effects, keyframes)
- **Operations** (`operations`) — All mutation types with serialization and `inverse()` for undo
- **Vector clocks** — Lamport-style clocks for causal ordering
- **Tombstones** — Garbage-collected deletion markers
- **Keyframes** — Interpolated animation keyframes on timeline properties

# 💬 Discussion: Rust Core Hardening

> **Feature**: `10` — Rust Core Hardening
> **Status**: 🟢 COMPLETE
> **Branch**: `feature/10-rust-core-hardening`
> **Depends On**: #01
> **Date Started**: 2026-06-30
> **Date Completed**: 2026-06-30

## Summary

Fix critical bugs and add test coverage to the Rust workspace. The core engine is ~60-65% real but has 6 untested crates, a data-corruption merge bug, a TODO for CRDT conflict resolution, and several AI/plugin features that return mock data. This feature fixes the high-priority issues and brings test coverage up on the untested crates.

## Functional Requirements

- Fix `temporal-versioning` merge: `.unwrap_or(0)` at line 151 silently inserts clips into wrong tracks — data corruption bug
- Fix CRDT conflict resolution TODO in `nle_state.rs:720` — complete the conflict resolution logic
- Add tests to 6 zero-test crates: gpu, masks, temporal-versioning, mcp-server, cli, wasm
- Wire real SAM2 ONNX inference (replace hardcoded circle mask)
- Implement real VST3 plugin loading (uncomment libloading)
- Implement C2PA manifest signing (replace `todo!()`)

## Current State

- **temporal-versioning**: `merge_track_clips()` at lib.rs:151 uses `.position(|t| t.id == *track_id).unwrap_or(0)` — when source track doesn't exist in target, clips silently go to track 0
- **nle_state.rs**: `apply_operation()` at line 720 has `TODO: Full CRDT conflict resolution logic` — basic operations work but complex concurrent operations may not converge
- **SAM2**: `masks/src/sam2.rs` returns hardcoded white circle — ONNX runtime is feature-gated but not wired
- **VST3**: `audio/src/vst.rs` has `libloading::Library::new` commented out, registers mock parameters
- **C2PA**: `provenance/src/c2pa.rs` has `todo!()` in `sign_manifest`
- **Tests**: gpu, masks, temporal-versioning, mcp-server, cli, wasm have zero tests

## Proposed Approach

Fix highest-severity bugs first (merge bug, CRDT TODO), then add tests to untested crates, then wire real AI/plugin features. Scope is limited to `rust/` directory only.

## Discussion Complete ✅

**Summary**: Fix 2 critical bugs, add tests to 6 crates, wire real SAM2/VST3/C2PA implementations.

**Completed**: 2026-06-30
**Next**: Create architecture doc → `architecture.md`

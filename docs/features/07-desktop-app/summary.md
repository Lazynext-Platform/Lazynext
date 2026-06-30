# 📋 Summary — Desktop App

> **Feature**: #07 — Desktop App
> **Status**: ⏸️ On Hold (Retroactive)
> **Approximate Date Range**: 2025-Q3 – 2026-Q2

## What Was Built

A GPUI (Zed framework) native desktop application scaffold. The `Cargo.toml` declares GPUI dependencies and the project structure is laid out. A basic `main.rs` exists as a stub. The architecture is designed to call into the Rust NLE engine natively (no WASM bridge needed) with direct wgpu rendering to native surfaces. DeckLink I/O integration (`rust/crates/decklink/`) is planned for broadcast monitoring.

## Key Decisions

- **GPUI over Electron**: Native Rust GUI framework avoids JavaScript bridge overhead for GPU compositing
- **Native wgpu rendering**: No need for WASM bridge — the compositor renders directly to native surfaces
- **DeckLink I/O**: Blackmagic hardware output for professional broadcast monitoring

## Files & Components Affected

- `apps/desktop/` — GPUI application (currently a stub)
- `rust/crates/decklink/` — Blackmagic DeckLink I/O CXX scaffold
- `rust/crates/compositor/` — Will render natively via wgpu

## Dependencies

- **Depends on**: #01 (Rust Core Engine)
- **Enables**: #12 (Desktop App — Full Implementation)

## Notes

- ~55% complete overall. GPUI dependency declared and scaffolded, but all GPUI code is commented out. Current `main.rs` is a 25-line stub that prints "I'm a stub."
- Major work needed: uncomment and activate GPUI (significant Zed monorepo dependency), build Dashboard window (project listing, creation, settings), build Editor window (GPUI view wrapping NLE engine with wgpu), wire native compositor, wire DeckLink I/O with real Blackmagic SDK, native file system access, native CoreAudio/WASAPI audio, add tests (zero test files)
- GPUI is not a stable 1.0 framework — dependency risk

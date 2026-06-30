# 📋 Summary — Mobile App

> **Feature**: #08 — Mobile App
> **Status**: ⏸️ On Hold (Retroactive)
> **Approximate Date Range**: 2025-Q4 – 2026-Q2

## What Was Built

An Expo/React Native mobile application shell targeting iOS and Android. Features a polished Dashboard screen with project listing and a stub AI Copilot screen. The architecture is designed to call into Rust via UniFFI-generated native bindings (Kotlin for Android, Swift for iOS). A `NativeBridge` module is defined in `rust/core/src/mobile_bridge.rs` for the Rust side of the bridge.

## Key Decisions

- **React Native + UniFFI**: React Native chosen for code sharing with web; UniFFI for direct Rust native bindings instead of a WASM bridge
- **Expo**: Managed workflow for rapid iteration
- **NativeBridge pattern**: Rust struct defines the bridge API; UniFFI generates Kotlin/Swift wrappers

## Files & Components Affected

- `apps/mobile/` — Expo/React Native application
- `rust/core/src/mobile_bridge.rs` — Rust-side bridge API definition

## Dependencies

- **Depends on**: #01 (Rust Core Engine)
- **Enables**: #13 (Mobile App — Full Implementation)

## Notes

- ~55% complete overall. React Native shell exists with Dashboard and stub Copilot screens, but the NativeBridge is entirely a JavaScript mock returning hardcoded strings. No UniFFI-generated bindings exist. No native `android/` or `ios/` directories.
- Major work needed: implement UniFFI bridge end-to-end (define `.udl` file, generate Kotlin/Swift bindings, build native modules), build native project scaffolding, replace JavaScript mock bridge with real bindings, build AI Copilot screen (currently placeholder with two Text components), build timeline viewer, add missing assets (icon.png, splash.png referenced but don't exist), add tsconfig.json, fix race conditions (uncancellable setTimeout, Apple Pencil detection), add tests (zero test files, no test runner)
- UniFFI bridge is a substantial engineering effort — the most complex part of mobile development

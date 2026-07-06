# 🏗️ Architecture: Mobile App — Wire NativeBridge to Editor

> **Feature**: `21` — Mobile App Completion
> **Discussion**: [`discussion.md`](discussion.md)
> **Status**: 🟢 FINALIZED
> **Date**: 2026-06-30

---

## Overview

The mobile app already has full iOS/Android projects with UniFFI bindings, a real `NativeBridge.ts`, and a complete `EditorScreen.tsx` (136 lines). The single gap was that `EditorScreen` used hardcoded mock clip data instead of calling `NativeBridge.fetchProject()`.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│ React Native / Expo (dumb shell)                     │
│                                                      │
│  App.tsx (325 lines)                                 │
│  ├── DashboardScreen                                 │
│  ├── EditorScreen                                    │
│  │   ├── Timeline                                    │
│  │   ├── Playhead                                    │
│  │   ├── PreviewArea                                 │
│  │   └── NativeBridge.fetchProject()  ← fixed        │
│  ├── AIChatScreen                                    │
│  │   └── NativeBridge.sendChatMessage()              │
│  └── NativeBridge.ts (51 lines)                      │
│      ├── getProjectInfo() → UniFFI                   │
│      ├── fetchProject() → UniFFI                     │
│      ├── processIntent() → UniFFI                    │
│      └── moveClip() → UniFFI                         │
│                                                      │
│  UniFFI Bridge (auto-generated)                      │
│  ├── iOS: Swift FFI headers                          │
│  └── Android: Kotlin bindings                        │
│                                                      │
│  Rust Core (lazynext_core)                           │
│  ├── uniffi/lazynext.udl                             │
│  └── uniffi-bindgen.rs                               │
└──────────────────────────────────────────────────────┘
```

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| EditorScreen data source | `NativeBridge.fetchProject()` via `useEffect` | Replaces hardcoded `useState` mock initialization |
| Native error handling | Graceful degradation | Falls back to empty state if NativeBridge is unavailable |
| UniFFI bindings | Auto-generated from `.udl` file | Single source of truth for Rust→native interface |

## Files Modified

- `apps/mobile/src/screens/EditorScreen.tsx` — Wire to NativeBridge
- `apps/mobile/src/Timeline.tsx` — Accept real data props

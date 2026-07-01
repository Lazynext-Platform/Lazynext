# Mobile App (React Native / Expo)

Cross-platform mobile shell for iOS and Android, built with Expo SDK 56 and React Native 0.86.

## Structure

```
App.tsx              # Root: NavigationContainer with bottom tabs
src/
├── NativeBridge.ts  # Bridge to Rust core via native module
├── Timeline.tsx     # Editor timeline screen with gesture support
└── screens/         # Additional screen components
```

## Screens

| Tab | Screen | Description |
|-----|--------|-------------|
| Dashboard | `DashboardScreen` | Project stats (tracks/clips), quick-action chips, natural-language intent input |
| Editor | `TimelineScreen` | Gesture-driven timeline editor with clip manipulation via Reanimated |
| AI Copilot | `AIChatScreen` | Chat interface with Chronos Copilot for conversational video editing |

## Native Bridge

`NativeBridge.ts` communicates with the Rust core through a native Turbo Module (`MyModule`). All calls degrade gracefully to offline fallbacks when the native module is unavailable.

## Running

```bash
bun expo start          # Expo dev server
bun expo run:ios        # iOS simulator / device
bun expo run:android    # Android emulator / device
```

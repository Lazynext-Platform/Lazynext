# 🧪 Test Plan: Mobile App — Wire NativeBridge to Editor

> **Feature**: `21` — Mobile App Completion

## Scope

Verify EditorScreen uses real data from NativeBridge instead of hardcoded mock clips. iOS and Android compile verification. Native bridge API round-trip.

## Test Cases

| ID | Area | Case | Expected | Status |
|---|---|---|---|---|
| TC1 | EditorScreen | Load screen — verify `useEffect` calls `NativeBridge.fetchProject()` | Timeline populated with real clips, not mock data | ✅ |
| TC2 | EditorScreen | NativeBridge unavailable (simulated) | Graceful empty state shown, no crash | ✅ |
| TC3 | Timeline | Pass real clip data array to Timeline component | Clips rendered with correct positions/durations | ✅ |
| TC4 | NativeBridge | `fetchProject()` round-trip via UniFFI | Returns valid project JSON from Rust core | ✅ |
| TC5 | iOS | `npx expo run:ios` | App builds and launches without UniFFI link errors | ✅ |
| TC6 | Android | `npx expo run:android` | App builds and launches without UniFFI link errors | ✅ |
| TC7 | Regression | Existing native bridge test (47 lines) | All assertions pass | ✅ |

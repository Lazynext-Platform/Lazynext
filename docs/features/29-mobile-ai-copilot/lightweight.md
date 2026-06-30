# 🪶 Lightweight Feature: Mobile AI Copilot — race-condition fix

> **Feature**: `29` — Mobile AI Copilot (completion pass)
> **Branch**: `feature/29-mobile-ai-copilot`
> **Date**: 2026-06-30
> **Variant**: Lightweight (small, well-understood, low-risk)

## Summary
Verification found the mobile AI Copilot chat surface (`AIChatScreen` in `App.tsx`) and its bridge (`NativeBridge.sendChatMessage`) are **already implemented**. The only genuine remaining defect is a state-race in the Dashboard quick-action buttons, plus a minor timer leak on unmount.

## Scope & Approach
- **Race (3.8)**: `onPress={() => { setPrompt(action); handleProcessIntent(); }}` — `setPrompt` is asynchronous, so `handleProcessIntent` reads the *stale* `prompt` (empty or previous value). The guard `!prompt.trim()` then bails out, so quick actions silently do nothing (or send the wrong prompt). **Fix**: `handleProcessIntent` accepts an optional `overridePrompt`; quick actions pass the action string directly.
- **Leak**: the Apple-Pencil `setTimeout` is not cleared on unmount. **Fix**: clear `pencilTimerRef` in a `useEffect` cleanup.

## Tasks
- [x] L1 Refactor `handleProcessIntent(overridePrompt?)` + update call sites (input, button, quick actions)
- [x] L2 Add unmount cleanup for `pencilTimerRef`
- [x] L3 `tsc --noEmit` clean (apps/mobile)

## Verification
- `tsc --noEmit` passes (apps/mobile).
- Code review: quick actions now pass the action string directly (no stale-state read); pencil timer cleared on unmount.

## Reflection
Confirms the recurring lesson: the assessment is stale almost everywhere. Of the whole #22–#31 backlog, only #24 (browser-ext real import), #27 (API GW tests+OpenAPI), and #31 (broad OTel+E2E) retain substantial genuine work after verification.

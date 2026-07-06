# Lazynext Capture Extension (Chrome MV3) ⚠️ LEGACY

> **This extension is superseded by `apps/browser-extension/`** which provides the canonical, maintained implementation with TypeScript, React, Vite, and full AI Copilot integration.
> This legacy version is preserved for historical reference only. Do not add new features here.

Lightweight Chrome extension for capturing active tab video/audio and streaming directly into a Lazynext project.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest: `tabCapture`, `activeTab`, `storage` permissions |
| `popup.html` | Popup UI with Start/Stop Recording buttons |
| `popup.js` | Popup logic: sends `captureActiveTab` / `stopCapture` messages |
| `background.js` | Service worker: `MediaRecorder` via `chrome.tabCapture`, chunked uploads |
| `icon16/48/128.png` | Extension icons |
| `PRIVACY_POLICY.md` | Privacy policy for Chrome Web Store submission |

## How It Works

1. User clicks **Start Recording** in the popup.
2. Background service worker calls `chrome.tabCapture.capture()` with `audio: true, video: true`.
3. `MediaRecorder` captures 1-second chunks and POSTs them to `POST /api/v1/ingest/stream` via `FormData`.
4. On **Stop Recording**, a final `POST /api/v1/ingest/stream/complete` is sent with the `session_id`.
5. Chunks are streamed to the API Gateway (port 8005) for ingestion into the active timeline.

## Install (unpacked)

1. Go to `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select this directory.

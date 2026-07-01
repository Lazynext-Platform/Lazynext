# Browser Extension (Chrome MV3)

Chrome Manifest V3 extension built with Vite + React. Detects videos on any page and imports them into a Lazynext project timeline.

## Structure

```
src/
├── App.tsx                      # Popup UI: video detection list, import buttons, AI overlay launcher
├── main.tsx                     # Popup entry point
├── overlay.tsx                  # Injected overlay entry point
├── background/
│   └── service-worker.ts        # Background service worker
└── content/
    └── content-script.ts        # Content script: media detection, overlay injection
public/
├── manifest.json                # MV3 manifest
└── icons/                       # Extension icons
```

## Features

- **Video Detection**: Scans active tab for `<video>` elements and displays them in the popup.
- **Frame Capture**: Extracts a JPEG thumbnail from detected videos and POSTs to API Gateway (`/api/v1/ai/ingest`).
- **Offline Queue**: When the gateway is unreachable, imports are queued in `chrome.storage.local`.
- **AI Copilot Overlay**: Injects a floating overlay onto any page for contextual AI assistance.

## Build

```bash
bun run build       # tsc + vite build (popup, overlay, background, content)
bun run dev         # vite dev server
```

## Load in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` directory

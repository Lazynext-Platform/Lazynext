# Apps — UI Shells

Each app is a pure rendering shell that calls into the Rust core (via WASM on web, natively on desktop, via UniFFI on mobile). No business logic lives here.

| App | Framework | Target |
|-----|-----------|--------|
| `web/` | Next.js 16 + React 19 | Browser (WASM compositor) |
| `desktop/` | GPUI (Zed framework) | macOS, Windows, Linux |
| `mobile/` | React Native + Expo | iOS, Android |
| `browser-extension/` | Chrome Manifest V3 | Chrome Web Store |

## Architecture

```
Apps (dumb shells)  ←→  WASM / Native bridges  ←→  Rust Core (ALL logic)
```

## Getting Started

```bash
# Web
cd apps/web && bun run dev

# Desktop
cd apps/desktop && cargo run

# Mobile
cd apps/mobile && bun start

# Browser Extension
cd apps/browser-extension && bun run build
```

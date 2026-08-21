# Lazynext Mobile App (Android + iOS)

A native mobile companion app built with [Capacitor 8](https://capacitorjs.com).
It connects to a Lazynext server (your desktop instance on the LAN, or a remote
server) via the [API Gateway](../docs/api-gateway.md) and lets you:

- **Browse and manage projects** — list, create, open in the editor, delete.
- **Capture and upload media** — take a photo/video with the camera or pick from
  your library and upload it to your Lazynext media library.
- **Inspect the agent surface** — view MCP endpoint info and available tools.
- **Configure the connection** — server URL + API key, stored on-device.

The companion web app lives in `mobile/web/` and is plain HTML/CSS/JS (no build
step). It uses Capacitor plugins (`Camera`, `Preferences`) when running natively
and falls back to web APIs (`<input type=file>`, `localStorage`) when opened in
a browser, so it is fully testable on desktop.

## Project layout

| Path | Purpose |
|---|---|
| `mobile/web/` | Companion web app (Capacitor `webDir`) |
| `capacitor.config.ts` | Capacitor config (appId `com.lazynext.app`) |
| `ios/` | Generated Xcode project (Swift Package Manager plugins) |
| `android/` | Generated Android Studio project (Gradle) |

## Prerequisites

- **iOS**: macOS with Xcode 16+ and an Apple Developer account (for device installs).
- **Android**: Android Studio with the Android SDK + JDK 17+.

## Build & run

```bash
# 1. Sync web assets + plugin config into native projects
npm run mobile:sync

# 2. Open the native project and run on a device/simulator
npm run mobile:open:ios        # opens ios/Lazynext.xcodeproj in Xcode
npm run mobile:open:android    # opens android/ in Android Studio

# Or run directly (device/simulator must be connected)
npm run mobile:run:ios
npm run mobile:run:android
```

In the app, open the **Settings** tab and enter:
- **Server URL** — e.g. `http://<your-desktop-LAN-ip>:5199` (or `http://localhost:5199`
  when testing the web app in a desktop browser).
- **API key** — the gateway key (`LAZYNEXT_API_KEY` set on the server).

## App icons & splash screen

Generate native icons/splash from a source image:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android --ios
```

(Source icon: `mobile/web/icon.png`, derived from `public/lazynext-icon.png`.)

## Networking (HTTP to LAN servers)

The Lazynext editor runs on plain HTTP on the LAN. The app is configured to allow
cleartext HTTP to local/private hosts:

- **iOS**: `NSAppTransportSecurity` → `NSAllowsArbitraryLoads` + `NSAllowsLocalNetworking`
  (`ios/App/App/Info.plist`).
- **Android**: `network_security_config.xml` permits cleartext for local/private
  hosts, plus `android:usesCleartextTraffic="true"` (`android/app/src/main/AndroidManifest.xml`).

For production distribution over the public internet, point the app at an
HTTPS-fronted Lazynext server and remove the cleartext exceptions.

## Permissions

| Permission | Why |
|---|---|
| Camera | Capture photos/video for upload |
| Photo library | Pick existing media to upload |
| Internet / local network | Talk to the Lazynext API Gateway |

## Verification

The companion web app was verified in a browser against a running gateway with
`LAZYNEXT_API_KEY` set: connection status, project list/create/delete, media
list, agent tools/MCP discovery, and cross-origin CORS all work. Camera capture
uses the native `@capacitor/camera` plugin on-device (web fallback uses a file
input on desktop).

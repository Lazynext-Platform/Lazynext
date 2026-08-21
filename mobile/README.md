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

### Android setup (one-time)

The Android build requires the Android SDK + JDK 17. If you don't have them:

```bash
# Install JDK 17 (requires sudo password)
brew install --cask temurin@17

# Install Android Studio (includes the SDK)
brew install --cask android-studio

# Or install just the command-line SDK (no IDE)
brew install --cask android-commandlinetools
export ANDROID_HOME="$HOME/Library/Android/sdk"
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc

# Accept SDK licenses and install platform tools + build tools
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

# Then sync and build
npm run mobile:sync
npm run mobile:open:android    # opens in Android Studio
# or: cd android && ./gradlew assembleDebug
```

The generated APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

### iOS physical device setup

The simulator build works without a paid account. To build for a physical device:

1. Open `npm run mobile:open:ios` in Xcode.
2. Select the **App** target → **Signing & Capabilities**.
3. Set **Team** to your Apple Developer team (requires Apple Developer Program, $99/yr).
4. Connect your iPhone/iPad via USB and select it as the run destination.
5. Build and run (Cmd+R). Trust the developer certificate on the device under
   Settings → General → VPN & Device Management.

For App Store distribution: Product → Archive → Distribute App → App Store Connect.

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

### Production HTTPS mode

For production distribution over the public internet, switch to HTTPS-only:

```bash
npm run mobile:https        # enable HTTPS-only (removes cleartext exceptions)
npm run mobile:sync         # sync the config into native projects
npm run mobile:open:ios     # rebuild

# To restore LAN cleartext for development later:
npm run mobile:https:dev
```

This removes `NSAllowsArbitraryLoads` from iOS Info.plist, sets
`android:usesCleartextTraffic="false"`, and tightens the Android network security
config to deny cleartext except for `localhost` and private IP ranges. The
Capacitor config also respects `LAZYNEXT_MOBILE_HTTPS=1` to disable
`allowMixedContent` and `server.cleartext`.

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

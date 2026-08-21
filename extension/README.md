# Lazynext Browser Extension

A cross-browser extension (Chrome, Edge, Firefox, Safari) that connects to a
Lazynext server via the [API Gateway](../docs/api-gateway.md) and lets you:

- **Send media from any web page** to your Lazynext media library (right-click
  an image/video/audio → "Send to Lazynext", or "Send page media to Lazynext"
  to grab all supported media on the page).
- **Manage projects** from the toolbar popup — list, create, open, delete.
- **Configure** the server URL and API key on the options page.
- **Discover** the MCP agent surface (`agent tools`, `agent mcp`).

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 manifest (cross-browser) |
| `background.js` | Service worker — context menu, uploads, notifications, message router |
| `api.js` | Shared API Gateway client (used by popup, options, background) |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup UI |
| `options.html` / `options.js` | Settings page |
| `icons/` | Extension icons (16/32/48/128) |

## Load it (development)

### Chrome / Edge
1. Visit `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this `extension/` folder.
4. Open the extension options to set your server URL and `LAZYNEXT_API_KEY`.

### Firefox
1. Visit `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `extension/manifest.json`.
3. (For permanent signing/distribution, submit to [addons.mozilla.org](https://addons.mozilla.org).)

### Safari (macOS)
Convert the extension into a Safari Web Extension and build the Xcode project:
```bash
xcrun safari-web-extension-converter path/to/extension -project-location ./safari
open ./safari/Lazynext.xcodeproj
# Build & run from Xcode; enable it in Safari → Settings → Extensions
```
(Apple Developer account + signing required for distribution outside your own Mac.)

## Package for stores

```bash
npm run extension:package
```

Produces:
- `dist/extension/lazynext-chrome.zip` — Chrome Web Store + Edge Add-ons
- `dist/extension/lazynext-firefox.zip` — Firefox AMO (manifest patched with
  `browser_specific_settings.gecko.id` and `background.scripts`)
- `dist/extension/lazynext-safari/` — source for `xcrun safari-web-extension-converter`

### Submit

| Store | URL | Requirements |
|---|---|---|
| Chrome Web Store | https://chrome.google.com/webstore/devconsole | $5 one-time developer fee |
| Edge Add-ons | https://partner.microsoft.com/dashboard/microsoftedge | Microsoft account |
| Firefox AMO | https://addons.mozilla.org/developers/ | Mozilla account (free) |
| Safari | `xcrun safari-web-extension-converter` → Xcode | Apple Developer Program ($99/yr) |

## Configuration

Open the extension **Settings** (gear icon → Settings, or the popup footer link)
and set:

- **Server URL** — the Lazynext editor URL (default `http://localhost:5199`).
- **API Key** — the gateway API key (`LAZYNEXT_API_KEY` in the server's `.env`).

The key is stored in `chrome.storage.sync` and synced to your browser account.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save server URL + API key |
| `contextMenus` | "Send to Lazynext" right-click menu |
| `activeTab`, `scripting` | Collect media URLs from the active page |
| `notifications` | Upload progress / success / failure toasts |
| `<all_urls>` (host) | Download media from any page and call your configured server |

Auth is header-based (Bearer API key), not cookie-based, so the extension never
reads your editor session — it only uses the API key you configure.

## Verification

The shared client (`api.js`) is integration-tested against a running gateway:
`status`, `projects list`, `agent tools`, and a media upload round-trip all
pass. To re-run, start the server with `LAZYNEXT_API_KEY` set and load the
unpacked extension; the popup shows a green dot when connected.

#!/bin/bash
# codesign-desktop.sh — Sign and notarize the Lazynext desktop app for macOS.
#
# Prerequisites (supply via env vars or .env):
#   APPLE_DEVELOPER_ID="Developer ID Application: Your Name (TEAMID)"
#   APPLE_ID_EMAIL="your@apple-id.com"
#   APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
#   APPLE_TEAM_ID="YOUR_TEAM_ID"
#
# Run after: cargo build --release -p lazynext_desktop

set -e

APP_DIR="apps/desktop"
BINARY="target/release/lazynext_desktop"
APP_BUNDLE="${APP_DIR}/Lazynext.app"
DMG_OUT="Lazynext-Desktop.dmg"

echo "🔐 Codesigning Lazynext Desktop..."

# 1. Build release binary
echo "📦 Building release binary..."
cargo build --release -p lazynext_desktop

# 2. Create .app bundle structure
echo "📁 Creating .app bundle..."
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"
cp "$BINARY" "$APP_BUNDLE/Contents/MacOS/lazynext_desktop"
cp "$APP_DIR/assets/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/" 2>/dev/null || true

# 3. Generate Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleName</key>
	<string>Lazynext</string>
	<key>CFBundleDisplayName</key>
	<string>Lazynext</string>
	<key>CFBundleIdentifier</key>
	<string>com.lazynext.desktop</string>
	<key>CFBundleVersion</key>
	<string>1.0.0</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0.0</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleExecutable</key>
	<string>lazynext_desktop</string>
	<key>LSMinimumSystemVersion</key>
	<string>13.0</string>
	<key>NSHighResolutionCapable</key>
	<true/>
</dict>
</plist>
PLIST

# 4. Codesign the binary
if [ -n "$APPLE_DEVELOPER_ID" ]; then
	echo "✍️ Signing with: $APPLE_DEVELOPER_ID"
	codesign --deep --force --verify --verbose \
		--sign "$APPLE_DEVELOPER_ID" \
		--options runtime \
		--entitlements "${APP_DIR}/entitlements.plist" \
		"$APP_BUNDLE"

	# 5. Notarize (async submit + staple)
	echo "📤 Submitting for notarization..."
	zip -r /tmp/lazynext-notarize.zip "$APP_BUNDLE"
	xcrun notarytool submit /tmp/lazynext-notarize.zip \
		--apple-id "$APPLE_ID_EMAIL" \
		--password "$APPLE_APP_SPECIFIC_PASSWORD" \
		--team-id "$APPLE_TEAM_ID" \
		--wait
	xcrun stapler staple "$APP_BUNDLE"
	rm /tmp/lazynext-notarize.zip
	echo "✅ Signed and notarized: $APP_BUNDLE"
else
	echo "⚠️ APPLE_DEVELOPER_ID not set — skipping signing."
	echo "   The binary is at: $BINARY"
fi

# 6. Create DMG
echo "💿 Creating DMG..."
hdiutil create -volname "Lazynext" -srcfolder "$APP_BUNDLE" -ov -format UDZO "$DMG_OUT"
echo "✅ DMG: $DMG_OUT"

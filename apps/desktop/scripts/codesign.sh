#!/bin/bash
set -e

APP_NAME="Lazynext"
APP_PATH="target/release/bundle/osx/${APP_NAME}.app"
ENTITLEMENTS="scripts/entitlements.plist"
SIGN_IDENTITY="Developer ID Application: Your Name (XXXXXXXXXX)"

echo "Signing $APP_PATH..."

# Sign Frameworks and inner binaries first (GPUI dependencies)
find "$APP_PATH/Contents/Frameworks" -type f -name "*.dylib" -exec codesign --force --sign "$SIGN_IDENTITY" --options runtime {} \;
find "$APP_PATH/Contents/MacOS" -type f -exec codesign --force --sign "$SIGN_IDENTITY" --options runtime --entitlements "$ENTITLEMENTS" {} \;

# Sign the App bundle itself
codesign --force --sign "$SIGN_IDENTITY" --options runtime --entitlements "$ENTITLEMENTS" "$APP_PATH"

echo "Verifying signature..."
codesign --verify --verbose=4 "$APP_PATH"

echo "Zipping for notarization..."
/usr/bin/ditto -c -k --keepParent "$APP_PATH" "${APP_NAME}.zip"

echo "Please run: xcrun notarytool submit ${APP_NAME}.zip --keychain-profile \"AC_PASSWORD\" --wait"
echo "Done."

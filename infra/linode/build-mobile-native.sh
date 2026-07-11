#!/usr/bin/env bash
# build-mobile-native.sh — Build UniFFI bindings for iOS/Android
# ───────────────────────────────────────────────────────────────
# Generates Kotlin (Android) and Swift (iOS) UniFFI bindings from
# the Rust core's UDL definition. Must run before building the
# mobile app with native modules.
# ───────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$PROJECT_ROOT/apps/mobile"
CORE_DIR="$PROJECT_ROOT/rust/core"
UDL_FILE="$CORE_DIR/src/lazynext_mobile.udl"
OUT_DIR="$MOBILE_DIR/modules/lazynext-native"

info() { echo -e "\033[0;36m[INFO]\033[0m  $*"; }
ok()   { echo -e "\033[0;32m[OK]\033[0m    $*"; }
err()  { echo -e "\033[0;31m[ERROR]\033[0m $*"; exit 1; }

# ── Check prerequisites ──
command -v cargo >/dev/null 2>&1 || err "Rust/Cargo is required"
command -v uniffi-bindgen >/dev/null 2>&1 || {
	info "Installing uniffi-bindgen..."
	cargo install uniffi_bindgen
}

info "Building Rust core library for mobile targets..."

# Android (aarch64)
info "Building for Android aarch64..."
cargo build --release -p lazynext_core --target aarch64-linux-android 2>/dev/null || \
	warn "Android aarch64 target not configured. Run: rustup target add aarch64-linux-android"

# iOS (aarch64)
info "Building for iOS aarch64..."
cargo build --release -p lazynext_core --target aarch64-apple-ios 2>/dev/null || \
	warn "iOS aarch64 target not configured. Run: rustup target add aarch64-apple-ios"

# iOS simulator (aarch64)
cargo build --release -p lazynext_core --target aarch64-apple-ios-sim 2>/dev/null || \
	warn "iOS simulator target not configured. Run: rustup target add aarch64-apple-ios-sim"

# ── Generate UniFFI bindings ──
if [ -f "$UDL_FILE" ]; then
	info "Generating UniFFI Kotlin bindings..."
	uniffi-bindgen generate "$UDL_FILE" \
		--language kotlin \
		--out-dir "$OUT_DIR/android/src/main/java/lazynext/uniffi"

	info "Generating UniFFI Swift bindings..."
	uniffi-bindgen generate "$UDL_FILE" \
		--language swift \
		--out-dir "$OUT_DIR/ios"
else
	warn "No UDL file found at $UDL_FILE — skipping UniFFI generation."
	warn "Create the UDL file, or if using proc macros, run: cargo build -p lazynext_core to generate bindings."
fi

# ── Copy native libraries ──
info "Copying native libraries..."

# Android
ANDROID_JNI_DIR="$OUT_DIR/android/src/main/jniLibs"
mkdir -p "$ANDROID_JNI_DIR/arm64-v8a" "$ANDROID_JNI_DIR/x86_64"
cp "$PROJECT_ROOT/target/aarch64-linux-android/release/liblazynext_core.so" \
   "$ANDROID_JNI_DIR/arm64-v8a/liblazynext_core.so" 2>/dev/null || true

# iOS (xcframework would be needed for distribution)
IOS_LIB_DIR="$OUT_DIR/ios"
mkdir -p "$IOS_LIB_DIR"
cp "$PROJECT_ROOT/target/aarch64-apple-ios/release/liblazynext_core.a" \
   "$IOS_LIB_DIR/liblazynext_core.a" 2>/dev/null || true

ok "Native libraries built and bindings generated!"
ok "Next: cd apps/mobile && bun install && expo prebuild"

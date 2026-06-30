#!/bin/bash
# Generate UniFFI Kotlin bindings for Android
# Prerequisites: cargo install uniffi_bindgen
#
# This script generates Kotlin bindings from the lazynext.udl file
# and places them in the Android native module directory.

set -e

UDL_FILE="../../rust/core/uniffi/lazynext.udl"
OUTPUT_DIR="apps/mobile/modules/lazynext-native/android/src/main/java/com/lazynext/lazynextnative"

echo "🔧 Generating Kotlin UniFFI bindings..."

# Generate Kotlin bindings
uniffi-bindgen generate \
    --language kotlin \
    --config ./uniffi.toml \
    --out-dir "$OUTPUT_DIR/generated" \
    "$UDL_FILE"

# Move generated bindings into place
mkdir -p "$OUTPUT_DIR/generated"
mv "$OUTPUT_DIR/generated/uniffi/lazynext/lazynext.kt" "$OUTPUT_DIR/generated/LazynextCore.kt" 2>/dev/null || true
rmdir "$OUTPUT_DIR/generated/uniffi/lazynext" 2>/dev/null || true
rmdir "$OUTPUT_DIR/generated/uniffi" 2>/dev/null || true

echo "✅ Kotlin bindings generated at: $OUTPUT_DIR/generated/"
echo ""
echo "Next steps:"
echo "  1. Build Rust library for Android:"
echo "     cargo build --target aarch64-linux-android --release -p lazynext_core"
echo "     cargo build --target x86_64-linux-android --release -p lazynext_core"
echo ""
echo "  2. Place .so files in jniLibs:"
echo "     mkdir -p apps/mobile/android/app/src/main/jniLibs/arm64-v8a"
echo "     cp rust/target/aarch64-linux-android/release/liblazynext_core.so \\"
echo "        apps/mobile/android/app/src/main/jniLibs/arm64-v8a/"
echo ""
echo "  3. The MyModule.kt bridge is already wired to use System.loadLibrary"

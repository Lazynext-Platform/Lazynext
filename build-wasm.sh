#!/usr/bin/env bash
# build-wasm.sh
# Builds the Rust WASM module for the Next.js web application.
# In CI, the WASM package is pre-built and downloaded as an artifact
# — set SKIP_WASM_BUILD=1 to skip the build step.

set -e

echo "Building Rust WASM Core Engine..."

# Skip if WASM package is already present (e.g., downloaded from CI artifact)
if [ "${SKIP_WASM_BUILD:-}" = "1" ] || [ -f "rust/wasm/pkg/lazynext_wasm.js" ]; then
    if [ -f "rust/wasm/pkg/lazynext_wasm.js" ]; then
        echo "WASM package already exists — skipping build."
    else
        echo "SKIP_WASM_BUILD=1 set — skipping WASM build."
    fi
    exit 0
fi

# Ensure rustc and cargo are installed
if ! command -v cargo &> /dev/null; then
    echo "Rust/Cargo is not installed. Please install Rust: https://rustup.rs/"
    exit 1
fi

# Ensure wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing..."
    cargo install wasm-pack
fi

cd rust/wasm

echo "Running wasm-pack build..."
# getrandom 0.3 on wasm32 target needs cfg flag for JS backend
export RUSTFLAGS="--cfg getrandom_backend=\"wasm_js\""
# Lock cargo to avoid multi-version conflicts
wasm-pack build --target web --release -- --locked 2>/dev/null || \
  wasm-pack build --target web --release

echo "WASM compilation successful!"

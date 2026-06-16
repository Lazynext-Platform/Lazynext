#!/usr/bin/env bash
# build-wasm.sh
# Builds the Rust WASM module for the Next.js web application.

set -e

echo "Building Rust WASM Core Engine..."

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
wasm-pack build --target web --release

echo "WASM compilation successful!"

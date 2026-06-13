#!/bin/bash

# Lazynext Headless Render Farm Deployment Script

echo "🚀 Provisioning Lazynext Headless Render Node..."

# 1. Compile the CLI binary in release mode
cd "$(dirname "$0")/.."
echo "🔨 Compiling Rust CLI Daemon..."
cargo build --manifest-path rust/cli/Cargo.toml --release

# 2. Emulate distributing the binary to 5 separate render nodes
echo "🌐 Distributing daemon to render nodes..."
for i in {1..5}
do
   echo "  -> Deploying to node-${i}.lazynext.internal"
done

# 3. Trigger a massive headless render job across the farm
echo "🎬 Executing distributed render job [ID: cyberpunk_film_final]..."
./target/release/lazynext_cli --project cyberpunk_film_final --format mp4 --width 3840 --height 2160

echo "✅ Farm Node Execution Complete."

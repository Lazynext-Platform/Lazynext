#!/bin/bash

set -e

echo "🚀 Deploying Lazynext to Production Architecture..."

# Ensure we are in the root directory
cd "$(dirname "$0")/.."

echo "📦 Building Docker Images..."
docker compose build

echo "🚢 Starting Lazynext Microservices..."
docker compose up -d

echo "✅ Deployment Successful!"
echo "🌐 Web App: http://localhost:3000"
echo "📡 WebRTC Sync: ws://localhost:8002"
echo "🎬 Render Farm: http://localhost:8003"
echo "🗄️ PostgreSQL: localhost:5434"

echo ""
echo "To view logs, run: docker compose logs -f"
echo "To shut down, run: docker compose down"

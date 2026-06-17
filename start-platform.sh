#!/usr/bin/env bash
# start-platform.sh
# Bootstraps and starts all Lazynext services

echo "Cleaning up any old background processes..."
lsof -ti:3000,8000,8001,8002,8003 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting Lazynext Platform..."

# 1. Start Rust WASM auto-builder (in background)
echo "Starting Rust WASM builder..."
(cd rust/wasm && wasm-pack build --target web --out-dir pkg) &

# 2. Start Next.js Frontend (in background)
echo "Starting Next.js Frontend..."
(cd apps/web && bun run dev) &

# 3. Start Render Service
echo "Starting Render Service..."
(cd services/render-service && bun run start) &

# 4. Start Python Pre-Processing (FunClip / Clip-Anything)
echo "Starting Pre-Processing ML Service..."
(
cd services/pre-processing
if command -v python3 &>/dev/null; then
    rm -rf venv
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt fastapi uvicorn pydantic
    python3 main.py
else
    echo "Python 3 not found, skipping pre-processing service."
fi
) &

# 5. Start Generative Studio (Open-Sora / Kiwi-Edit)
echo "Starting Generative Studio..."
(
cd services/generative-studio
if command -v python3 &>/dev/null; then
    rm -rf venv
    python3 -m venv venv
    source venv/bin/activate
    # Create a basic requirements file if missing
    if [ ! -f "requirements.txt" ]; then
        echo -e "fastapi\nuvicorn\npydantic" > requirements.txt
    fi
    pip install -r requirements.txt
    python3 main.py
else
    echo "Python 3 not found, skipping generative studio."
fi
) &

# 6. Start AI Agents Orchestrator
echo "Starting AI Agents Orchestrator..."
(cd services/ai-agents && bun run start) &

echo "All services started! Press Ctrl+C to shut down."
wait

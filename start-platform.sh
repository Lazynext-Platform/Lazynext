#!/usr/bin/env bash
# start-platform.sh
#
# Bootstraps and starts all Lazynext services in development mode.
# Launches: Docker infra (Redis, Postgres), WASM builder, Next.js frontend,
# Render Service, Pre-Processing ML Service, Generative Studio, and AI Agents.
#
# Usage:
#   ./start-platform.sh
#   Press Ctrl+C to shut down all services.

echo "Cleaning up any old background processes..."
lsof -ti:3000,8000,8001,8002,8003,8004,8006 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting Lazynext Platform..."

echo "Booting up required infrastructure (Redis & Postgres)..."
if ! docker compose up -d redis db redis-proxy; then
    echo "❌ ERROR: Failed to start infrastructure. Is Docker Desktop running?"
    exit 1
fi
sleep 2

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
PYTHON_EXEC=$(which python3.13 || which python3)
if command -v $PYTHON_EXEC &>/dev/null; then
    PYTHON_EXEC=$(which python3.13 || which python3)
    $PYTHON_EXEC -m venv venv
    export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
    venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt fastapi uvicorn pydantic
    PYTHONPATH="$PWD" venv/bin/python src/main.py
else
    echo "Python 3 not found, skipping pre-processing service."
fi
) &

# 5. Start Generative Studio (Open-Sora / Kiwi-Edit)
echo "Starting Generative Studio..."
(
cd services/generative-studio
PYTHON_EXEC=$(which python3.13 || which python3)
if command -v $PYTHON_EXEC &>/dev/null; then
    PYTHON_EXEC=$(which python3.13 || which python3)
    $PYTHON_EXEC -m venv venv
    export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
    # Create a basic requirements file if missing
    if [ ! -f "requirements.txt" ]; then
        echo -e "fastapi\nuvicorn\npydantic" > requirements.txt
    fi
    venv/bin/python -m pip install --disable-pip-version-check -r requirements.txt
    PYTHONPATH="$PWD" venv/bin/python src/main.py
else
    echo "Python 3 not found, skipping generative studio."
fi
) &

# 6. Start AI Agents Orchestrator
echo "Starting AI Agents Orchestrator..."
(cd services/ai-agents && bun run start) &

echo "All services started! Press Ctrl+C to shut down."
wait

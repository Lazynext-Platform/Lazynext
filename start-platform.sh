#!/usr/bin/env bash
# start-platform.sh
# Bootstraps and starts all Lazynext 2025 services

echo "Cleaning up any old background processes..."
lsof -ti:3000,3001,8000,8081 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting Lazynext 2025 Platform..."

# 1. Start Rust WASM auto-builder (in background)
echo "Starting Rust WASM builder..."
bun run dev:wasm &

# 2. Start Next.js Frontend (in background)
echo "Starting Next.js Frontend..."
bun run dev:web &

# 3. Start Remotion Render Service
echo "Starting Render Service..."
cd services/render-service
bun run src/index.ts &
cd ../..

# 4. Start Python Pre-Processing (FunClip / Clip-Anything)
echo "Starting Pre-Processing ML Service..."
cd services/pre-processing
if command -v python3 &>/dev/null; then
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -r requirements.txt fastapi uvicorn pydantic --quiet
    python3 main.py &
    deactivate
else
    echo "Python not found, skipping pre-processing service."
fi
cd ../..

# 5. Start Generative Studio (Open-Sora / Kiwi-Edit)
echo "Starting Generative Studio..."
cd services/generative-studio
if command -v python3 &>/dev/null; then
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    # Create a basic requirements file if missing
    if [ ! -f "requirements.txt" ]; then
        echo -e "fastapi\nuvicorn\npydantic" > requirements.txt
    fi
    pip install -r requirements.txt --quiet
    python3 main.py &
    deactivate
else
    echo "Python not found, skipping generative studio."
fi
cd ../..

# 6. Start Agentic Orchestrator (MCP Server)
echo "Starting Agentic Orchestrator..."
cd services/ai-agents
bun run start &
cd ../..

echo "All services started! Press Ctrl+C to shut down."
wait

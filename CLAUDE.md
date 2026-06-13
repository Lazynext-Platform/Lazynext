# Lazynext Architecture Guide

If you are an AI assistant or a new developer modifying Lazynext, you must strictly adhere to the architectural paradigm defined here.

## 1. The React Shell (`apps/web` or root)
- **Role**: A dumb rendering shell.
- **Rules**:
  - Never put business logic, state conflict resolution, or video processing logic in the React layer.
  - The UI must use TailwindCSS with **Premium Glassmorphism** (vibrant gradients, backdrop blurs, dynamic borders). No generic or simple tailwind colors.

## 2. The Rust Core (`rust/`)
- **Role**: The single source of truth for all complex logic, bound to Next.js via WASM.
- **Rules**:
  - State is managed via Conflict-free Replicated Data Types (CRDT) implemented in Rust (`rust/crates/state/src/crdt.rs`).
  - The timeline sequence is manipulated entirely by the Rust Engine. 
  - All AI Agent logic orchestration (AgentFactory, Providers, Autonomous Director) lives in `rust/crates/agent`.

## 3. The Backend Microservices (`services/`)
- **Role**: Heavy compute nodes decoupled from the frontend.
- **Nodes**:
  - `pre-processing`: Python node handling NeRFs and Rotoscoping (Port 8000).
  - `generative-studio`: Python node handling Video Upscaling and Audio Synthesis (Port 8001).
  - `ai-agents`: Node.js cluster for Chronos Copilot interaction (Port 8002).
  - `render-service`: Node.js FFMPEG Render Farm distributor (Port 8003).
- **Communication**: All inter-service communication happens via REST over the `lazynext-network` Docker bridge.

## 4. Development Commands
- **Rust Compile**: `cd rust && cargo build --target wasm32-unknown-unknown`
- **Frontend Dev**: `npm run dev`
- **Testing**: `npm run test` (Jest) & `npm run test:e2e` (Playwright)
- **Production**: `docker-compose up --build -d`

*Adhere to these boundaries to maintain the stability of the platform.*

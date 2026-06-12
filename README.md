<div align="center">
  <h1>LAZYNEXT 2025</h1>
  <p><strong>The Autonomous, Real-Time Collaborative NLE of the Future.</strong></p>
</div>

---

Lazynext 2025 is an enterprise-grade, multi-platform video editing ecosystem. We stripped out the heavy Electron wrappers and generic JavaScript state management to build something fundamentally faster, smarter, and infinitely scalable.

## 🚀 The Architecture

Lazynext is built on a strict, high-performance architecture:
- **Core Logic (`rust/`)**: The single source of truth. All NLE state management, timeline calculations, and CRDT sync logic live in pure, platform-agnostic Rust.
- **Web Frontend (`apps/web/`)**: A highly optimized Next.js/React shell that imports the Rust core via **WebAssembly**, rendering at 120fps using WebGL.
- **Native Desktop (`apps/desktop/`)**: A native OS application built with **GPUI** (the engine behind Zed) that calls the exact same Rust core logic with zero duplication.
- **Microservices (`services/`)**: Node.js backends handling CRDT WebSocket signaling, Mocked FFmpeg Render Farms, and Generative AI bridging.

## 🧠 Autonomous AI Agents

Lazynext features **Chronos**, an integrated LLM copilot that understands your timeline. Need an establishing shot of a cyberpunk city? Ask Chronos, and it will orchestrate the Generative AI microservices (text-to-video, text-to-audio) to synthesize the asset and drop it directly onto your timeline.

## 🤝 Figma for Video

Using custom LWW (Last-Writer-Wins) CRDTs and a scalable WebSocket signaling hub, Lazynext supports massive real-time multiplayer editing. You and your colleagues can edit the exact same timeline, on the exact same frame, simultaneously across the globe. Built-in WebRTC Voice Chat ensures you're always in sync.

## 📱 The Distribution Network

Lazynext isn't just an editor; it's a network. The built-in `/feed` is a vertical-scrolling social discovery platform. Watch incredible edits, and click "Remix" to instantly clone their CRDT timeline state into your own editor to learn from and modify.

---

## 🛠️ Quick Start (Docker Compose)

Lazynext 2025 is fully containerized. To spin up the entire multi-billion dollar platform locally:

```bash
# Clone the repository
git clone https://github.com/Lazynext-Corporation/lazynext-2025.git
cd lazynext-2025

# Boot the Microservice Cluster
./scripts/deploy.sh
```

**Services Started:**
- 🌐 Web App: `http://localhost:3000`
- 📡 WebRTC Sync: `ws://localhost:8002`
- 🎬 Render Farm: `http://localhost:8003`
- 🗄️ PostgreSQL: `localhost:5432`

## 🧪 Development & Testing

We enforce strict CI/CD pipelines via GitHub Actions.
To run the Playwright End-to-End test suite locally:

```bash
bun install
bun run test:e2e
```

To compile the Rust WASM core manually:
```bash
wasm-pack build --target web --out-dir pkg rust/wasm
```

---

<div align="center">
  <p><i>Built with ⚡️ by Lazynext
</div>
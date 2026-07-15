# Changelog

All notable changes to the Lazynext project are documented in this file.

## [0.1.0-alpha] — 2026-06-27

### Core Engine (`rust/core`)

- **Rust NLE engine**: Non-linear video editing engine implemented entirely in Rust, serving as the single source of truth for all business logic.
- **CRDT state management**: Conflict-free Replicated Data Types (LWW-Register + operation-based) with vector clocks, keyframes, and tombstone-based deletion for real-time collaboration without conflicts.
- **WebGPU compositor**: GPU-accelerated compositor with 17 blend modes (normal, darken, multiply, color-burn, lighten, screen, color-dodge, plus-lighter, overlay, soft-light, hard-light, difference, exclusion, hue, saturation, color, luminosity) and 11 GPU effect shaders (gaussian-blur, chroma-key, glitch, color-grade, fire, portal, vhs, crt, glow, vignette, lut-3d).
- **Command pattern**: Undo/redo system with visitor-pattern serialization for all state mutations.

### Web Application (`apps/web`)

- **Next.js 16**: App Router architecture with React 19, TailwindCSS, and Premium Glassmorphism UI components (shadcn/ui derivatives).
- **Lazynext AI Agent Copilot AI Editor**: LLM-orchestrated autonomous editing agent with smart bins, clip tagging, and natural-language timeline manipulation.
- **Real-time collaboration**: WebSocket-based CRDT sync server enabling multi-user simultaneous editing.
- **Timeline rendering**: Canvas-based timeline with drag-drop, resize, playhead, zoom, and snap-to-grid/element controllers.
- **Preview canvas**: Fabric.js-powered composition preview with interactive transform handles.

### Export & Media

- **5 export formats**: MP4 (H.264/H.265), Apple ProRes, DCP (Digital Cinema Package), AAF (Advanced Authoring Format), and GIF via FFMPEG encoding pipeline with SSE progress streaming.
- **ACES 1.3 color management**: Full Academy Color Encoding System support for professional color workflows.
- **VST3 audio plugin host**: Native VST3 hosting for professional audio processing.
- **Stereoscopic 3D**: Side-by-side and anaglyph stereoscopic rendering support.

### AI & Machine Learning

- **SAM2 rotoscoping**: Segment Anything Model 2 integration for automatic rotoscoping via the pre-processing microservice.
- **Optical flow**: Motion estimation for frame interpolation and temporal effects.
- **Whisper transcription**: Automatic speech-to-text for clip metadata and search.
- **Stable Video Diffusion**: AI-generated video content via the generative studio microservice.

### Desktop & Mobile

- **Desktop app**: GPUI (Zed framework) native application with wgpu rendering calling Rust natively.
- **Mobile app**: React Native with UniFFI-generated native bindings to the Rust core.
- **Browser extension**: Chrome extension for capturing web video directly into the timeline.

### Developer Tools

- **CLI**: Headless command-line renderer for CI/CD and batch processing.
- **MCP server**: Model Context Protocol server with 14 tools, 4 resources, and 4 prompts enabling AI agent integration for timeline manipulation, export, analysis, and project management (both Rust/stdio and Node.js implementations).

### Content Integrity

- **C2PA provenance**: Content Provenance and Authenticity tracking via `rust/provenance` crate, embedding cryptographically verifiable origin metadata.

### Backend Microservices

- **Pre-processing** (Python FastAPI, port 8000): Whisper transcription, SAM2 rotoscoping, NeRF extraction.
- **Generative Studio** (Python FastAPI, port 8001): Stable Video Diffusion, ElevenLabs dubbing, Demucs stem separation.
- **AI Agents** (Node.js/Bun, port 8002): Lazynext AI Agent Copilot LLM orchestration and CRDT WebSocket sync server.
- **Render Service** (Node.js/Bun, port 8003): FFMPEG render farm with SSE progress streaming.
- **API Gateway** (Rust/Axum, port 8005): Centralized REST gateway for all microservices.
- **Collab Server** (Rust/Axum, port 8004): Native CRDT sync server with WebRTC signaling for real-time collaboration.
- **Analytics Service** (Node.js/Bun, port 8006): High-velocity data ingestion and LTV calculation engine.

### Networking & Infrastructure

- **Docker Compose**: Full platform orchestration with `lazynext-network` Docker bridge.
- **Kubernetes**: Optional K8s manifests for GPU-accelerated workloads on self-managed K8s.
- **Docker Compose on Linode**: Infrastructure-as-code for Docker Compose on Linode and PostgreSQL 17 (Docker).
- **P2P sync**: libp2p mesh networking for decentralized peer-to-peer collaboration via `rust/p2p-sync`.

### Observability

- **Grafana**: Dashboards for service health and performance metrics.
- **Prometheus**: Time-series metrics collection across all microservices.
- **Loki**: Structured log aggregation with full-text search.
- **Tempo**: Distributed tracing for request flows across the microservice mesh.

### Storage & Database

- **PostgreSQL**: Primary database with Drizzle ORM migrations and better-auth authentication.
- **IndexedDB/OPFS**: Client-side project storage with 31+ versioned sequential migrations.
- **Stripe**: Payment processing for premium features.
- **Resend**: Transactional email delivery.

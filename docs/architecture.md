# Lazynext: System Architecture & Design

Lazynext operates on a structured, strict monorepo architecture where clear boundaries separate business logic, presentation logic, and external system integrations.

## 1. Core Principle: Rust as the Single Source of Truth

An ongoing architectural migration places **all business logic inside the `rust/` workspace**.

- **Platform-Agnostic:** Code in `rust/` is not tied to any single operating system, UI framework, or visual structure.
- **Independence:** No UI components, React hooks, or framework-specific imports belong here.
- **Shared Domain Model:** By consolidating logic in Rust, we avoid duplicating domain rules, state machines, and data transformations across the diverse UI clients.

## 2. Presentation Layer: The `apps/` Workspace

Each application located in `apps/` is strictly a **UI shell**. They handle rendering, user interactions, and platform-specific device integrations, while offloading logic and heavy computations to the Rust core.

Because each platform has distinct constraints and ideal frameworks, the UI is inherently separated:

- `apps/web/`: A Next.js (React) application serving the browser ecosystem.
- `apps/desktop/`: A native desktop application built using the GPUI (Zed) framework in Rust.
- `apps/mobile/`: A mobile entry point (React Native) serving iOS and Android users.
- `apps/browser-extension/`: A Chrome MV3 extension for capturing web video into the timeline.

**Design Rule for UI Components:**

- Before using or rewriting components, developers must read existing components, as they may already apply critical styling classes and override behaviors necessary for maintaining a cohesive design system.
- Logic is NEVER duplicated between apps. If two apps need to perform the same task, that task must be abstracted into the `rust/` workspace.

## 3. Microservices & Plugins

- **`services/`**: Six backend microservices operate alongside the core application to offload specialized async tasks:
  - `pre-processing` (Python, :8000) — Whisper, SAM2, NeRF
  - `generative-studio` (Python, :8001) — AI video/audio generation
  - `ai-agents` (Node.js, :8002) — LLM orchestration + CRDT sync
  - `render-service` (Node.js, :8003) — FFMPEG render farm
  - `collab-server` (Rust, :8004) — Native CRDT sync + WebRTC signaling
  - `analytics-service` (Node.js, :8006) — Data ingestion + LTV engine
- **`plugins/`**: System extension points that interact with the core structure.

## 4. Directory Overview

```text
Lazynext/
├── apps/               # UI Shells (Next.js, GPUI Desktop, Mobile, Extension)
├── docs/               # System documentation, design docs, ADRs, runbooks
├── rust/               # The single source of truth for all business logic
├── services/           # 7 microservices (Python, Node.js, Rust)
├── packages/           # Shared packages (e.g., api-client)
├── plugins/            # System extensions + plugin SDK
├── terraform/          # Infrastructure as code (base, HA, overlays)
├── k8s/                # Kubernetes deployment configurations
├── ansible/            # Bare-metal provisioning playbooks
├── monitoring/         # Prometheus, Grafana, Loki, Tempo, Alertmanager
├── scripts/            # Infrastructure and build automation scripts
├── config/             # Traefik ingress configuration
├── .github/workflows/  # CI/CD pipelines (13 workflows)
└── jenkins/            # Jenkins pipeline configuration
```

## 5. Development Strategy

When adding new features to Lazynext:

1. **Model the domain in Rust:** Identify the data structures and logical operations, and write them in the `rust/` workspace.
2. **Expose the logic:** Create safe boundaries (e.g. FFI, WebAssembly, or IPC) for the shells to consume.
3. **Build the UI:** Develop the visual interface in the respective `apps/` directory, treating the Rust core as an external, trusted brain.

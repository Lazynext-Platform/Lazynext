# Desktop App (GPUI)

Native macOS desktop editor — wgpu-accelerated video compositing via [GPUI](https://www.gpui.rs/).

## Structure

```
src/
├── main.rs         # App entrypoint: Tokio runtime, NLE init, GPUI event loop
├── dashboard.rs    # Dashboard window: New/Open Project, version badge
└── editor.rs       # NLE Editor: canvas preview, timeline, inspector, AI Copilot
```

## Architecture

- **Rendering**: GPUI (Zed's GPU-native UI framework) with `lazynext_core` driving all business logic.
- **Engine**: Each window opens with a shared `CoreEngine` behind `Arc<Mutex<>>` — renders frames from the CRDT timeline state.
- **AI Copilot**: Inspector panel includes a prompt bar that POSTs to the API Gateway (`/api/v1/autonomous_edit`).
- **Project I/O**: Open/save `.lazynext` project files via `rfd` native file dialogs.

## Build & Run

```bash
cargo run
```

Requires Rust 2024 edition. Ensure `gpui` system dependencies are installed (see [GPUI docs](https://www.gpui.rs/guide)).

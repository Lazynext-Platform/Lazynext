# CLI — Headless Renderer

Clap-based CLI for headless video rendering and AI-powered editing.

## Commands

| Command | Description |
|---------|------------|
| `edit` | AI-powered editing via Chronos Copilot |
| `render` | GPU-accelerated rendering (compositor → ffmpeg) |
| `batch-render` | Batch render multiple projects |
| `ingest` | Media ingestion with ffprobe probing |

## Usage

```bash
# Render a project
cargo run -p lazynext_cli -- render --input project.json --output out.mp4

# AI editing from CLI
cargo run -p lazynext_cli -- edit --project project.json --prompt "cut silences"

# Batch render
cargo run -p lazynext_cli -- batch-render projects/*.json

# Ingest media
cargo run -p lazynext_cli -- ingest --input video.mp4 --project project.json
```

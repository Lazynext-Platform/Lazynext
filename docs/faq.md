# FAQ

## General

### What is Lazynext?

Lazynext is a local-first, agent-native AI video editor. It combines a professional multitrack timeline with conversational AI agents that can read, edit, and export real video projects. Every agent edit is written to real tracks, clips, and captions — you can continue editing manually, undo, or hand the project to another agent.

### Is Lazynext free?

Lazynext is a commercial product. The source code is available in this repository. AI features (chat, generation, transcription) require your own API keys from the respective providers.

### Does Lazynext work offline?

Core editing (timeline, cuts, transitions, effects, captions, export) works fully offline. AI features (chat, generation, cloud transcription) require internet and API keys. Local transcription via whisper.cpp works offline.

### What platforms are supported?

- **macOS**: Apple Silicon (arm64) and Intel (x64)
- **Windows**: x64
- **Linux**: x64 (AppImage)

## Setup

### Why does it require Node.js 24?

Lazynext uses modern Node.js features including built-in `Intl.Segmenter`, native fetch, and ESM. Node 24 is the current LTS release with the best support for these features.

### The dev server won't start

1. Ensure you're running Node.js 24 (`node --version`).
2. Run `npm ci` to install dependencies.
3. Check that port 5199 is not in use.
4. Ensure ffmpeg is installed and on your PATH (`ffmpeg -version`).

### I see `--localstorage-file` warnings

This is a Node.js warning that appears when running under Node 25. It's harmless and does not affect functionality. The project declares `>=24 <25` in `package.json`. For best results, use Node 24.

### `npm ci` fails with onnxruntime-node errors

Set `ONNXRUNTIME_NODE_INSTALL=skip` in your environment:

```bash
ONNXRUNTIME_NODE_INSTALL=skip npm ci
```

This skips the NuGet runtime download that fails on some platforms. The desktop-native ORT runtime ships separately with the desktop build.

## AI and agents

### Which AI providers are supported?

Lazynext routes all LLM requests through a local `/llm` proxy that supports:

- **Anthropic**: Claude models
- **OpenAI**: GPT models
- **Any OpenAI-compatible provider**: set `LLM_BASE_URL` and `LLM_API_KEY`

### How do I connect an external agent?

1. Start Lazynext and open **Settings → MCP**.
2. Copy the bearer token.
3. Configure your agent client (Codex, Claude Code, etc.) with:
   - URL: `http://localhost:5199/api/external-mcp/mcp`
   - Token: the copied bearer token
4. The agent can now use `lazynext_status`, `list_projects`, `target_project`, `begin_edit_session`, and all editing tools.

### Can the agent delete my work?

Agent edits use a proposal-based system. Depending on your approval policy:
- **Auto-approve**: edits are applied immediately (with undo support)
- **Manual review**: you see a proposal and approve/reject before changes are applied

You can always undo any edit with Cmd/Ctrl+Z.

### What are skills?

Skills are domain-specific agent capabilities (e.g., "long-video-to-shorts", "color grading"). They provide the agent with specialized instructions and tool sequences for specific workflows. Skills are loaded from `src/agent/skills/`.

## Export

### What export formats are supported?

- **MP4** (H.264, hardware-accelerated)
- **Audio** (separate audio tracks)
- **Captions** (SRT, VTT)
- **FCPXML** (Final Cut Pro XML for DaVinci Resolve, Final Cut Pro, Premiere Pro)
- **Project archive** (complete project with media for backup or transfer)

### Can I export to DaVinci Resolve?

Yes. Use the FCPXML export. The generated XML includes asset relinking paths, caption data, and timeline structure compatible with DaVinci Resolve, Final Cut Pro, and Adobe Premiere Pro.

## Troubleshooting

### The agent says it can't find my project

Ensure you have an open project in the editor. The agent uses `list_projects` and `target_project` to select the active project. If no project is open, create one first.

### Media shows as offline

1. Check that the media file exists at the original path.
2. If the file moved, use the relink feature in the media pool to point to the new location.
3. For desktop app users, ensure the media directory is accessible (not on an unmounted drive).

### Export fails with a rendering error

1. Ensure ffmpeg is installed and on your PATH.
2. Check that all media is online (not showing as missing).
3. Try reducing the export resolution or quality preset.
4. Check the server console for detailed error messages.

### Caption styles don't look right

1. Open the caption inspector and check the selected style preset.
2. Verify font availability — some presets use specific fonts that may not be installed.
3. Use the caption preview to adjust position, size, and color before exporting.

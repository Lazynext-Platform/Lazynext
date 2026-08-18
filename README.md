<div align="center">
  <img src="public/lazynext-icon.png" width="96" alt="Lazynext" />
</div>

<h1 align="center">Lazynext</h1>

<p align="center">
  <strong>AI video editor — local-first, agent-native, MCP-powered</strong>
</p>

<p align="center">
  Let AI agents read, edit, and export real video projects that remain fully editable.
</p>

---

## What is Lazynext?

Lazynext is a **local-first, agent-native AI video editor**. It brings conversational AI agents and professional timeline editing into the same workspace. Every edit is written to real tracks, clips, transitions, captions, effects, and media inside the project. You can continue editing manually, undo or redo changes, save versions, or hand the project to another agent.

**Lazynext = local video projects + multitrack timeline + AI agents + MCP + production-ready exports.**

### Key features

- **Agent-native**: the built-in agent and external MCP agents share the same editing tools.
- **Real timeline**: multiple video and audio tracks, transitions, effects, LUTs, zooms, and keyframes.
- **Transcript-driven editing**: word-level transcription, text-based cuts, pause handling, speakers, and linked captions.
- **Generation and media**: images, video, speech, music, sound effects, and online media search.
- **Motion Graphics and WebGL**: editable motion templates, custom shaders, visual effects, and transitions.
- **Visual geometry**: in-browser person segmentation and face-safe zones — captions avoid the speaker automatically, reframe follows the subject, and overlay graphics land in empty space.
- **Production-ready exports**: MP4, audio, captions, FCPXML, and complete project data.
- **Local-first**: projects and media stay on your machine by default, while API keys remain server-side.

## Quick start

### Prerequisites

- **Node.js 24** (use `fnm` or `nvm` to install)
- **cmake** (for building whisper.cpp from source on macOS)

### Install and run

```bash
git clone https://github.com/Lazynext-Platform/Lazynext.git
cd Lazynext
npm ci
cp .env.example .env
npm run dev
```

The editor opens at `http://localhost:5199`.

### Configuration

Edit `.env` to add API keys for the features you want to enable:

- **AI Chat**: `LLM_ANTHROPIC_API_KEY`, `LLM_OPENAI_API_KEY`, or any supported provider
- **Generation**: `IMAGE_API_KEY`, `ELEVENLABS_API_KEY`, `MUREKA_API_KEY`, `SEEDANCE_API_KEY`
- **Stock media**: `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY`
- **Cloud transcription**: `ASSEMBLYAI_API_KEY`

The editor runs without any API keys — you just won't have AI chat, generation, or stock media features until you add them.

## Desktop app

Build native installers for macOS, Windows, and Linux:

```bash
npm run desktop:dist          # macOS arm64
npm run desktop:dist:mac-x64  # macOS x64
npm run desktop:dist:win      # Windows
npm run desktop:dist:linux    # Linux
```

## Agent / MCP

Lazynext exposes a Streamable HTTP MCP endpoint at `http://localhost:5199/api/external-mcp/mcp`.

Connect external agents like Codex or Claude Code:

1. Start Lazynext and open **Settings → MCP** to copy the bearer token.
2. Register the MCP server in your agent client.
3. Use `lazynext_status` → `list_projects` → `target_project` → `begin_edit_session` → editing tools → `review_edit_session`.

## Core capabilities

| Area | Capabilities |
|---|---|
| Timeline | Multitrack editing, move, trim, split, ripple edits, snapping, keyframes, markers, undo, redo |
| Visuals | WebGL effects, LUTs, chroma key, zoom, transitions, custom shaders |
| Audio | Multiple audio tracks, sound effects, background music, voice-over, loudness, auto-ducking, vocal isolation |
| Transcript | Transcription jobs, word-level editing, pause compression, search, speakers, clip views |
| Captions | Automatic captions, named styles, translation, timeline overlays, SRT export |
| Motion Graphics | Built-in templates, secure sandbox, custom templates, video rendering |
| AI Generation | Image, video, speech, music, sound-effect jobs with progress tracking |
| Media | Uploads, folders, online image/video/audio search |
| Export | MP4, audio, captions, FCPXML, project import/export, hardware-aware H.264 acceleration |
| Agent | Built-in conversational agent, skills, proposal-based edits, external MCP |

## License

Copyright (c) 2026 Lazynext. All rights reserved.

## Documentation

- [Quick Start](./docs/quick-start.md) — installation, configuration, and first run
- [Features](./docs/features.md) — full capability reference
- [FAQ](./docs/faq.md) — common questions and troubleshooting

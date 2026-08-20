# Introducing Lazynext: AI-Native Video Editing, Local-First and Agent-Powered

**August 2026**

Today we're announcing Lazynext — a local-first, agent-native AI video editor that brings conversational AI directly into your editing workflow. Instead of switching between AI chat tools and a timeline, Lazynext lets AI agents read, edit, and export real video projects. Every edit lands on actual tracks, clips, and captions that stay fully editable.

## Why we built Lazynext

Existing video editors are powerful but slow. AI tools are fast but disconnected from the timeline. We wanted both: the speed of conversational AI with the precision of a professional multitrack editor.

Lazynext is built around three principles:

### 1. Local-first

Your projects, media, and API keys stay on your machine. Core editing works fully offline. No cloud uploads required. The desktop app runs natively on macOS, Windows, and Linux — no browser tab, no subscription, no vendor lock-in.

### 2. Agent-native

Lazynext exposes 118+ editing tools to AI agents through a standard MCP (Model Context Protocol) endpoint. This isn't a chatbot that describes edits — it's an agent that makes them. Connect Claude Code, Codex, or any MCP-compatible agent, and it can:

- Read your timeline, transcripts, and project state
- Create and arrange clips, add transitions, apply LUTs
- Generate images, video, speech, music, and sound effects
- Edit captions with custom styles and karaoke highlighting
- Export to MP4, FCPXML, SRT, and project archives

Every edit goes through a proposal-based system — you review what the agent wants to do before it touches your timeline.

### 3. Powered by the best AI providers

Lazynext integrates with leading AI models for every generation task:

- **Google Vertex AI** — Imagen image generation, Veo video generation, Gemini TTS, all using GCP credits with ADC authentication (no API keys to manage)
- **Google Gemini** — Free-tier chat, transcription, and TTS
- **Pollinations** — Free FLUX image generation, no API key required
- **ElevenLabs, OpenAI, Cartesia, MiniMax, and more** — Premium voice synthesis with bring-your-own-key flexibility

Mix and match providers. Use free options for drafts, premium options for final cuts.

## What you can do with Lazynext

### Edit with AI chat
Describe what you want in plain language. "Add a title card with the project name." "Cut out the silence." "Generate background music that matches the beat." The agent proposes edits, you approve them, and they land on the timeline.

### Transcript-driven editing
Word-level transcription with text-based cuts. Strike through words to delete them. Pause compression, speaker labels, and unified search across all your media.

### Multitrack timeline
Unlimited video and audio tracks with transitions, effects, LUTs, zoom envelopes, keyframes, and markers. Full undo/redo history. Professional-grade editing without leaving the app.

### AI captions
Automatic captions from transcript data. TikTok, YouTube, and custom styles with karaoke highlighting. Export to SRT, VTT, or embedded in your video.

### Audio intelligence
Auto-ducking, vocal isolation, loudness normalization, beat detection, and music-synced cuts. Multiple audio tracks with full mixing.

### Visual intelligence
In-browser person segmentation, face-safe caption zones, auto-reframe for aspect ratio conversion, and AI-assisted color grading.

### Production-ready export
MP4 with hardware-accelerated H.264, separate audio, captions, FCPXML for DaVinci Resolve and Final Cut Pro, and full project archives.

## Download

Lazynext is free and open source, available for macOS (Apple Silicon and Intel), Windows, and Linux:

→ [Download from GitHub Releases](https://github.com/Lazynext-Platform/Lazynext/releases/latest)

Or build from source:

```bash
git clone https://github.com/Lazynext-Platform/Lazynext.git
cd Lazynext
npm ci
cp .env.example .env
npm run dev
```

## Get started

1. Download and install Lazynext
2. Open Settings → API Keys and configure your AI providers (or use free options)
3. Create a new project or import an existing one
4. Start chatting with the AI agent or editing directly on the timeline

Read the [Quick Start guide](https://github.com/Lazynext-Platform/Lazynext/blob/main/docs/quick-start.md) for detailed setup instructions.

## Open source

Lazynext is MIT licensed and fully open source. We believe the best tools are built in the open. Contribute, report bugs, or just star the repo:

→ [GitHub: Lazynext-Platform/Lazynext](https://github.com/Lazynext-Platform/Lazynext)

## What's next

We're just getting started. Here's what's coming:

- **More AI providers** — OpenAI Sora, Runway, Pika, and others
- **Cloud sync** — Optional project sync across devices (paid feature)
- **Plugin marketplace** — Community-built effects, templates, and agent skills
- **Mobile companion** — Review and approve agent edits from your phone

Stay tuned. The future of video editing is conversational, local-first, and open.

---

*Lazynext is built with Electron, React, TypeScript, Remotion, and the Vercel AI SDK. It uses Google Vertex AI for AI generation and supports MCP for external agent integration.*

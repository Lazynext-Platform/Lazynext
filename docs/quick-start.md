# Quick Start

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 24 | Use `fnm` or `nvm` to install and manage |
| npm | 10+ | Ships with Node.js |
| ffmpeg | any | Required for media processing and export |
| cmake | 3.20+ | Only needed for building whisper.cpp from source on macOS |

### Install Node.js 24

```bash
# Using fnm
fnm install 24
fnm use 24

# Using nvm
nvm install 24
nvm use 24
```

### Install ffmpeg

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt-get install ffmpeg

# Windows (winget)
winget install Gyan.FFmpeg
```

## 2. Clone and install

```bash
git clone https://github.com/Lazynext-Platform/Lazynext.git
cd Lazynext
npm ci
cp .env.example .env
```

## 3. Start the dev server

```bash
npm run dev
```

The editor opens at **http://localhost:5199**.

## 4. Add API keys (optional)

Edit `.env` to enable AI features. The editor runs without any keys — you just won't have AI chat, generation, or stock media until you add them.

| Feature | Env var | Provider |
|---|---|---|
| AI Chat | `LLM_ANTHROPIC_API_KEY` | Anthropic (Claude) |
| AI Chat | `LLM_OPENAI_API_KEY` | OpenAI (GPT) |
| AI Chat | `LLM_VERTEX_MODEL` + ADC | Google Vertex AI (Gemini) |
| Image generation | `IMAGE_API_KEY` | Provider-dependent |
| Voice synthesis | `ELEVENLABS_API_KEY` | ElevenLabs |
| Music generation | `MUREKA_API_KEY` | Mureka |
| Video generation | `SEEDANCE_API_KEY` | Seedance |
| Stock photos | `PEXELS_API_KEY` | Pexels |
| Stock photos | `PIXABAY_API_KEY` | Pixabay |
| Stock photos | `UNSPLASH_ACCESS_KEY` | Unsplash |
| Cloud transcription | `ASSEMBLYAI_API_KEY` | AssemblyAI |

### Using Google Vertex AI (recommended for GCP users)

Vertex AI uses Application Default Credentials (ADC) — no API key needed. This routes LLM chat, image generation, video generation, and TTS through your GCP project billing/credits.

```bash
# Install gcloud CLI, then authenticate:
gcloud auth login
gcloud auth application-default login

# Set the project and region in .env:
GCP_PROJECT_ID=your-gcp-project
GCP_REGION=us-central1
LLM_PROVIDER=vertex
LLM_VERTEX_MODEL=gemini-2.5-flash
```

See the [GCP Migration Guide](./gcp-migration-guide.md) for full setup details.

## 5. Build the desktop app (optional)

```bash
npm run desktop:dist          # macOS arm64
npm run desktop:dist:mac-x64  # macOS x64
npm run desktop:dist:win      # Windows
npm run desktop:dist:linux    # Linux
```

Installers are output to `release/`.

## 6. Connect an external agent via MCP

1. Start Lazynext and open **Settings → MCP**.
2. Copy the bearer token.
3. Register the MCP server in your agent client (Codex, Claude Code, etc.):

   ```
   URL:    http://localhost:5199/api/external-mcp/mcp
   Token:  <paste from Settings>
   ```

4. Use the workflow: `lazynext_status` → `list_projects` → `target_project` → `begin_edit_session` → editing tools → `review_edit_session`.

## Next steps

- [Features](./features.md) — full capability reference
- [FAQ](./faq.md) — common questions and troubleshooting

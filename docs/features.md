# Features

## Timeline editing

- **Multitrack**: unlimited video and audio tracks with per-track mute, lock, and visibility
- **Clip operations**: move, trim, split, ripple delete, snap-to-grid, snap-to-clip
- **Transitions**: cross-dissolve, custom WebGL shader transitions, plugin transitions
- **Effects**: WebGL fragment shaders, LUTs (.cube), chroma key, zoom envelopes, background fill
- **Keyframes**: per-clip property animation with easing
- **Markers**: named markers and ranges for navigation
- **Undo / redo**: full edit history with atomic proposal-based agent edits

## Transcript-driven editing

- **Word-level transcription**: cloud (AssemblyAI, Gemini) or local (whisper.cpp) transcription
- **Text-based cuts**: strike through words in the script view to delete them from the timeline
- **Pause handling**: automatic silence detection and compression
- **Speakers**: speaker diarization and labeled speaker tracks
- **Search**: unified visual + spoken media search across all project assets
- **Clip views**: transcript-linked clip selection and navigation

## Captions

- **Automatic captions**: generated from transcript data
- **Named styles**: TikTok, YouTube, custom presets with per-project overrides
- **Translation**: caption translation to multiple languages
- **Timeline overlays**: live preview with karaoke-style word highlighting
- **Manual editing**: add, edit, move, and delete individual cues
- **Export**: SRT, VTT, and embedded caption formats

## AI generation

- **Image generation**: text-to-image with multiple providers:
  - **Vertex Imagen** (`vertex-imagen`): Google `gemini-2.5-flash-image` via Vertex AI — premium quality, uses GCP credits, supports reference images
  - **Pollinations** (`pollinations`): free FLUX model, no API key required
  - **GPT Image** (`gpt-image-2`): OpenAI image generation
  - **Nano Banana** (`nano-banana`): Google Gemini image generation via API key
  - **MiniMax** (`image-01`): MiniMax image generation
  - **WaveSpeed** (`wavespeed`): WaveSpeed AI fast image models
  - **BytePlus** (`byteplus`): BytePlus ModelArk Seedream
- **Video generation**: text-to-video and image-to-video:
  - **Veo** (`veo`): Google Veo 3.1 Lite via Vertex AI — uses GCP credits
  - **Seedance** (`seedance2`): ByteDance Seedance via WaveSpeed
  - **Kling** (`kling`): Kuaishou Kling
  - **Hailuo** (`hailuo`): MiniMax Hailuo
  - **BytePlus** (`byteplus`): BytePlus ModelArk Seedance
- **Speech synthesis**: text-to-speech with multiple voices:
  - **Gemini TTS** (`gemini`): Google `gemini-3.1-flash-tts-preview` — free with Gemini API key
  - **ElevenLabs** (`elevenlabs`): premium voice library
  - **OpenAI** (`openai`): OpenAI TTS
  - **Cartesia** (`cartesia`): low-latency voice generation
  - **MiniMax** (`minimax`), **Doubao** (`doubao`), **Inworld** (`inworld`), **Fish Audio** (`fishaudio`), **Speechify** (`speechify`)
- **Music generation**: text-to-music with structure control (Mureka)
- **Sound effects**: text-to-SFX with semantic matching
- **Progress tracking**: background job queue with live status and retry

## Motion graphics

- **Built-in templates**: title cards, lower thirds, end screens, and more
- **Custom templates**: JSX/React templates with secure sandboxed rendering
- **WebGL shaders**: custom fragment shaders for effects and transitions
- **Plugin packs**: import/export plugin packs with effects, transitions, LUTs, and templates

## Visual intelligence

- **Person segmentation**: in-browser segmentation for subject-aware overlays
- **Face-safe zones**: captions automatically avoid the speaker's face
- **Auto-reframe**: subject-following reframe for aspect ratio conversion
- **Auto-grade**: AI-assisted color grading with scope verification

## Audio

- **Multiple audio tracks**: mix dialogue, music, SFX, and voice-over
- **Auto-ducking**: music automatically ducks under dialogue
- **Vocal isolation**: separate vocals from background music
- **Loudness normalization**: EBU R128 / ATSC A/85 compliance
- **Beat detection**: tempo and beat mapping for music-synced cuts

## Media management

- **Local-first storage**: projects and media stay on your machine
- **Folder organization**: nested media folders with favorites
- **Online search**: Pexels, Pixabay, Unsplash integration for stock media
- **Mobile upload**: QR-code-based phone-to-desktop file transfer
- **Directory watch**: auto-import from watched folders (desktop app)
- **Semantic search**: content-based media search using embeddings

## Export

- **MP4**: hardware-accelerated H.264 encoding
- **Audio**: separate audio track export
- **Captions**: SRT, VTT export
- **FCPXML**: Final Cut Pro XML for round-tripping with professional NLEs
- **Project archive**: complete project import/export with media

## Agent and MCP

- **Built-in agent**: conversational AI editor with proposal-based edits
- **Skills**: domain-specific agent skills (long-video-to-shorts, color grading, etc.)
- **External MCP**: Streamable HTTP MCP endpoint for external agents
- **Tool catalog**: 118+ editing tools exposed to agents
- **Approval policy**: configurable auto-approve or manual review for agent edits
- **Edit sessions**: atomic edit sessions with rollback and review

## Desktop app

- **Cross-platform**: macOS (arm64 + x64), Windows (x64), Linux (x64)
- **Auto-update**: built-in update checker with delta downloads
- **Native menus**: platform-native menu bar and window controls
- **System tray**: background operation with quick project switching
- **Offline**: core editing works without internet; AI features require API keys

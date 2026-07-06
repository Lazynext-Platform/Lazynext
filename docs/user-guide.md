# Lazynext User Guide

Welcome to Lazynext — the AI-native video editor. Type what you want, and the Lazynext AI Agent Copilot builds it on your timeline.

---

## Quick Start: Type. Speak. Edit.

1. **Sign up** at [lazynext.ai](https://lazynext.ai) or `http://localhost:3000` (local)
2. **Create a project** — name it, set resolution and framerate
3. **Import media** — drag-and-drop files or paste a URL
4. **Open the Copilot** — press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)
5. **Type your intent** — e.g., "Cut the silence and add a cinematic color grade"
6. **Review the plan** — Lazynext AI Agent shows what it will do before executing
7. **Approve or refine** — tweak the plan or let it run
8. **Export** — choose your format and deliver

---

## AI Copilot Commands Reference

The Lazynext AI Agent Copilot understands natural language editing. Here are common command patterns:

### Timeline Editing

```
"Cut the silence from all audio tracks"
"Remove all gaps between clips on track 1"
"Add a crossfade transition between clip 3 and clip 4"
"Trim the first 2 seconds from every clip"
"Split clip 2 at the 5-second mark"
"Ripple delete the selected clip"
"Move all clips on track 2 forward by 3 seconds"
```

### Color & Effects

```
"Apply a cinematic color grade to all clips on track 1"
"Add a gaussian blur to clip 5 with sigma 3.0"
"Apply a vignette effect with intensity 0.7 to the entire timeline"
"Color correct clips 1-4 to match clip 5"
"Add a LUT from the 'Cinematic' pack to all video clips"
"Key out the green screen in clip 2 with threshold 0.1"
```

### Audio

```
"Lower background music volume by 10dB during speech segments"
"Add a compressor with threshold -20dB and ratio 4:1 to the voice track"
"Normalize all audio tracks to -16 LUFS"
"Extract vocals from clip 3 using stem separation"
"Add a fade-out to the background music starting at 28 seconds"
"Apply a high-pass filter at 80Hz to track 3"
```

### Text & Captions

```
"Generate auto-captions for the entire timeline"
"Add a title card at the beginning: 'Summer 2026' in bold white text"
"Create lower thirds for all interview clips"
"Style all captions with the 'Modern' preset"
"Burn subtitles into the video on export"
```

### AI Generation

```
"Generate a 5-second establishing shot of a city at sunset"
"Create an AI voiceover reading this script: 'Welcome to...'"
"Dub the dialogue track from English to Spanish"
"Upscale clip 4 to 4K resolution"
"Apply style transfer from reference image to clips 2-4"
```

### Format-Specific

```
"Auto-reframe the timeline for Instagram Reel (9:16, 1080x1920)"
"Create a TikTok-safe version with center crop"
"Export in ProRes 422 HQ for broadcast delivery"
"Generate a DCP for cinema screening"
```

### Multi-step Commands

You can chain instructions in a single prompt:

```
"Import the footage from this folder, cut all silent parts,
add background music at low volume, apply a warm color grade,
add a title card, and export as YouTube 4K"
```

### Tips for Best Results

- **Be specific** — "Cut silence below -40dB" works better than "Make it sound better"
- **Reference clips by position** — "Clip 3" or "the third clip" instead of "that one"
- **Use confirmation mode** for complex edits — the default shows a plan before executing
- **Iterate** — you can say "Actually, make the blur less intense" and Lazynext AI Agent will adjust
- **Context matters** — Lazynext AI Agent reviews your timeline before suggesting operations

---

## Timeline Basics

### Track Types

| Track | Icon | What it holds |
|-------|------|---------------|
| **Video** | 🎬 | Video clips, images, generated video |
| **Audio** | 🎵 | Audio clips, voiceovers, music |
| **Text** | 💬 | Titles, captions, lower thirds |
| **Effect** | ✨ | Adjustment layers for color/effects |

### Track Controls

- **Mute (M)**: Silences the track without deleting it
- **Solo (S)**: Plays only this track, muting all others
- **Lock (L)**: Prevents accidental edits on this track
- **Visibility (👁)**: Hides the track from preview

### Clip Operations

| Action | Shortcut | Description |
|--------|----------|-------------|
| Select | Click | Select a single clip |
| Multi-select | Shift+Click | Select multiple clips |
| Range select | Click+drag | Box select multiple clips |
| Trim start | Drag left edge | Adjust in-point |
| Trim end | Drag right edge | Adjust out-point |
| Split | `S` or `Cmd+B` | Split clip at playhead |
| Delete | `Backspace` | Remove selected clip(s) |
| Ripple delete | `Shift+Backspace` | Remove and close gap |
| Move | Click+drag | Move clip on the timeline |
| Copy/Paste | `Cmd+C` / `Cmd+V` | Duplicate clip(s) |
| Nudge left | `,` | Move 1 frame left |
| Nudge right | `.` | Move 1 frame right |

### Timeline Navigation

| Action | Shortcut |
|--------|----------|
| Play/Pause | `Space` |
| Go to start | `Home` |
| Go to end | `End` |
| Frame forward | `→` |
| Frame backward | `←` |
| Jump to next clip | `↓` |
| Jump to previous clip | `↑` |
| Zoom in | `Cmd+=` |
| Zoom out | `Cmd+-` |
| Zoom to fit | `Cmd+0` |

### Keyframing

Click the keyframe diamond (◆) on any clip property to add a keyframe:

| Animated Properties | |
|---|---|
| Opacity | `0.0–1.0` |
| Scale X/Y | `0.01–10.0` |
| Rotation | `0–360°` |
| Position X/Y | Pixels |
| Volume | `0.0–2.0` |
| Effect intensity | Varies by effect |

Select a keyframe and drag to adjust timing. Right-click for easing options:
- **Linear**: Constant speed between keyframes
- **Ease In**: Slow start, fast finish
- **Ease Out**: Fast start, slow finish
- **Ease In/Out**: Smooth acceleration and deceleration
- **Step (Hold)**: Instant change with no interpolation

---

## Export Formats Guide

### Choose Your Format

| Format | Use Case | Quality | File Size |
|--------|----------|---------|-----------|
| **MP4 (h264)** | YouTube, web, social media | Good–Excellent | Small–Medium |
| **MP4 (h265)** | High quality web delivery | Excellent | Medium |
| **ProRes 422** | Professional editing, color grading | Lossless (visually) | Large |
| **ProRes 4444** | VFX, compositing with alpha | Lossless | Very Large |
| **DCP** | Digital Cinema projection | Maximum | Very Large |
| **AAF** | Avid/Pro Tools interchange | N/A | Small (metadata) |
| **MOV** | Legacy professional formats | Varies | Varies |
| **GIF** | Short loops, memes | Low | Small |

### Delivery Presets

| Preset | Resolution | FPS | Codec | Bitrate | For |
|--------|-----------|-----|-------|---------|-----|
| YouTube 4K | 3840×2160 | 30 | h264 | 45 Mbps | High quality YouTube |
| YouTube 1080p | 1920×1080 | 30 | h264 | 16 Mbps | Standard YouTube |
| Instagram Reel | 1080×1920 | 30 | h264 | 8 Mbps | IG Reels/Stories |
| TikTok | 1080×1920 | 30 | h264 | 8 Mbps | TikTok |
| Broadcast ProRes | 1920×1080 | 29.97 | ProRes 422 HQ | — | TV broadcast |
| DCP 2K | 2048×1080 | 24 | JPEG2000 | 250 Mbps | Cinema |
| AAF Avid | — | — | — | — | Post-production handoff |

### Export Settings

- **Watermark**: Add a subtle watermark (configurable position, opacity)
- **Burn subtitles**: Render captions directly into the video
- **Include audio tracks**: Choose which audio tracks to include
- **In/Out range**: Export only a portion of the timeline
- **Render quality**: Fast (preview) vs Best (final)

### Render Progress

Once you click Export:
1. The render job is queued in the render farm
2. You'll see real-time progress (percentage, ETA, frames rendered)
3. You can close the browser — rendering continues on the server
4. You'll get a notification and download link when complete
5. Or stream the URL via SSE for live progress

---

## Collaboration Guide

### Inviting Collaborators

1. Open your project
2. Click **Share** (top-right toolbar)
3. Enter email addresses of collaborators
4. Set permissions: **Viewer** (read-only) or **Editor** (full edit)
5. Collaborators receive an email invitation

### Real-Time Co-Editing

All changes sync in real-time via CRDT (Conflict-free Replicated Data Types):

- **No locking**: Multiple people can edit the same timeline simultaneously
- **No conflicts**: The CRDT merges changes automatically — no "who saved last" problem
- **See cursors**: Each collaborator's cursor and selection appears in a unique color
- **Presence indicators**: See who's online in the top bar

### WebRTC Voice Chat

- Click the **voice call** button to start an audio call with collaborators
- Built-in WebRTC — no external app needed
- Mute/unmute with the mic button

### Best Practices

- **Communicate intent**: Use comments or the chat panel for complex operations
- **Use tracks wisely**: Assign different tracks to different editors if working in parallel
- **Confirm AI edits**: When multiple people are editing, use confirmation mode for AI commands
- **Save versions**: The platform auto-saves, but you can create named snapshots for milestones

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| `Cmd+K` / `Ctrl+K` | Open Lazynext AI Agent Copilot |
| `Cmd+S` / `Ctrl+S` | Save project |
| `Cmd+Z` / `Ctrl+Z` | Undo |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Redo |
| `Cmd+E` / `Ctrl+E` | Export |
| `Cmd+I` / `Ctrl+I` | Import media |
| `Cmd+Shift+F` / `Ctrl+Shift+F` | Toggle fullscreen preview |

### Timeline

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `J` | Reverse (2x, 4x on repeat) |
| `K` | Stop |
| `L` | Forward (2x, 4x on repeat) |
| `←` / `→` | Frame back/forward (hold Shift for 10 frames) |
| `Home` / `End` | Go to start/end |
| `↑` / `↓` | Jump to previous/next clip boundary |
| `I` | Set in-point |
| `O` | Set out-point |
| `Cmd+=` / `Cmd+-` | Zoom timeline in/out |
| `Cmd+0` | Zoom to fit timeline |

### Editing

| Shortcut | Action |
|----------|--------|
| `S` or `Cmd+B` | Split clip at playhead |
| `Backspace` | Delete selected |
| `Shift+Backspace` | Ripple delete |
| `Cmd+C` / `Cmd+V` | Copy/Paste |
| `Cmd+X` | Cut |
| `Cmd+D` | Duplicate |
| `,` / `.` | Nudge left/right (1 frame) |
| `Shift+,` / `Shift+.` | Nudge left/right (10 frames) |
| `Cmd+R` | Change clip speed/duration |
| `Cmd+T` | Add default transition |
| `M` | Add marker at playhead |

### Tools

| Shortcut | Tool |
|----------|------|
| `V` | Selection tool |
| `B` | Razor (split) tool |
| `A` | Track select forward |
| `Shift+A` | Track select backward |
| `R` | Rate stretch tool |
| `P` | Pen (keyframe) tool |
| `H` | Hand (pan) tool |
| `Z` | Zoom tool |

---

## FAQ

### General

**Q: Is Lazynext free?**
A: There's a free tier with 1080p exports and basic features. Pro ($20/mo) adds 4K export, AI generation credits, and collaboration. Studio ($50/mo) adds unlimited everything, priority rendering, and commercial licensing.

**Q: Does it work offline?**
A: Yes. The desktop app works fully offline. AI features gracefully degrade to local processing when you're offline or don't have API keys configured.

**Q: What formats can I import?**
A: MP4, MOV, MKV, WebM, AVI, WAV, MP3, FLAC, PNG, JPEG, WebP, GIF, TIFF, and more. Almost anything FFmpeg can read.

**Q: Can I use my own AI models?**
A: Yes. Set `LLM_PROVIDER=gemini` to use Google Gemini (add your GEMINI_API_KEY). The platform also supports OpenAI and Anthropic with your own API keys.

### Editing

**Q: How does the AI understand my timeline?**
A: When you send a command, Lazynext AI Agent reads your full timeline state — tracks, clips, durations, effects, metadata — and sends it as context to the LLM. It then generates a plan of specific CRDT operations.

**Q: Can I undo AI edits?**
A: Yes. Every AI operation is a standard CRDT mutation that can be undone with `Cmd+Z`. You can also require confirmation mode so you see the plan before execution.

**Q: Can I use Lazynext for professional work?**
A: Yes. The platform supports ProRes 4444, DCP cinema packages, AAF interchange, broadcast-safe color, C2PA provenance, and DeckLink SDI output on the desktop app.

### Technical

**Q: What are the system requirements?**
A: Web: any modern browser. Desktop: macOS 14+, Windows 11, Linux. GPU recommended but not required — CPU fallback is available. At least 8 GB RAM recommended.

**Q: Where is my data stored?**
A: Projects are stored in PostgreSQL. Media files go to Azure Blob Storage (cloud) or your local disk (desktop). You own your data — we provide export tools for everything.

**Q: How does collaboration handle conflicts?**
A: Lazynext uses CRDTs, not OT (Operational Transforms) or locking. Two people can edit the same clip simultaneously, and the CRDT converges to the same state regardless of operation order. It's the same tech that powers Figma and Linear.

**Q: Can I self-host?**
A: Yes. The entire platform is Dockerized. See `docker-compose.yml` and `docker-compose.prod.yml`. The desktop app connects to any instance via URL configuration.

# Lazynext MCP Server Guide

The Lazynext MCP Server exposes the entire video editing platform as tools, resources, and prompts for AI agents via the Model Context Protocol (MCP).

---

## What is MCP?

The **Model Context Protocol** is an open standard that lets AI applications connect to external tools and data sources. Any MCP-compatible client can use Lazynext's server.

With Lazynext's MCP server, an AI agent can read your timeline, apply edits, add effects, manage tracks, and export videos — all through natural language.

**Protocol**: JSON-RPC 2.0 over stdio (standard input/output)

---

## Available Tools (47 Tools)

> **Note**: Updated 2026-07-05. Feature #35 expanded the MCP server from 14 to 47 tools. Full list below.

The MCP server exposes all editing capabilities as callable tools:

### Core Editing (8 tools)

| Tool | Description |
|------|-------------|
| `run_lazynext_command` | Execute an AI-powered video editing intent on the CRDT timeline |
| `autonomous_edit` | Alias for `run_lazynext_command` — agent-friendly variant |
| `dry_run_edit` | Preview CRDT operations without applying them |
| `get_timeline_state` | Return the full CRDT timeline state as JSON |
| `get_project_info` | Return project metadata: name, framerate, resolution, track/clip counts |
| `apply_crdt_operation` | Apply a serialized CRDT operation to the timeline |
| `undo_operation` | Undo the last CRDT operation |
| `redo_operation` | Redo the last undone CRDT operation |

### Track Management (8 tools)

| Tool | Description |
|------|-------------|
| `add_track` | Add a new track (video, audio, text, effect) to the timeline |
| `remove_track` | Remove a track by its index |
| `manage_tracks` | Bulk operations: reorder, mute, unmute, solo, unsolo, lock, unlock |
| `mute_track` | Mute a specific track by index |
| `unmute_track` | Unmute a specific track by index |
| `solo_track` | Solo a track (mute all others) |
| `lock_track` | Lock a track to prevent editing |
| `unlock_track` | Unlock a previously locked track |

### Clip Operations (6 tools)

| Tool | Description |
|------|-------------|
| `add_clip` | Add a clip to a track (video, audio, text, image) |
| `remove_clip` | Remove a clip from a specific track |
| `trim_clip` | Trim a clip's in/out points |
| `split_clip` | Split a clip at a given frame |
| `move_clip` | Move a clip to a different track or position |
| `duplicate_clip` | Duplicate a clip with optional offset |

### Effects & Keyframes (8 tools)

| Tool | Description |
|------|-------------|
| `apply_effect` | Apply a video or audio effect to a specific clip |
| `remove_effect` | Remove an effect from a clip |
| `set_keyframe` | Set a keyframe on an animated property (opacity, scale, rotation, position) |
| `remove_keyframe` | Remove a keyframe at a specific frame |
| `set_effect_parameter` | Set an effect's parameter value |
| `animate_effect` | Add keyframe animation to an effect parameter |
| `apply_color_grade` | Apply a color grade LUT or preset to a clip |
| `reset_color_grade` | Remove color grading from a clip |

### Export & Media (8 tools)

| Tool | Description |
|------|-------------|
| `export_project` | Export timeline to video file (MP4, ProRes, DCP, AAF, MOV, GIF) |
| `export_frame` | Export a single frame at a given timecode |
| `analyze_media` | Analyze media file for editing recommendations |
| `import_media` | Import multiple media files into the project bin |
| `list_media` | List all media in the project bin with metadata |
| `remove_media` | Remove media from the project bin |
| `transcribe_media` | Transcribe audio from a media file (Whisper) |
| `detect_scenes` | Run scene detection on a video clip |

### Audio Tools (4 tools)

| Tool | Description |
|------|-------------|
| `adjust_audio_level` | Set clip volume level (0.0–2.0) |
| `apply_audio_effect` | Apply EQ, compressor, or reverb to a clip |
| `duck_audio` | Auto-duck audio under speech with sidechain compression |
| `separate_stems` | Separate audio into stems (vocals, drums, bass, other) |

### AI Tools (5 tools)

| Tool | Description |
|------|-------------|
| `ai_generate_broll` | Generate B-roll footage via AI (Fal.ai Kling) |
| `ai_generate_voiceover` | Generate AI voiceover (Edge TTS) |
| `ai_filler_removal` | Remove filler words (um, uh, like) from audio |
| `ai_auto_reframe` | Auto-reframe video for different aspect ratios |
| `ai_caption` | Generate styled captions from transcript

### Tool Signatures

**`run_lazynext_command`** — Main AI editing tool

```json
{
  "name": "run_lazynext_command",
  "description": "Execute an AI-powered video editing intent on the CRDT timeline",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Natural language editing intent"
      },
      "require_plan_approval": {
        "type": "boolean",
        "default": true
      }
    },
    "required": ["prompt"]
  }
}
```

**`add_clip`** — Add media to a track

```json
{
  "name": "add_clip",
  "inputSchema": {
    "type": "object",
    "properties": {
      "track_idx": {"type": "integer", "description": "0-based track index"},
      "id": {"type": "string", "description": "Clip ID"},
      "clip_type": {"type": "string", "description": "video, audio, text, image"},
      "name": {"type": "string", "description": "Display name"},
      "start": {"type": "integer", "description": "Start frame"},
      "end": {"type": "integer", "description": "End frame"}
    },
    "required": ["track_idx", "clip_type", "start", "end"]
  }
}
```

**`set_keyframe`** — Animate clip properties

```json
{
  "name": "set_keyframe",
  "inputSchema": {
    "type": "object",
    "properties": {
      "track_idx": {"type": "integer"},
      "clip_id": {"type": "string"},
      "property": {"type": "string", "description": "opacity, scale_x, scale_y, rotation, position_x, position_y"},
      "frame": {"type": "integer"},
      "value": {"type": "number"},
      "easing": {"type": "string", "description": "linear, step, ease_in, ease_out, ease_in_out"}
    },
    "required": ["track_idx", "clip_id", "property", "frame", "value"]
  }
}
```

**`export_project`** — Render timeline

```json
{
  "name": "export_project",
  "inputSchema": {
    "type": "object",
    "properties": {
      "format": {"type": "string", "description": "mp4, mov, prores, dcp, aaf"},
      "output_path": {"type": "string"},
      "width": {"type": "integer"},
      "height": {"type": "integer"},
      "framerate": {"type": "integer"}
    },
    "required": ["format", "output_path"]
  }
}
```

**`manage_tracks`** — Bulk track operations

```json
{
  "name": "manage_tracks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "operation": {"type": "string", "description": "reorder, mute, unmute, solo, unsolo, lock, unlock"},
      "track_indices": {
        "type": "array",
        "items": {"type": "integer"},
        "description": "Track indices to apply operation to"
      }
    },
    "required": ["operation", "track_indices"]
  }
}
```

---

## Available Resources (4 Resources)

Resources provide read-only data to the AI agent:

| URI | Name | Description |
|-----|------|-------------|
| `lazynext://timeline/current` | Current Timeline State | Full CRDT timeline as JSON |
| `lazynext://project/info` | Project Information | Name, resolution, framerate, track/clip counts |
| `lazynext://timeline/tracks` | Track List | All tracks with clip counts and types |
| `lazynext://crdt/operation-log` | CRDT Operation Log | Full append-only operation log for sync/debug |

---

## Prompt Templates (4 Prompts)

Pre-built prompts for common editing workflows:

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `edit_video` | Edit a video using natural language | `intent` (required) — what to do |
| `create_project` | Create a new editing project | `name` (required), width, height, framerate |
| `export_timeline` | Export the current timeline to video | format, output_path |
| `analyze_and_edit` | Analyze media and suggest/apply edits | `file_path` (required) |

---

## Authentication

Set `LAZYNEXT_MCP_API_KEY` as an environment variable. Both modes require it:

```bash
export LAZYNEXT_MCP_API_KEY="lz_sk_your_api_key_here"
```

The key is passed in JSON-RPC params (`_api_key` field) for every authenticated request.

---

## How to Connect

### MCP Client Setup

Add to your MCP client's configuration file:

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "/path/to/lazynext_mcp_server",
      "env": {
        "LAZYNEXT_MCP_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

Restart your MCP client. The Lazynext tools will appear in the tools menu.

### Cursor

Add to Cursor's MCP configuration (Settings → MCP):

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "/path/to/lazynext_mcp_server",
      "env": {
        "LAZYNEXT_MCP_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Cline (VS Code)

Add to Cline's MCP settings:

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "/path/to/lazynext_mcp_server",
      "env": {
        "LAZYNEXT_MCP_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Zed

Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "lazynext": {
      "command": {
        "path": "/path/to/lazynext_mcp_server",
        "env": {
          "LAZYNEXT_MCP_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

### Any MCP Client (Generic)

The server uses stdio transport. Point your MCP client at the compiled binary:

```bash
# Binary location after build
./target/release/lazynext_mcp_server
```

---

## Transport Modes

### stdio (Default)

Standard MCP transport — connects via stdin/stdout pipes. Used by all desktop MCP clients.

```bash
cargo run -p lazynext_mcp_server
```

### SSE (HTTP Streaming)

For web-based MCP clients or testing:

```bash
cargo run -p lazynext_mcp_server -- --sse
# Server starts on port 9000 with Server-Sent Events
```

---

## Example Workflows

### Workflow 1: Create and Edit a Project

```
AI → tools/call: get_project_info()
AI → Result: "No project loaded"

AI → prompts/get: create_project
    arguments: { "name": "Summer Recap", "width": 1920, "height": 1080, "framerate": 24 }
AI → Result: "Create a new project named 'Summer Recap' at 1920x1080 @ 24fps"

AI → tools/call: add_track({ "kind": "video" })
AI → tools/call: add_track({ "kind": "audio" })

AI → tools/call: run_lazynext_command({
    "prompt": "Import drone footage and add background music at 30% volume",
    "require_plan_approval": false
})
AI → Result: "Executed 2 operations: imported drone.mp4, added music.mp3 at 0.3 volume"
```

### Workflow 2: Analyze and Enhance

```
AI → tools/call: analyze_media({ "file_path": "/videos/interview.mp4" })
AI → Result: "Found 12 scenes, 3 silence regions >500ms, average luminance: 0.45"

AI → tools/call: run_lazynext_command({
    "prompt": "Cut silence from the interview, apply a warm color grade, add lower thirds for speaker name 'Jane Doe'"
})
AI → Result: "Plan generated. 3 operations: cut 3 silence regions, apply warm LUT, add text overlay"
```

### Workflow 3: Multi-step Export

```
AI → tools/call: run_lazynext_command({
    "prompt": "Auto-reframe for Instagram Reel 9:16"
})
AI → Result: "Auto-reframed. Subject tracked and centered in 9:16 crop."

AI → tools/call: export_project({
    "format": "mp4",
    "output_path": "/renders/reel_final.mp4",
    "width": 1080,
    "height": 1920,
    "framerate": 30
})
AI → Result: "Export complete. File: /renders/reel_final.mp4 (45 MB)"
```

### Workflow 4: Keyframe Animation

```
AI → tools/call: set_keyframe({
    "track_idx": 0,
    "clip_id": "clip_title",
    "property": "opacity",
    "frame": 0,
    "value": 0.0,
    "easing": "ease_in"
})

AI → tools/call: set_keyframe({
    "track_idx": 0,
    "clip_id": "clip_title",
    "property": "opacity",
    "frame": 24,
    "value": 1.0,
    "easing": "ease_in"
})
AI → Result: "Keyframe set: title fades in over first second"
```

---

## Building from Source

```bash
cd rust/mcp-server
cargo build --release
# Binary at: target/release/lazynext_mcp_server
```

### Running Tests

```bash
cd rust/mcp-server
cargo test
```

---

## Troubleshooting

### "Unauthorized" Error

Ensure `LAZYNEXT_MCP_API_KEY` is set in your environment and matches what the server expects.

### Tools Don't Appear in Client

1. Verify the MCP server binary is at the path specified in your client config
2. Check client logs for connection errors
3. Test manually: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_api_key":"your_key"}}' | ./lazynext_mcp_server`

### "Method not found"

Some tools accept aliases. For example, both `run_lazynext_command` and `autonomous_edit` dispatch to the same handler.

### SSE Mode Not Responding

Check that port 9000 is available and not blocked by a firewall. The SSE server is for development/testing — stdio is the primary transport.

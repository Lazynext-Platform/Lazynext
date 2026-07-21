# MCP Integration Guide for Claude Desktop and Hermes Agents

This guide provides comprehensive instructions for integrating the Lazynext MCP Server with Claude Desktop and Hermes Agents using the Model Context Protocol (MCP).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Available Tools](#available-tools)
4. [Resources](#resources)
5. [Prompt Templates](#prompt-templates)
6. [Claude Desktop Integration](#claude-desktop-integration)
7. [Hermes Agents Integration](#hermes-agents-integration)
8. [Usage Examples](#usage-examples)
9. [Troubleshooting](#troubleshooting)
10. [Security Considerations](#security-considerations)

## Overview

The Lazynext MCP Server implements the Model Context Protocol to provide seamless integration between Lazynext's audio editing capabilities and AI agents like Claude Desktop and Hermes. This integration enables:

- **Natural Language Control**: Edit audio projects using conversational commands
- **Automated Workflows**: Create complex editing workflows through AI orchestration
- **Context-Aware Assistance**: AI agents can access project state, presets, and documentation
- **Multi-Agent Collaboration**: Multiple agents can work on the same project simultaneously

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Claude Desktop │         │  Hermes Agents   │         │  Other MCP      │
│     (Client)    │         │     (Client)     │         │    Clients      │
└────────┬────────┘         └────────┬─────────┘         └────────┬────────┘
         │                           │                            │
         │   MCP Protocol (JSON-RPC) │                            │
         │                           │                            │
         └───────────────────────────┼────────────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   MCP Server        │
                          │   (Lazynext)        │
                          │                     │
                          │ - Tools (81)        │
                          │ - Resources (10)    │
                          │ - Prompts (8)       │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Lazynext Core     │
                          │   Audio Engine      │
                          └─────────────────────┘
```

### Connection Flow

1. **Client Initialization**: MCP client (Claude/Hermes) starts the Lazynext MCP server
2. **Capability Negotiation**: Server advertises available tools, resources, and prompts
3. **Tool Invocation**: Client requests tool execution with parameters
4. **Execution**: Server executes tool against Lazynext engine
5. **Response**: Results returned to client in standardized format

## Available Tools

The Lazynext MCP Server provides **81 tools** organized into 7 categories:

### 1. Core Editing Tools (15 tools)
- `open_project` - Open existing audio project
- `create_project` - Create new project with specifications
- `save_project` - Save current project state
- `import_audio` - Import audio files into project
- `export_audio` - Export project to various formats
- `get_project_info` - Retrieve project metadata
- `list_tracks` - List all tracks in project
- `add_track` - Add new track to project
- `delete_track` - Remove track from project
- `duplicate_track` - Copy track with all settings
- `rename_track` - Change track name
- `reorder_tracks` - Change track order
- `split_track` - Split track at specified position
- `merge_tracks` - Combine multiple tracks
- `get_timeline_info` - Get timeline information

### 2. Audio Manipulation Tools (18 tools)
- `trim_audio` - Trim audio clip to specified range
- `fade_in` - Apply fade-in effect
- `fade_out` - Apply fade-out effect
- `crossfade` - Create crossfade between clips
- `normalize` - Normalize audio levels
- `change_speed` - Adjust playback speed
- `change_pitch` - Modify pitch without affecting speed
- `reverse_audio` - Reverse audio clip
- `silence_detection` - Detect silent sections
- `remove_silence` - Automatically remove silence
- `time_stretch` - Stretch/compress time
- `beat_detection` - Detect beats and tempo
- `transient_detection` - Identify transients
- `zero_crossing_edit` - Edit at zero crossings
- `gain_adjustment` - Adjust gain/volume
- `pan_adjustment` - Set stereo pan position
- `mute_track` - Mute/unmute track
- `solo_track` - Solo/unsolo track

### 3. Effects & Processing Tools (20 tools)
- `apply_eq` - Apply equalization
- `apply_compression` - Apply dynamic compression
- `apply_reverb` - Add reverb effect
- `apply_delay` - Add delay/echo effect
- `apply_chorus` - Apply chorus effect
- `apply_flanger` - Apply flanger effect
- `apply_distortion` - Add distortion/saturation
- `apply_noise_gate` - Apply noise gate
- `apply_deesser` - Reduce sibilance
- `apply_limiter` - Apply peak limiting
- `apply_expander` - Apply expansion
- `apply_filter` - Apply high/low/band pass filter
- `apply_tremolo` - Apply tremolo effect
- `apply_vibrato` - Apply vibrato effect
- `apply_wahwah` - Apply wah-wah effect
- `apply_phaser` - Apply phaser effect
- `apply_bitcrusher` - Apply bit reduction
- `apply_stereo_enhancer` - Widen stereo image
- `apply_vocal_transformer` - Transform vocal characteristics
- `batch_apply_effects` - Apply multiple effects at once

### 4. AI-Powered Tools (12 tools)
- `ai_noise_reduction` - AI-based noise removal
- `ai_vocal_isolation` - Extract vocals from mix
- `ai_music_separation` - Separate instruments (stems)
- `ai_speech_enhancement` - Enhance speech clarity
- `ai_mastering` - AI-powered mastering
- `ai_tempo_detection` - Detect tempo automatically
- `ai_key_detection` - Detect musical key
- `ai_genre_classification` - Classify music genre
- `ai_mood_analysis` - Analyze emotional content
- `ai_auto_mix` - Automatic mixing suggestions
- `ai_level_matching` - Match levels across tracks
- `ai_silence_filler` - Intelligently fill gaps

### 5. Color & Visual Tools (6 tools)
- `set_track_color` - Set track color
- `get_color_palette` - Retrieve color palettes
- `apply_waveform_color` - Customize waveform display
- `set_marker_color` - Color-code markers
- `theme_customization` - Change UI theme
- `visual_feedback_config` - Configure visual feedback

### 6. Export & Rendering Tools (7 tools)
- `export_to_mp3` - Export as MP3
- `export_to_wav` - Export as WAV
- `export_to_flac` - Export as FLAC
- `export_to_aac` - Export as AAC
- `export_to_ogg` - Export as OGG
- `batch_export` - Export multiple formats
- `render_preview` - Generate preview render

### 7. Track Management Tools (3 tools)
- `track_routing` - Configure track routing
- `bus_management` - Manage bus sends/returns
- `automation_control` - Control automation curves

## Resources

The MCP server exposes **10 resources** for context retrieval:

### Project Resources
- `lazynext://project/current` - Current project state
- `lazynext://project/tracks` - All track information
- `lazynext://project/timeline` - Timeline and arrangement data
- `lazynext://project/history` - Undo/redo history

### Configuration Resources
- `lazynext://config/preferences` - User preferences
- `lazynext://config/keybindings` - Keyboard shortcuts
- `lazynext://config/workspaces` - Workspace layouts

### Asset Resources
- `lazynext://assets/presets` - Effect and instrument presets
- `lazynext://assets/templates` - Project templates
- `lazynext://assets/documentation` - Built-in documentation

### Resource URI Format
```
lazynext://<resource_type>/<resource_id>
```

### Example Resource Access
```json
{
  "method": "resources/read",
  "params": {
    "uri": "lazynext://project/current"
  }
}
```

## Prompt Templates

The server provides **8 prompt templates** for common workflows:

### 1. Quick Start Project
```
Create a new podcast project with:
- Sample rate: 48kHz
- Bit depth: 24-bit
- 3 tracks: Voice, Music, SFX
- Default duration: 30 minutes
```

### 2. Noise Reduction Workflow
```
Apply AI noise reduction to selected track:
1. Analyze noise profile from selection
2. Apply adaptive noise reduction
3. Preview result
4. Fine-tune parameters if needed
```

### 3. Podcast Editing
```
Edit podcast episode:
1. Remove long silences (>500ms)
2. Apply voice EQ preset
3. Add intro/outro music
4. Normalize to -16 LUFS
5. Export as MP3 128kbps
```

### 4. Music Mastering
```
Master music track:
1. Analyze frequency spectrum
2. Apply multiband compression
3. Add subtle saturation
4. Limit to -1 dBTP
5. Target loudness: -14 LUFS
```

### 5. Vocal Production
```
Process vocal track:
1. High-pass filter at 80Hz
2. De-essing at 6kHz
3. Compression 4:1 ratio
4. Add plate reverb (1.2s decay)
5. Subtle auto-tune correction
```

### 6. Batch Processing
```
Batch process multiple files:
1. Import all files from folder
2. Apply normalize to -1dB
3. Add fade in/out (100ms)
4. Export to specified format
5. Organize in output folder
```

### 7. Stem Separation
```
Separate audio into stems:
1. Analyze mixed audio
2. Extract: Vocals, Drums, Bass, Other
3. Create separate tracks for each
4. Align timing perfectly
5. Allow individual processing
```

### 8. Accessibility Enhancement
```
Enhance audio for accessibility:
1. Increase speech clarity
2. Reduce background noise
3. Add audio descriptions marker
4. Ensure compliance with WCAG
5. Generate transcript markers
```

## Claude Desktop Integration

### Prerequisites
- Claude Desktop app installed (v0.2.0 or later)
- Node.js 18+ installed
- Lazynext MCP Server built and tested

### Installation Steps

#### Step 1: Build MCP Server
```bash
cd /workspace/services/mcp-server
npm install
npm run build
```

#### Step 2: Configure Claude Desktop

**macOS:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "node",
      "args": ["/absolute/path/to/workspace/services/mcp-server/dist/index.js"],
      "env": {
        "LAZYNEXT_PROJECT_PATH": "/path/to/projects",
        "DEBUG": "true"
      }
    }
  }
}
```

**Windows:**
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "node",
      "args": ["C:\\path\\to\\workspace\\services\\mcp-server\\dist\\index.js"],
      "env": {
        "LAZYNEXT_PROJECT_PATH": "C:\\Users\\YourName\\Documents\\LazynextProjects",
        "DEBUG": "true"
      }
    }
  }
}
```

**Linux:**
Edit `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "node",
      "args": ["/home/user/workspace/services/mcp-server/dist/index.js"],
      "env": {
        "LAZYNEXT_PROJECT_PATH": "/home/user/lazynext-projects",
        "DEBUG": "true"
      }
    }
  }
}
```

#### Step 3: Restart Claude Desktop
Close and reopen Claude Desktop to load the new MCP server configuration.

#### Step 4: Verify Connection
In Claude Desktop, type:
```
List available Lazynext tools
```

You should see all 81 tools listed with their descriptions.

### Using MCP in Claude Desktop

#### Example Conversations

**Creating a Project:**
```
User: Create a new podcast project with 3 tracks for voice, music, and sound effects.

Claude: I'll create a new podcast project for you using Lazynext.
[Uses create_project tool]
Project created successfully with:
- Name: Podcast Episode 1
- Sample Rate: 48kHz
- Bit Depth: 24-bit
- Tracks: Voice, Music, SFX
Would you like to import any audio files?
```

**Editing Audio:**
```
User: Remove all silences longer than 500ms from the voice track and apply noise reduction.

Claude: I'll clean up the voice track by removing silences and reducing noise.
[Uses silence_detection, remove_silence, ai_noise_reduction tools]
Done! I've removed 12 silent sections and applied AI noise reduction.
The background noise has been reduced by approximately 18dB.
```

**Exporting:**
```
User: Export the final mix as MP3 and WAV formats.

Claude: I'll export your project in both formats.
[Uses export_to_mp3, export_to_wav tools]
Export complete:
- MP3: /exports/podcast_ep1.mp3 (128kbps, 45.2MB)
- WAV: /exports/podcast_ep1.wav (24-bit, 523.8MB)
```

## Hermes Agents Integration

### Prerequisites
- Python 3.9+ installed
- Hermes Agent framework installed
- Lazynext MCP Server running

### Installation Methods

#### Method 1: YAML Configuration

Create `hermes_config.yaml`:

```yaml
agents:
  - name: audio_editor
    type: mcp_client
    mcp:
      server_command: "node"
      server_args:
        - "/workspace/services/mcp-server/dist/index.js"
      connection_timeout: 30
      tools_enabled:
        - "open_project"
        - "import_audio"
        - "trim_audio"
        - "apply_eq"
        - "export_to_mp3"
      resources_enabled:
        - "lazynext://project/current"
        - "lazynext://assets/presets"
    capabilities:
      - audio_editing
      - batch_processing
      - quality_control
```

Load configuration:
```python
from hermes import AgentManager

manager = AgentManager.from_yaml("hermes_config.yaml")
agent = manager.get_agent("audio_editor")
```

#### Method 2: Python SDK

```python
from hermes.agents import MCPAgent
from hermes.mcp import MCPClient

# Initialize MCP client
client = MCPClient(
    server_command="node",
    server_args=["/workspace/services/mcp-server/dist/index.js"],
    env={
        "LAZYNEXT_PROJECT_PATH": "/path/to/projects",
        "DEBUG": "false"
    }
)

# Create agent with MCP capabilities
audio_agent = MCPAgent(
    name="LazynextAudioEditor",
    mcp_client=client,
    system_prompt="""You are an expert audio editor with access to 
    professional audio editing tools. Help users edit their audio 
    projects efficiently.""",
    allowed_tools=["*"],  # Or specify individual tools
    max_iterations=10
)

# Connect and list tools
await audio_agent.connect()
tools = await audio_agent.list_tools()
print(f"Available tools: {len(tools)}")
```

### Advanced Hermes Integration

#### Multi-Agent Workflow

```python
from hermes.agents import MCPAgent, CoordinatorAgent
from hermes.workflow import Workflow

# Create specialized agents
editing_agent = MCPAgent(
    name="Editor",
    mcp_client=editing_client,
    specialty="audio_editing"
)

mastering_agent = MCPAgent(
    name="MasteringEngineer",
    mcp_client=mastering_client,
    specialty="audio_mastering"
)

quality_agent = MCPAgent(
    name="QualityControl",
    mcp_client=qc_client,
    specialty="quality_assurance"
)

# Define workflow
workflow = Workflow(name="PodcastProduction")

workflow.add_step(
    name="edit_episode",
    agent=editing_agent,
    task="Remove silences, apply EQ, add music beds",
    next_step="master_episode"
)

workflow.add_step(
    name="master_episode",
    agent=mastering_agent,
    task="Apply mastering chain, loudness normalization",
    next_step="quality_check"
)

workflow.add_step(
    name="quality_check",
    agent=quality_agent,
    task="Verify audio quality, check for artifacts",
    next_step=None
)

# Execute workflow
result = await workflow.execute(input_project="episode_raw.wav")
```

#### Custom Tool Extension

```python
from hermes.tools import Tool
from typing import Dict, Any

class SmartFadeTool(Tool):
    """Intelligent fade that adapts to audio content"""
    
    name = "smart_fade"
    description = "Apply content-aware fade based on audio analysis"
    
    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        # Analyze audio content
        analysis = await self.analyze_audio(params["track_id"])
        
        # Determine optimal fade curve
        if analysis["has_percussion"]:
            fade_curve = "logarithmic"
            fade_duration = 200  # ms
        elif analysis["is_vocal"]:
            fade_curve = "exponential"
            fade_duration = 300
        else:
            fade_curve = "linear"
            fade_duration = 250
        
        # Apply fade via MCP
        return await self.mcp_client.call_tool(
            "fade_out",
            {
                "track_id": params["track_id"],
                "duration_ms": fade_duration,
                "curve": fade_curve
            }
        )

# Register custom tool
audio_agent.register_tool(SmartFadeTool())
```

## Usage Examples

### Example 1: Podcast Production Pipeline

```python
# Complete podcast production workflow
async def produce_podcast(episode_number: int):
    # Create project
    project = await agent.call_tool(
        "create_project",
        {
            "name": f"Episode {episode_number}",
            "sample_rate": 48000,
            "bit_depth": 24,
            "tracks": ["Voice", "Intro Music", "Outro Music", "SFX"]
        }
    )
    
    # Import voice recording
    await agent.call_tool(
        "import_audio",
        {"track": "Voice", "file": f"recordings/ep{episode_number}_voice.wav"}
    )
    
    # Clean up voice
    await agent.call_tool("remove_silence", {"track": "Voice", "threshold_ms": 500})
    await agent.call_tool("ai_noise_reduction", {"track": "Voice", "strength": 0.7})
    
    # Apply voice processing
    await agent.call_tool(
        "apply_eq",
        {"track": "Voice", "preset": "podcast_voice_clarity"}
    )
    await agent.call_tool(
        "apply_compression",
        {"track": "Voice", "ratio": 4, "threshold_db": -18}
    )
    
    # Import and position music
    await agent.call_tool(
        "import_audio",
        {"track": "Intro Music", "file": "assets/intro_theme.wav"}
    )
    await agent.call_tool(
        "import_audio",
        {"track": "Outro Music", "file": "assets/outro_theme.wav"}
    )
    
    # Auto-level everything
    await agent.call_tool("ai_level_matching", {"target_lufs": -16})
    
    # Export
    await agent.call_tool(
        "export_to_mp3",
        {
            "output_path": f"exports/episode_{episode_number}.mp3",
            "bitrate": 128
        }
    )
    
    return f"Episode {episode_number} produced successfully!"
```

### Example 2: Batch Audio Processing

```python
async def batch_process_folder(input_folder: str, output_folder: str):
    import os
    
    # Get list of audio files
    files = [f for f in os.listdir(input_folder) if f.endswith(('.wav', '.mp3'))]
    
    results = []
    for filename in files:
        # Create project for each file
        project = await agent.call_tool(
            "create_project",
            {"name": filename, "tracks": ["Main"]}
        )
        
        # Import
        await agent.call_tool(
            "import_audio",
            {"track": "Main", "file": os.path.join(input_folder, filename)}
        )
        
        # Process
        await agent.call_tool("normalize", {"track": "Main", "target_db": -1})
        await agent.call_tool("fade_in", {"track": "Main", "duration_ms": 100})
        await agent.call_tool("fade_out", {"track": "Main", "duration_ms": 100})
        
        # Export
        output_name = f"processed_{filename}"
        await agent.call_tool(
            "export_to_mp3",
            {"output_path": os.path.join(output_folder, output_name), "bitrate": 192}
        )
        
        results.append({"input": filename, "output": output_name, "status": "success"})
    
    return results
```

### Example 3: AI-Assisted Mixing

```python
async def ai_assisted_mix(project_path: str):
    # Open project
    await agent.call_tool("open_project", {"path": project_path})
    
    # Get AI mixing suggestions
    suggestions = await agent.call_tool("ai_auto_mix", {})
    
    print("AI Mixing Suggestions:")
    for suggestion in suggestions["recommendations"]:
        print(f"- {suggestion['track']}: {suggestion['action']}")
        
        # Apply suggestion if confidence is high
        if suggestion["confidence"] > 0.8:
            if suggestion["action_type"] == "eq":
                await agent.call_tool(
                    "apply_eq",
                    {
                        "track": suggestion["track"],
                        "settings": suggestion["parameters"]
                    }
                )
            elif suggestion["action_type"] == "compression":
                await agent.call_tool(
                    "apply_compression",
                    {
                        "track": suggestion["track"],
                        **suggestion["parameters"]
                    }
                )
            elif suggestion["action_type"] == "level":
                await agent.call_tool(
                    "gain_adjustment",
                    {
                        "track": suggestion["track"],
                        "gain_db": suggestion["parameters"]["adjustment_db"]
                    }
                )
    
    # Final master bus processing
    await agent.call_tool("apply_limiter", {"threshold_db": -1, "ceiling_db": -0.3})
    await agent.call_tool("ai_mastering", {"target_lufs": -14, "genre": "podcast"})
    
    return "Mix completed with AI assistance"
```

## Troubleshooting

### Common Issues

#### 1. MCP Server Not Starting

**Symptoms:**
- Claude Desktop shows "MCP server failed to connect"
- No tools appear in tool list

**Solutions:**
```bash
# Check if server builds correctly
cd /workspace/services/mcp-server
npm run build

# Test server manually
node dist/index.js

# Check for errors in logs
tail -f ~/.claude/mcp_logs/lazynext.log
```

#### 2. Tools Not Appearing

**Symptoms:**
- Server connects but tools don't show up
- Empty tool list in Claude

**Solutions:**
- Verify MCP protocol version compatibility
- Check tool registration in server code
- Restart Claude Desktop completely
- Clear MCP cache: `rm -rf ~/Library/Application\ Support/Claude/mcp_cache`

#### 3. Permission Denied Errors

**Symptoms:**
- "Cannot write to project directory"
- "Access denied when exporting"

**Solutions:**
```bash
# Fix permissions on macOS/Linux
chmod -R 755 /path/to/projects
chown -R $USER:staff /path/to/projects

# On Windows, run Claude Desktop as Administrator
# Or grant full control to project folder
```

#### 4. Performance Issues

**Symptoms:**
- Slow tool execution
- Timeout errors
- High CPU usage

**Solutions:**
- Reduce concurrent operations
- Increase timeout in config: `"connection_timeout": 60`
- Use SSD for project storage
- Close other audio applications
- Enable hardware acceleration if available

#### 5. Audio Format Compatibility

**Symptoms:**
- "Unsupported audio format" errors
- Export failures

**Solutions:**
- Verify FFmpeg is installed and in PATH
- Check supported formats in documentation
- Convert source files to WAV before importing
- Update audio codec libraries

### Debug Mode

Enable detailed logging:

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "node",
      "args": ["/path/to/server.js"],
      "env": {
        "DEBUG": "true",
        "LOG_LEVEL": "debug",
        "LOG_FILE": "/tmp/lazynext-mcp.log"
      }
    }
  }
}
```

View logs:
```bash
# Real-time log monitoring
tail -f /tmp/lazynext-mcp.log

# Filter for errors
grep ERROR /tmp/lazynext-mcp.log
```

## Security Considerations

### Best Practices

1. **Token Management**
   - Never hardcode API tokens in configuration files
   - Use environment variables for sensitive data
   - Rotate tokens regularly

2. **File System Access**
   - Restrict MCP server to specific project directories
   - Use sandboxed environments when possible
   - Validate all file paths before access

3. **Network Security**
   - Don't expose MCP server to network unless necessary
   - Use TLS for remote connections
   - Implement authentication for remote access

4. **Input Validation**
   - Sanitize all user inputs
   - Validate audio file formats
   - Check parameter ranges

5. **Resource Limits**
   - Set memory limits for MCP server
   - Limit concurrent operations
   - Implement request timeouts

### Example Secure Configuration

```json
{
  "mcpServers": {
    "lazynext": {
      "command": "node",
      "args": ["/opt/lazynext/mcp-server/dist/index.js"],
      "env": {
        "LAZYNEXT_PROJECT_PATH": "/home/user/audio-projects",
        "LAZYNEXT_MAX_MEMORY": "2048",
        "LAZYNEXT_ALLOWED_FORMATS": "wav,mp3,flac,aac",
        "NODE_ENV": "production"
      },
      "disabled": false
    }
  }
}
```

## Performance Optimization

### Server-Side Optimizations

1. **Enable Caching**
```javascript
// In MCP server
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

async function getCachedProjectInfo(projectId) {
  const cached = cache.get(projectId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  // Fetch fresh data
  const data = await fetchProjectInfo(projectId);
  cache.set(projectId, { data, timestamp: Date.now() });
  return data;
}
```

2. **Batch Operations**
```javascript
// Instead of multiple single calls
for (const track of tracks) {
  await applyEffect(track, 'eq');
}

// Use batch operation
await batchApplyEffect(tracks, 'eq');
```

3. **Lazy Loading**
```javascript
// Load heavy modules only when needed
let audioEngine = null;

async function getAudioEngine() {
  if (!audioEngine) {
    audioEngine = await import('./audio-engine.js');
  }
  return audioEngine;
}
```

### Client-Side Optimizations

1. **Connection Pooling**
```python
# Reuse MCP connections
class MCPConnectionPool:
    def __init__(self, max_connections=5):
        self.pool = asyncio.Queue(maxsize=max_connections)
    
    async def get_connection(self):
        return await self.pool.get()
    
    async def return_connection(self, conn):
        await self.pool.put(conn)
```

2. **Request Debouncing**
```python
# Prevent rapid successive calls
from functools import wraps
import asyncio

def debounce(wait_time):
    def decorator(func):
        task = None
        @wraps(func)
        async def wrapper(*args, **kwargs):
            nonlocal task
            if task:
                task.cancel()
            task = asyncio.create_task(func(*args, **kwargs))
            await asyncio.sleep(wait_time)
            return await task
        return wrapper
    return decorator
```

## Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV LAZYNEXT_PROJECT_PATH=/projects
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Run with Docker:
```bash
docker build -t lazynext-mcp .
docker run -d \
  -v /host/projects:/projects \
  -e LAZYNEXT_PROJECT_PATH=/projects \
  -p 3000:3000 \
  --name lazynext-mcp \
  lazynext-mcp
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lazynext-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lazynext-mcp
  template:
    metadata:
      labels:
        app: lazynext-mcp
    spec:
      containers:
      - name: mcp-server
        image: lazynext/mcp-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: LAZYNEXT_PROJECT_PATH
          value: /projects
        volumeMounts:
        - name: projects-storage
          mountPath: /projects
        resources:
          limits:
            memory: "2Gi"
            cpu: "2000m"
          requests:
            memory: "1Gi"
            cpu: "1000m"
      volumes:
      - name: projects-storage
        persistentVolumeClaim:
          claimName: lazynext-projects-pvc
```

## Conclusion

The Lazynext MCP Server integration provides powerful capabilities for AI-assisted audio editing. By following this guide, you can:

- ✅ Connect Claude Desktop or Hermes Agents to Lazynext
- ✅ Access all 81 audio editing tools via natural language
- ✅ Leverage 10 resources for context-aware assistance
- ✅ Use 8 prompt templates for common workflows
- ✅ Implement secure, production-ready deployments

For additional support, refer to:
- [MCP Specification](https://modelcontextprotocol.io/)
- [Lazynext Documentation](../README.md)
- [Claude Desktop Setup](https://claude.ai/download)
- [Hermes Agents Framework](https://github.com/hermes-agents)

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Compatibility:** MCP Protocol v1.0+, Claude Desktop v0.2.0+, Hermes Agents v2.0+

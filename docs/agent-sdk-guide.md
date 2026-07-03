# Lazynext Agent SDK Guide

Build AI agents that control Lazynext programmatically. Two SDK flavors — TypeScript and Python — with the same API surface.

---

## TypeScript SDK

### Installation

```bash
bun add @lazynext/agent-sdk
# or
npm install @lazynext/agent-sdk
```

### Quick Start

```typescript
import { LazynextAgent } from "@lazynext/agent-sdk";

// Initialize with your API key
const agent = new LazynextAgent({
  apiKey: process.env.LAZYNEXT_MCP_API_KEY!,
  baseUrl: "http://localhost:8005", // or your API Gateway URL
});

// Create a project
const project = await agent.createProject({
  name: "Agent-Directed Edit",
  width: 1920,
  height: 1080,
  framerate: 24,
});

console.log(`Project created: ${project.id}`);

// Send an AI editing command
const result = await agent.edit(project.id, {
  prompt: "Cut all silence and add a crossfade between remaining clips",
  requireConfirmation: false,
  maxOperations: 10,
});

console.log(`Applied ${result.operationsApplied} operations`);
console.log("Plan:", result.plan);

// Export the result
const exportJob = await agent.export(project.id, {
  preset: "youtube_1080p",
});

console.log(`Export queued: ${exportJob.jobId}`);
```

### Streaming Queries

Get real-time streaming responses from the Lazynext AI Agent Copilot:

```typescript
const stream = agent.editStream(project.id, {
  prompt: "Generate a 5-second intro animation with the project title",
  requireConfirmation: true,
});

for await (const event of stream) {
  switch (event.type) {
    case "planning":
      console.log("AI is planning...");
      break;
    case "plan_ready":
      console.log("Plan generated:", event.plan);
      // You can approve or modify the plan here
      await stream.confirm();
      break;
    case "operation":
      console.log(`Executing: ${event.operation}`);
      break;
    case "progress":
      console.log(`Progress: ${event.percent}%`);
      break;
    case "complete":
      console.log("Edit complete!");
      break;
    case "error":
      console.error("Error:", event.message);
      break;
  }
}
```

### Search and Slash Commands

Search across your media library and execute slash commands:

```typescript
// Search assets
const results = await agent.search({
  query: "drone shot sunset",
  type: "video",
  projectId: project.id,
  limit: 20,
});

// Slash commands (quick actions)
await agent.slashCommand(project.id, "/auto-captions");
await agent.slashCommand(project.id, "/remove-silence --threshold=-35dB");
await agent.slashCommand(project.id, "/apply-lut cinematic");
await agent.slashCommand(project.id, "/export youtube_4k");
```

### Memory and Rules

The agent SDK supports persistent memory and declarative editing rules:

```typescript
// Set agent memory (persists across sessions)
await agent.setMemory({
  key: "user_style",
  value: {
    preferredColorGrade: "warm_cinematic",
    defaultTransition: "crossfade",
    defaultTransitionDuration: 12, // frames
    backgroundMusicVolume: 0.3,
  },
});

// Retrieve memory
const style = await agent.getMemory("user_style");

// Set editing rules
await agent.setRule({
  name: "auto_normalize_audio",
  description: "Always normalize audio to -16 LUFS before export",
  trigger: "before_export",
  action: "normalize_audio",
  params: { targetLUFS: -16 },
  enabled: true,
});

// List all rules
const rules = await agent.listRules(project.id);
```

### Full CRDT Control

For advanced agents that need direct CRDT operation dispatch:

```typescript
// Read full timeline state
const timelineState = await agent.getTimelineState(project.id);
console.log(`Tracks: ${timelineState.tracks.length}`);

for (const track of timelineState.tracks) {
  console.log(`Track ${track.id}: ${track.kind}, ${track.clips.length} clips`);
}

// Apply a raw CRDT operation
await agent.applyCrdtOp(project.id, {
  variant: "UpdateClipOpacity",
  clipId: "clip_001",
  trackIdx: 0,
  newOpacity: 0.75,
  timestamp: Date.now(),
  peerId: agent.peerId,
});

// Add a track
await agent.addTrack(project.id, {
  kind: "text",
  id: "track_titles",
});

// Add a clip
await agent.addClip(project.id, {
  trackIdx: 2,
  clipType: "text",
  name: "Title Card",
  text: "My Awesome Video",
  start: 0,
  end: 72,
});

// Apply an effect
await agent.applyEffect(project.id, {
  trackIdx: 0,
  clipId: "clip_001",
  effectName: "blur",
  parameters: { sigma: 5.0 },
});

// Set a keyframe
await agent.setKeyframe(project.id, {
  trackIdx: 0,
  clipId: "clip_001",
  property: "scale_x",
  frame: 0,
  value: 1.0,
  easing: "ease_in_out",
});

await agent.setKeyframe(project.id, {
  trackIdx: 0,
  clipId: "clip_001",
  property: "scale_x",
  frame: 48,
  value: 1.2,
  easing: "ease_in_out",
});
```

### TypeScript SDK Reference

```typescript
interface LazynextAgentConfig {
  apiKey: string;
  baseUrl?: string;        // Default: http://localhost:8005
  timeout?: number;         // Default: 30000ms
  retries?: number;         // Default: 3
}

class LazynextAgent {
  constructor(config: LazynextAgentConfig);

  // Projects
  createProject(params: CreateProjectParams): Promise<Project>;
  getProject(id: string): Promise<Project>;
  listProjects(opts?: ListOptions): Promise<ProjectList>;
  deleteProject(id: string): Promise<void>;

  // AI Editing
  edit(projectId: string, params: EditParams): Promise<EditResult>;
  editStream(projectId: string, params: EditParams): EditStream;

  // Export
  export(projectId: string, params: ExportParams): Promise<ExportJob>;
  getExportJob(jobId: string): Promise<ExportJob>;
  cancelExport(jobId: string): Promise<void>;
  streamProgress(jobId: string): AsyncIterable<ProgressEvent>;

  // Media
  uploadMedia(projectId: string, file: File | Buffer): Promise<Asset>;
  search(params: SearchParams): Promise<SearchResults>;
  ingest(sourceUrl: string, projectId: string, opts?: IngestOptions): Promise<Asset>;
  transcribe(assetId: string, opts?: TranscribeOptions): Promise<Transcription>;

  // Timeline CRDT
  getTimelineState(projectId: string): Promise<TimelineState>;
  applyCrdtOp(projectId: string, op: CrdtOperation): Promise<void>;
  addTrack(projectId: string, params: TrackParams): Promise<void>;
  removeTrack(projectId: string, trackIdx: number): Promise<void>;
  addClip(projectId: string, params: ClipParams): Promise<void>;
  removeClip(projectId: string, trackIdx: number, clipId: string): Promise<void>;
  applyEffect(projectId: string, params: EffectParams): Promise<void>;
  setKeyframe(projectId: string, params: KeyframeParams): Promise<void>;

  // Memory & Rules
  setMemory(entry: MemoryEntry): Promise<void>;
  getMemory(key: string): Promise<any>;
  setRule(rule: Rule): Promise<void>;
  listRules(projectId: string): Promise<Rule[]>;
  deleteRule(ruleId: string): Promise<void>;

  // Slash Commands
  slashCommand(projectId: string, command: string): Promise<CommandResult>;

  // Utility
  health(): Promise<HealthStatus>;
  peerId: string;
}
```

---

## Python SDK

### Installation

```bash
pip install lazynext-agent-sdk
```

### Quick Start

```python
from lazynext_agent import LazynextAgent

# Initialize
agent = LazynextAgent(
    api_key="lz_sk_your_api_key_here",
    base_url="http://localhost:8005",
)

# Create a project
project = agent.create_project(
    name="Python Agent Edit",
    width=1920,
    height=1080,
    framerate=24,
)

print(f"Project created: {project['id']}")

# Send an AI editing command
result = agent.edit(project["id"], {
    "prompt": "Cut all silence and add background music at 30% volume",
    "require_confirmation": False,
})
print(f"Applied {result['operations_applied']} operations")

# Export
export_job = agent.export(project["id"], preset="youtube_1080p")
print(f"Export queued: {export_job['job_id']}")
```

### Streaming Queries

```python
# Streaming AI edit with real-time feedback
stream = agent.edit_stream(project["id"], {
    "prompt": "Generate a cinematic intro with title animation",
    "require_confirmation": True,
})

for event in stream:
    if event["type"] == "planning":
        print("AI is planning...")
    elif event["type"] == "plan_ready":
        print(f"Plan: {event['plan']}")
        stream.confirm()  # Auto-approve
    elif event["type"] == "operation":
        print(f"Executing: {event['operation']}")
    elif event["type"] == "complete":
        print("Edit complete!")
```

### Search and Slash Commands

```python
# Search media
results = agent.search(
    query="drone shot",
    type="video",
    project_id=project["id"],
    limit=10,
)

# Slash commands
agent.slash_command(project["id"], "/auto-captions")
agent.slash_command(project["id"], "/remove-silence --threshold=-35dB")
agent.slash_command(project["id"], "/apply-lut cinematic")
```

### Memory and Rules

```python
# Set agent memory
agent.set_memory({
    "key": "user_style",
    "value": {
        "preferredColorGrade": "warm_cinematic",
        "defaultTransition": "crossfade",
        "backgroundMusicVolume": 0.3,
    },
})

# Editing rules
agent.set_rule({
    "name": "auto_normalize_audio",
    "trigger": "before_export",
    "action": "normalize_audio",
    "params": {"targetLUFS": -16},
    "enabled": True,
})
```

### Python SDK Reference

```python
class LazynextAgent:
    def __init__(self, api_key: str, base_url: str = "http://localhost:8005",
                 timeout: int = 30, retries: int = 3): ...

    # Projects
    def create_project(self, name: str, width: int = 1920,
                       height: int = 1080, framerate: int = 24) -> dict: ...
    def get_project(self, project_id: str) -> dict: ...
    def list_projects(self, limit: int = 20, offset: int = 0) -> dict: ...
    def delete_project(self, project_id: str) -> None: ...

    # AI Editing
    def edit(self, project_id: str, params: dict) -> dict: ...
    def edit_stream(self, project_id: str, params: dict) -> EditStream: ...

    # Export
    def export(self, project_id: str, preset: str = "youtube_1080p",
               **kwargs) -> dict: ...
    def get_export_job(self, job_id: str) -> dict: ...

    # Timeline
    def get_timeline_state(self, project_id: str) -> dict: ...
    def add_track(self, project_id: str, kind: str,
                  track_id: str = None) -> None: ...
    def add_clip(self, project_id: str, track_idx: int,
                 clip_type: str, start: int, end: int,
                 **kwargs) -> None: ...

    # Memory
    def set_memory(self, entry: dict) -> None: ...
    def get_memory(self, key: str) -> dict: ...
    def set_rule(self, rule: dict) -> None: ...

    # Search & Commands
    def search(self, query: str, **filters) -> dict: ...
    def slash_command(self, project_id: str, command: str) -> dict: ...
```

---

## Example Use Cases

### 1. Automated Social Media Pipeline

```typescript
// Automatically create platform-specific versions from one master timeline
async function crossPlatformExport(agent: LazynextAgent, projectId: string) {
  const platforms = [
    { name: "YouTube", preset: "youtube_4k" },
    { name: "Instagram", preset: "instagram_reel" },
    { name: "TikTok", preset: "tiktok" },
  ];

  for (const platform of platforms) {
    console.log(`Reframing for ${platform.name}...`);

    // Auto-reframe using AI
    await agent.edit(projectId, {
      prompt: `Auto-reframe the timeline for ${platform.name}`,
      requireConfirmation: false,
    });

    // Export
    const job = await agent.export(projectId, {
      preset: platform.preset,
    });

    console.log(`  ${platform.name} export queued: ${job.jobId}`);

    // Wait for completion (with progress streaming)
    for await (const event of agent.streamProgress(job.jobId)) {
      if (event.type === "complete") {
        console.log(`  ${platform.name} complete: ${event.outputUrl}`);
      }
    }
  }
}
```

### 2. AI-Powered Editing Assistant

```typescript
// Build an editing assistant that learns user preferences
class EditingAssistant {
  constructor(private agent: LazynextAgent) {}

  async enhanceTimeline(projectId: string) {
    // Learn user's style preferences
    const style = await this.agent.getMemory("user_style");

    // Analyze current timeline
    const state = await this.agent.getTimelineState(projectId);

    // Build a contextual prompt
    const prompt = [
      "Enhance the current timeline with:",
      style.preferredColorGrade
        ? `- Apply ${style.preferredColorGrade} color grade to all video tracks`
        : "",
      "- Add crossfades between all clips",
      "- Normalize audio to -16 LUFS",
      "- Remove silence gaps",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.agent.edit(projectId, {
      prompt,
      requireConfirmation: true,
    });

    return result;
  }
}
```

### 3. Render Farm Automation

```python
# Batch process multiple projects on a render farm
from concurrent.futures import ThreadPoolExecutor

def batch_render(agent, project_ids, preset="youtube_1080p"):
    jobs = []

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(agent.export, pid, preset=preset): pid
            for pid in project_ids
        }

        for future in futures:
            pid = futures[future]
            try:
                job = future.result()
                jobs.append({"project_id": pid, "job_id": job["job_id"], "status": "queued"})
                print(f"Queued: {pid} → {job['job_id']}")
            except Exception as e:
                print(f"Failed: {pid} — {e}")

    return jobs

# Usage
agent = LazynextAgent(api_key="lz_sk_...")
projects = agent.list_projects(limit=100)
project_ids = [p["id"] for p in projects["projects"]]

batch_render(agent, project_ids)
```

### 4. Content Moderation Agent

```typescript
// Automatically scan and flag content issues before publishing
async function prePublishCheck(agent: LazynextAgent, projectId: string) {
  const issues: string[] = [];

  const state = await agent.getTimelineState(projectId);

  // Check audio levels
  const audioTrack = state.tracks.find((t) => t.kind === "audio");
  if (!audioTrack || audioTrack.clips.length === 0) {
    issues.push("No audio track found");
  }

  // Check for silence at start/end
  if (audioTrack?.clips[0]?.startFrame > 24) {
    issues.push("Missing audio at start (>1 second of silence)");
  }

  // Check for captions
  const textTrack = state.tracks.find((t) => t.kind === "text");
  const hasCaptions = textTrack?.clips.some((c) =>
    c.name?.toLowerCase().includes("caption")
  );
  if (!hasCaptions) {
    issues.push("No captions/subtitles found — run /auto-captions");
  }

  // Check duration
  const totalFrames = Math.max(
    ...state.tracks.flatMap((t) => t.clips.map((c) => c.endFrame))
  );
  const durationSeconds = totalFrames / state.framerate;
  if (durationSeconds < 1) {
    issues.push("Timeline is empty or too short");
  }

  return {
    passed: issues.length === 0,
    issues,
    projectId,
    durationSeconds,
  };
}
```

---

## Configuration

Both SDKs accept these common configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | — | Lazynext MCP API key (required) |
| `baseUrl` | string | `http://localhost:8005` | API Gateway URL |
| `timeout` | number | `30000` | Request timeout in milliseconds |
| `retries` | number | `3` | Number of retries on transient failures |

### Environment Variables

```bash
LAZYNEXT_MCP_API_KEY=lz_sk_your_key_here
LAZYNEXT_API_URL=http://localhost:8005
```

---

## Error Handling

Both SDKs throw typed errors:

```typescript
try {
  await agent.edit(projectId, { prompt: "..." });
} catch (error) {
  if (error instanceof LazynextAuthError) {
    console.error("Invalid API key");
  } else if (error instanceof LazynextRateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof LazynextValidationError) {
    console.error(`Invalid input: ${error.detail}`);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

/**
 * Lazynext MCP Server — Model Context Protocol server over stdio.
 *
 * Exposes 45+ video editing tools to MCP clients (Claude Desktop,
 * Cursor, etc.), enabling natural-language video editing intents
 * to be routed through the Lazynext API Gateway / AI Agents orchestrator.
 *
 * Authentication: Set LAZYNEXT_MCP_API_KEY env var. Passed as
 * X-API-Key header to the AI Agents service.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "lazynext-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const API_KEY = process.env.LAZYNEXT_MCP_API_KEY || "";
const AI_AGENTS_URL = process.env.AI_AGENTS_URL || "http://localhost:8002";
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:8005";

/**
 * Tool registry — all tools exposed by the Lazynext platform.
 * Each tool has a name, description, input schema, and execution handler.
 */
interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

const TOOLS: McpTool[] = [
  // ── Core Editing ──
  {
    name: "autonomous_edit",
    description: "Execute an AI-powered video editing intent on the Lazynext timeline. Accepts natural language prompts like 'cut silences', 'add crossfade', 'apply cinematic color grade'.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The natural language editing instruction" },
        projectId: { type: "string", description: "Optional project ID to apply edits to" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "transcribe",
    description: "Transcribe video/audio using Whisper with speaker diarization.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to the media file" },
        language: { type: "string", description: "Language code (e.g. 'en', 'es')" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "edit_via_transcript",
    description: "Edit video by editing its transcript text. Remove words/sentences to cut the corresponding video segments.",
    inputSchema: {
      type: "object",
      properties: {
        transcript: { type: "string", description: "The transcript text with timestamps" },
        edits: { type: "string", description: "Description of edits to apply" },
      },
      required: ["transcript"],
    },
  },
  {
    name: "remove_filler_words",
    description: "Remove filler words (um, uh, like, you know) from the timeline.",
    inputSchema: {
      type: "object",
      properties: {
        threshold: { type: "number", description: "Confidence threshold for filler detection (0-1)" },
      },
    },
  },
  {
    name: "diarize_speakers",
    description: "Identify and label different speakers in the audio track.",
    inputSchema: {
      type: "object",
      properties: {
        numSpeakers: { type: "number", description: "Expected number of speakers" },
      },
    },
  },

  // ── Audio ──
  {
    name: "enhance_audio",
    description: "Enhance audio quality with EQ, compression, and noise reduction.",
    inputSchema: {
      type: "object",
      properties: {
        profile: { type: "string", description: "Audio profile: 'studio_podcast' or 'vocal_boost'" },
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "clean_audio",
    description: "Remove background noise and normalize audio levels.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "apply_auto_ducking",
    description: "Automatically duck (lower) music volume when speech is detected.",
    inputSchema: {
      type: "object",
      properties: {
        duckLevel: { type: "number", description: "Ducking level in dB (default: -15)" },
        attackMs: { type: "number", description: "Attack time in milliseconds" },
      },
    },
  },
  {
    name: "split_stems",
    description: "Separate audio into stems (vocals, drums, bass, other).",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "add_sound_effect",
    description: "Add a sound effect at a specific timeline position.",
    inputSchema: {
      type: "object",
      properties: {
        effect: { type: "string", description: "Sound effect name or description" },
        position: { type: "number", description: "Timeline position in seconds" },
      },
      required: ["effect"],
    },
  },

  // ── Color & Grading ──
  {
    name: "apply_color_grade",
    description: "Apply a cinematic color grade to the timeline.",
    inputSchema: {
      type: "object",
      properties: {
        style: { type: "string", description: "Style: 'cinematic', 'vintage', 'teal_orange', 'black_and_white', 'warm', 'cool'" },
      },
    },
  },
  {
    name: "apply_color_match",
    description: "Match the color grade of one clip to another reference clip.",
    inputSchema: {
      type: "object",
      properties: {
        referenceClipId: { type: "string", description: "Reference clip ID for color matching" },
        targetClipId: { type: "string", description: "Target clip ID to apply match to" },
      },
      required: ["referenceClipId"],
    },
  },
  {
    name: "apply_lut",
    description: "Apply a LUT (Look-Up Table) to the timeline.",
    inputSchema: {
      type: "object",
      properties: {
        lutName: { type: "string", description: "LUT name or path to .cube file" },
        intensity: { type: "number", description: "LUT intensity (0-1, default: 1.0)" },
      },
      required: ["lutName"],
    },
  },
  {
    name: "adjust_hdr_color",
    description: "Adjust HDR color parameters including exposure, highlights, shadows.",
    inputSchema: {
      type: "object",
      properties: {
        exposure: { type: "number", description: "Exposure adjustment in stops" },
        highlights: { type: "number", description: "Highlights adjustment" },
        shadows: { type: "number", description: "Shadows adjustment" },
        contrast: { type: "number", description: "Contrast adjustment" },
        saturation: { type: "number", description: "Saturation adjustment" },
      },
    },
  },

  // ── Effects & Compositing ──
  {
    name: "style_transfer",
    description: "Apply artistic style transfer to video (anime, claymation, pencil sketch, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        style: { type: "string", description: "Style: 'anime', 'claymation', 'pencil', 'detail_enhance'" },
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl", "style"],
    },
  },
  {
    name: "generative_fill",
    description: "Remove objects from video using AI inpainting/generative fill.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
        maskRegion: { type: "string", description: "Region to inpaint (JSON with x, y, width, height)" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "remove_background",
    description: "Remove video background using AI rotoscoping (SAM2).",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "track_motion",
    description: "Track object motion in video for attaching effects or text.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
        roi: { type: "string", description: "Region of interest (JSON with x, y, width, height)" },
      },
      required: ["mediaUrl", "roi"],
    },
  },
  {
    name: "apply_beauty_retouch",
    description: "Apply beauty/skin retouching to faces in video.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
        intensity: { type: "number", description: "Retouch intensity (0-1)" },
      },
      required: ["mediaUrl"],
    },
  },

  // ── Text & Captions ──
  {
    name: "add_viral_captions",
    description: "Add animated viral-style captions (Hormozi style) to the video.",
    inputSchema: {
      type: "object",
      properties: {
        style: { type: "string", description: "Caption style: 'hormozi', 'alex', 'minimal', 'karaoke'" },
        color: { type: "string", description: "Caption highlight color (hex)" },
      },
    },
  },
  {
    name: "add_kinetic_typography",
    description: "Add animated kinetic typography text animations.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to animate" },
        style: { type: "string", description: "Animation style" },
        position: { type: "number", description: "Timeline position in seconds" },
        duration: { type: "number", description: "Duration in seconds" },
      },
      required: ["text"],
    },
  },

  // ── AI Generation ──
  {
    name: "generate_dub",
    description: "Generate AI voice dubbing using ElevenLabs text-to-speech.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to convert to speech" },
        voiceId: { type: "string", description: "ElevenLabs voice ID" },
        language: { type: "string", description: "Language code" },
      },
      required: ["text"],
    },
  },
  {
    name: "overdub_audio",
    description: "Overdub audio with AI-generated speech (ElevenLabs + Coqui fallback).",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to overdub" },
        voiceId: { type: "string", description: "Voice ID for cloning/dubbing" },
      },
      required: ["text"],
    },
  },
  {
    name: "generate_broll",
    description: "Generate B-roll footage using AI video generation.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Description of desired B-roll footage" },
        duration: { type: "number", description: "Duration in seconds" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_ai_avatar",
    description: "Generate an AI avatar video with lip-synced speech.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text for the avatar to speak" },
        avatarStyle: { type: "string", description: "Avatar style or ID" },
      },
      required: ["text"],
    },
  },
  {
    name: "auto_fill_broll",
    description: "Automatically fill gaps in the timeline with relevant B-roll footage.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic or theme for B-roll search" },
        source: { type: "string", description: "Source: 'pexels', 'ai_generated', 'stock'" },
      },
    },
  },

  // ── Reframing & Transform ──
  {
    name: "auto_reframe",
    description: "Automatically reframe video for different aspect ratios (9:16, 1:1, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
        targetAspect: { type: "string", description: "Target aspect ratio: '9:16', '1:1', '4:5', '16:9'" },
      },
      required: ["mediaUrl", "targetAspect"],
    },
  },
  {
    name: "extrude_3d_text",
    description: "Add extruded 3D text with lighting and shadows.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to extrude in 3D" },
        depth: { type: "number", description: "Extrusion depth" },
        color: { type: "string", description: "Text color (hex)" },
      },
      required: ["text"],
    },
  },

  // ── Effects & Particles ──
  {
    name: "setup_3d_environment",
    description: "Set up a 3D environment/camera for the composition.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Environment type: 'studio', 'outdoor', 'abstract'" },
        lighting: { type: "string", description: "Lighting preset" },
      },
    },
  },
  {
    name: "add_particle_system",
    description: "Add a particle system effect (sparks, smoke, confetti, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Particle type: 'sparks', 'smoke', 'confetti', 'snow', 'fire'" },
        position: { type: "number", description: "Timeline position in seconds" },
        duration: { type: "number", description: "Duration in seconds" },
      },
      required: ["type"],
    },
  },
  {
    name: "add_null_object",
    description: "Add a null object for parenting and complex transforms.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Null object name" },
        position: { type: "number", description: "Timeline position in seconds" },
      },
    },
  },
  {
    name: "add_shape_layer",
    description: "Add a shape layer (rectangle, circle, polygon, line).",
    inputSchema: {
      type: "object",
      properties: {
        shape: { type: "string", description: "Shape type: 'rectangle', 'circle', 'polygon', 'line', 'star'" },
        color: { type: "string", description: "Fill color (hex)" },
        position: { type: "number", description: "Timeline position in seconds" },
        duration: { type: "number", description: "Duration in seconds" },
      },
      required: ["shape"],
    },
  },

  // ── Timeline & Editing ──
  {
    name: "auto_beat_sync",
    description: "Automatically sync clip cuts to the music beat.",
    inputSchema: {
      type: "object",
      properties: {
        sensitivity: { type: "number", description: "Beat detection sensitivity (0-1)" },
      },
    },
  },
  {
    name: "toggle_pancake_timeline",
    description: "Toggle the pancake timeline view for multi-track editing.",
    inputSchema: {
      type: "object",
      properties: {
        enabled: { type: "boolean", description: "Enable or disable pancake timeline" },
      },
      required: ["enabled"],
    },
  },
  {
    name: "setup_multicam",
    description: "Set up a multicam editing workspace with angle switching.",
    inputSchema: {
      type: "object",
      properties: {
        angles: { type: "number", description: "Number of camera angles" },
        syncMethod: { type: "string", description: "Sync method: 'timecode', 'audio', 'manual'" },
      },
      required: ["angles"],
    },
  },
  {
    name: "apply_speed_ramp",
    description: "Apply speed ramping (slow-mo, fast-forward) to a clip.",
    inputSchema: {
      type: "object",
      properties: {
        clipId: { type: "string", description: "Clip ID to apply speed ramp to" },
        speed: { type: "number", description: "Speed multiplier (0.25 = quarter speed, 2.0 = double speed)" },
        easing: { type: "string", description: "Easing: 'linear', 'ease_in', 'ease_out', 'ease_in_out'" },
      },
      required: ["speed"],
    },
  },
  {
    name: "perform_trim_edit",
    description: "Perform trim edits (ripple, roll, slip, slide) on the timeline.",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string", description: "Trim operation: 'ripple', 'roll', 'slip', 'slide'" },
        clipId: { type: "string", description: "Target clip ID" },
        amount: { type: "number", description: "Trim amount in frames" },
      },
      required: ["operation"],
    },
  },

  // ── Media Management ──
  {
    name: "fetch_assets",
    description: "Fetch and list all assets in the project media pool.",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", description: "Filter by asset type: 'video', 'audio', 'image', 'all'" },
      },
    },
  },
  {
    name: "generate_proxies",
    description: "Generate proxy/low-res versions of media for smoother editing.",
    inputSchema: {
      type: "object",
      properties: {
        quality: { type: "string", description: "Proxy quality: '360p', '540p', '720p', '1080p'" },
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "extract_viral_hook",
    description: "Extract the most engaging/viral hook segment from a video.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
        duration: { type: "number", description: "Target hook duration in seconds (default: 5)" },
      },
      required: ["mediaUrl"],
    },
  },

  // ── Monitoring & Utility ──
  {
    name: "toggle_scopes",
    description: "Toggle video scopes display (waveform, vectorscope, histogram, parade).",
    inputSchema: {
      type: "object",
      properties: {
        scope: { type: "string", description: "Scope type: 'waveform', 'vectorscope', 'histogram', 'parade', 'all'" },
        enabled: { type: "boolean", description: "Enable or disable scopes" },
      },
      required: ["scope", "enabled"],
    },
  },
  {
    name: "setup_node_grading",
    description: "Set up node-based color grading workflow.",
    inputSchema: {
      type: "object",
      properties: {
        nodes: { type: "string", description: "Node configuration (JSON array of node definitions)" },
      },
    },
  },

  // ── Export & Publishing ──
  {
    name: "export_project",
    description: "Export/render the project to a video file.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", description: "Export format: 'mp4', 'prores', 'dcp', 'aaf', 'mov', 'gif'" },
        resolution: { type: "string", description: "Resolution: '1080p', '4k', '720p'" },
        bitrate: { type: "number", description: "Bitrate in kbps" },
        projectId: { type: "string", description: "Project ID to export" },
      },
    },
  },
  {
    name: "publish_to_social",
    description: "Publish the rendered video to social media platforms.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", description: "Platform: 'tiktok', 'youtube', 'instagram', 'all'" },
        caption: { type: "string", description: "Post caption/description" },
        mediaUrl: { type: "string", description: "URL of the rendered video" },
      },
      required: ["platform"],
    },
  },

  // ── Project Management ──
  {
    name: "get_timeline_state",
    description: "Get the current state of the project timeline (tracks, clips, keyframes).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
      },
    },
  },
  {
    name: "get_project_info",
    description: "Get project metadata (name, resolution, frame rate, duration).",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
      },
    },
  },
  {
    name: "analyze_media",
    description: "Analyze a media file (codec, resolution, duration, bitrate, scenes).",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "import_media",
    description: "Import media into the project from URL or file path.",
    inputSchema: {
      type: "object",
      properties: {
        mediaUrl: { type: "string", description: "URL or path to media file" },
        projectId: { type: "string", description: "Project ID" },
      },
      required: ["mediaUrl"],
    },
  },
  {
    name: "render",
    description: "Render the current project to a video file via the render service.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", description: "Export format" },
        projectId: { type: "string", description: "Project ID" },
      },
    },
  },
];

/**
 * Handler: tools/list — advertises all Lazynext tools to MCP clients.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

/**
 * Handler: tools/call — executes a tool by forwarding to the AI Agents
 * orchestrator or directly to the appropriate microservice.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = TOOLS.find((t) => t.name === name);

  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (API_KEY) {
      headers["X-API-Key"] = API_KEY;
    }

    // Route: core editing tools go through orchestrator
    // Direct microservice tools route to their specific endpoints
    if (
      name === "autonomous_edit" ||
      name === "transcribe" ||
      name === "remove_filler_words" ||
      name === "diarize_speakers" ||
      name === "edit_via_transcript"
    ) {
      // Use the AI orchestrator for intent-based tools
      const prompt = typeof args.prompt === "string"
        ? args.prompt
        : `${name}: ${JSON.stringify(args)}`;

      const resp = await fetch(`${AI_AGENTS_URL}/orchestrate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, projectId: args.projectId }),
      });
      const data = await resp.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === "export_project" || name === "render") {
      // Route to API Gateway for export/render
      const resp = await fetch(`${API_GATEWAY_URL}/api/v1/export`, {
        method: "POST",
        headers,
        body: JSON.stringify(args),
      });
      const data = await resp.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }

    if (name === "get_timeline_state" || name === "get_project_info") {
      const resp = await fetch(`${API_GATEWAY_URL}/api/v1/projects/${args.projectId || "current"}`, {
        headers,
      });
      const data = await resp.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    }

    // All other tools: forward to orchestrator with tool name as intent
    const toolPrompt = `${name} ${Object.entries(args || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ")}`;

    const resp = await fetch(`${AI_AGENTS_URL}/orchestrate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: toolPrompt, projectId: args?.projectId }),
    });
    const data = await resp.json();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to execute ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Lazynext MCP Server v1.0.0 running on stdio (${TOOLS.length} tools)`);
}

run().catch(console.error);

/**
 * Multi-step AI agent orchestrator for Chronos Copilot.
 *
 * Receives a high-level editing intent, decomposes it into tool calls,
 * executes each tool against the Lazynext microservices, and returns
 * a structured execution plan with results.
 */

interface ToolCall {
  action: string;
  params: Record<string, unknown>;
}

interface OrchestrationStep {
  tool: string;
  args: Record<string, unknown>;
  description: string;
  crdt_patches?: Array<{ op: string; path: string; value: any }>;
}

interface OrchestrationPlan {
  steps: OrchestrationStep[];
  reasoning: string;
}

interface OrchestrationResult {
  success: boolean;
  plan: OrchestrationStep[];
  results: Array<{
    tool: string;
    success: boolean;
    output: unknown;
    crdt_patches?: Array<{ op: string; path: string; value: any }>;
  }>;
}

// Microservice URLs from env or docker-compose bridge network
const PRE_PROCESSING_URL =
  process.env.PRE_PROCESSING_URL || "http://localhost:8000";
const GENERATIVE_STUDIO_URL =
  process.env.GENERATIVE_STUDIO_URL || "http://localhost:8001";
const RENDER_SERVICE_URL =
  process.env.RENDER_SERVICE_URL || "http://localhost:8003";

/**
 * Determine the most efficient provider based on prompt characteristics.
 */
function routePromptToProvider(prompt: string): "openai" | "anthropic" | "ollama" {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("private") || lower.includes("local") || lower.includes("secure") || lower.includes("confidential")) {
    return "ollama";
  }
  
  if (lower.includes("write") || lower.includes("story") || lower.includes("draft") || lower.includes("creative") || prompt.length > 2000) {
    return "anthropic";
  }
  
  return "openai"; // Default for logic, reasoning, and planning
}

/**
 * Decompose a natural language editing intent into a structured plan.
 *
 * Automatically routes prompts to the most efficient provider 
 * (OpenAI for logic, Anthropic for long-context, Ollama for privacy).
 */
export async function decomposeIntent(
  prompt: string,
): Promise<OrchestrationPlan> {
  const provider = routePromptToProvider(prompt);
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  console.log(`[Orchestrator] Intelligent router selected provider: ${provider}`);

  try {
    if (provider === "openai" && openaiKey) {
      return await decomposeWithLLM(prompt, openaiKey, "openai");
    } else if (provider === "anthropic" && anthropicKey) {
      // In a full implementation, this would call Anthropic's Claude API.
      // For now, we reuse the OpenAI-compatible logic if Claude exposes a compatible endpoint or fallback.
      return await decomposeWithLLM(prompt, anthropicKey, "anthropic");
    } else if (provider === "ollama") {
      // Local ollama integration
      return await decomposeWithLLM(prompt, "ollama-local", "ollama");
    }
  } catch (err) {
    console.warn(
      `[Orchestrator] LLM decomposition failed (${err}). Using rule-based fallback.`,
    );
  }

  return decomposeRuleBased(prompt);
}

/**
 * LLM-powered intent decomposition via OpenAI-compatible API.
 */
async function decomposeWithLLM(
  prompt: string,
  apiKey: string,
  provider: string = "openai"
): Promise<OrchestrationPlan> {
  const systemPrompt = `You are the Lazynext AI Orchestrator. You decompose video editing intents into tool calls.

Available tools:
- fetch_assets: Search stock footage libraries (Pexels, Pixabay)
- generate_dub: Create AI dubbing in a target language via generative-studio
- transcribe: Transcribe audio via Whisper (pre-processing)
- generate_broll: Generate B-roll footage via Stable Video Diffusion
- split_stems: Separate audio into stems (vocals, drums, bass, other)
- apply_color_grade: Apply cinematic color grading
- clean_audio: Auto-detect and remove filler words ("um/uh") and dead air from audio tracks
- add_viral_captions: Transcribe audio and spawn dynamic Hormozi-style kinetic text captions on the timeline
- auto_fill_broll: Analyze transcript, fetch contextual stock footage, and auto-place clips on the timeline
- overdub_audio: Generate voice-cloned audio to replace or insert words
- remove_background: Automatically rotoscope and remove the background of a video clip
- track_motion: Track an object in a video and attach text/stickers to its movement
- auto_reframe: Automatically reframe horizontal video to vertical (TikTok/Reels) by tracking the subject
- enhance_audio: Enhance voice audio to sound like a professional studio recording (noise reduction, EQ)
- style_transfer: Transform the visual style of a video clip (e.g. into anime or claymation) using generative AI
- generate_viral_captions: Add word-by-word highlighted, bold animated text with emojis (Hormozi style)
- apply_beauty_retouch: Apply AI facial beauty, skin smoothing, and retouching
- generative_fill: Add or remove objects in a video temporally using generative AI inpainting
- extract_viral_hook: Analyze video and extract the best 3-second hook, placing it at the beginning
- setup_3d_environment: Add 3D cameras and virtual lights to the composition
- add_particle_system: Add procedural particle effects like snow, fire, rain, or magical effects
- add_kinetic_typography: Procedurally generate bouncy text animations driven by math/code expressions
- generate_ai_avatar: Generate a lip-synced digital human avatar from a text script
- auto_beat_sync: Automatically cut video clips to sync with music transients and beats
- apply_color_match: Automatically match color palette of a clip to a reference
- adjust_hdr_color: Adjust HDR color wheels (lift, gamma, gain)
- setup_node_grading: Setup DaVinci-style node graph for color grading
- apply_lut: Apply a 3D LUT (.cube) file to a clip
- toggle_scopes: Toggle color scopes UI (vectorscope, waveform)
- toggle_pancake_timeline: Toggle stacked pancake timeline view
- setup_multicam: Setup a multicam clip synchronized by audio/timecode
- generate_proxies: Generate low-resolution proxy files for smooth editing
- apply_speed_ramp: Apply optical-flow based time remapping / speed ramping
- perform_trim_edit: Abstract slip, slide, ripple, or roll trim edits
- add_null_object: Add a null object to the composition for grouping/parenting
- add_shape_layer: Add a vector shape layer
- extrude_3d_text: Convert 2D text into a 3D extruded object
- edit_via_transcript: Edit the video timeline by deleting or moving transcript text
- remove_filler_words: Remove filler words (um, uh) and silences
- diarize_speakers: Label and color-code transcript by speaker
- publish_to_social: Publish the rendered video directly to social media
- add_sound_effect: Fetch and add a sound effect from the built-in library
- apply_auto_ducking: Automatically duck background music when voice/dialogue is detected
- render: Export the final video via render-service

Respond ONLY with a JSON object:
{
  "reasoning": "Brief explanation of your plan",
  "steps": [
    { 
      "tool": "tool_name", 
      "args": { ... }, 
      "description": "What this step does",
      "crdt_patches": [
        { "op": "add", "path": "/tracks/0/clips/-", "value": { "id": "clip_1", "start": 0, "duration": 5 } }
      ]
    }
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  
  try {
    clearTimeout(timeoutId);

    if (provider === "anthropic") {
      // Use the native Anthropic Messages API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text: string }>;
      };
      const raw = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
      // Anthropic may wrap JSON in markdown — strip ``` fences
      const json = raw.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```$/, "");
      const parsed = JSON.parse(json) as {
        reasoning: string;
        steps: OrchestrationStep[];
      };

      return {
        steps: parsed.steps || [],
        reasoning: parsed.reasoning || "No reasoning provided",
      };
    }

    // OpenAI-compatible path (OpenAI, Ollama)
    let endpoint = "https://api.openai.com/v1/chat/completions";
    let modelName = "gpt-4o";

    if (provider === "ollama") {
      endpoint = "http://localhost:11434/v1/chat/completions";
      modelName = "llama3";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const parsed = JSON.parse(data.choices[0].message.content) as {
      reasoning: string;
      steps: OrchestrationStep[];
    };

    return {
      steps: parsed.steps || [],
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Rule-based intent decomposition — no LLM required.
 */
function decomposeRuleBased(prompt: string): OrchestrationPlan {
  const lower = prompt.toLowerCase();
  const steps: OrchestrationStep[] = [];

  if (
    lower.includes("transcribe") ||
    lower.includes("subtitle") ||
    lower.includes("caption")
  ) {
    if (lower.includes("viral") || lower.includes("hormozi") || lower.includes("dynamic")) {
      steps.push({
        tool: "add_viral_captions",
        args: { video_id: "input_video", style: "hormozi" },
        description: "Transcribe audio and add dynamic viral captions",
      });
    } else {
      steps.push({
        tool: "transcribe",
        args: { video_id: "input_video" },
        description: "Transcribe audio to generate subtitles",
      });
    }
  }

  if (lower.includes("dub") || lower.includes("spanish") || lower.includes("french")) {
    const lang = lower.includes("spanish")
      ? "es-ES"
      : lower.includes("french")
        ? "fr-FR"
        : "en-US";
    steps.push({
      tool: "generate_dub",
      args: { clip_id: "main", target_language: lang },
      description: `Generate AI dub in ${lang}`,
    });
  }

  if (lower.includes("overdub") || lower.includes("clone voice") || lower.includes("replace word")) {
    steps.push({
      tool: "overdub_audio",
      args: { clip_id: "main_voice", text: extractPrompt(prompt, "overdub") },
      description: "Generate overdubbed audio using AI voice cloning",
    });
  }

  if (
    lower.includes("broll") ||
    lower.includes("b-roll") ||
    lower.includes("auto-fill")
  ) {
    steps.push({
      tool: "auto_fill_broll",
      args: { video_id: "input_video" },
      description: "Auto-fill timeline with contextual B-roll based on transcript keywords",
    });
  }

  if (
    lower.includes("silence") ||
    lower.includes("trim") ||
    lower.includes("clean") ||
    lower.includes("filler")
  ) {
    steps.push({
      tool: "clean_audio",
      args: { video_id: "input_video" },
      description: "Auto-detect and remove filler words and dead air",
    });
  }

  if (lower.includes("music") || lower.includes("stem") || lower.includes("separate")) {
    steps.push({
      tool: "split_stems",
      args: { audio_id: "main_audio", stems: 4 },
      description: "Separate audio into vocal/instrumental stems",
    });
  }

  if (lower.includes("color") || lower.includes("grade") || lower.includes("cinematic")) {
    steps.push({
      tool: "apply_color_grade",
      args: { preset: "cinematic_teal_orange" },
      description: "Apply cinematic color grading",
    });
  }

  if (lower.includes("duck") || lower.includes("background music") || lower.includes("voice") || lower.includes("auto-duck")) {
      steps.push({
          tool: "apply_auto_ducking",
          args: { voice_track: "dialogue", music_track: "bgm" },
          description: "Apply sidechain auto-ducking to lower music volume during dialogue",
      });
  }

  if (lower.includes("remove background") || lower.includes("rotoscope") || lower.includes("isolate")) {
      steps.push({
          tool: "remove_background",
          args: { video_id: "input_video", object_prompt: extractPrompt(prompt, "rotoscope") || "person" },
          description: "Remove background via auto-rotoscoping",
      });
  }

  if (lower.includes("track") || lower.includes("attach") || lower.includes("follow")) {
      steps.push({
          tool: "track_motion",
          args: { video_id: "input_video", target_layer: "text_layer_1", start_frame: 0, end_frame: 60, roi: [100.0, 100.0, 50.0, 50.0] },
          description: "Track motion of an object and attach a layer to it",
      });
  }

  if (lower.includes("reframe") || lower.includes("tiktok") || lower.includes("9:16") || lower.includes("vertical")) {
      steps.push({
          tool: "auto_reframe",
          args: { video_id: "input_video", target_aspect_ratio: "9:16" },
          description: "Reframe the project for vertical formats",
      });
  }

  if (lower.includes("enhance") || lower.includes("podcast") || lower.includes("studio sound")) {
      steps.push({
          tool: "enhance_audio",
          args: { video_id: "input_video", target_profile: "studio_podcast" },
          description: "Enhance audio to sound like a studio recording",
      });
  }

  if (lower.includes("style") || lower.includes("anime") || lower.includes("claymation") || lower.includes("look like")) {
      steps.push({
          tool: "style_transfer",
          args: { video_id: "input_video", style_prompt: extractPrompt(prompt, "look like") || "anime style" },
          description: "Apply generative AI style transfer to video",
      });
  }

  if (lower.includes("viral caption") || lower.includes("hormozi") || lower.includes("dynamic caption") || lower.includes("emoji")) {
      steps.push({
          tool: "generate_viral_captions",
          args: { video_id: "input_video" },
          description: "Generate viral animated captions",
      });
  }

  if (lower.includes("smooth") || lower.includes("beauty") || lower.includes("retouch") || lower.includes("teeth")) {
      steps.push({
          tool: "apply_beauty_retouch",
          args: { video_id: "input_video", intensity: 0.8 },
          description: "Apply facial beauty retouching",
      });
  }

  if (lower.includes("remove") || lower.includes("add") || lower.includes("fill")) {
      steps.push({
          tool: "generative_fill",
          args: { video_id: "input_video", prompt: extractPrompt(prompt, "fill") || "remove object" },
          description: "Apply generative fill to the video",
      });
  }

  if (lower.includes("hook") || lower.includes("viral hook") || lower.includes("extract best part")) {
      steps.push({
          tool: "extract_viral_hook",
          args: { video_id: "input_video" },
          description: "Extract and prepend a viral hook",
      });
  }

  if (lower.includes("3d") || lower.includes("camera") || lower.includes("light") || lower.includes("spotlight")) {
      steps.push({
          tool: "setup_3d_environment",
          args: { type: lower.includes("light") ? "light" : "camera" },
          description: "Setup 3D environment with cameras and lights",
      });
  }

  if (lower.includes("particle") || lower.includes("snow") || lower.includes("rain") || lower.includes("fire")) {
      let pType = "snow";
      if (lower.includes("rain")) pType = "rain";
      if (lower.includes("fire")) pType = "fire";
      
      steps.push({
          tool: "add_particle_system",
          args: { particle_type: pType },
          description: `Add ${pType} particle system`,
      });
  }

  if (lower.includes("kinetic") || lower.includes("bouncy text") || lower.includes("expression")) {
      steps.push({
          tool: "add_kinetic_typography",
          args: { text: extractPrompt(prompt, "text") || "Kinetic Text!" },
          description: "Add bouncy kinetic typography with expressions",
      });
  }

  if (lower.includes("avatar") || lower.includes("digital human") || lower.includes("lip sync")) {
      steps.push({
          tool: "generate_ai_avatar",
          args: { script: extractPrompt(prompt, "script") || "Hello from the AI avatar!" },
          description: "Generate an AI avatar from script",
      });
  }

  if (lower.includes("beat") || lower.includes("sync") || lower.includes("rhythm")) {
      steps.push({
          tool: "auto_beat_sync",
          args: { video_id: "input_video", audio_id: "bgm" },
          description: "Auto beat-sync video clips to music",
      });
  }

  if (lower.includes("match color") || lower.includes("reference color")) {
      steps.push({
          tool: "apply_color_match",
          args: { video_id: "input_video", reference_image: "ref.jpg" },
          description: "Apply AI color match to reference",
      });
  }

  if (lower.includes("hdr") || lower.includes("lift") || lower.includes("gamma") || lower.includes("gain") || lower.includes("crush the blacks")) {
      steps.push({
          tool: "adjust_hdr_color",
          args: { video_id: "input_video", lift: -0.1, gamma: 1.0, gain: 1.1 },
          description: "Adjust HDR color wheels",
      });
  }

  if (lower.includes("node") && lower.includes("grading")) {
      steps.push({
          tool: "setup_node_grading",
          args: { video_id: "input_video" },
          description: "Setup node-based color grading",
      });
  }

  if (lower.includes("lut") || lower.includes(".cube")) {
      steps.push({
          tool: "apply_lut",
          args: { video_id: "input_video", lut_name: extractPrompt(prompt, "lut") || "cinematic.cube" },
          description: "Apply 3D LUT",
      });
  }

  if (lower.includes("scope") || lower.includes("waveform") || lower.includes("vectorscope") || lower.includes("rgb parade")) {
      steps.push({
          tool: "toggle_scopes",
          args: { show: true },
          description: "Show color scopes",
      });
  }

  if (lower.includes("pancake") || lower.includes("stacked timeline")) {
      steps.push({
          tool: "toggle_pancake_timeline",
          args: { show: true },
          description: "Open pancake timeline editing",
      });
  }

  if (lower.includes("multicam") || lower.includes("multi-cam") || lower.includes("sync angle")) {
      steps.push({
          tool: "setup_multicam",
          args: { sync_method: "audio" },
          description: "Setup multicam synchronized editing",
      });
  }

  if (lower.includes("proxy") || lower.includes("proxies")) {
      steps.push({
          tool: "generate_proxies",
          args: { video_id: "input_video" },
          description: "Generate proxies for smooth editing",
      });
  }

  if (lower.includes("speed ramp") || lower.includes("slow motion") || lower.includes("time remap") || lower.includes("optical flow")) {
      steps.push({
          tool: "apply_speed_ramp",
          args: { video_id: "input_video", speed: 0.5 },
          description: "Apply optical flow speed ramping",
      });
  }

  if (lower.includes("slip") || lower.includes("slide") || lower.includes("ripple") || lower.includes("roll")) {
      let type = "ripple";
      if (lower.includes("slip")) type = "slip";
      if (lower.includes("slide")) type = "slide";
      if (lower.includes("roll")) type = "roll";

      steps.push({
          tool: "perform_trim_edit",
          args: { video_id: "input_video", edit_type: type, frames: 5 },
          description: `Perform ${type} trim edit`,
      });
  }

  if (lower.includes("null") || lower.includes("parent")) {
      steps.push({
          tool: "add_null_object",
          args: {},
          description: "Add a null object",
      });
  }

  if (lower.includes("shape") || lower.includes("vector") || lower.includes("draw a circle") || lower.includes("draw a square")) {
      steps.push({
          tool: "add_shape_layer",
          args: { shape_type: "rectangle" },
          description: "Add a vector shape layer",
      });
  }

  if (lower.includes("extrude") || lower.includes("3d text")) {
      steps.push({
          tool: "extrude_3d_text",
          args: { text_id: "title_text", depth: 10 },
          description: "Extrude text to 3D",
      });
  }

  if (lower.includes("transcript") && (lower.includes("edit") || lower.includes("delete"))) {
      steps.push({
          tool: "edit_via_transcript",
          args: { video_id: "input_video", text_selection: "selected_text" },
          description: "Edit video via transcript",
      });
  }

  if (lower.includes("filler") || lower.includes("um") || lower.includes("uh") || lower.includes("silence")) {
      steps.push({
          tool: "remove_filler_words",
          args: { video_id: "input_video" },
          description: "Remove filler words",
      });
  }

  if (lower.includes("speaker") || lower.includes("diarize") || lower.includes("label who is speaking")) {
      steps.push({
          tool: "diarize_speakers",
          args: { video_id: "input_video" },
          description: "Diarize speakers in transcript",
      });
  }

  if (lower.includes("publish") || lower.includes("upload") || lower.includes("tiktok") || lower.includes("instagram")) {
      steps.push({
          tool: "publish_to_social",
          args: { platform: lower.includes("tiktok") ? "tiktok" : "instagram", description: "Auto-published from Lazynext!" },
          description: "Publish to social media",
      });
  }

  if (lower.includes("sound effect") || lower.includes("whoosh") || lower.includes("sfx")) {
      steps.push({
          tool: "add_sound_effect",
          args: { effect_type: extractPrompt(prompt, "sfx") || "whoosh" },
          description: "Add a sound effect",
      });
  }

  // Always add a render step if there are preceding steps
  if (steps.length > 0) {
    steps.push({
      tool: "render",
      args: { format: "mp4" },
      description: "Export final rendered video",
    });
  }

  // Default: fetch assets and render
  if (steps.length === 0) {
    steps.push({
      tool: "fetch_assets",
      args: { query: prompt },
      description: "Search for relevant stock footage",
    });
    steps.push({
      tool: "render",
      args: { format: "mp4" },
      description: "Export final video",
    });
  }

  return {
    steps,
    reasoning: `Rule-based decomposition of: "${prompt}"`,
  };
}

function extractPrompt(prompt: string, _tool: string): string {
  // Extract the descriptive part of the prompt for AI generation
  const keywords = [
    "generate",
    "create",
    "make",
    "add",
    "broll",
    "b-roll",
    "footage",
  ];
  const words = prompt.split(" ");
  const cleaned = words
    .filter((w) => !keywords.includes(w.toLowerCase()))
    .join(" ");
  return cleaned || prompt;
}

/**
 * Execute an orchestration plan step-by-step with an Agentic Repair Loop.
 */
export async function executePlan(
  plan: OrchestrationPlan,
): Promise<OrchestrationResult> {
  const results: OrchestrationResult["results"] = [];

  for (const step of plan.steps) {
    let attempts = 0;
    const maxRetries = 2;
    let success = false;
    let result: any = null;

    while (attempts <= maxRetries && !success) {
      result = await executeToolCall(step.tool, step.args);
      
      // Simulate verification against Rust Core / CRDT state
      // In a full implementation, this would query the Rust API Gateway
      // to ensure the operation was valid (e.g., face was tracked successfully)
      if (result.success) {
        success = true;
      } else {
        attempts++;
        console.warn(`[Agentic Repair Loop] Step ${step.tool} failed. Retry ${attempts}/${maxRetries}...`);
        
        // If it's a reframe or tracking failure, we might adjust args here
        // Example: if (step.tool === 'punch_in') step.args.scale = 1.0;
        
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    results.push({
      tool: step.tool,
      success,
      output: result,
      crdt_patches: step.crdt_patches,
    });

    // If an operation critically fails and cannot be repaired, we might abort the plan
    if (!success) {
      console.error(`[Agentic Repair Loop] Failed to repair operation ${step.tool} after ${maxRetries} retries. Halting plan.`);
      break;
    }
  }

  return {
    success: results.every((r) => r.success),
    plan: plan.steps,
    results,
  };
}

/**
 * Execute a single tool call against the appropriate microservice.
 */
async function executeToolCall(
  tool: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (tool) {
    case "fetch_assets":
      return fetchStockFootage(args.query as string);

    case "generate_dub":
      return callService(
        `${GENERATIVE_STUDIO_URL}/dub`,
        "POST",
        args,
      );

    case "overdub_audio":
      const odResult: any = await callService(
        `${GENERATIVE_STUDIO_URL}/overdub`,
        "POST",
        { clip_id: args.clip_id || "main", voice_sample_url: "user_voice.wav", text_to_speak: args.text }
      );
      if (!odResult || !odResult.success) {
          return { success: false, error: "Failed to generate overdub" };
      }
      return { 
          success: true, 
          crdt_patches: [{
              op: "add",
              path: `/tracks/overdub_track/clips/overdub_${Date.now()}`,
              value: {
                  type: "AudioClip",
                  url: odResult.audio_url,
                  start: 0 // In real scenario, sync with transcript timeline
              }
          }] 
      };

    case "generate_broll":
      return callService(
        `${GENERATIVE_STUDIO_URL}/generate-video`,
        "POST",
        { prompt: args.prompt },
      );

    case "transcribe":
      return callService(
        `${PRE_PROCESSING_URL}/transcribe`,
        "POST",
        args,
      );

    case "add_viral_captions":
      const transcribeResult: any = await callService(
        `${PRE_PROCESSING_URL}/transcribe`,
        "POST",
        args,
      );
      
      if (!transcribeResult || !transcribeResult.success) {
          return { success: false, error: "Transcription failed" };
      }

      const patches = [];
      let clipIdCounter = 1;
      for (const sub of (transcribeResult.subtitles || [])) {
          patches.push({
              op: "add",
              path: `/tracks/caption_track/clips/caption_${clipIdCounter}`,
              value: {
                  type: "TextLayer",
                  text: sub.text,
                  start: sub.start,
                  end: sub.end,
                  style: args.style || "hormozi",
                  animations: ["pop_in"]
              }
          });
          clipIdCounter++;
      }
      return { success: true, transcription: transcribeResult, crdt_patches: patches };

    case "remove_background":
      const rotoResult: any = await callService(
          `${PRE_PROCESSING_URL}/rotoscope`,
          "POST",
          args
      );
      if (!rotoResult || !rotoResult.success) {
          return { success: false, error: "Rotoscoping failed" };
      }
      return {
          success: true,
          crdt_patches: [{
              op: "add",
              path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
              value: {
                  type: "AlphaMask",
                  mask_url: rotoResult.mask_url
              }
          }]
      };

    case "track_motion":
      const trackResult: any = await callService(
          `${PRE_PROCESSING_URL}/track`,
          "POST",
          args
      );
      if (!trackResult || !trackResult.success) {
          return { success: false, error: "Motion tracking failed" };
      }
      
      const keyframesPatch = [];
      if (trackResult.keyframes) {
          for (const kf of trackResult.keyframes) {
              keyframesPatch.push({
                  frame: kf.frame,
                  value: { x: kf.x, y: kf.y }
              });
          }
      }
      
      return {
          success: true,
          crdt_patches: [{
              op: "add",
              path: `/tracks/caption_track/clips/${args.target_layer || "text_layer_1"}/position_keyframes`,
              value: keyframesPatch
          }]
      };

    case "auto_reframe":
      const reframeResult: any = await callService(
          `${PRE_PROCESSING_URL}/auto-reframe`,
          "POST",
          args
      );
      if (!reframeResult || !reframeResult.success) {
          return { success: false, error: "Auto-reframe failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "replace",
                  path: "/project/resolution",
                  value: { width: 1080, height: 1920 }
              },
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/crop_keyframes`,
                  value: reframeResult.keyframes
              }
          ]
      };

    case "enhance_audio":
      const enhanceResult: any = await callService(
          `${PRE_PROCESSING_URL}/enhance-audio`,
          "POST",
          args
      );
      if (!enhanceResult || !enhanceResult.success) {
          return { success: false, error: "Audio enhancement failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/audio/clips/${args.video_id || "input_video"}_enhanced`,
                  value: {
                      type: "AudioClip",
                      url: enhanceResult.enhanced_audio_url,
                      start_time: 0
                  }
              },
              {
                  op: "replace",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/muted`,
                  value: true
              }
          ]
      };

    case "style_transfer":
      const styleResult: any = await callService(
          `${GENERATIVE_STUDIO_URL}/style-transfer`,
          "POST",
          args
      );
      if (!styleResult || !styleResult.success) {
          return { success: false, error: "Style transfer failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "replace",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/url`,
                  value: styleResult.styled_video_url
              }
          ]
      };

    case "generate_viral_captions":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/caption_track/clips/viral_captions_1`,
                  value: {
                      type: "TextClip",
                      text: "WAIT 🛑 BEFORE YOU SCROLL...",
                      font: "Montserrat Black",
                      animation: "word-by-word-pop",
                      emoji_overlay: true,
                      start_time: 0,
                      end_time: 3
                  }
              }
          ]
      };

    case "apply_beauty_retouch":
      const retouchResult: any = await callService(
          `${PRE_PROCESSING_URL}/retouch`,
          "POST",
          args
      );
      if (!retouchResult || !retouchResult.success) {
          return { success: false, error: "Retouching failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "BeautyFilter",
                      intensity: retouchResult.intensity_applied,
                      filter_id: retouchResult.filter_id
                  }
              }
          ]
      };

    case "generative_fill":
      const genFillResult: any = await callService(
          `${GENERATIVE_STUDIO_URL}/generative-fill`,
          "POST",
          args
      );
      if (!genFillResult || !genFillResult.success) {
          return { success: false, error: "Generative fill failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "replace",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/url`,
                  value: genFillResult.filled_video_url
              }
          ]
      };

    case "extract_viral_hook":
      const hookResult: any = await callService(
          `${PRE_PROCESSING_URL}/extract-hook`,
          "POST",
          args
      );
      if (!hookResult || !hookResult.success) {
          return { success: false, error: "Hook extraction failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/hook_${args.video_id || "input_video"}`,
                  value: {
                      type: "VideoClip",
                      url: `s3://lazynext-assets/raw/${args.video_id || "input_video"}.mp4`,
                      start_time: 0,
                      trim_start: hookResult.hook_start_time,
                      trim_end: hookResult.hook_start_time + hookResult.hook_duration
                  }
              }
          ]
      };

    case "setup_3d_environment":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/project/scene_3d/elements/-`,
                  value: args.type === "light" 
                      ? { type: "Spotlight", color: "#FFFFFF", intensity: 100, position: {x: 0, y: 10, z: -10} }
                      : { type: "Camera3D", fov: 90, position: {x: 0, y: 0, z: -50}, target: {x: 0, y: 0, z: 0} }
              }
          ]
      };

    case "add_particle_system":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/vfx_track/clips/particle_${Date.now()}`,
                  value: {
                      type: "ParticleEmitter",
                      particle_type: args.particle_type || "snow",
                      start_time: 0,
                      duration: 10,
                      properties: { velocity: 5, birth_rate: 100 }
                  }
              }
          ]
      };

    case "add_kinetic_typography":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/caption_track/clips/kinetic_${Date.now()}`,
                  value: {
                      type: "TextClip",
                      text: args.text || "Kinetic Text!",
                      font: "Inter Black",
                      expression: "bounce(freq=2.0, decay=5.0)",
                      start_time: 0,
                      end_time: 5
                  }
              }
          ]
      };

    case "generate_ai_avatar":
      const avatarResult: any = await callService(
          `${GENERATIVE_STUDIO_URL}/generate-avatar`,
          "POST",
          args
      );
      if (!avatarResult || !avatarResult.success) {
          return { success: false, error: "Avatar generation failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/avatar_${Date.now()}`,
                  value: {
                      type: "VideoClip",
                      url: avatarResult.avatar_video_url,
                      start_time: 0
                  }
              }
          ]
      };

    case "auto_beat_sync":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/project/timeline/effects/-`,
                  value: {
                      type: "BeatSyncNode",
                      audio_source: args.audio_id || "bgm",
                      snap_tolerance: 0.1
                  }
              }
          ]
      };

    case "apply_color_match":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "ColorMatchFilter",
                      reference_url: args.reference_image || "ref.jpg",
                      intensity: 1.0
                  }
              }
          ]
      };

    case "adjust_hdr_color":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "HDRColorWheels",
                      lift: args.lift || 0.0,
                      gamma: args.gamma || 1.0,
                      gain: args.gain || 1.0
                  }
              }
          ]
      };

    case "setup_node_grading":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "ColorNodeGraph",
                      nodes: [
                          { id: "node_1", type: "Primary", active: true },
                          { id: "node_2", type: "Qualifier", active: false }
                      ],
                      connections: [{ from: "node_1", to: "node_2" }]
                  }
              }
          ]
      };

    case "apply_lut":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "LUTFilter",
                      lut_file: args.lut_name || "default.cube",
                      intensity: 1.0
                  }
              }
          ]
      };

    case "toggle_scopes":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "replace",
                  path: `/project/ui/scopes_visible`,
                  value: args.show ?? true
              }
          ]
      };

    case "toggle_pancake_timeline":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "replace",
                  path: `/project/ui/pancake_timeline_visible`,
                  value: args.show ?? true
              }
          ]
      };

    case "setup_multicam":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/multicam_${Date.now()}`,
                  value: {
                      type: "MulticamClip",
                      angles: ["cam_a", "cam_b", "cam_c"],
                      active_angle: "cam_a",
                      sync_method: args.sync_method || "audio",
                      start_time: 0
                  }
              }
          ]
      };

    case "generate_proxies":
      const proxyResult: any = await callService(
          `${PRE_PROCESSING_URL}/generate-proxies`,
          "POST",
          args
      );
      if (!proxyResult || !proxyResult.success) {
          return { success: false, error: "Proxy generation failed" };
      }
      
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/proxy_url`,
                  value: proxyResult.proxy_url
              }
          ]
      };

    case "apply_speed_ramp":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "SpeedRamp",
                      interpolation: "optical_flow",
                      keyframes: [
                          { time: 0, speed: 1.0 },
                          { time: 2, speed: args.speed || 0.5 },
                          { time: 4, speed: 1.0 }
                      ]
                  }
              }
          ]
      };

    case "perform_trim_edit":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/trim_history/-`,
                  value: {
                      edit_type: args.edit_type || "ripple",
                      frames_offset: args.frames || 5,
                      timestamp: Date.now()
                  }
              }
          ]
      };

    case "add_null_object":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/project/timeline/layers/null_${Date.now()}`,
                  value: {
                      type: "NullObject",
                      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
                      children: []
                  }
              }
          ]
      };

    case "add_shape_layer":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/project/timeline/layers/shape_${Date.now()}`,
                  value: {
                      type: "ShapeLayer",
                      shape_type: args.shape_type || "rectangle",
                      fill_color: "#FFFFFF",
                      stroke_color: "#000000",
                      stroke_width: 2
                  }
              }
          ]
      };

    case "extrude_3d_text":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/project/timeline/layers/${args.text_id || "title_text"}/extrusion`,
                  value: {
                      enabled: true,
                      depth: args.depth || 10,
                      material: "matte_plastic"
                  }
              }
          ]
      };

    case "edit_via_transcript":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/trim_history/-`,
                  value: {
                      edit_type: "transcript_delete",
                      text_selection: args.text_selection || "all_ums",
                      timestamp: Date.now()
                  }
              }
          ]
      };

    case "remove_filler_words":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/effects/-`,
                  value: {
                      type: "FillerWordRemoval",
                      aggressiveness: 0.8
                  }
              }
          ]
      };

    case "diarize_speakers":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "replace",
                  path: `/tracks/main/clips/${args.video_id || "input_video"}/transcript_metadata/diarized`,
                  value: true
              }
          ]
      };

    case "add_sound_effect":
      return {
          success: true,
          crdt_patches: [
              {
                  op: "add",
                  path: `/tracks/sfx_track/clips/sfx_${Date.now()}`,
                  value: {
                      type: "AudioClip",
                      url: `s3://lazynext-assets/sfx/${args.effect_type || "whoosh"}.wav`,
                      start_time: 0
                  }
              }
          ]
      };

    case "publish_to_social":
      const publishResult: any = await callService(
          `${RENDER_SERVICE_URL}/api/v1/publish`,
          "POST",
          {
              video_url: "s3://lazynext-assets/rendered/final.mp4",
              platform: args.platform || "tiktok",
              description: args.description || "Generated by Lazynext Copilot"
          }
      );
      if (!publishResult || !publishResult.success) {
          return { success: false, error: "Publishing failed" };
      }
      
      return {
          success: true,
          crdt_patches: [],
          message: `Successfully published to ${publishResult.platform}. URL: ${publishResult.post_url}`
      };

    case "apply_auto_ducking":
      const duckingPatch = [{
          op: "add",
          path: `/tracks/${args.music_track || "bgm"}/effects/-`,
          value: {
              type: "SidechainCompressor",
              sidechain_source: args.voice_track || "dialogue",
              threshold_db: -20.0,
              ratio: 4.0,
              attack_ms: 10.0,
              release_ms: 200.0,
              makeup_gain_db: 0.0
          }
      }];
      return { success: true, crdt_patches: duckingPatch };

    case "split_stems":
      return callService(
        `${GENERATIVE_STUDIO_URL}/split-stems`,
        "POST",
        args,
      );

    case "clean_audio":
      const processResult: any = await callService(`${PRE_PROCESSING_URL}/process`, "POST", {
        video_id: args.video_id || "input",
        operations: ["clean_audio"],
      });

      if (!processResult || !processResult.success) {
          return processResult;
      }

      const cleanPatches = [];
      const cleanOp = processResult.operations_completed?.find((op: any) => op.operation === "clean_audio");
      if (cleanOp && cleanOp.cuts_to_delete) {
          for (const cut of cleanOp.cuts_to_delete) {
              cleanPatches.push({
                  op: "delete_cut",
                  path: `/tracks/main/`,
                  value: { start_ms: cut.start * 1000, end_ms: cut.end * 1000, reason: cut.reason }
              });
          }
      }
      return { success: true, crdt_patches: cleanPatches };

    case "auto_fill_broll":
      const tResult: any = await callService(`${PRE_PROCESSING_URL}/transcribe`, "POST", args);
      if (!tResult || !tResult.success) {
          return { success: false, error: "Failed to transcribe for b-roll generation" };
      }
      
      const sentences = tResult.subtitles || [];
      const brollPatches = [];
      let brollClipCounter = 1;
      
      brollPatches.push({
          op: "add",
          path: "/tracks/broll_track",
          value: { id: "broll_track", type: "video", clips: [] }
      });

      for (let i = 0; i < sentences.length; i += 3) {
          const keyword = sentences[i].text;
          if (keyword && keyword.length > 4) {
              const stockResult: any = await fetchStockFootage(keyword);
              if (stockResult.success && stockResult.assets && stockResult.assets.length > 0) {
                  // Try to get actual video file URL, fallback to image/page url for mock
                  const url = stockResult.assets[0].video_files?.[0]?.link || stockResult.assets[0].url || "https://mock.broll.com/video.mp4";
                  brollPatches.push({
                      op: "add",
                      path: `/tracks/broll_track/clips/broll_${brollClipCounter}`,
                      value: {
                          type: "VideoClip",
                          url: url,
                          start: sentences[i].start,
                          duration: 3.0 // 3 seconds of b-roll
                      }
                  });
                  brollClipCounter++;
              }
          }
      }
      return { success: true, crdt_patches: brollPatches };

    case "render":
      return callService(`${RENDER_SERVICE_URL}/api/v1/jobs`, "POST", {
        projectId: args.projectId || "default",
        format: args.format || "mp4",
      });

    default:
      return { success: false, error: `Unknown tool: ${tool}` };
  }
}

async function callService(
  url: string,
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return (await response.json()) as unknown;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Search stock footage from Pexels API.
 */
async function fetchStockFootage(query: string): Promise<unknown> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return {
      success: true,
      source: "mock",
      assets: [
        {
          id: "pexels-mock-1",
          url: "https://images.pexels.com/photos/example-1",
          description: `Mock result for: ${query}`,
        },
      ],
    };
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3`,
      {
        headers: { Authorization: apiKey },
      },
    );

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
    const data = (await response.json()) as { videos: unknown[] };
    return { success: true, source: "pexels", assets: data.videos };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

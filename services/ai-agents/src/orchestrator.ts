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
 * Decompose a natural language editing intent into a structured plan.
 *
 * Uses the LLM provider configured via LLM_PROVIDER env var to reason
 * about the intent and select appropriate tools. Falls back to rule-based
 * decomposition if no LLM API key is configured.
 */
export async function decomposeIntent(
  prompt: string,
): Promise<OrchestrationPlan> {
  const provider = process.env.LLM_PROVIDER || "rule-based";
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey && provider !== "rule-based") {
    try {
      return await decomposeWithLLM(prompt, openaiKey);
    } catch (err) {
      console.warn(
        `[Orchestrator] LLM decomposition failed (${err}). Using rule-based fallback.`,
      );
    }
  }

  return decomposeRuleBased(prompt);
}

/**
 * LLM-powered intent decomposition via OpenAI-compatible API.
 */
async function decomposeWithLLM(
  prompt: string,
  apiKey: string,
): Promise<OrchestrationPlan> {
  const systemPrompt = `You are the Lazynext AI Orchestrator. You decompose video editing intents into tool calls.

Available tools:
- fetch_assets: Search stock footage libraries (Pexels, Pixabay)
- generate_dub: Create AI dubbing in a target language via generative-studio
- transcribe: Transcribe audio via Whisper (pre-processing)
- generate_broll: Generate B-roll footage via Stable Video Diffusion
- split_stems: Separate audio into stems (vocals, drums, bass, other)
- apply_color_grade: Apply cinematic color grading
- trim_silence: Auto-detect and remove silence from audio tracks
- render: Export the final video via render-service

Respond ONLY with a JSON object:
{
  "reasoning": "Brief explanation of your plan",
  "steps": [
    { "tool": "tool_name", "args": { ... }, "description": "What this step does" }
  ]
}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
    steps.push({
      tool: "transcribe",
      args: { video_id: "input_video" },
      description: "Transcribe audio to generate subtitles",
    });
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

  if (
    lower.includes("broll") ||
    lower.includes("b-roll") ||
    lower.includes("generate")
  ) {
    steps.push({
      tool: "generate_broll",
      args: { prompt: extractPrompt(prompt, "broll") },
      description: "Generate B-roll footage via AI",
    });
  }

  if (
    lower.includes("silence") ||
    lower.includes("trim") ||
    lower.includes("clean")
  ) {
    steps.push({
      tool: "trim_silence",
      args: { track_idx: 0 },
      description: "Auto-detect and remove silence",
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
 * Execute an orchestration plan step-by-step.
 */
export async function executePlan(
  plan: OrchestrationPlan,
): Promise<OrchestrationResult> {
  const results: OrchestrationResult["results"] = [];

  for (const step of plan.steps) {
    const result = await executeToolCall(step.tool, step.args);
    results.push({
      tool: step.tool,
      success: result.success as boolean,
      output: result,
    });
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

    case "split_stems":
      return callService(
        `${GENERATIVE_STUDIO_URL}/split-stems`,
        "POST",
        args,
      );

    case "trim_silence":
      return callService(`${PRE_PROCESSING_URL}/process`, "POST", {
        video_id: args.video_id || "input",
        operations: ["auto_editor"],
      });

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

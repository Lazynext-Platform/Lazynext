import { NextResponse } from "next/server";

// ── Constants ──

const SYSTEM_PROMPT =
	"You are Lazynext Agent, an autonomous video editor. " +
	"You have direct control over a Rust-based NLE. " +
	"When the user asks you to edit their video, use your available tools to perform the edit. " +
	"Always respond with a helpful message explaining what you will do, then call the appropriate tool.";

const DEFAULT_MODEL = "claude-sonnet-4-6";

// ── Tool Definitions (mirrors rust/crates/agent/src/tools.rs) ──

const LAZYNEXT_TOOLS = [
	{
		name: "delete_clip",
		description: "Deletes the currently selected clip from the timeline.",
		input_schema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
	},
	{
		name: "cut_silences",
		description:
			"Analyzes the video and automatically removes all silent portions, performing jump cuts.",
		input_schema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
	},
	{
		name: "color_grade",
		description:
			"Applies a specific color grading or film emulation shader to the footage.",
		input_schema: {
			type: "object" as const,
			properties: {
				look: {
					type: "string",
					description:
						"The look to apply, e.g. 'teal_and_orange', 'cyberpunk', 'vintage'",
				},
			},
			required: ["look"],
		},
	},
	{
		name: "add_text_overlay",
		description:
			"Adds a text caption, title, or subtitle to the video at a specific timestamp.",
		input_schema: {
			type: "object" as const,
			properties: {
				text: { type: "string", description: "The text to display" },
				start_time_sec: {
					type: "number",
					description: "Start time in seconds",
				},
				duration_sec: { type: "number", description: "Duration in seconds" },
			},
			required: ["text", "start_time_sec", "duration_sec"],
		},
	},
	{
		name: "duck_audio",
		description:
			"Automatically lowers the volume of background music tracks whenever speech is detected on the main vocal track.",
		input_schema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
	},
	{
		name: "add_transition",
		description: "Adds a transition effect between two consecutive clips.",
		input_schema: {
			type: "object" as const,
			properties: {
				type: {
					type: "string",
					description:
						"The type of transition, e.g., 'crossfade', 'wipe', 'dip_to_black'",
				},
				duration_frames: {
					type: "number",
					description: "Duration of the transition in frames",
				},
			},
			required: ["type", "duration_frames"],
		},
	},
	{
		name: "crop_and_pan",
		description: "Applies a dynamic crop and pan (Ken Burns) effect to a clip.",
		input_schema: {
			type: "object" as const,
			properties: {
				start_scale: { type: "number", description: "Initial scale factor" },
				end_scale: { type: "number", description: "Final scale factor" },
				pan_x: {
					type: "number",
					description: "Horizontal pan distance",
				},
				pan_y: { type: "number", description: "Vertical pan distance" },
			},
			required: ["start_scale", "end_scale"],
		},
	},
	{
		name: "generate_subtitles",
		description:
			"Automatically transcribes audio and generates subtitle layers.",
		input_schema: {
			type: "object" as const,
			properties: {
				style: {
					type: "string",
					description:
						"Subtitle styling preset (e.g. 'tiktok_bold', 'cinematic')",
				},
			},
			required: ["style"],
		},
	},
	{
		name: "transcribe_video",
		description:
			"Transcribes the spoken words in the video using an AI Whisper model.",
		input_schema: {
			type: "object" as const,
			properties: {
				language: {
					type: "string",
					description: "The language code, e.g. 'en', or 'auto'",
				},
			},
			required: [],
		},
	},
	{
		name: "generate_b_roll",
		description:
			"Generates new B-roll video footage from a text prompt using Open-Sora or Kiwi-Edit models, and drops it into the timeline.",
		input_schema: {
			type: "object" as const,
			properties: {
				prompt: {
					type: "string",
					description: "The text-to-video prompt to generate footage of.",
				},
				duration_sec: {
					type: "number",
					description: "The requested duration of the B-roll in seconds.",
				},
			},
			required: ["prompt", "duration_sec"],
		},
	},
	{
		name: "trim_audio",
		description:
			"Trims an audio track to start and end at specific timestamps.",
		input_schema: {
			type: "object" as const,
			properties: {
				start_time_sec: {
					type: "number",
					description: "The time in seconds to start the audio clip.",
				},
				end_time_sec: {
					type: "number",
					description: "The time in seconds to end the audio clip.",
				},
			},
			required: ["start_time_sec", "end_time_sec"],
		},
	},
	{
		name: "adjust_zoom_speed",
		description:
			"Applies a continuous zoom (scale) effect over a specified duration.",
		input_schema: {
			type: "object" as const,
			properties: {
				target_scale: {
					type: "number",
					description: "The final scale factor (e.g. 1.5 for 150% zoom).",
				},
				duration_frames: {
					type: "number",
					description: "Duration of the zoom animation in frames.",
				},
			},
			required: ["target_scale", "duration_frames"],
		},
	},
	{
		name: "fetch_stock_image",
		description:
			"Fetches a high-quality stock image based on a search query and drops it onto the timeline.",
		input_schema: {
			type: "object" as const,
			properties: {
				search_query: {
					type: "string",
					description:
						"The descriptive keyword to search for (e.g. 'mountain landscape').",
				},
			},
			required: ["search_query"],
		},
	},
	{
		name: "generate_music",
		description:
			"Generates an AI background music track based on a genre and mood description.",
		input_schema: {
			type: "object" as const,
			properties: {
				prompt: {
					type: "string",
					description: "The description of the music (e.g. 'upbeat synthwave for a coding montage').",
				},
				duration_sec: {
					type: "number",
					description: "Duration of the requested audio track.",
				},
			},
			required: ["prompt", "duration_sec"],
		},
	},
	{
		name: "apply_slow_motion",
		description:
			"Applies AI-based optical flow slow motion (like Twixtor) to the selected clip.",
		input_schema: {
			type: "object" as const,
			properties: {
				speed_factor: {
					type: "number",
					description: "The speed factor (e.g., 0.5 for half speed, 0.25 for quarter speed).",
				},
			},
			required: ["speed_factor"],
		},
	},
];

// ── Direct LLM Call (fallback when CLI binary isn't available) ──

interface AgentToolCall {
	name: string;
	input: Record<string, unknown>;
}

interface AgentResponseItem {
	type: "text" | "tool_call";
	content: string;
	tool?: AgentToolCall;
}

async function callAnthropicAPI(prompt: string): Promise<AgentResponseItem[]> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error(
			"ANTHROPIC_API_KEY is not set. Set it in your environment or .env.local file.",
		);
	}

	const model = process.env.LAZYNEXT_AI_MODEL || DEFAULT_MODEL;

	const res = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model,
			max_tokens: 2048,
			system: SYSTEM_PROMPT,
			messages: [{ role: "user", content: prompt }],
			tools: LAZYNEXT_TOOLS,
		}),
	});

	if (!res.ok) {
		const errBody = await res.text();
		throw new Error(`Anthropic API error ${res.status}: ${errBody}`);
	}

	const body = await res.json();
	const items: AgentResponseItem[] = [];

	if (Array.isArray(body.content)) {
		for (const block of body.content) {
			if (block.type === "tool_use") {
				items.push({
					type: "tool_call",
					content: `Calling tool: ${block.name}`,
					tool: {
						name: block.name,
						input: (block.input ?? {}) as Record<string, unknown>,
					},
				});
			} else if (block.type === "text" && block.text) {
				items.push({ type: "text", content: block.text });
			}
		}
	}

	return items;
}

// ── Route Handler ──

export async function POST(req: Request) {
	try {
		const { prompt } = await req.json();

		if (!prompt || typeof prompt !== "string") {
			return NextResponse.json(
				{ error: "Prompt is required" },
				{ status: 400 },
			);
		}

		// Try direct API call first (works in Cloudflare Workers, Vercel, etc.)
		// Falls back to CLI only in local dev when explicitly configured
		const useCli = process.env.LAZYNEXT_USE_CLI === "true";

		if (useCli) {
			// CLI mode — only for local development
			try {
				const { exec } = await import("child_process");
				const { promisify } = await import("util");
				const path = await import("path");

				const execAsync = promisify(exec);
				const cliPath = path.resolve(
					process.cwd(),
					"../../target/debug/lazynext-cli",
				);
				const dummyProject = path.resolve(process.cwd(), "../../project.json");

				const { stdout, stderr } = await execAsync(
					`"${cliPath}" prompt "${dummyProject}" "${prompt}"`,
				);

				return NextResponse.json({
					response: stdout,
					logs: stderr || null,
					mode: "cli",
				});
			} catch (cliErr) {
				console.error("CLI mode failed, falling back to direct API:", cliErr);
			}
		}

		// Direct API mode — works everywhere
		const items = await callAnthropicAPI(prompt);

		const textParts: string[] = [];
		const toolCalls: AgentToolCall[] = [];
		for (const item of items) {
			if (item.content) textParts.push(item.content);
			if (item.type === "tool_call" && item.tool) toolCalls.push(item.tool);
		}

		return NextResponse.json({
			response:
				textParts.length > 0
					? textParts.join("\n")
					: "Processing your request...",
			toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			mode: "api",
		});
	} catch (error: unknown) {
		console.error("Agent error:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

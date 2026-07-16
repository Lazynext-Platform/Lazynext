/**
 * Lazynext AI Agents — Express HTTP + WebSocket server.
 *
 * Hosts the Lazynext AI Agent Copilot orchestrator, AI-powered generative sub-routes,
 * CRDT sync server (Socket.IO), and MCP server initialization. Routes
 * natural-language editing intents through the orchestrator and broadcasts
 * CRDT patches autonomously to connected clients.
 */

import "./tracing";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { setupSyncServer, broadcastCrdtPatch } from "./sync";
import {
	decomposeIntent,
	executePlan,
	executePlanStreaming,
} from "./orchestrator";
import { generateBroll, generateDub } from "./generative";
import { setupMcpServers } from "./mcp";
import { authMiddleware } from "@lazynext/api-client/auth-middleware";

const app = express();
const port = process.env.PORT || 8002;

app.use(express.json());

app.get("/health", (_req, res) => {
	res.json({
		status: "ok",
		service: "ai-agents",
		routing: "intelligent-multi-provider",
		providers: {
			gemini: "available",
		},
		services: {
			pre_processing: process.env.PRE_PROCESSING_URL || "http://localhost:8000",
			generative_studio:
				process.env.GENERATIVE_STUDIO_URL || "http://localhost:8001",
			render_service: process.env.RENDER_SERVICE_URL || "http://localhost:8003",
		},
	});
});

app.use(authMiddleware);
app.use(
	rateLimit({
		windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
		limit: parseInt(process.env.RATE_LIMIT_MAX || "60", 10),
		standardHeaders: "draft-7",
		legacyHeaders: false,
		message: { error: "Too many requests — please retry later." },
	}),
);

app.get("/", (_req, res) => {
	res.json({ status: "ok", service: "ai-agents" });
});

// Generative Studio Sub-routes
app.post("/generative/broll", generateBroll);
app.post("/generative/dub", generateDub);

/**
 * Orchestrate an AI-powered editing intent.
 *
 * POST /orchestrate
 * Body: { prompt: string }
 *
 * Returns a structured execution plan with per-tool results.
 * Uses LLM decomposition when GEMINI_API_KEY is set,
 * otherwise falls back to rule-based planning.
 */
app.post("/orchestrate", async (req, res) => {
	const { prompt: rawPrompt, projectId } = req.body as {
		prompt?: unknown;
		projectId?: string;
	};

	if (typeof rawPrompt !== "string" || rawPrompt.trim().length === 0) {
		return res.status(400).json({ error: "Missing or invalid prompt" });
	}

	if (rawPrompt.length > 50000) {
		return res
			.status(400)
			.json({ error: "Prompt exceeds maximum length of 50,000 characters" });
	}

	const prompt = rawPrompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();

	console.log(
		`[AI-Agents] Orchestrating: "${prompt}" for project: ${projectId || "unknown"}`,
	);

	try {
		const plan = await decomposeIntent(prompt);
		console.log(
			`[AI-Agents] Plan: ${plan.steps.length} steps — ${plan.reasoning}`,
		);

		const result = await executePlan(plan);

		// Apply the CRDT patches autonomously via WebSocket to the connected clients
		if (projectId) {
			for (const res of result.results) {
				if (res.crdt_patches && res.crdt_patches.length > 0) {
					// Push autonomous AI edits directly to the timeline room
					broadcastCrdtPatch(projectId, res.crdt_patches);
				}
			}
		}

		res.json({
			success: result.success,
			reasoning: plan.reasoning,
			plan: plan.steps.map((s) => ({
				tool: s.tool,
				description: s.description,
			})),
			results: result.results,
		});
	} catch (err) {
		console.error(`[AI-Agents] Orchestration failed:`, err);
		res.status(500).json({
			success: false,
			error: String(err),
		});
	}
});

/**
 * Stream an AI orchestration plan's execution progress via SSE.
 *
 * GET /orchestrate/stream?prompt=...&projectId=...
 *
 * Emits events: plan, step:start, step:result, step:error, done, error.
 * The client connects via EventSource / fetch-with-stream and processes
 * events as they arrive.
 */
app.get("/orchestrate/stream", async (req, res) => {
	const rawPrompt = (req.query.prompt as string) || "";
	const prompt = rawPrompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
	const projectId = (req.query.projectId as string) || "";
	const dryRun = req.query.dryRun === "1" || req.query.dryRun === "true";

	if (!prompt) {
		res.status(400).json({ error: "Missing prompt query parameter" });
		return;
	}

	if (prompt.length > 50000) {
		res.status(400).json({ error: "Prompt exceeds maximum length" });
		return;
	}

	// SSE headers
	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	const sendEvent = (event: string, data: unknown) => {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	};

	try {
		console.log(
			`[AI-Agents] Streaming orchestration: "${prompt}" for project: ${projectId || "unknown"}`,
		);

		const plan = await decomposeIntent(prompt);
		const result = await executePlanStreaming(plan, (event) => {
			if ((event.type === "done" || event.type === "error") && !dryRun) {
				if (projectId && event.data) {
					const results = (
						event.data as { results?: Array<{ crdt_patches?: unknown[] }> }
					).results;
					if (results) {
						for (const r of results) {
							if (r.crdt_patches && r.crdt_patches.length > 0) {
								broadcastCrdtPatch(projectId, r.crdt_patches);
							}
						}
					}
				}
			}
			sendEvent(event.type, event.data);
		});

		res.end();
	} catch (err) {
		console.error(`[AI-Agents] Streaming orchestration failed:`, err);
		sendEvent("error", { error: String(err) });
		res.end();
	}
});

const httpServer = createServer(app);
setupSyncServer(httpServer);

await setupMcpServers();

httpServer.listen(port, () => {
	console.log(
		`🤖 Lazynext AI-Agents Orchestrator & Sync Server running on port ${port}`,
	);
	console.log(
		`   LLM: ${process.env.LLM_PROVIDER || "rule-based"} | Gemini: ${process.env.GEMINI_API_KEY ? "✓" : "✗"}`,
	);
});

import "./tracing";
import express from "express";
import { createServer } from "http";
import { setupSyncServer, broadcastCrdtPatch } from "./sync";
import { decomposeIntent, executePlan } from "./orchestrator";
import { generateBroll, generateDub } from "./generative";
import { setupMcpServers } from "./mcp";

const app = express();
const port = process.env.PORT || 8002;

app.use(express.json());

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
 * Uses LLM decomposition when OPENAI_API_KEY is set,
 * otherwise falls back to rule-based planning.
 */
app.post("/orchestrate", async (req, res) => {
  const { prompt, projectId } = req.body as { prompt?: string; projectId?: string };

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  console.log(`[AI-Agents] Orchestrating: "${prompt}" for project: ${projectId || "unknown"}`);

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
 * Health check with intelligent routing capabilities info.
 */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    routing: "intelligent-multi-provider",
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      ollama: "available-locally"
    },
    services: {
      pre_processing: process.env.PRE_PROCESSING_URL || "http://localhost:8000",
      generative_studio:
        process.env.GENERATIVE_STUDIO_URL || "http://localhost:8001",
      render_service:
        process.env.RENDER_SERVICE_URL || "http://localhost:8003",
    },
  });
});

const httpServer = createServer(app);
setupSyncServer(httpServer);

await setupMcpServers();

httpServer.listen(port, () => {
  console.log(
    `🤖 Lazynext AI-Agents Orchestrator & Sync Server running on port ${port}`,
  );
  console.log(
    `   LLM: ${process.env.LLM_PROVIDER || "rule-based"} | OpenAI: ${process.env.OPENAI_API_KEY ? "✓" : "✗"}`,
  );
});

/**
 * Lazynext AI Agent Agent SDK — TypeScript
 *
 * Programmatic access to the Lazynext AI Agent AI agent loop for NLE timeline
 * operations. Natural language prompts are translated into CRDT
 * timeline mutations via the Lazynext API Gateway.
 *
 * ## Quick Start
 *
 * ```ts
 * import { Lazynext AI AgentAgent } from "@lazynext/agent-sdk";
 *
 * const agent = new Lazynext AI AgentAgent({
 *   apiEndpoint: "http://localhost:8005",
 *   mode: "auto_execute",
 * });
 *
 * for await (const event of agent.query("Add captions and remove silences")) {
 *   console.log(`[${event.type}]`, event.data);
 * }
 * ```
 *
 * @module agent-sdk
 */

export type {
	AgentOptions,
	AgentMode,
	AgentEvent,
	AgentEventType,
	SearchResult,
	CommandResult,
	AgentSuggestion,
	ConversationMemory,
	MemoryTurn,
	TimelineAudit,
	AuditFinding,
	AuditSuggestion,
	RuleConfig,
	RulePriority,
} from "./types";

export {
	getAvailableTools,
	getToolsByCategory,
	ToolCategory,
	type ToolDefinition,
} from "./tools";

export { MemoryManager } from "./memory";
export { RulesManager, type Rule } from "./rules";

// ── Internal imports for the Lazynext AI AgentAgent class ─────────────────────────────
import type {
	AgentOptions,
	AgentEvent,
	SearchResult,
	CommandResult,
	AgentSuggestion,
	ConversationMemory,
	TimelineAudit,
	RuleConfig,
} from "./types";

// ── Lazynext AI AgentAgent ────────────────────────────────────────────────────────────

/**
 * Primary entry point for the Lazynext AI Agent AI agent.
 *
 * Communicates with the Lazynext API Gateway (default `http://localhost:8005`)
 * to translate natural language into CRDT timeline operations.
 *
 * ## Agent Modes
 *
 * | Mode            | Behaviour                                      |
 * | --------------- | ---------------------------------------------- |
 * | `"auto_execute"`  | Plan and execute automatically (no approval).  |
 * | `"plan_only"`     | Generate a plan, pause for human review.       |
 * | `"suggest"`       | Propose edits without applying them.           |
 *
 * ## API Gateway Endpoints
 *
 * | Method                     | Gateway Route                              |
 * | -------------------------- | ------------------------------------------ |
 * | `agent.query()`            | `POST /api/v1/lazynext-ai/stream`              |
 * | `agent.search()`           | `POST /api/v1/lazynext-ai/search`              |
 * | `agent.executeSlashCommand()` | `POST /api/v1/lazynext-ai/slash`           |
 * | `agent.getMemory()`        | `GET  /api/v1/lazynext-ai/memory`              |
 * | `agent.getSuggestions()`   | `GET  /api/v1/lazynext-ai/suggestions`         |
 * | `agent.applySuggestion()`  | `POST /api/v1/lazynext-ai/suggestions/:id/apply`|
 * | `agent.runAudit()`         | `POST /api/v1/lazynext-ai/audit`               |
 */
export class Lazynext AI AgentAgent {
	private readonly apiEndpoint: string;
	private readonly apiKey?: string;
	private readonly mode: string;
	private readonly allowedTools: string[];
	private readonly rules: RuleConfig[];

	constructor(options: AgentOptions) {
		this.apiEndpoint = options.apiEndpoint.replace(/\/$/, "");
		this.apiKey = options.apiKey;
		this.mode = options.mode ?? "auto_execute";
		this.allowedTools = options.allowedTools ?? [];
		this.rules = options.rules ?? [];
	}

	// ── HTTP helpers ──────────────────────────────────────────────────────

	private headers(): Record<string, string> {
		const h: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.apiKey) {
			h["Authorization"] = `Bearer ${this.apiKey}`;
		}
		return h;
	}

	private async get<T>(path: string): Promise<T> {
		const resp = await fetch(`${this.apiEndpoint}${path}`, {
			method: "GET",
			headers: this.headers(),
		});
		if (!resp.ok) {
			const body = await resp.text();
			throw new Error(
				`Lazynext AI Agent API error ${resp.status} on GET ${path}: ${body}`,
			);
		}
		return resp.json() as Promise<T>;
	}

	private async post<T>(path: string, body: unknown): Promise<T> {
		const resp = await fetch(`${this.apiEndpoint}${path}`, {
			method: "POST",
			headers: this.headers(),
			body: JSON.stringify(body),
		});
		if (!resp.ok) {
			const text = await resp.text();
			throw new Error(
				`Lazynext AI Agent API error ${resp.status} on POST ${path}: ${text}`,
			);
		}
		return resp.json() as Promise<T>;
	}

	private async postStream<T extends AgentEvent>(
		path: string,
		body: unknown,
	): Promise<AsyncGenerator<T, void, undefined>> {
		const resp = await fetch(`${this.apiEndpoint}${path}`, {
			method: "POST",
			headers: {
				...this.headers(),
				Accept: "text/event-stream",
			},
			body: JSON.stringify(body),
		});

		if (!resp.ok) {
			const text = await resp.text();
			throw new Error(
				`Lazynext AI Agent API error ${resp.status} on POST ${path}: ${text}`,
			);
		}

		if (!resp.body) {
			throw new Error("Streamed response has no body");
		}

		return this.decodeSseStream<T>(resp.body);
	}

	/**
	 * Decodes a Server-Sent Events (SSE) stream into an async generator of
	 * typed events.  Each SSE `data:` line is parsed as JSON.
	 */
	private async *decodeSseStream<T extends AgentEvent>(
		stream: ReadableStream<Uint8Array>,
	): AsyncGenerator<T, void, undefined> {
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith("data: ")) {
						const json = trimmed.slice(6);
						if (json === "[DONE]") return;
						try {
							yield JSON.parse(json) as T;
						} catch {
							// Skip lines the gateway sends as non-JSON
							// keepalive heartbeats.
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	// ── Public API ────────────────────────────────────────────────────────

	/**
	 * Send a natural-language prompt that is streamed through the Lazynext AI Agent
	 * agent loop and translated into CRDT timeline operations.
	 *
	 * Returns an async generator of {@link AgentEvent} objects.
	 *
	 * ```ts
	 * for await (const event of agent.query("Remove silences from the audio track")) {
	 *   if (event.type === "tool_call") { ... }
	 *   if (event.type === "timeline_snapshot") { ... }
	 * }
	 * ```
	 */
	async *query(
		prompt: string,
	): AsyncGenerator<AgentEvent, void, undefined> {
		const stream = await this.postStream<AgentEvent>(
			"/api/v1/lazynext-ai/stream",
			{ prompt, mode: this.mode, tools: this.allowedTools },
		);
		yield* stream;
	}

	/**
	 * Search the current project timeline for clips, markers, or metadata
	 * matching the natural-language query.
	 */
	search(query: string): Promise<SearchResult[]> {
		return this.post<SearchResult[]>("/api/v1/lazynext-ai/search", {
			query,
		});
	}

	/**
	 * Execute a slash command by name (e.g. `/export`, `/render`,
	 * `/caption`).
	 */
	executeSlashCommand(command: string): Promise<CommandResult> {
		return this.post<CommandResult>("/api/v1/lazynext-ai/slash", {
			command,
		});
	}

	/**
	 * Retrieve the agent's conversation memory for the current session.
	 */
	getMemory(): Promise<ConversationMemory> {
		return this.get<ConversationMemory>("/api/v1/lazynext-ai/memory");
	}

	/**
	 * Register a custom behavioural rule for the agent loop.
	 *
	 * Rules are stored in-memory for the lifetime of the agent instance.
	 * For persistent rules, place `.md` files under `.lazynext/rules/`.
	 */
	addRule(rule: RuleConfig): void {
		this.rules.push(rule);
	}

	/**
	 * Ask the agent to generate proactive suggestions based on the current
	 * timeline state.
	 */
	getSuggestions(): Promise<AgentSuggestion[]> {
		return this.get<AgentSuggestion[]>(
			"/api/v1/lazynext-ai/suggestions",
		);
	}

	/**
	 * Apply a previously-retrieved suggestion by its `id`.
	 *
	 * Returns `true` if the suggestion was applied successfully.
	 */
	async applySuggestion(id: string): Promise<boolean> {
		const resp = await this.post<{ applied: boolean }>(
			`/api/v1/lazynext-ai/suggestions/${encodeURIComponent(id)}/apply`,
			{},
		);
		return resp.applied;
	}

	/**
	 * Run a full audit of the current timeline — checks for gaps, clip
	 * overlaps, alignment issues, missing audio, and render safety.
	 */
	runAudit(): Promise<TimelineAudit> {
		return this.post<TimelineAudit>("/api/v1/lazynext-ai/audit", {});
	}
}

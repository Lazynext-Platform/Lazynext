/**
 * Lazynext AI Agent Agent SDK — TypeScript
 *
 * Programmatic access to the Lazynext AI Agent agent loop for NLE timeline
 * operations. Natural language prompts are translated into CRDT
 * timeline mutations via the Lazynext API Gateway.
 *
 * ## Quick Start
 *
 * ```ts
 * import { LazynextAgent } from "@lazynext/agent-sdk";
 *
 * const agent = new LazynextAgent({
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
export type { AgentOptions, AgentMode, AgentEvent, AgentEventType, SearchResult, CommandResult, AgentSuggestion, ConversationMemory, MemoryTurn, TimelineAudit, AuditFinding, AuditSuggestion, RuleConfig, RulePriority, } from "./types";
export { getAvailableTools, getToolsByCategory, ToolCategory, type ToolDefinition, } from "./tools";
export { MemoryManager } from "./memory";
export { RulesManager, type Rule } from "./rules";
import type { AgentOptions, AgentEvent, SearchResult, CommandResult, AgentSuggestion, ConversationMemory, TimelineAudit, RuleConfig } from "./types";
/**
 * Primary entry point for the Lazynext AI Agent agent.
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
export declare class LazynextAgent {
    private readonly apiEndpoint;
    private readonly apiKey?;
    private readonly mode;
    private readonly allowedTools;
    private readonly rules;
    constructor(options: AgentOptions);
    private headers;
    private get;
    private post;
    private postStream;
    /**
     * Decodes a Server-Sent Events (SSE) stream into an async generator of
     * typed events.  Each SSE `data:` line is parsed as JSON.
     */
    private decodeSseStream;
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
    query(prompt: string): AsyncGenerator<AgentEvent, void, undefined>;
    /**
     * Search the current project timeline for clips, markers, or metadata
     * matching the natural-language query.
     */
    search(query: string): Promise<SearchResult[]>;
    /**
     * Execute a slash command by name (e.g. `/export`, `/render`,
     * `/caption`).
     */
    executeSlashCommand(command: string): Promise<CommandResult>;
    /**
     * Retrieve the agent's conversation memory for the current session.
     */
    getMemory(): Promise<ConversationMemory>;
    /**
     * Register a custom behavioural rule for the agent loop.
     *
     * Rules are stored in-memory for the lifetime of the agent instance.
     * For persistent rules, place `.md` files under `.lazynext/rules/`.
     */
    addRule(rule: RuleConfig): void;
    /**
     * Ask the agent to generate proactive suggestions based on the current
     * timeline state.
     */
    getSuggestions(): Promise<AgentSuggestion[]>;
    /**
     * Apply a previously-retrieved suggestion by its `id`.
     *
     * Returns `true` if the suggestion was applied successfully.
     */
    applySuggestion(id: string): Promise<boolean>;
    /**
     * Run a full audit of the current timeline — checks for gaps, clip
     * overlaps, alignment issues, missing audio, and render safety.
     */
    runAudit(): Promise<TimelineAudit>;
}
//# sourceMappingURL=index.d.ts.map
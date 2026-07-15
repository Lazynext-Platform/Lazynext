/**
 * Type definitions for the Lazynext AI Agent Agent SDK.
 *
 * Every interface and type alias used by the SDK is declared here so
 * consumers can import them alongside the {@link Lazynext AI AgentAgent} class.
 *
 * @module agent-sdk/types
 */
/** Operation mode for the agent loop. */
export type AgentMode = "auto_execute" | "plan_only" | "suggest";
/** Priority level for a behavioural rule. */
export type RulePriority = "low" | "medium" | "high" | "critical";
/** Configuration for a single behavioural rule. */
export interface RuleConfig {
    /** Glob paths the rule applies to. */
    paths: string[];
    /** Rule content (human-readable instructions). */
    content: string;
    /** Priority level.  Defaults to `"medium"`. */
    priority?: RulePriority;
}
/** Options passed to the {@link Lazynext AI AgentAgent} constructor. */
export interface AgentOptions {
    /** Base URL of the Lazynext API Gateway (e.g. `http://localhost:8005`). */
    apiEndpoint: string;
    /** Optional JWT / API key for authenticated requests. */
    apiKey?: string;
    /** Agent operation mode.  Defaults to `"auto_execute"`. */
    mode?: AgentMode;
    /** If set, only these tools are available during the agent loop. */
    allowedTools?: string[];
    /** Initial set of behavioural rules. */
    rules?: RuleConfig[];
}
/** Discriminated type for events emitted during `agent.query()`. */
export type AgentEventType = "thinking" | "plan" | "tool_call" | "tool_result" | "timeline_snapshot" | "edit_applied" | "status" | "error" | "done";
/**
 * A single event yielded by the streaming agent loop.
 *
 * Every event has a `type` discriminant and a `data` payload whose shape
 * depends on the type.
 *
 * | Type                | Data shape                        |
 * | ------------------- | --------------------------------- |
 * | `thinking`          | `{ thought: string }`             |
 * | `plan`              | `{ steps: PlanStep[] }`           |
 * | `tool_call`         | `{ tool: string, args: object }`  |
 * | `tool_result`       | `{ output: unknown }`             |
 * | `timeline_snapshot` | `{ state: TimelineState }`        |
 * | `edit_applied`      | `{ mutation: Mutation }`          |
 * | `status`            | `{ message: string }`             |
 * | `error`             | `{ message: string }`             |
 * | `done`              | `{ summary: string }`             |
 */
export interface AgentEvent {
    /** Discriminant for the event type. */
    type: AgentEventType;
    /** Payload whose shape is determined by `type`. */
    data: Record<string, unknown>;
    /** ISO-8601 timestamp of when the event was produced. */
    timestamp: string;
}
/** A single search result from `agent.search()`. */
export interface SearchResult {
    /** Relevance score (0–1). */
    score: number;
    /** The matched timeline item. */
    item: {
        /** Unique item identifier. */
        id: string;
        /** Item type discriminator. */
        type: string;
        /** Display name of the item. */
        name: string;
        /** Start time of the item. */
        start: number;
        /** End time of the item. */
        end: number;
    };
    /** Surrounding context showing why the item matched. */
    context: string;
}
/** Result of executing a slash command via `agent.executeSlashCommand()`. */
export interface CommandResult {
    /** Whether the command executed successfully. */
    success: boolean;
    /** Human-readable result message. */
    message: string;
    /** Optional structured output from the command. */
    output?: Record<string, unknown>;
}
/** A proactive agent suggestion returned by `agent.getSuggestions()`. */
export interface AgentSuggestion {
    /** Unique suggestion identifier. */
    id: string;
    /** Short title describing the suggested action. */
    title: string;
    /**
     * Category of suggestion:
     * - `"optimization"` — performance or quality improvements
     * - `"continuity"` — narrative / visual continuity issues
     * - `"audio"` — audio level or sync concerns
     * - `"export"` — render or format recommendations
     * - `"accessibility"` — captions, colour contrast, etc.
     */
    category: "optimization" | "continuity" | "audio" | "export" | "accessibility";
    /** Risk level of the suggested change. */
    risk: "low" | "medium" | "high";
    /** Human-readable reasoning for why the suggestion was made. */
    reasoning: string;
}
/** A single turn in the conversation memory. */
export interface MemoryTurn {
    /** Role of the speaker. */
    role: "user" | "agent" | "system";
    /** Content of the utterance. */
    content: string;
    /** ISO-8601 timestamp. */
    timestamp: string;
}
/** Conversation memory returned by `agent.getMemory()`. */
export interface ConversationMemory {
    /** Ordered list of conversation turns. */
    turns: MemoryTurn[];
    /** LLM-generated summary of the full conversation. */
    summary: string;
}
/** A single finding from a timeline audit. */
export interface AuditFinding {
    /** Severity of the finding. */
    severity: "info" | "warning" | "error";
    /** Category of the finding (gap, overlap, missing, alignment, etc.). */
    category: string;
    /** Human-readable description. */
    description: string;
    /** Timeline position(s) where the issue was found. */
    location: {
        start: number;
        end: number;
    };
}
/** A single recommendation from a timeline audit. */
export interface AuditSuggestion {
    /** Category of the recommendation. */
    category: string;
    /** Human-readable recommendation. */
    description: string;
    /** Estimated effort to implement (`"low"`, `"medium"`, `"high"`). */
    effort: "low" | "medium" | "high";
}
/** Full timeline audit returned by `agent.runAudit()`. */
export interface TimelineAudit {
    /** Array of issues found during the audit. */
    findings: AuditFinding[];
    /** Array of recommended improvements. */
    suggestions: AuditSuggestion[];
}
//# sourceMappingURL=types.d.ts.map
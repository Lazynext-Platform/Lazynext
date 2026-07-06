/**
 * Lazynext AI Agent Agent Tool Registry
 *
 * Exposes the canonical list of 80+ MCP tools available to the Lazynext AI Agent
 * agent loop.  Tools are organised into six categories matching the
 * NLE domain: **editing**, **audio**, **color**, **export**, **AI**,
 * and **project**.
 *
 * @module agent-sdk/tools
 */
/** Six-domain category for every MCP tool. */
export declare const ToolCategory: {
    readonly Editting: "editing";
    readonly Audio: "audio";
    readonly Color: "color";
    readonly Export: "export";
    readonly Ai: "ai";
    readonly Project: "project";
};
export type ToolCategory = (typeof ToolCategory)[keyof typeof ToolCategory];
/** Descriptor for a single MCP tool the agent may invoke. */
export interface ToolDefinition {
    /** Unique tool name (e.g. `"add_clip"`, `"apply_eq"`). */
    name: string;
    /** Human-readable description shown to the LLM. */
    description: string;
    /** The domain category this tool belongs to. */
    category: ToolCategory;
    /** JSON Schema for the tool's parameters. */
    parameters: Record<string, unknown>;
}
/**
 * Return the full list of 90 MCP tools available to the Lazynext AI Agent agent.
 *
 * ```ts
 * import { getAvailableTools } from "@lazynext/agent-sdk";
 *
 * const tools = getAvailableTools();
 * console.log(`${tools.length} tools available`);
 * ```
 */
export declare function getAvailableTools(): ToolDefinition[];
/**
 * Return tools filtered by a specific domain category.
 *
 * ```ts
 * import { getToolsByCategory, ToolCategory } from "@lazynext/agent-sdk";
 *
 * const audioTools = getToolsByCategory(ToolCategory.Audio);
 * ```
 */
export declare function getToolsByCategory(category: ToolCategory): ToolDefinition[];
//# sourceMappingURL=tools.d.ts.map
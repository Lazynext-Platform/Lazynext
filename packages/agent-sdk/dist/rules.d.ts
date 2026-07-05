/**
 * Rules management for the Lazynext AI Agent Agent SDK.
 *
 * Behavioural rules define constraints, preferences, and editing
 * conventions that the Lazynext AI Agent agent follows during every editing
 * session.  Rules can be loaded from the filesystem (`.lazynext/rules/`
 * directory) or added programmatically at runtime.
 *
 * ## Rule Scoping
 *
 * Rules support path-scoped matching via glob patterns.  For example:
 *
 * ```
 * paths: ["**\/*.mp4"]   → applies to all MP4 clips
 * paths: ["audio/*"]      → applies to audio tracks only
 * ```
 *
 * ## Session Portability
 *
 * The `serialize()` / `deserialize()` pair lets you export the current
 * rule set as JSON and re-import it in another session — useful for
 * agent handoff across team members.
 *
 * ```ts
 * import { RulesManager } from "@lazynext/agent-sdk";
 *
 * const rules = new RulesManager();
 *
 * // Load workspace rules from disk
 * await rules.loadRules([".lazynext/rules/"]);
 *
 * // Add a programmatic rule
 * rules.addRule({
 *   paths: ["audio/**"],
 *   content: "Always normalise dialogue to -16 LUFS.",
 *   priority: "high",
 * });
 *
 * // Export for handoff
 * const json = rules.serialize();
 * ```
 *
 * @module agent-sdk/rules
 */
import type { RuleConfig, RulePriority } from "./types.js";
/** A fully-resolved behavioural rule. */
export interface Rule {
    /** Unique rule identifier (UUID v4). */
    id: string;
    /** Glob patterns the rule applies to. */
    paths: string[];
    /** Human-readable rule content. */
    content: string;
    /** Priority level. */
    priority: RulePriority;
    /** Source of the rule: `"file"`, `"programmatic"`, or `"imported"`. */
    source: "file" | "programmatic" | "imported";
    /** ISO-8601 timestamp of when the rule was added. */
    createdAt: string;
}
/**
 * Manages the behavioural rule set for a Lazynext AI Agent agent instance.
 *
 * Rules are evaluated in priority order (critical → high → medium → low).
 * When multiple rules match a given file path, all applicable rules are
 * returned — the agent LLM is responsible for resolving conflicts.
 */
export declare class RulesManager {
    private rules;
    /**
     * Load `.md` rule files from one or more directories.
     *
     * Each `.md` file is parsed as a single rule.  The file name (without
     * extension) becomes the rule ID; the file content becomes the rule
     * `content`.  YAML front-matter is not supported — if you need
     * structured metadata, use programmatic rules instead.
     *
     * ```ts
     * await rules.loadRules([".lazynext/rules/"]);
     * ```
     */
    loadRules(paths: string[]): Promise<Rule[]>;
    /**
     * Parse a raw `.md` file into a {@link Rule} object.
     *
     * The first `#` heading (if one exists) becomes the path-scope;
     * the rest of the file body is the rule content.
     */
    private parseRuleFile;
    /**
     * Return all rules whose path patterns match the given file path.
     *
     * Rules are sorted in priority order: critical → high → medium → low.
     *
     * ```ts
     * const applicable = rules.getApplicableRules("audio/narration.wav");
     * ```
     */
    getApplicableRules(filePath: string): Rule[];
    /**
     * Add a rule from a {@link RuleConfig} object.
     *
     * The rule is assigned a `"programmatic"` source.
     */
    addRule(config: RuleConfig): Rule;
    /**
     * Remove a rule by its identifier.
     *
     * Returns `true` if the rule existed and was removed.
     */
    removeRule(id: string): boolean;
    /**
     * Return a shallow copy of all registered rules.
     */
    getAllRules(): Rule[];
    /**
     * Export the full rule set as a JSON string.
     *
     * Useful for session portability — you can save this string to disk
     * or send it to another agent instance via a handoff protocol.
     */
    serialize(): string;
    /**
     * Import a previously serialised rule set.
     *
     * Existing rules are **merged** — rules with the same `id` are
     * overwritten by the imported version.
     *
     * Returns the number of rules imported.
     */
    deserialize(json: string): number;
}
//# sourceMappingURL=rules.d.ts.map
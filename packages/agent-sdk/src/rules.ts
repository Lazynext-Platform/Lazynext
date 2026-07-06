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

// ── Rule ─────────────────────────────────────────────────────────────────────

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

// ── Serialised Format ────────────────────────────────────────────────────────

/** JSON-serialisable representation of the full rule set. */
interface SerialisedRules {
	version: 1;
	rules: Rule[];
}

/** Current serialisation version. */
const FORMAT_VERSION = 1;

// ── RulesManager ─────────────────────────────────────────────────────────────

/**
 * Manages the behavioural rule set for a Lazynext AI Agent agent instance.
 *
 * Rules are evaluated in priority order (critical → high → medium → low).
 * When multiple rules match a given file path, all applicable rules are
 * returned — the agent LLM is responsible for resolving conflicts.
 */
export class RulesManager {
	private rules: Map<string, Rule> = new Map();

	// ── Loading ───────────────────────────────────────────────────────────

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
	async loadRules(paths: string[]): Promise<Rule[]> {
		const loaded: Rule[] = [];

		for (const dirPath of paths) {
			try {
				// Use Deno-style dynamic import for Bun / Node compatibility.
				// The standard approach is `readdir` followed by `readFile`.
				const { readdir, readFile, stat } = await import(
					"node:fs/promises"
				);
				const { join, basename, extname } =
					await import("node:path");

				const entries = await readdir(dirPath, {
					withFileTypes: true,
				}).catch(() => [] as { name: string; isFile: () => boolean }[]);

				for (const entry of entries) {
					if (!entry.isFile()) continue;

					const filePath = join(dirPath, entry.name);
					const ext = extname(entry.name).toLowerCase();

					if (ext !== ".md") continue;

					const raw = await readFile(filePath, "utf-8");
					const rule = this.parseRuleFile(
						sanitizeId(basename(entry.name, ext)),
						raw,
					);
					this.rules.set(rule.id, rule);
					loaded.push(rule);
				}
			} catch {
				// Directory may not exist — skip silently.
			}
		}

		return loaded;
	}

	/**
	 * Parse a raw `.md` file into a {@link Rule} object.
	 *
	 * The first `#` heading (if one exists) becomes the path-scope;
	 * the rest of the file body is the rule content.
	 */
	private parseRuleFile(id: string, raw: string): Rule {
		const lines = raw
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		// If the first heading looks like a path pattern, use it.
		let paths: string[] = ["**/*"];
		let content = raw.trim();

		if (lines[0]?.startsWith("#")) {
			const heading = lines[0].replace(/^#+\s*/, "");

			// Check if the heading contains glob-like characters.
			if (/[*?[\]]/.test(heading)) {
				paths = heading.split(/[\s,]+/).filter(Boolean);
				content = lines.slice(1).join("\n");
			}
		}

		return {
			id,
			paths,
			content,
			priority: "medium",
			source: "file",
			createdAt: new Date().toISOString(),
		};
	}

	// ── Querying ──────────────────────────────────────────────────────────

	/**
	 * Return all rules whose path patterns match the given file path.
	 *
	 * Rules are sorted in priority order: critical → high → medium → low.
	 *
	 * ```ts
	 * const applicable = rules.getApplicableRules("audio/narration.wav");
	 * ```
	 */
	getApplicableRules(filePath: string): Rule[] {
		const matches = Array.from(this.rules.values()).filter((rule) =>
			rule.paths.some((pattern) => {
				const regex = globToRegex(pattern);
				return regex.test(filePath);
			}),
		);

		return matches.sort(
			(a, b) => priorityWeight(b.priority) - priorityWeight(a.priority),
		);
	}

	// ── Programmatic Rules ─────────────────────────────────────────────────

	/**
	 * Add a rule from a {@link RuleConfig} object.
	 *
	 * The rule is assigned a `"programmatic"` source.
	 */
	addRule(config: RuleConfig): Rule {
		const id = `prog-${generateShortId()}`;
		const rule: Rule = {
			id,
			paths: config.paths,
			content: config.content,
			priority: config.priority ?? "medium",
			source: "programmatic",
			createdAt: new Date().toISOString(),
		};
		this.rules.set(id, rule);
		return rule;
	}

	/**
	 * Remove a rule by its identifier.
	 *
	 * Returns `true` if the rule existed and was removed.
	 */
	removeRule(id: string): boolean {
		return this.rules.delete(id);
	}

	/**
	 * Return a shallow copy of all registered rules.
	 */
	getAllRules(): Rule[] {
		return Array.from(this.rules.values());
	}

	// ── Serialisation ─────────────────────────────────────────────────────

	/**
	 * Export the full rule set as a JSON string.
	 *
	 * Useful for session portability — you can save this string to disk
	 * or send it to another agent instance via a handoff protocol.
	 */
	serialize(): string {
		const payload: SerialisedRules = {
			version: FORMAT_VERSION,
			rules: Array.from(this.rules.values()),
		};
		return JSON.stringify(payload, null, 2);
	}

	/**
	 * Import a previously serialised rule set.
	 *
	 * Existing rules are **merged** — rules with the same `id` are
	 * overwritten by the imported version.
	 *
	 * Returns the number of rules imported.
	 */
	deserialize(json: string): number {
		let payload: SerialisedRules;

		try {
			payload = JSON.parse(json) as SerialisedRules;
		} catch {
			throw new Error("RulesManager.deserialize: invalid JSON");
		}

		if (payload.version !== FORMAT_VERSION) {
			throw new Error(
				`RulesManager.deserialize: unsupported version ${payload.version}`,
			);
		}

		let count = 0;

		for (const rule of payload.rules) {
			rule.source = "imported";
			this.rules.set(rule.id, rule);
			count++;
		}

		return count;
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Numeric weight for priority sorting (higher = more important). */
function priorityWeight(priority: RulePriority): number {
	switch (priority) {
		case "critical":
			return 4;
		case "high":
			return 3;
		case "medium":
			return 2;
		case "low":
			return 1;
	}
}

/** Naive glob-to-regex conversion.  Covers `*`, `**`, and `?`. */
function globToRegex(glob: string): RegExp {
	let pattern = "";
	let i = 0;

	while (i < glob.length) {
		const ch = glob[i];
		if (ch === "*") {
			if (glob[i + 1] === "*") {
				pattern += ".*";
				i += 1;
			} else {
				pattern += "[^/]*";
			}
		} else if (ch === "?") {
			pattern += "[^/]";
		} else if (".+^${}()|[]\\".includes(ch)) {
			pattern += "\\" + ch;
		} else {
			pattern += ch;
		}
		i++;
	}

	return new RegExp(`^${pattern}$`);
}

/** Generate an 8-character short ID for programmatic rules. */
function generateShortId(): string {
	return Math.random().toString(36).slice(2, 10);
}

/** Sanitise a file-name-based rule ID to use only safe characters. */
function sanitizeId(raw: string): string {
	return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

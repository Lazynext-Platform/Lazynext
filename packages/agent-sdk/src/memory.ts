/**
 * Memory management for the Lazynext AI Agent Agent SDK.
 *
 * Provides a key-value store with summarisation capabilities that
 * persists for the lifetime of the {@link Lazynext AI AgentAgent} instance.
 * The remote gateway also maintains its own memory store; call
 * {@link Lazynext AI AgentAgent.getMemory} to retrieve the server-side state.
 *
 * ```ts
 * import { MemoryManager } from "@lazynext/agent-sdk";
 *
 * const mem = new MemoryManager();
 * mem.remember("target_lufs", -16);
 * const lufs = mem.recall<number>("target_lufs");
 * const summary = mem.summarize();
 * ```
 *
 * @module agent-sdk/memory
 */

/** A single entry in the in-memory store. */
interface MemoryEntry {
	/** Stored value. */
	value: unknown;
	/** Milliseconds timestamp of when stored. */
	timestamp: number;
}

/**
 * In-process key-value store with summarisation.
 *
 * The memory manager is useful for:
 * - Caching agent preferences across queries
 * - Storing intermediate results the agent may re-use
 * - Building a working set that can be summarised for the LLM
 */
export class MemoryManager {
	private store: Map<string, MemoryEntry>;

	constructor() {
		this.store = new Map();
	}

	/**
	 * Store a value under the given key.
	 *
	 * Overwrites any existing entry with the same key.
	 * The value is stored by reference — use `structuredClone` if
	 * you need a deep copy.
	 */
	remember(key: string, value: unknown): void {
		this.store.set(key, {
			value,
			timestamp: Date.now(),
		});
	}

	/**
	 * Retrieve a previously stored value.
	 *
	 * Returns `undefined` when the key does not exist.
	 * The caller should cast the result to the expected type.
	 *
	 * ```ts
	 * const speed = mem.recall<number>("clip_speed");
	 * ```
	 */
	recall<T = unknown>(key: string): T | undefined {
		const entry = this.store.get(key);
		return entry ? (entry.value as T) : undefined;
	}

	/**
	 * Remove a single key from the store.
	 *
	 * Returns `true` if the key existed, `false` otherwise.
	 */
	forget(key: string): boolean {
		return this.store.delete(key);
	}

	/**
	 * Check whether a key exists in the store.
	 */
	has(key: string): boolean {
		return this.store.has(key);
	}

	/**
	 * Return all keys currently in the store.
	 */
	keys(): string[] {
		return Array.from(this.store.keys());
	}

	/**
	 * Generate a human-readable summary of all stored entries.
	 *
	 * Each key-value pair is formatted as a bullet point.  Values are
	 * serialised with `JSON.stringify`.
	 */
	summarize(): string {
		if (this.store.size === 0) return "(empty)";

		const lines: string[] = [];
		for (const [key, entry] of this.store) {
			const val =
				typeof entry.value === "string"
					? entry.value
					: JSON.stringify(entry.value);
			lines.push(`- ${key}: ${val}`);
		}
		return lines.join("\n");
	}

	/**
	 * Return all entries as a plain object suitable for JSON serialisation.
	 *
	 * Timestamps are ISO-8601 strings.
	 */
	toJSON(): Record<string, { value: unknown; timestamp: string }> {
		const result: Record<
			string,
			{ value: unknown; timestamp: string }
		> = {};
		for (const [key, entry] of this.store) {
			result[key] = {
				value: entry.value,
				timestamp: new Date(entry.timestamp).toISOString(),
			};
		}
		return result;
	}

	/**
	 * Remove all entries from the store.
	 */
	clear(): void {
		this.store.clear();
	}

	/**
	 * Return the number of entries currently stored.
	 */
	get size(): number {
		return this.store.size;
	}
}

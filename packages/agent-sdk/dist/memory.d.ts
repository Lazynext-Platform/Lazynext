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
/**
 * In-process key-value store with summarisation.
 *
 * The memory manager is useful for:
 * - Caching agent preferences across queries
 * - Storing intermediate results the agent may re-use
 * - Building a working set that can be summarised for the LLM
 */
export declare class MemoryManager {
    private store;
    constructor();
    /**
     * Store a value under the given key.
     *
     * Overwrites any existing entry with the same key.
     * The value is stored by reference — use `structuredClone` if
     * you need a deep copy.
     */
    remember(key: string, value: unknown): void;
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
    recall<T = unknown>(key: string): T | undefined;
    /**
     * Remove a single key from the store.
     *
     * Returns `true` if the key existed, `false` otherwise.
     */
    forget(key: string): boolean;
    /**
     * Check whether a key exists in the store.
     */
    has(key: string): boolean;
    /**
     * Return all keys currently in the store.
     */
    keys(): string[];
    /**
     * Generate a human-readable summary of all stored entries.
     *
     * Each key-value pair is formatted as a bullet point.  Values are
     * serialised with `JSON.stringify`.
     */
    summarize(): string;
    /**
     * Return all entries as a plain object suitable for JSON serialisation.
     *
     * Timestamps are ISO-8601 strings.
     */
    toJSON(): Record<string, {
        value: unknown;
        timestamp: string;
    }>;
    /**
     * Remove all entries from the store.
     */
    clear(): void;
    /**
     * Return the number of entries currently stored.
     */
    get size(): number;
}
//# sourceMappingURL=memory.d.ts.map
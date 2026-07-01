/**
 * @module wasm/init
 * @description Ensures the WASM bridge is ready before any Rust-backed
 *   functions are called.
 */

/** Resolves immediately — the bundler initialises WASM automatically. */
export function ensureWasmInitialized(): Promise<void> {
	return Promise.resolve();
}

export function ensureWasmInitialized(): Promise<void> {
	// When built with target=bundler, WASM is initialized asynchronously by the bundler automatically.
	// We don't need to manually call an init function.
	return Promise.resolve();
}

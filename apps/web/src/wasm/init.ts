import initWasm, { initializeGpu } from "lazynext-wasm";

let wasmInitPromise: Promise<void> | null = null;

export function ensureWasmInitialized(): Promise<void> {
	if (!wasmInitPromise) {
		console.log("WASM: Creating new init promise!");
		wasmInitPromise = (async () => {
			try {
				console.log("WASM: Calling initWasm()...");
				await initWasm();
				console.log("WASM: initWasm() complete!");
			} catch (e: any) {
				console.warn("WASM init warning (may already be initialized):", e);
			}
			try {
				console.log("WASM: Calling initializeGpu()...");
				await initializeGpu();
				console.log("WASM: initializeGpu() complete!");
			} catch (e: any) {
				console.warn("WASM GPU init warning:", e);
			}
		})();
	}
	return wasmInitPromise;
}

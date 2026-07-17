/**
 * @module Singleton WASM engine bridge. Provides lazy one-time initialization
 * of the WasmEngine and exposes it for timeline state queries and canvas
 * rendering throughout the app.
 */

import { WasmEngine } from "lazynext-wasm";

class WasmBridge {
	private static instance: WasmBridge;
	private engine: WasmEngine | null = null;
	private initPromise: Promise<void> | null = null;

	private constructor() {}

	public static getInstance(): WasmBridge {
		if (!WasmBridge.instance) {
			WasmBridge.instance = new WasmBridge();
		}
		return WasmBridge.instance;
	}

	public async initialize(): Promise<void> {
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			console.log("[WasmBridge] Initializing WASM module...");
			
			// Initialize engine with some default project data
			this.engine = await new WasmEngine("default-id", "Default Project", 60);
			console.log("[WasmBridge] Engine initialized successfully.");
		})();

		return this.initPromise;
	}

	public getEngine(): WasmEngine {
		if (!this.engine) {
			throw new Error("WasmEngine is not initialized. Call initialize() first.");
		}
		return this.engine;
	}
	
	public async renderToCanvas(canvas: HTMLCanvasElement, frameIdx: number): Promise<void> {
		const engine = this.getEngine();
		await engine.render_to_canvas(canvas, frameIdx);
	}
}

/** Utility representing wasmBridge. */
export const wasmBridge = WasmBridge.getInstance();

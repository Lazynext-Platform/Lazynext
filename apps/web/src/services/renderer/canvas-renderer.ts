/** @module Canvas renderer leveraging WASM bridge for GPU-accelerated frame compositing */
import { wasmBridge } from "@/core/wasm-bridge";
import type { FrameRate } from "lazynext-wasm";

export type CanvasRendererParams = {
	/** Output width in pixels. */
	width: number;
	/** Output height in pixels. */
	height: number;
	/** Project frame rate. */
	fps: FrameRate;
};

export class CanvasRenderer {
	width: number;
	height: number;
	fps: FrameRate;
    
    // We keep a dummy canvas to satisfy getOutputCanvas for now
    dummyCanvas: HTMLCanvasElement;

	constructor({ width, height, fps }: CanvasRendererParams) {
		this.width = width;
		this.height = height;
		this.fps = fps;
        this.dummyCanvas = document.createElement("canvas");
        this.dummyCanvas.width = width;
        this.dummyCanvas.height = height;
        
        // Add test clip for now (Phase 1 validation)
        wasmBridge.initialize().then(() => {
            wasmBridge.getEngine().add_test_clip();
        });
	}

	getOutputCanvas(): HTMLCanvasElement {
        return this.dummyCanvas;
	}

	setSize({ width, height }: { width: number; height: number }) {
		this.width = width;
		this.height = height;
        this.dummyCanvas.width = width;
        this.dummyCanvas.height = height;
	}

	async render({ node, time }: { node: any; time: number }) {
        // Render to dummy canvas
		await wasmBridge.renderToCanvas(this.dummyCanvas, Math.floor(time));
	}

	async renderToCanvas({
		node,
		time,
		targetCanvas,
	}: {
		node: any;
		time: number;
		targetCanvas: HTMLCanvasElement;
	}) {
        // Direct render via WasmEngine
		await wasmBridge.renderToCanvas(targetCanvas, Math.floor(time));
	}
}

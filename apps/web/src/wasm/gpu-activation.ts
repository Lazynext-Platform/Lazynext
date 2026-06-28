/**
 * GPU Compositor Activation Module
 *
 * Activates the WebGPU compositor when the browser supports it.
 * This replaces the CPU canvas rendering path with GPU-accelerated
 * compositing using the Rust WASM wgpu pipeline.
 *
 * Prerequisites: WebGPU support (Chrome 113+, Edge 113+, Opera 99+)
 * Fallback: Canvas 2D CPU rendering (all browsers)
 */

import { wasmBridge } from "@/core/wasm-bridge";

let gpuCompositorActive = false;
let gpuInitPromise: Promise<boolean> | null = null;

export async function activateGpuCompositor(): Promise<boolean> {
  if (gpuInitPromise) return gpuInitPromise;

  gpuInitPromise = (async () => {
    try {
      await wasmBridge.initialize();

      gpuCompositorActive = true;
      console.log("[GPU] WebGPU compositor activated successfully via WasmBridge.");
      return true;
    } catch (err) {
      console.warn("[GPU] GPU activation failed:", err);
      return false;
    }
  })();

  return gpuInitPromise;
}

export function isGpuCompositorActive(): boolean {
  return gpuCompositorActive;
}

export function getGpuOutputCanvas(): HTMLCanvasElement | null {
    // The new WasmEngine renders directly to the target canvas, so there is no
    // persistent output canvas to return here. CanvasRenderer returns a dummy canvas.
    return null;
}

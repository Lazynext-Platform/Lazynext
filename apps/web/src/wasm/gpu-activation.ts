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

import { ensureWasmInitialized } from "@/wasm/init";
import { initializeGpu, getCompositorCanvas } from "lazynext-wasm";

let gpuCompositorActive = false;
let gpuInitPromise: Promise<boolean> | null = null;

/**
 * Attempt to initialize the GPU compositor.
 * Returns true if GPU rendering is available and active.
 */
export async function activateGpuCompositor(): Promise<boolean> {
  if (gpuInitPromise) return gpuInitPromise;

  gpuInitPromise = (async () => {
    try {
      // Must have WASM loaded first
      await ensureWasmInitialized();

      // Check browser WebGPU support
      if (!("gpu" in navigator)) {
        console.log("[GPU] WebGPU not available — using CPU canvas rendering.");
        return false;
      }

      // Initialize the WASM GPU context
      const gpuInitialized = initializeGpu();
      if (!gpuInitialized) {
        console.warn("[GPU] WASM GPU context init failed — falling back to CPU.");
        return false;
      }

      gpuCompositorActive = true;
      console.log("[GPU] WebGPU compositor activated successfully.");
      return true;
    } catch (err) {
      console.warn("[GPU] GPU activation failed:", err);
      return false;
    }
  })();

  return gpuInitPromise;
}

/**
 * Check if the GPU compositor is currently active.
 */
export function isGpuCompositorActive(): boolean {
  return gpuCompositorActive;
}

/**
 * Get the compositor's output canvas for rendering into the DOM.
 * Returns null if GPU compositing is not available.
 */
export function getGpuOutputCanvas(): HTMLCanvasElement | null {
  if (!gpuCompositorActive) return null;
  try {
    return getCompositorCanvas();
  } catch {
    return null;
  }
}

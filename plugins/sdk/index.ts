/**
 * @module @lazynext/plugin-sdk
 *
 * Plugin SDK API interfaces for building Lazynext plugins.
 * Plugins are WASM-compiled modules that implement the {@link WasmPlugin}
 * interface and are loaded by the Rust `wasm_sandbox` runtime.
 *
 * @example
 * ```ts
 * import { WasmPlugin, registerPlugin } from "@lazynext/plugin-sdk";
 *
 * const myEffect: WasmPlugin = {
 *   id: "my-effect",
 *   processFrame(buffer, width, height) {
 *     // Apply effect to RGBA pixel buffer
 *     return buffer;
 *   },
 * };
 *
 * registerPlugin(myEffect);
 * ```
 */

/** Top-level timeline model exposed to plugins via the SDK. */
export interface Timeline {
    id: string;
    tracks: Track[];
    fps: number;
    durationFrames: number;
}

/** A single track on the timeline, containing ordered clips of a specific media type. */
export interface Track {
    id: string;
    type: 'video' | 'audio' | 'effect';
    clips: Clip[];
}

/** A clip on a track, referencing an asset by ID with start/end frame boundaries. */
export interface Clip {
    id: string;
    assetId: string;
    startFrame: number;
    endFrame: number;
}

/**
 * Interface that all Lazynext WASM plugins must implement.
 */
export interface WasmPlugin {
    /** Unique identifier for the plugin */
    id: string;
    /** Apply an effect to a raw frame buffer */
    processFrame(buffer: Uint8Array, width: number, height: number): Uint8Array;
}

/**
 * Register a plugin with the Lazynext engine.
 *
 * The plugin's `processFrame` method will be called by the Rust
 * `wasm_sandbox` runtime for each frame that has this effect applied.
 * The plugin ID must be unique across all loaded plugins.
 *
 * @param plugin - Plugin instance implementing the WasmPlugin interface
 */
export function registerPlugin(plugin: WasmPlugin) {
	console.log(`Registered Lazynext plugin: ${plugin.id}`);
	// FFI call to Rust `wasm_sandbox.rs` happens here
}

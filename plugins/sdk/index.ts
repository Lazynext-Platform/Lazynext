// @lazynext/plugin-sdk API interfaces

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
 */
export function registerPlugin(plugin: WasmPlugin) {
    console.log(`Registered Lazynext plugin: ${plugin.id}`);
    // FFI call to Rust `wasm_sandbox.rs` happens here
}

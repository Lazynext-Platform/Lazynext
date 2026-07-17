/* tslint:disable */
/* eslint-disable */
/**
 * Exact rational frame rate (`numerator/denominator`).
 *
 * Standard rates are available as associated constants (e.g.,
 * [`FrameRate::FPS_24`], [`FrameRate::FPS_29_97`]). Use
 * [`FrameRate::new`] for custom rates.
 */
export interface FrameRate {
    numerator: number;
    denominator: number;
}

/**
 * Options for auto-detecting the timecode format from a string.
 */
export interface GuessTimecodeFormatOptions {
    timeCode: string;
}

/**
 * Options for formatting a MediaTime into a timecode string.
 */
export interface FormatTimecodeOptions {
    time: MediaTime;
    format?: TimeCodeFormat;
    rate?: FrameRate;
}

/**
 * Options for parsing a timecode string into a MediaTime.
 */
export interface ParseTimecodeOptions {
    timeCode: string;
    format?: TimeCodeFormat;
    rate?: FrameRate;
}

/**
 * Supported timecode display formats.
 */
export type TimeCodeFormat = "MM:SS" | "HH:MM:SS" | "HH:MM:SS:CS" | "HH:MM:SS:FF";

/** Type definition for FloorToFrameOptions. */
export interface FloorToFrameOptions {
    time: MediaTime;
    rate: FrameRate;
}

/** Type definition for IsFrameAlignedOptions. */
export interface IsFrameAlignedOptions {
    time: MediaTime;
    rate: FrameRate;
}

/** Type definition for LastFrameTimeOptions. */
export interface LastFrameTimeOptions {
    duration: MediaTime;
    rate: FrameRate;
}

/** Type definition for MediaTimeAddOptions. */
export interface MediaTimeAddOptions {
    lhs: MediaTime;
    rhs: MediaTime;
}

/** Type definition for MediaTimeClampOptions. */
export interface MediaTimeClampOptions {
    time: MediaTime;
    min: MediaTime;
    max: MediaTime;
}

/** Type definition for MediaTimeFromFrameOptions. */
export interface MediaTimeFromFrameOptions {
    frame: number;
    rate: FrameRate;
}

/** Type definition for MediaTimeFromSecondsOptions. */
export interface MediaTimeFromSecondsOptions {
    seconds: number;
}

/** Type definition for MediaTimeMaxOptions. */
export interface MediaTimeMaxOptions {
    lhs: MediaTime;
    rhs: MediaTime;
}

/** Type definition for MediaTimeMinOptions. */
export interface MediaTimeMinOptions {
    lhs: MediaTime;
    rhs: MediaTime;
}

/** Type definition for MediaTimeSubOptions. */
export interface MediaTimeSubOptions {
    lhs: MediaTime;
    rhs: MediaTime;
}

/** Type definition for MediaTimeToFrameOptions. */
export interface MediaTimeToFrameOptions {
    time: MediaTime;
    rate: FrameRate;
}

/** Type definition for MediaTimeToSecondsOptions. */
export interface MediaTimeToSecondsOptions {
    time: MediaTime;
}

/** Type definition for RoundToFrameOptions. */
export interface RoundToFrameOptions {
    time: MediaTime;
    rate: FrameRate;
}

/** Type definition for SnappedSeekTimeOptions. */
export interface SnappedSeekTimeOptions {
    time: MediaTime;
    duration: MediaTime;
    rate: FrameRate;
}

/** Type definition for MediaTime. */
export type MediaTime = number;


/**
 * WASM-facing CRDT engine for collaborative editing.
 */
export class CrdtEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Apply a serialized CRDT operation to the engine.
     */
    applyOperation(op_json: any): boolean;
    /**
     * Garbage-collect tombstones safe to remove at the current clock horizon.
     */
    gcTombstones(): number;
    /**
     * Get the current vector clock as JSON.
     */
    getClock(): any;
    /**
     * Get the serialized EntityGraph for Javascript consumption
     */
    getEntityGraph(): any;
    /**
     * Get the full operation log as a JSON array.
     */
    getOperationLog(): any;
    /**
     * Get operations since a given Lamport clock value.
     */
    getOperationsSince(seq: bigint): any;
    /**
     * Get the peer ID for this engine instance.
     */
    getPeerId(): string;
    /**
     * Returns true if this clock happens-before the given clock.
     */
    happensBefore(other_json: any): boolean;
    /**
     * Returns true if the clocks are concurrent (neither happens-before the other).
     */
    isConcurrentWith(other_json: any): boolean;
    /**
     * Check if an entity has been deleted.
     */
    isDeleted(entity_id: string): boolean;
    /**
     * Get the number of operations in the log.
     */
    len(): number;
    /**
     * Link a timeline clip to an entity in the EntityGraph
     */
    linkClipToEntity(clip_id: string, entity_id: string): void;
    /**
     * Mark an entity as deleted (adds tombstone).
     */
    markDeleted(entity_id: string): void;
    /**
     * Merge a remote vector clock into ours.
     */
    mergeClock(clock_json: any): void;
    constructor(peer_id: string);
    /**
     * Redo the last undone operation
     */
    redo(): boolean;
    /**
     * Set an entity's global value in the EntityGraph
     */
    setEntity(entity_id: string, value: string): void;
    /**
     * Get the number of active tombstones.
     */
    tombstoneCount(): number;
    /**
     * Undo the last local operation
     */
    undo(): boolean;
}

/** Class representing NLEState. */
export class NLEState {
    free(): void;
    [Symbol.dispose](): void;
    addClip(track_idx: number, id: string, clip_type: string, name: string, start_frame: number, duration_frames: number): void;
    addTrack(name: string, track_type: string): void;
    deleteCutFromScript(start_ms: number, end_ms: number): void;
    getFrame(): number;
    getIsPlaying(): boolean;
    getProjectData(): any;
    insertCutFromScript(start_ms: number, end_ms: number): void;
    loadProjectData(json_val: any): void;
    constructor(id: string, name: string, fps: number);
    pause(): void;
    play(): void;
    setFrame(frame: number): void;
    splitClip(clip_id: string, at_frame: number): void;
    triggerLiveCut(_camera_angle: number, current_frame: number): void;
    trimClip(clip_id: string, new_start: number, new_duration: number): void;
    updateClip(clip_id: string, start_frame?: number | null, is_disabled?: boolean | null): boolean;
}

/**
 * ProxyGenerator handles background downscaling of high-res video
 * files into 720p intra-frame proxies for smooth timeline scrubbing.
 */
export class ProxyGenerator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Spawns a web worker to transcode the source video into a 720p proxy
     * using the browser's WebCodecs API (hardware-accelerated) when available,
     * falling back to ffmpeg-wasm for software transcoding.
     */
    generate_proxy(file_name: string): Promise<any>;
    constructor();
}

/** Utility representing TICKS_PER_SECOND. */
export function TICKS_PER_SECOND(): number;

/**
 * Wrapper around the browser's native WebCodecs VideoDecoder API.
 *
 * Provides hardware-accelerated video decoding in the browser via
 * the WebCodecs API (available in Chrome 94+, Edge 94+, Opera 80+).
 * Falls back to software decoding when hardware acceleration is unavailable.
 *
 * Usage:
 * ```js
 * const decoder = new VideoDecoderWrapper("avc1.640028");
 * decoder.configure(null);
 * decoder.decodeChunk(encodedData, 0, true);
 * await decoder.flush();
 * ```
 */
export class VideoDecoderWrapper {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Close the decoder and release all resources.
     * Must be called to prevent memory leaks.
     */
    close(): void;
    /**
     * Get the codec string this decoder was initialized with.
     */
    codec(): string;
    /**
     * Configure the decoder with codec-specific initialization data.
     *
     * The `description` parameter contains codec-specific data:
     *   - H.264: AVCC extradata (SPS/PPS)
     *   - VP9: empty (codec string is sufficient)
     *   - AV1: AV1CodecConfigurationRecord
     */
    configure(description?: Uint8Array | null): void;
    /**
     * Decode a raw encoded video chunk.
     *
     * # Arguments
     * * `chunk_data` — Raw encoded bytes (NAL units for H.264, OBUs for AV1)
     * * `timestamp` — Presentation timestamp in microseconds
     * * `is_keyframe` — Whether this chunk starts a new GOP
     * * `duration` — Duration of this chunk in microseconds (optional)
     */
    decode_chunk(chunk_data: Uint8Array, timestamp: number, is_keyframe: boolean, duration?: number | null): void;
    /**
     * Flush the decoder, waiting for all pending frames to be emitted.
     * Returns after all queued frames have been processed.
     */
    flush(): Promise<void>;
    /**
     * Get the number of frames decoded so far.
     */
    frame_count(): number;
    constructor(codec: string, on_frame_cb?: Function | null);
    /**
     * Reset the decoder state (e.g., after a seek).
     */
    reset(): void;
}

/** Class representing WasmEngine. */
export class WasmEngine {
    free(): void;
    [Symbol.dispose](): void;
    addMedia(id: string, name: string, path_or_url: string, asset_type: string, duration: number, width: number, height: number): Promise<void>;
    addTrack(kind: string): Promise<void>;
    add_test_clip(): Promise<void>;
    getTimelineState(): Promise<string>;
    constructor(project_id: string, project_name: string, framerate: number);
    render_to_canvas(canvas: HTMLCanvasElement, frame_idx: number): Promise<void>;
}

/** Class representing WasmPluginRuntime. */
export class WasmPluginRuntime {
    free(): void;
    [Symbol.dispose](): void;
    execute_script(script: string): string;
    constructor();
}

/** Utility representing analyze_waveform. */
export function analyze_waveform(): Uint32Array;

/** Utility representing apply3DLut. */
export function apply3DLut(options: any): OffscreenCanvas;

/** Utility representing applyChromaKey. */
export function applyChromaKey(options: any): OffscreenCanvas;

/**
 * Apply a dynamics compressor to an audio buffer.
 */
export function applyCompressor(buffer: Float64Array, sample_rate: number, threshold_db: number, ratio: number, attack_ms: number, release_ms: number, makeup_gain_db: number): Float64Array;

/** Utility representing applyEffectPasses. */
export function applyEffectPasses(options: any): OffscreenCanvas;

/** Utility representing applyMaskFeather. */
export function applyMaskFeather(options: any): OffscreenCanvas;

/**
 * Apply a parametric EQ to an audio buffer.
 *
 * Frequencies in Hz, gain in dB, Q is bandwidth.
 */
export function applyParametricEq(buffer: Float64Array, sample_rate: number, low_freq: number, low_gain_db: number, mid_freq: number, mid_gain_db: number, mid_q: number, high_freq: number, high_gain_db: number): Float64Array;

/** Utility representing applyPlacement. */
export function applyPlacement(tracks_js: any, placement_result_js: any, elements_js: any, new_track_insert_index_override?: number | null): any;

/** Utility representing applyPolygonMask. */
export function applyPolygonMask(options: any): OffscreenCanvas;

/** Utility representing apply_crdt_patch_native. */
export function apply_crdt_patch_native(patch_json: string): string;

/** Utility representing autoTagFootage. */
export function autoTagFootage(clip_ids: any[]): any;

/**
 * Build an AAF composition manifest (XML).
 */
export function buildAafManifest(project_name: string, clip_ids_js: any): string;

/**
 * Build a DCP Composition Playlist (CPL) XML.
 */
export function buildDcpCpl(project_name: string, reel_count: number, duration_frames: number): string;

/** Utility representing buildSmartBins. */
export function buildSmartBins(tagged: any): any;

/** Utility representing deleteElements. */
export function deleteElements(tracks_js: any, elements_js: any): any;

/** Utility representing detectFaces. */
export function detectFaces(frame_data: Uint8Array, width: number, height: number): any;

/** Utility representing evaluateDiscreteChannel. */
export function evaluateDiscreteChannel(channel_json: any, time_ticks: number, default_value: string): string;

/** Utility representing evaluateScalarChannel. */
export function evaluateScalarChannel(channel_json: any, time_ticks: number, default_value: number): number;

/** Utility representing floorToFrame. */
export function floorToFrame(arg0: FloorToFrameOptions): MediaTime | undefined;

/**
 * Formats a MediaTime into a timecode string using the specified format and
 * optional frame rate.
 */
export function formatTimecode(arg0: FormatTimecodeOptions): string | undefined;

/** Utility representing getCompositorCanvas. */
export function getCompositorCanvas(): HTMLCanvasElement;

/** Utility representing getLastFrameProfile. */
export function getLastFrameProfile(): Array<any>;

/** Utility representing get_wgpu_limits. */
export function get_wgpu_limits(): any;

/**
 * Detects the timecode format from a colon-delimited string by counting parts.
 */
export function guessTimecodeFormat(arg0: GuessTimecodeFormatOptions): TimeCodeFormat | undefined;

/** Utility representing initCompositor. */
export function initCompositor(width: number, height: number): void;

/** Utility representing initNeuralEngine. */
export function initNeuralEngine(): any;

/** Utility representing initializeGpu. */
export function initializeGpu(): Promise<void>;

/** Utility representing isFrameAligned. */
export function isFrameAligned(arg0: IsFrameAlignedOptions): boolean | undefined;

/** Utility representing lastFrameTime. */
export function lastFrameTime(arg0: LastFrameTimeOptions): MediaTime | undefined;

/** Utility representing mediaTimeAdd. */
export function mediaTimeAdd(arg0: MediaTimeAddOptions): MediaTime;

/** Utility representing mediaTimeClamp. */
export function mediaTimeClamp(arg0: MediaTimeClampOptions): MediaTime;

/** Utility representing mediaTimeFromFrame. */
export function mediaTimeFromFrame(arg0: MediaTimeFromFrameOptions): MediaTime | undefined;

/** Utility representing mediaTimeFromSeconds. */
export function mediaTimeFromSeconds(arg0: MediaTimeFromSecondsOptions): MediaTime | undefined;

/** Utility representing mediaTimeMax. */
export function mediaTimeMax(arg0: MediaTimeMaxOptions): MediaTime;

/** Utility representing mediaTimeMin. */
export function mediaTimeMin(arg0: MediaTimeMinOptions): MediaTime;

/** Utility representing mediaTimeSub. */
export function mediaTimeSub(arg0: MediaTimeSubOptions): MediaTime;

/** Utility representing mediaTimeToFrame. */
export function mediaTimeToFrame(arg0: MediaTimeToFrameOptions): bigint | undefined;

/** Utility representing mediaTimeToSeconds. */
export function mediaTimeToSeconds(arg0: MediaTimeToSecondsOptions): number;

/**
 * Parses a timecode string into a MediaTime using the specified format and
 * optional frame rate.
 */
export function parseTimecode(arg0: ParseTimecodeOptions): MediaTime | undefined;

/** Utility representing parse_project_crdt. */
export function parse_project_crdt(project_json: string): boolean;

/** Utility representing placeElementsOnTimeline. */
export function placeElementsOnTimeline(tracks_js: any, subject_js: any, time_spans_js: any, strategy_js: any, elements_js: any, new_track_insert_index_override?: number | null): any;

/**
 * Prepare an export manifest for the given format.
 */
export function prepareExportManifest(format: string, width: number, height: number, framerate: number, output_path: string): any;

/**
 * Process an audio buffer through the master bus (hard limiting).
 */
export function processAudioBuffer(buffer: Float32Array, sample_rate: number, channels: number): Float32Array;

/** Utility representing releaseTexture. */
export function releaseTexture(id: string): void;

/** Utility representing renderFrame. */
export function renderFrame(options: any): void;

/** Utility representing renderProjectFrame. */
export function renderProjectFrame(project_json: string, frame_idx: number): void;

/** Utility representing resizeCompositor. */
export function resizeCompositor(width: number, height: number): void;

/** Utility representing resolveTrackPlacement. */
export function resolveTrackPlacement(tracks_js: any, subject_js: any, time_spans_js: any, strategy_js: any): any;

/** Utility representing roundToFrame. */
export function roundToFrame(arg0: RoundToFrameOptions): MediaTime | undefined;

/** Utility representing snappedSeekTime. */
export function snappedSeekTime(arg0: SnappedSeekTimeOptions): MediaTime | undefined;

/** Utility representing uploadTexture. */
export function uploadTexture(options: any): void;

/** Type definition for InitInput. */
export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

/** Type definition for InitOutput. */
export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmengine_free: (a: number, b: number) => void;
    readonly wasmengine_addMedia: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => any;
    readonly wasmengine_addTrack: (a: number, b: number, c: number) => any;
    readonly wasmengine_add_test_clip: (a: number) => any;
    readonly wasmengine_getTimelineState: (a: number) => any;
    readonly wasmengine_new: (a: number, b: number, c: number, d: number, e: number) => any;
    readonly wasmengine_render_to_canvas: (a: number, b: any, c: number) => any;
    readonly __wbg_crdtengine_free: (a: number, b: number) => void;
    readonly apply3DLut: (a: any) => [number, number, number];
    readonly applyChromaKey: (a: any) => [number, number, number];
    readonly applyEffectPasses: (a: any) => [number, number, number];
    readonly autoTagFootage: (a: number, b: number) => [number, number, number];
    readonly buildSmartBins: (a: any) => [number, number, number];
    readonly crdtengine_applyOperation: (a: number, b: any) => [number, number, number];
    readonly crdtengine_gcTombstones: (a: number) => number;
    readonly crdtengine_getClock: (a: number) => [number, number, number];
    readonly crdtengine_getEntityGraph: (a: number) => [number, number, number];
    readonly crdtengine_getOperationLog: (a: number) => [number, number, number];
    readonly crdtengine_getOperationsSince: (a: number, b: bigint) => [number, number, number];
    readonly crdtengine_getPeerId: (a: number) => [number, number];
    readonly crdtengine_happensBefore: (a: number, b: any) => [number, number, number];
    readonly crdtengine_isConcurrentWith: (a: number, b: any) => [number, number, number];
    readonly crdtengine_isDeleted: (a: number, b: number, c: number) => number;
    readonly crdtengine_len: (a: number) => number;
    readonly crdtengine_linkClipToEntity: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly crdtengine_markDeleted: (a: number, b: number, c: number) => void;
    readonly crdtengine_mergeClock: (a: number, b: any) => [number, number];
    readonly crdtengine_new: (a: number, b: number) => number;
    readonly crdtengine_redo: (a: number) => [number, number, number];
    readonly crdtengine_setEntity: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly crdtengine_tombstoneCount: (a: number) => number;
    readonly crdtengine_undo: (a: number) => [number, number, number];
    readonly detectFaces: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly initNeuralEngine: () => [number, number, number];
    readonly getLastFrameProfile: () => any;
    readonly apply_crdt_patch_native: (a: number, b: number) => [number, number, number, number];
    readonly getCompositorCanvas: () => [number, number, number];
    readonly initCompositor: (a: number, b: number) => [number, number];
    readonly parse_project_crdt: (a: number, b: number) => [number, number, number];
    readonly releaseTexture: (a: number, b: number) => [number, number];
    readonly renderFrame: (a: any) => [number, number];
    readonly renderProjectFrame: (a: number, b: number, c: number) => [number, number];
    readonly resizeCompositor: (a: number, b: number) => [number, number];
    readonly uploadTexture: (a: any) => [number, number];
    readonly __wbg_proxygenerator_free: (a: number, b: number) => void;
    readonly __wbg_wasmpluginruntime_free: (a: number, b: number) => void;
    readonly proxygenerator_generate_proxy: (a: number, b: number, c: number) => any;
    readonly proxygenerator_new: () => number;
    readonly wasmpluginruntime_execute_script: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmpluginruntime_new: () => number;
    readonly analyze_waveform: () => [number, number];
    readonly buildAafManifest: (a: number, b: number, c: any) => [number, number, number, number];
    readonly buildDcpCpl: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly get_wgpu_limits: () => any;
    readonly initializeGpu: () => any;
    readonly prepareExportManifest: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
    readonly applyMaskFeather: (a: any) => [number, number, number];
    readonly applyPlacement: (a: any, b: any, c: any, d: number) => [number, number, number];
    readonly applyPolygonMask: (a: any) => [number, number, number];
    readonly deleteElements: (a: any, b: any) => [number, number, number];
    readonly placeElementsOnTimeline: (a: any, b: any, c: any, d: any, e: any, f: number) => [number, number, number];
    readonly resolveTrackPlacement: (a: any, b: any, c: any, d: any) => [number, number, number];
    readonly __wbg_nlestate_free: (a: number, b: number) => void;
    readonly __wbg_videodecoderwrapper_free: (a: number, b: number) => void;
    readonly applyCompressor: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly applyParametricEq: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
    readonly evaluateDiscreteChannel: (a: any, b: number, c: number, d: number) => [number, number];
    readonly evaluateScalarChannel: (a: any, b: number, c: number) => number;
    readonly nlestate_addClip: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
    readonly nlestate_addTrack: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly nlestate_deleteCutFromScript: (a: number, b: number, c: number) => void;
    readonly nlestate_getFrame: (a: number) => number;
    readonly nlestate_getIsPlaying: (a: number) => number;
    readonly nlestate_getProjectData: (a: number) => any;
    readonly nlestate_insertCutFromScript: (a: number, b: number, c: number) => void;
    readonly nlestate_loadProjectData: (a: number, b: any) => [number, number];
    readonly nlestate_new: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly nlestate_pause: (a: number) => void;
    readonly nlestate_play: (a: number) => void;
    readonly nlestate_setFrame: (a: number, b: number) => void;
    readonly nlestate_splitClip: (a: number, b: number, c: number, d: number) => void;
    readonly nlestate_triggerLiveCut: (a: number, b: number, c: number) => void;
    readonly nlestate_trimClip: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly nlestate_updateClip: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly processAudioBuffer: (a: number, b: number, c: number, d: number) => [number, number];
    readonly videodecoderwrapper_close: (a: number) => void;
    readonly videodecoderwrapper_codec: (a: number) => [number, number];
    readonly videodecoderwrapper_configure: (a: number, b: number) => [number, number];
    readonly videodecoderwrapper_decode_chunk: (a: number, b: any, c: number, d: number, e: number, f: number) => [number, number];
    readonly videodecoderwrapper_flush: (a: number) => any;
    readonly videodecoderwrapper_frame_count: (a: number) => number;
    readonly videodecoderwrapper_new: (a: number, b: number, c: number) => number;
    readonly videodecoderwrapper_reset: (a: number) => [number, number];
    readonly formatTimecode: (a: any) => [number, number];
    readonly guessTimecodeFormat: (a: any) => any;
    readonly parseTimecode: (a: any) => any;
    readonly TICKS_PER_SECOND: () => number;
    readonly floorToFrame: (a: any) => any;
    readonly isFrameAligned: (a: any) => number;
    readonly lastFrameTime: (a: any) => any;
    readonly mediaTimeAdd: (a: any) => any;
    readonly mediaTimeClamp: (a: any) => any;
    readonly mediaTimeFromFrame: (a: any) => any;
    readonly mediaTimeFromSeconds: (a: any) => any;
    readonly mediaTimeMax: (a: any) => any;
    readonly mediaTimeMin: (a: any) => any;
    readonly mediaTimeSub: (a: any) => any;
    readonly mediaTimeToFrame: (a: any) => [number, bigint];
    readonly mediaTimeToSeconds: (a: any) => number;
    readonly roundToFrame: (a: any) => any;
    readonly snappedSeekTime: (a: any) => any;
    readonly wasm_bindgen__convert__closures_____invoke__h82e520213aa56895: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h1baec7b2e08a718e: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h1ea79e83e0e5229e: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__hde3d7d63d4e427ed: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

/** Type definition for SyncInitInput. */
export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

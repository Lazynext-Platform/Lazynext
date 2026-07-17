// Type declarations for lazynext-wasm (WASM package)
// Provides type safety when the WASM binary isn't available during typecheck.
// These declarations match the actual API surface used by the web application.

declare module "lazynext-wasm" {
  // ── Core Types ──────────────────────────────────────────────────────
  export class CrdtEngine {
    constructor(peerId: string);
    applyOperation(op: Record<string, unknown> | unknown): boolean;
    undo(): boolean;
    redo(): boolean;
    getOperationLog(): unknown[];
    getOperationsSince(seq: number): unknown[];
    mergeClock(clock: unknown): void;
    getClock(): unknown;
    happensBefore(other: unknown): boolean;
    isConcurrentWith(other: unknown): boolean;
    markDeleted(id: string): void;
    isDeleted(id: string): boolean;
    gcTombstones(): void;
    len(): number;
    tombstoneCount(): number;
    getPeerId(): string;
    setEntity(id: string, data: unknown): void;
    linkClipToEntity(clipId: string, entityId: string): void;
    getEntityGraph(): unknown;
  }

  /** Class representing WasmEngine. */
  export class WasmEngine {
    constructor(projectId: string, projectName: string, framerate: number);
    static new(projectId: string, projectName: string, framerate: number): Promise<WasmEngine>;
    render_to_canvas(canvas: HTMLCanvasElement, frame_idx: number): Promise<void>;
    add_test_clip(): Promise<void>;
  }

  // ── MediaTime ───────────────────────────────────────────────────────
  // MediaTime is a branded number type compatible with local wasm/media-time.ts
  export type MediaTime = number;

  // FrameRate is used as both a WASM class and a plain {numerator, denominator} object
  export interface FrameRate {
    numerator: number;
    denominator: number;
    ticksPerFrame?(): number | null;
    asF64?(): number;
  }
  /** Utility representing FrameRate. */
  export const FrameRate: {
    new(numerator: number, denominator: number): FrameRate;
    (numerator: number, denominator: number): FrameRate;
  };

  // TimeCodeFormat used as both enum and string union
  export type TimeCodeFormat = string;
  /** Utility representing TimeCodeFormat. */
  export const TimeCodeFormat: Record<string, string>;

  // ── Media/Time functions ────────────────────────────────────────────
  export function mediaTimeFromSeconds(opts: { seconds: number }): MediaTime;
  /** Utility representing mediaTimeToSeconds. */
  export function mediaTimeToSeconds(opts: { time: MediaTime }): number;
  /** Utility representing mediaTimeFromFrame. */
  export function mediaTimeFromFrame(opts: { frame: number; rate: FrameRate }): MediaTime | null;
  /** Utility representing mediaTimeToFrame. */
  export function mediaTimeToFrame(opts: { time: MediaTime; rate: FrameRate }): number | null;
  /** Utility representing roundToFrame. */
  export function roundToFrame(opts: { time: MediaTime; rate: FrameRate }): MediaTime | null;
  /** Utility representing floorToFrame. */
  export function floorToFrame(opts: { time: MediaTime; rate: FrameRate }): MediaTime | null;
  /** Utility representing isFrameAligned. */
  export function isFrameAligned(opts: { time: MediaTime; rate: FrameRate }): boolean | null;
  /** Utility representing lastFrameTime. */
  export function lastFrameTime(opts: { duration: MediaTime; rate: FrameRate }): MediaTime | null;
  /** Utility representing snappedSeekTime. */
  export function snappedSeekTime(opts: { time: MediaTime; duration: MediaTime; rate: FrameRate }): MediaTime | null;
  /** Utility representing mediaTimeAdd. */
  export function mediaTimeAdd(a: MediaTime, b: MediaTime): MediaTime;
  /** Utility representing mediaTimeSub. */
  export function mediaTimeSub(a: MediaTime, b: MediaTime): MediaTime;
  /** Utility representing mediaTimeMin. */
  export function mediaTimeMin(a: MediaTime, b: MediaTime): MediaTime;
  /** Utility representing mediaTimeMax. */
  export function mediaTimeMax(a: MediaTime, b: MediaTime): MediaTime;
  /** Utility representing mediaTimeClamp. */
  export function mediaTimeClamp(t: MediaTime, min: MediaTime, max: MediaTime): MediaTime;

  /** Utility representing formatTimecode. */
  export function formatTimecode(...args: unknown[]): string;
  /** Utility representing parseTimecode. */
  export function parseTimecode(...args: unknown[]): number | null;

  // ── NLE State ───────────────────────────────────────────────────────
  export class NLEState {
    constructor(...args: unknown[]);
    addTrack(id: string, kind: string): void;
    getProjectData(): any;
    loadProjectData(data: unknown): void;
    play(): void;
    pause(): void;
    setFrame(frame: number): void;
    getFrame(): number;
    getIsPlaying(): boolean;
    updateClip(...args: unknown[]): any;
    splitClip(...args: unknown[]): any;
    trimClip(...args: unknown[]): any;
  }

  // ── GPU & Compositor ────────────────────────────────────────────────
  export function initializeGpu(): boolean;
  /** Utility representing initCompositor. */
  export function initCompositor(...args: unknown[]): boolean;
  /** Utility representing resizeCompositor. */
  export function resizeCompositor(...args: unknown[]): void;
  /** Utility representing getCompositorCanvas. */
  export function getCompositorCanvas(): HTMLCanvasElement | null;
  /** Utility representing uploadTexture. */
  export function uploadTexture(...args: unknown[]): void;
  /** Utility representing releaseTexture. */
  export function releaseTexture(id: string): void;
  /** Utility representing renderFrame. */
  export function renderFrame(...args: unknown[]): unknown;
  /** Utility representing renderProjectFrame. */
  export function renderProjectFrame(...args: unknown[]): unknown;

  /** Utility representing applyEffectPasses. */
  export function applyEffectPasses(...args: unknown[]): OffscreenCanvas;
  /** Utility representing applyMaskFeatherWasm. */
  export function applyMaskFeatherWasm(...args: unknown[]): OffscreenCanvas;
  /** Utility representing applyMaskFeather. */
  export function applyMaskFeather(...args: unknown[]): OffscreenCanvas;
  /** Utility representing applyPolygonMask. */
  export function applyPolygonMask(...args: unknown[]): unknown;
  /** Utility representing apply3DLut. */
  export function apply3DLut(...args: unknown[]): unknown;
  /** Utility representing applyChromaKey. */
  export function applyChromaKey(...args: unknown[]): unknown;
  /** Utility representing getLastFrameProfile. */
  export function getLastFrameProfile(): Array<{ name: string; durationMs: number }>;

  // ── Timeline ────────────────────────────────────────────────────────
  export function resolveTrackPlacement(...args: unknown[]): unknown;
  /** Utility representing applyPlacement. */
  export function applyPlacement(...args: unknown[]): unknown;
  /** Utility representing placeElementsOnTimeline. */
  export function placeElementsOnTimeline(...args: unknown[]): unknown;

  // ── Animation ───────────────────────────────────────────────────────
  export function evaluateScalarChannel(...args: unknown[]): number;
  /** Utility representing evaluateDiscreteChannel. */
  export function evaluateDiscreteChannel(...args: unknown[]): string;

  // ── Export ──────────────────────────────────────────────────────────
  export function prepareExportManifest(opts: Record<string, unknown>): string;
  /** Utility representing buildAafManifest. */
  export function buildAafManifest(opts: Record<string, unknown>): string;
  /** Utility representing buildDcpCpl. */
  export function buildDcpCpl(opts: Record<string, unknown>): string;

  // ── Audio ───────────────────────────────────────────────────────────
  export function processAudioBuffer(...args: unknown[]): Float32Array;
  /** Utility representing applyParametricEq. */
  export function applyParametricEq(...args: unknown[]): unknown;
  /** Utility representing applyCompressor. */
  export function applyCompressor(...args: unknown[]): unknown;

  // ── Neural ──────────────────────────────────────────────────────────
  export function initNeuralEngine(): void;
  /** Utility representing detectFaces. */
  export function detectFaces(frame: Uint8Array, width: number, height: number): any[];
  /** Utility representing autoTagFootage. */
  export function autoTagFootage(clipIds: string[]): Record<string, string[]>;
  /** Utility representing buildSmartBins. */
  export function buildSmartBins(tagged: Record<string, string[]>): { label: string; clip_ids: string[] }[];

  // ── WASM Init ───────────────────────────────────────────────────────
  export function initSync(module: WebAssembly.Module | unknown): void;
  /** Utility representing init. */
  export default function init(): Promise<InitOutput>;

  /** Type definition for InitOutput. */
  export interface InitOutput {
    memory: WebAssembly.Memory;
    CrdtEngine: typeof CrdtEngine;
    NLEState: typeof NLEState;
    initializeGpu: typeof initializeGpu;
    getCompositorCanvas: typeof getCompositorCanvas;
  }

  // ── Plugin Runtime ──────────────────────────────────────────────────
  export class WasmPluginRuntime {
    constructor();
    loadPlugin(wasmBytes: Uint8Array): string;
    hasPlugin(pluginId: string): boolean;
    listPlugins(): unknown[];
    unloadPlugin(pluginId: string): void;
    execute_script(script: string): string;
    executeScript(script: string): string;
  }

  // ── GPU Utils ───────────────────────────────────────────────────────
  export function get_wgpu_limits(): unknown;
  /** Utility representing analyze_waveform. */
  export function analyze_waveform(): number[];

  // ── Proxy ───────────────────────────────────────────────────────────
  export class ProxyGenerator {
    constructor();
    generate_proxy(fileName: string): Promise<string>;
  }

  // ── WasmPlayer (canvas-based compositor wrapper) ────────────────────
  export class WasmPlayer {
    constructor(canvas: HTMLCanvasElement);
    render(config: unknown): void;
    destroy(): void;
  }
}

// Default export for dynamic imports
declare module "lazynext-wasm" {
  const init: () => Promise<any>;
  export default init;
}

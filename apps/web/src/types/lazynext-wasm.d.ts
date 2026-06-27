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

  // ── MediaTime ───────────────────────────────────────────────────────
  // MediaTime is a branded number type (opaque wrapper around i64)
  export type MediaTime = number & { readonly __mediaTime: unique symbol };
  export const MediaTime: {
    fromTicks(ticks: number): MediaTime;
    fromSeconds(seconds: number): MediaTime | null;
    fromFrame(frame: number, rate: FrameRate): MediaTime | null;
  };

  // FrameRate is used as both a WASM class and a plain {numerator, denominator} object
  export interface FrameRate {
    numerator: number;
    denominator: number;
    ticksPerFrame?(): number | null;
    asF64?(): number;
  }
  export const FrameRate: {
    new(numerator: number, denominator: number): FrameRate;
    (numerator: number, denominator: number): FrameRate;
  };

  // TimeCodeFormat used as both enum and string union
  export type TimeCodeFormat = string;
  export const TimeCodeFormat: Record<string, string>;

  // ── Media/Time functions ────────────────────────────────────────────
  export function mediaTimeFromSeconds(opts: { seconds: number }): MediaTime | null;
  export function mediaTimeToSeconds(opts: { time: MediaTime }): number;
  export function mediaTimeFromFrame(opts: { frame: number; rate: FrameRate }): MediaTime | null;
  export function mediaTimeToFrame(opts: { time: MediaTime; rate: FrameRate }): number | null;
  export function roundToFrame(opts: { time: MediaTime; rate: FrameRate }): MediaTime | null;
  export function floorToFrame(opts: { time: MediaTime; rate: FrameRate }): MediaTime | null;
  export function isFrameAligned(opts: { time: MediaTime; rate: FrameRate }): boolean | null;
  export function lastFrameTime(opts: { duration: MediaTime; rate: FrameRate }): MediaTime | null;
  export function snappedSeekTime(opts: { time: MediaTime; duration: MediaTime; rate: FrameRate }): MediaTime | null;
  export function mediaTimeAdd(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeSub(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeMin(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeMax(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeClamp(t: MediaTime, min: MediaTime, max: MediaTime): MediaTime;

  export function formatTimecode(...args: unknown[]): string;
  export function parseTimecode(...args: unknown[]): number | null;

  // ── NLE State ───────────────────────────────────────────────────────
  export class NLEState {
    constructor(...args: unknown[]);
    addTrack(id: string, kind: string): void;
    getProjectData(): unknown;
    loadProjectData(data: unknown): void;
    play(): void;
    pause(): void;
    setFrame(frame: number): void;
    getFrame(): number;
    getIsPlaying(): boolean;
    updateClip(...args: unknown[]): void;
    splitClip(...args: unknown[]): void;
    trimClip(...args: unknown[]): void;
  }

  // ── GPU & Compositor ────────────────────────────────────────────────
  export function initializeGpu(): boolean;
  export function initCompositor(width: number, height: number): boolean;
  export function resizeCompositor(width: number, height: number): void;
  export function getCompositorCanvas(): HTMLCanvasElement | null;
  export function uploadTexture(id: string, texture: unknown): void;
  export function releaseTexture(id: string): void;
  export function renderFrame(descriptor: unknown): unknown;
  export function renderProjectFrame(config: unknown): unknown;

  export function applyEffectPasses(...args: unknown[]): unknown;
  export function applyMaskFeatherWasm(...args: unknown[]): unknown;
  export function applyMaskFeather(...args: unknown[]): unknown;
  export function applyPolygonMask(...args: unknown[]): unknown;
  export function apply3DLut(...args: unknown[]): unknown;
  export function applyChromaKey(...args: unknown[]): unknown;
  export function getLastFrameProfile(): Array<{ name: string; durationMs: number }>;

  // ── Timeline ────────────────────────────────────────────────────────
  export function resolveTrackPlacement(...args: unknown[]): unknown;
  export function applyPlacement(...args: unknown[]): unknown;
  export function placeElementsOnTimeline(...args: unknown[]): unknown;

  // ── Animation ───────────────────────────────────────────────────────
  export function evaluateScalarChannel(...args: unknown[]): number;

  // ── Export ──────────────────────────────────────────────────────────
  export function prepareExportManifest(opts: Record<string, unknown>): string;
  export function buildAafManifest(opts: Record<string, unknown>): string;
  export function buildDcpCpl(opts: Record<string, unknown>): string;

  // ── Audio ───────────────────────────────────────────────────────────
  export function processAudioBuffer(buffer: Float32Array): Float32Array;
  export function applyParametricEq(...args: unknown[]): unknown;
  export function applyCompressor(...args: unknown[]): unknown;

  // ── Neural ──────────────────────────────────────────────────────────
  export function initNeuralEngine(): void;
  export function detectFaces(frame: Uint8Array, width: number, height: number): unknown;

  // ── WASM Init ───────────────────────────────────────────────────────
  export function initSync(module: WebAssembly.Module | unknown): void;
  export default function init(): Promise<InitOutput>;

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

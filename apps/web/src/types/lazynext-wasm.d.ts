// Type declarations for lazynext-wasm (WASM package)
// Provides type safety when the WASM binary isn't available during typecheck.

declare module "lazynext-wasm" {
  // ── Core Types ──────────────────────────────────────────────────────
  export class CrdtEngine {
    constructor(peerId: string);
    applyOperation(op: Record<string, unknown>): boolean;
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
  export interface MediaTime {
    asTicks(): number;
    toSecondsF64(): number;
  }

  export interface FrameRate {
    ticksPerFrame(): number | null;
    asF64(): number;
    numerator: number;
    denominator: number;
  }

  export enum TimeCodeFormat {
    MmSs = 0,
    HhMmSs = 1,
    HhMmSsCs = 2,
    HhMmSsFf = 3,
  }

  export function mediaTimeFromSeconds(opts: { seconds: number }): MediaTime | null;
  export function mediaTimeToSeconds(opts: { time: MediaTime }): number;
  export function mediaTimeFromFrame(opts: { frame: number; rate: FrameRate }): MediaTime | null;
  export function mediaTimeToFrame(opts: { time: MediaTime; rate: FrameRate }): number | null;
  export function roundToFrame(opts: { time: MediaTime; rate: FrameRate }): MediaTime | null;
  export function floorToFrame(opts: { time: MediaTime; rate: FrameRate }): MediaTime | null;
  export function isFrameAligned(opts: { time: MediaTime; rate: FrameRate }): boolean | null;
  export function mediaTimeAdd(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeSub(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeMin(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeMax(a: MediaTime, b: MediaTime): MediaTime;
  export function mediaTimeClamp(t: MediaTime, min: MediaTime, max: MediaTime): MediaTime;

  // ── Timecode ────────────────────────────────────────────────────────
  export function formatTimecode(
    ticks: number,
    framerate: FrameRate,
    format: TimeCodeFormat,
  ): string;
  export function parseTimecode(tc: string, framerate: FrameRate): number;

  // ── NLE State ───────────────────────────────────────────────────────
  export class NLEState {
    constructor(sessionId: string, projectName: string, framerate: number);
    addTrack(id: string, kind: string): void;
    getProjectData(): unknown;
    loadProjectData(data: unknown): void;
    play(): void;
    pause(): void;
    setFrame(frame: number): void;
    getFrame(): number;
    getIsPlaying(): boolean;
    updateClip(trackIdx: number, clipId: string, data: unknown): void;
    splitClip(trackIdx: number, clipId: string, splitFrame: number): void;
    trimClip(trackIdx: number, clipId: string, start: number, end: number): void;
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

  export function applyEffectPasses(opts: {
    source: OffscreenCanvas;
    width: number;
    height: number;
    passes: Array<{
      shader: string;
      uniforms: Array<{ name: string; value: number[] }>;
    }>;
  }): OffscreenCanvas;

  export function applyMaskFeatherWasm(opts: {
    mask: OffscreenCanvas;
    width: number;
    height: number;
    feather: number;
  }): OffscreenCanvas;

  // ── Timeline ────────────────────────────────────────────────────────
  export function resolveTrackPlacement(opts: Record<string, unknown>): unknown;
  export function applyPlacement(opts: Record<string, unknown>): unknown;
  export function placeElementsOnTimeline(opts: Record<string, unknown>): unknown;

  // ── Animation ───────────────────────────────────────────────────────
  export function evaluateScalarChannel(opts: Record<string, unknown>): number;

  // ── Export ──────────────────────────────────────────────────────────
  export function prepareExportManifest(opts: Record<string, unknown>): string;
  export function buildAafManifest(opts: Record<string, unknown>): string;
  export function buildDcpCpl(opts: Record<string, unknown>): string;

  // ── Audio ───────────────────────────────────────────────────────────
  export function processAudioBuffer(buffer: Float32Array): Float32Array;
  export function applyParametricEq(opts: Record<string, unknown>): Float32Array;
  export function applyCompressor(opts: Record<string, unknown>): Float32Array;

  // ── Neural ──────────────────────────────────────────────────────────
  export function initNeuralEngine(): void;
  export function detectFaces(frame: Uint8Array, width: number, height: number): unknown;

  // ── WASM Init ───────────────────────────────────────────────────────
  export function initSync(module: WebAssembly.Module): void;
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
  }

  // ── GPU Utils ───────────────────────────────────────────────────────
  export function get_wgpu_limits(): unknown;
  export function analyze_waveform(): number[];
}

// Also export init as default for dynamic imports
declare module "lazynext-wasm" {
  const init: () => Promise<any>;
  export default init;
}

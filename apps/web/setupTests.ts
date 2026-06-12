import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { mock } from 'bun:test';

// Register global DOM elements (window, document, etc.)
GlobalRegistrator.register();

globalThis.indexedDB = {
  open: () => {
    const req: any = { readyState: 'pending' };
    setTimeout(() => {
      req.readyState = 'done';
      req.result = {
        transaction: () => ({ objectStore: () => ({ get: () => ({ onsuccess: null }) }) })
      };
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }
} as any;

mock.module('lazynext-wasm', () => {
  return {
    NLEState: function MockNLEState() {
      return {
        free: () => {},
        getProjectData: () => ({ tracks: [] }),
        updateClip: () => {}
      };
    },
    ProxyGenerator: function MockProxyGenerator() {},
    initWasm: async () => {},
    default: async () => {},
    detectFaces: () => [],
    processAudioBuffer: () => {},
    initNeuralEngine: () => {},
    parseTimecode: () => 0,
    formatTimecode: () => "00:00:00:00",
    guessTimecodeFormat: () => {},
    TICKS_PER_SECOND: () => 60000,
    floorToFrame: () => 0,
    roundToFrame: () => 0,
    mediaTimeFromSeconds: () => 0,
    mediaTimeToSeconds: () => 0,
    mediaTimeFromFrame: () => 0,
    mediaTimeToFrame: () => 0,
    mediaTimeAdd: () => 0,
    mediaTimeSub: () => 0,
    applyMaskFeather: () => {},
    applyPolygonMask: () => {},
    applyEffectPasses: () => {},
    apply3DLut: () => {},
    applyChromaKey: () => {},
    getCompositorCanvas: () => {},
    initCompositor: () => {},
    initializeGpu: () => {},
    renderFrame: () => {},
    renderProjectFrame: () => {},
    resizeCompositor: () => {},
    snappedSeekTime: () => 0,
    analyze_waveform: () => new Float32Array(),
    get_wgpu_limits: () => ({}),
    isFrameAligned: () => true,
    lastFrameTime: () => 0,
    mediaTimeMax: () => 0,
    mediaTimeMin: () => 0,
    mediaTimeClamp: () => 0,
    releaseTexture: () => {},
    uploadTexture: () => {},
    initSync: () => {},
    WasmPluginRuntime: function MockWasmPluginRuntime() {},
  };
});

const OriginalAggregateError = globalThis.AggregateError;
globalThis.AggregateError = class extends OriginalAggregateError {
  constructor(errors, message, options) {
    super(errors, message, options);
    console.error("AGGREGATE ERROR INNER:", errors);
  }
};

// Mock Canvas getContext
globalThis.HTMLCanvasElement.prototype.getContext = () => {
  return {
    measureText: () => ({ width: 100, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 }),
    fillText: () => {},
    strokeText: () => {},
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    clip: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {}
  } as any;
};

// Mock OffscreenCanvas
globalThis.OffscreenCanvas = class OffscreenCanvas {
  constructor() {}
  getContext() {
    return globalThis.HTMLCanvasElement.prototype.getContext.call(this);
  }
} as any;

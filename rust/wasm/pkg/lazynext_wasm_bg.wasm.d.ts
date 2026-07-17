/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
/** Utility representing __wbg_wasmengine_free. */
export const __wbg_wasmengine_free: (a: number, b: number) => void;
/** Utility representing wasmengine_addMedia. */
export const wasmengine_addMedia: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => any;
/** Utility representing wasmengine_addTrack. */
export const wasmengine_addTrack: (a: number, b: number, c: number) => any;
/** Utility representing wasmengine_add_test_clip. */
export const wasmengine_add_test_clip: (a: number) => any;
/** Utility representing wasmengine_getTimelineState. */
export const wasmengine_getTimelineState: (a: number) => any;
/** Utility representing wasmengine_new. */
export const wasmengine_new: (a: number, b: number, c: number, d: number, e: number) => any;
/** Utility representing wasmengine_render_to_canvas. */
export const wasmengine_render_to_canvas: (a: number, b: any, c: number) => any;
/** Utility representing __wbg_crdtengine_free. */
export const __wbg_crdtengine_free: (a: number, b: number) => void;
/** Utility representing apply3DLut. */
export const apply3DLut: (a: any) => [number, number, number];
/** Utility representing applyChromaKey. */
export const applyChromaKey: (a: any) => [number, number, number];
/** Utility representing applyEffectPasses. */
export const applyEffectPasses: (a: any) => [number, number, number];
/** Utility representing autoTagFootage. */
export const autoTagFootage: (a: number, b: number) => [number, number, number];
/** Utility representing buildSmartBins. */
export const buildSmartBins: (a: any) => [number, number, number];
/** Utility representing crdtengine_applyOperation. */
export const crdtengine_applyOperation: (a: number, b: any) => [number, number, number];
/** Utility representing crdtengine_gcTombstones. */
export const crdtengine_gcTombstones: (a: number) => number;
/** Utility representing crdtengine_getClock. */
export const crdtengine_getClock: (a: number) => [number, number, number];
/** Utility representing crdtengine_getEntityGraph. */
export const crdtengine_getEntityGraph: (a: number) => [number, number, number];
/** Utility representing crdtengine_getOperationLog. */
export const crdtengine_getOperationLog: (a: number) => [number, number, number];
/** Utility representing crdtengine_getOperationsSince. */
export const crdtengine_getOperationsSince: (a: number, b: bigint) => [number, number, number];
/** Utility representing crdtengine_getPeerId. */
export const crdtengine_getPeerId: (a: number) => [number, number];
/** Utility representing crdtengine_happensBefore. */
export const crdtengine_happensBefore: (a: number, b: any) => [number, number, number];
/** Utility representing crdtengine_isConcurrentWith. */
export const crdtengine_isConcurrentWith: (a: number, b: any) => [number, number, number];
/** Utility representing crdtengine_isDeleted. */
export const crdtengine_isDeleted: (a: number, b: number, c: number) => number;
/** Utility representing crdtengine_len. */
export const crdtengine_len: (a: number) => number;
/** Utility representing crdtengine_linkClipToEntity. */
export const crdtengine_linkClipToEntity: (a: number, b: number, c: number, d: number, e: number) => void;
/** Utility representing crdtengine_markDeleted. */
export const crdtengine_markDeleted: (a: number, b: number, c: number) => void;
/** Utility representing crdtengine_mergeClock. */
export const crdtengine_mergeClock: (a: number, b: any) => [number, number];
/** Utility representing crdtengine_new. */
export const crdtengine_new: (a: number, b: number) => number;
/** Utility representing crdtengine_redo. */
export const crdtengine_redo: (a: number) => [number, number, number];
/** Utility representing crdtengine_setEntity. */
export const crdtengine_setEntity: (a: number, b: number, c: number, d: number, e: number) => void;
/** Utility representing crdtengine_tombstoneCount. */
export const crdtengine_tombstoneCount: (a: number) => number;
/** Utility representing crdtengine_undo. */
export const crdtengine_undo: (a: number) => [number, number, number];
/** Utility representing detectFaces. */
export const detectFaces: (a: number, b: number, c: number, d: number) => [number, number, number];
/** Utility representing initNeuralEngine. */
export const initNeuralEngine: () => [number, number, number];
/** Utility representing getLastFrameProfile. */
export const getLastFrameProfile: () => any;
/** Utility representing apply_crdt_patch_native. */
export const apply_crdt_patch_native: (a: number, b: number) => [number, number, number, number];
/** Utility representing getCompositorCanvas. */
export const getCompositorCanvas: () => [number, number, number];
/** Utility representing initCompositor. */
export const initCompositor: (a: number, b: number) => [number, number];
/** Utility representing parse_project_crdt. */
export const parse_project_crdt: (a: number, b: number) => [number, number, number];
/** Utility representing releaseTexture. */
export const releaseTexture: (a: number, b: number) => [number, number];
/** Utility representing renderFrame. */
export const renderFrame: (a: any) => [number, number];
/** Utility representing renderProjectFrame. */
export const renderProjectFrame: (a: number, b: number, c: number) => [number, number];
/** Utility representing resizeCompositor. */
export const resizeCompositor: (a: number, b: number) => [number, number];
/** Utility representing uploadTexture. */
export const uploadTexture: (a: any) => [number, number];
/** Utility representing __wbg_proxygenerator_free. */
export const __wbg_proxygenerator_free: (a: number, b: number) => void;
/** Utility representing __wbg_wasmpluginruntime_free. */
export const __wbg_wasmpluginruntime_free: (a: number, b: number) => void;
/** Utility representing proxygenerator_generate_proxy. */
export const proxygenerator_generate_proxy: (a: number, b: number, c: number) => any;
/** Utility representing proxygenerator_new. */
export const proxygenerator_new: () => number;
/** Utility representing wasmpluginruntime_execute_script. */
export const wasmpluginruntime_execute_script: (a: number, b: number, c: number) => [number, number, number, number];
/** Utility representing wasmpluginruntime_new. */
export const wasmpluginruntime_new: () => number;
/** Utility representing analyze_waveform. */
export const analyze_waveform: () => [number, number];
/** Utility representing buildAafManifest. */
export const buildAafManifest: (a: number, b: number, c: any) => [number, number, number, number];
/** Utility representing buildDcpCpl. */
export const buildDcpCpl: (a: number, b: number, c: number, d: number) => [number, number, number, number];
/** Utility representing get_wgpu_limits. */
export const get_wgpu_limits: () => any;
/** Utility representing initializeGpu. */
export const initializeGpu: () => any;
/** Utility representing prepareExportManifest. */
export const prepareExportManifest: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number];
/** Utility representing applyMaskFeather. */
export const applyMaskFeather: (a: any) => [number, number, number];
/** Utility representing applyPlacement. */
export const applyPlacement: (a: any, b: any, c: any, d: number) => [number, number, number];
/** Utility representing applyPolygonMask. */
export const applyPolygonMask: (a: any) => [number, number, number];
/** Utility representing deleteElements. */
export const deleteElements: (a: any, b: any) => [number, number, number];
/** Utility representing placeElementsOnTimeline. */
export const placeElementsOnTimeline: (a: any, b: any, c: any, d: any, e: any, f: number) => [number, number, number];
/** Utility representing resolveTrackPlacement. */
export const resolveTrackPlacement: (a: any, b: any, c: any, d: any) => [number, number, number];
/** Utility representing __wbg_nlestate_free. */
export const __wbg_nlestate_free: (a: number, b: number) => void;
/** Utility representing __wbg_videodecoderwrapper_free. */
export const __wbg_videodecoderwrapper_free: (a: number, b: number) => void;
/** Utility representing applyCompressor. */
export const applyCompressor: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
/** Utility representing applyParametricEq. */
export const applyParametricEq: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
/** Utility representing evaluateDiscreteChannel. */
export const evaluateDiscreteChannel: (a: any, b: number, c: number, d: number) => [number, number];
/** Utility representing evaluateScalarChannel. */
export const evaluateScalarChannel: (a: any, b: number, c: number) => number;
/** Utility representing nlestate_addClip. */
export const nlestate_addClip: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
/** Utility representing nlestate_addTrack. */
export const nlestate_addTrack: (a: number, b: number, c: number, d: number, e: number) => void;
/** Utility representing nlestate_deleteCutFromScript. */
export const nlestate_deleteCutFromScript: (a: number, b: number, c: number) => void;
/** Utility representing nlestate_getFrame. */
export const nlestate_getFrame: (a: number) => number;
/** Utility representing nlestate_getIsPlaying. */
export const nlestate_getIsPlaying: (a: number) => number;
/** Utility representing nlestate_getProjectData. */
export const nlestate_getProjectData: (a: number) => any;
/** Utility representing nlestate_insertCutFromScript. */
export const nlestate_insertCutFromScript: (a: number, b: number, c: number) => void;
/** Utility representing nlestate_loadProjectData. */
export const nlestate_loadProjectData: (a: number, b: any) => [number, number];
/** Utility representing nlestate_new. */
export const nlestate_new: (a: number, b: number, c: number, d: number, e: number) => number;
/** Utility representing nlestate_pause. */
export const nlestate_pause: (a: number) => void;
/** Utility representing nlestate_play. */
export const nlestate_play: (a: number) => void;
/** Utility representing nlestate_setFrame. */
export const nlestate_setFrame: (a: number, b: number) => void;
/** Utility representing nlestate_splitClip. */
export const nlestate_splitClip: (a: number, b: number, c: number, d: number) => void;
/** Utility representing nlestate_triggerLiveCut. */
export const nlestate_triggerLiveCut: (a: number, b: number, c: number) => void;
/** Utility representing nlestate_trimClip. */
export const nlestate_trimClip: (a: number, b: number, c: number, d: number, e: number) => void;
/** Utility representing nlestate_updateClip. */
export const nlestate_updateClip: (a: number, b: number, c: number, d: number, e: number) => number;
/** Utility representing processAudioBuffer. */
export const processAudioBuffer: (a: number, b: number, c: number, d: number) => [number, number];
/** Utility representing videodecoderwrapper_close. */
export const videodecoderwrapper_close: (a: number) => void;
/** Utility representing videodecoderwrapper_codec. */
export const videodecoderwrapper_codec: (a: number) => [number, number];
/** Utility representing videodecoderwrapper_configure. */
export const videodecoderwrapper_configure: (a: number, b: number) => [number, number];
/** Utility representing videodecoderwrapper_decode_chunk. */
export const videodecoderwrapper_decode_chunk: (a: number, b: any, c: number, d: number, e: number, f: number) => [number, number];
/** Utility representing videodecoderwrapper_flush. */
export const videodecoderwrapper_flush: (a: number) => any;
/** Utility representing videodecoderwrapper_frame_count. */
export const videodecoderwrapper_frame_count: (a: number) => number;
/** Utility representing videodecoderwrapper_new. */
export const videodecoderwrapper_new: (a: number, b: number, c: number) => number;
/** Utility representing videodecoderwrapper_reset. */
export const videodecoderwrapper_reset: (a: number) => [number, number];
/** Utility representing formatTimecode. */
export const formatTimecode: (a: any) => [number, number];
/** Utility representing guessTimecodeFormat. */
export const guessTimecodeFormat: (a: any) => any;
/** Utility representing parseTimecode. */
export const parseTimecode: (a: any) => any;
/** Utility representing TICKS_PER_SECOND. */
export const TICKS_PER_SECOND: () => number;
/** Utility representing floorToFrame. */
export const floorToFrame: (a: any) => any;
/** Utility representing isFrameAligned. */
export const isFrameAligned: (a: any) => number;
/** Utility representing lastFrameTime. */
export const lastFrameTime: (a: any) => any;
/** Utility representing mediaTimeAdd. */
export const mediaTimeAdd: (a: any) => any;
/** Utility representing mediaTimeClamp. */
export const mediaTimeClamp: (a: any) => any;
/** Utility representing mediaTimeFromFrame. */
export const mediaTimeFromFrame: (a: any) => any;
/** Utility representing mediaTimeFromSeconds. */
export const mediaTimeFromSeconds: (a: any) => any;
/** Utility representing mediaTimeMax. */
export const mediaTimeMax: (a: any) => any;
/** Utility representing mediaTimeMin. */
export const mediaTimeMin: (a: any) => any;
/** Utility representing mediaTimeSub. */
export const mediaTimeSub: (a: any) => any;
/** Utility representing mediaTimeToFrame. */
export const mediaTimeToFrame: (a: any) => [number, bigint];
/** Utility representing mediaTimeToSeconds. */
export const mediaTimeToSeconds: (a: any) => number;
/** Utility representing roundToFrame. */
export const roundToFrame: (a: any) => any;
/** Utility representing snappedSeekTime. */
export const snappedSeekTime: (a: any) => any;
/** Utility representing wasm_bindgen__convert__closures_____invoke__h82e520213aa56895. */
export const wasm_bindgen__convert__closures_____invoke__h82e520213aa56895: (a: number, b: number, c: any) => [number, number];
/** Utility representing wasm_bindgen__convert__closures_____invoke__h1baec7b2e08a718e. */
export const wasm_bindgen__convert__closures_____invoke__h1baec7b2e08a718e: (a: number, b: number, c: any, d: any) => void;
/** Utility representing wasm_bindgen__convert__closures_____invoke__h1ea79e83e0e5229e. */
export const wasm_bindgen__convert__closures_____invoke__h1ea79e83e0e5229e: (a: number, b: number, c: any) => void;
/** Utility representing wasm_bindgen__convert__closures_____invoke__hde3d7d63d4e427ed. */
export const wasm_bindgen__convert__closures_____invoke__hde3d7d63d4e427ed: (a: number, b: number, c: any) => void;
/** Utility representing __wbindgen_malloc. */
export const __wbindgen_malloc: (a: number, b: number) => number;
/** Utility representing __wbindgen_realloc. */
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
/** Utility representing __wbindgen_exn_store. */
export const __wbindgen_exn_store: (a: number) => void;
/** Utility representing __externref_table_alloc. */
export const __externref_table_alloc: () => number;
/** Utility representing __wbindgen_externrefs. */
export const __wbindgen_externrefs: WebAssembly.Table;
/** Utility representing __wbindgen_free. */
export const __wbindgen_free: (a: number, b: number, c: number) => void;
/** Utility representing __wbindgen_destroy_closure. */
export const __wbindgen_destroy_closure: (a: number, b: number) => void;
/** Utility representing __externref_table_dealloc. */
export const __externref_table_dealloc: (a: number) => void;
/** Utility representing __wbindgen_start. */
export const __wbindgen_start: () => void;

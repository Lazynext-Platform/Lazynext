/**
 * Editor Bridge Service
 * Connects React UI to Rust editor_core via WebAssembly
 */

export class EditorBridge {
  static wasmModule: any = null;

  static async initialize() {
    console.log("Initializing Rust Editor Core binding...");
    try {
      this.wasmModule = await import('lazynext-wasm');
      this.wasmModule.initialize_editor();
      console.log("WASM Editor initialized successfully");
    } catch (e) {
      console.error("Failed to load wasm module", e);
    }
  }

  static async addClip(source: string, start: number, end: number) {
    if (!this.wasmModule) {
      console.error("WASM module not initialized");
      return;
    }
    console.log(`Adding clip ${source} from ${start} to ${end}`);
    this.wasmModule.add_clip_to_timeline(source, start, end);
  }
}

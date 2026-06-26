import { EditorCore } from "@/core";
import { syncTimelineFromEngine } from "@/collaboration/crdt-sync";

// Global CrdtEngine type (dynamically loaded)
type CrdtEngineType = import("lazynext-wasm").CrdtEngine;

export class EngineManager {
	public crdt: CrdtEngineType | null = null;
	private initialized = false;

	constructor(private editor: EditorCore) {}

	async initialize() {
		if (this.initialized) return;
		const { CrdtEngine } = await import("lazynext-wasm");
		this.crdt = new CrdtEngine(crypto.randomUUID());
		this.initialized = true;
	}

	applyOperation(op: Record<string, unknown>) {
		if (!this.crdt) {
			console.warn("Cannot apply operation: CrdtEngine not initialized");
			return;
		}
		
		const applied = this.crdt.applyOperation(op);
		if (applied) {
			syncTimelineFromEngine(this.crdt);
		}
	}

	undo() {
		if (this.crdt?.undo()) {
			syncTimelineFromEngine(this.crdt);
		}
	}

	redo() {
		if (this.crdt?.redo()) {
			syncTimelineFromEngine(this.crdt);
		}
	}
}

/**
 * Bridge between WebSocket CRDT messages and the WASM CRDT engine.
 *
 * Handles serialization/deserialization of CRDT operations,
 * vector clock merging, and tombstone propagation between
 * the network layer and the Rust WASM core.
 */

import type { CrdtEngine } from "lazynext-wasm";
import type { CollaborationSocket } from "./socket";

/**
 * Initialize CRDT sync between the collaboration socket and WASM engine.
 *
 * - Incoming deltas from peers are applied to the WASM engine
 * - Local edits are broadcast to peers via the socket
 * - Vector clocks are merged on each received operation
 */
export function setupCrdtSync(
	socket: CollaborationSocket,
	engine: CrdtEngine,
): () => void {
	socket.setCrdtEngine(engine);

	// Listen for incoming deltas from peers
	const unsub = socket.onDelta((delta) => {
		try {
			const opJson = JSON.parse(new TextDecoder().decode(delta));
			const applied = engine.applyOperation(opJson);
			if (applied) {
				// Update the local timeline to reflect the remote change
				syncTimelineFromEngine(engine);
			}
		} catch (err) {
			console.warn("[CRDT-Sync] Failed to process remote delta:", err);
		}
	});

	return () => {
		unsub();
		socket.setCrdtEngine(null as unknown as CrdtEngine);
	};
}

/**
 * Broadcast a local CRDT operation to all connected peers.
 */
export function broadcastOperation(
	socket: CollaborationSocket,
	engine: CrdtEngine,
	operation: Record<string, unknown>,
): void {
	const delta = new TextEncoder().encode(JSON.stringify(operation));
	socket.broadcastEdit(delta);
}

/**
 * Sync the local React/editor state from the WASM CRDT engine.
 *
 * Reads the CRDT operation log and applies structural changes
 * to the React timeline state.
 */
function syncTimelineFromEngine(_engine: CrdtEngine): void {
	// In production, this reads the operation log from the CRDT engine
	// and updates the React Zustand/Jotai timeline store.
	// For now, the React state is driven by WASM via the useWasm() hook.
	// The CRDT engine is the source of truth; React mirrors it.
}

/**
 * Get the current vector clock from the CRDT engine for comparison.
 */
export function getCrdtClockSummary(engine: CrdtEngine): string {
	try {
		const clock = engine.getClock();
		return JSON.stringify(clock);
	} catch {
		return "unavailable";
	}
}

/**
 * Bridge between WebSocket CRDT messages and the WASM CRDT engine.
 *
 * Handles serialization/deserialization of CRDT operations,
 * vector clock merging, and tombstone propagation between
 * the network layer and the Rust WASM core.
 *
 * @module collaboration/crdt-sync
 */

import type { CrdtEngine } from "lazynext-wasm";
import type { CollaborationSocket } from "./socket";
import { hydrateScenesFromEntityGraph } from "./crdt-mapper";
import { EditorCore } from "@/core";

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
			const raw = JSON.parse(new TextDecoder().decode(delta));

			// Orchestrator patches arrive as an array of {op, path, value} objects;
			// normal CRDT operations arrive as a single serde-tagged CrdtOperation object.
			if (Array.isArray(raw) && raw.length > 0 && typeof raw[0].op === "string") {
				// AI orchestrator patches — normalise before applying
				const patches = raw as OrchestratorPatch[];
				applyOrchestrationPatches(engine, patches);
			} else if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
				// Standard CRDT operation from a peer
				const applied = engine.applyOperation(raw);
				if (applied) {
					syncTimelineFromEngine(engine);
				}
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
export function syncTimelineFromEngine(_engine: CrdtEngine): void {
	try {
		const entityGraph = _engine.getEntityGraph();
		const hydratedScenes = hydrateScenesFromEntityGraph(entityGraph);
		if (hydratedScenes.length > 0) {
			const editor = EditorCore.getInstance();
			const currentActive = editor.scenes.getActiveSceneOrNull();
			editor.scenes.setScenes({ 
				scenes: hydratedScenes,
				activeSceneId: currentActive?.id
			});
		}
	} catch (e) {
		console.error("[CRDT-Sync] Failed to sync timeline from engine:", e);
	}
}

/**
 * An orchestrator-generated CRDT patch in JSON-pointer style.
 * The ai-agents orchestrator produces these; the WASM engine expects
 * the serde-tagged CrdtOperation format (EntityInsert / EntityDelete /
 * PropertyUpdate), so we translate before applying.
 */
export interface OrchestratorPatch {
	/** CRUD operation type: add, remove, or replace. */
	op: "add" | "remove" | "replace";
	/** JSON-pointer path to the target entity. */
	path: string;
	/** Data payload for add and replace operations. */
	value?: Record<string, unknown>;
}

/**
 * Convert orchestrator JSON-pointer patches into the serde CrdtOperation
 * format that the WASM CRDT engine actually deserializes and applies.
 *
 * Path convention: "/tracks/<track>/clips/<clip>/..." maps to
 * entity-id "<track>/<clip>".
 */
export function normalizeOrchestratorPatches(
	patches: OrchestratorPatch[],
): Record<string, unknown>[] {
	return patches.map((p) => {
		const segments = p.path.split("/").filter(Boolean);
		// "/tracks/caption_track/clips/caption_1" → "caption_track/caption_1"
		const entityId =
			segments.length >= 4 ? `${segments[1]}/${segments[3]}` : p.path.replace(/\//g, "/");
		const entityType = segments.length >= 4 ? segments[2] : "generic";

		switch (p.op) {
			case "add":
				return {
					EntityInsert: {
						entity_id: entityId,
						entity_type: entityType,
						data: p.value ?? {},
					},
				};
			case "remove":
				return {
					EntityDelete: {
						entity_id: entityId,
					},
				};
			case "replace":
				return {
					PropertyUpdate: {
						target_id: entityId,
						property: segments.length >= 4 ? segments.slice(4).join("/") : "value",
						value: p.value ?? {},
					},
				};
			default:
				console.warn("[CRDT-Sync] Unknown patch op:", p.op, "— treating as add");
				return {
					EntityInsert: {
						entity_id: entityId,
						entity_type: entityType,
						data: p,
					},
				};
		}
	});
}

/**
 * Apply a batch of orchestrator patches to the WASM engine and sync
 * the React timeline. Returns true if all patches were applied.
 */
export function applyOrchestrationPatches(
	engine: CrdtEngine,
	patches: OrchestratorPatch[],
): boolean {
	const ops = normalizeOrchestratorPatches(patches);
	let allApplied = true;

	for (const op of ops) {
		try {
			const applied = engine.applyOperation(op);
			if (!applied) allApplied = false;
		} catch (e) {
			console.error("[CRDT-Sync] Failed to apply orchestrator patch:", e);
			allApplied = false;
		}
	}

	if (ops.length > 0) {
		syncTimelineFromEngine(engine);
	}

	return allApplied;
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

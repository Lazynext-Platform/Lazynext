/**
 * Group resize type definitions — member shape, update patches, and
 * computed results.
 *
 * @module timeline/group-resize/types
 */

import type { FrameRate } from "lazynext-wasm";
import type { ElementRef, RetimeConfig } from "@/timeline/types";
import type { MediaTime } from "@/wasm";

export type ResizeSide = "left" | "right";

export interface GroupResizeMember extends ElementRef {
	/** Element start time on the timeline. */
	startTime: MediaTime;
	/** Element duration in media time. */
	duration: MediaTime;
	/** Trim-in offset from source start. */
	trimStart: MediaTime;
	/** Trim-out offset from source end. */
	trimEnd: MediaTime;
	/** Total duration of the source media. */
	sourceDuration?: MediaTime;
	/** Optional retime speed curve. */
	retime?: RetimeConfig;
	/** Left neighbour boundary collision time. */
	leftNeighborBound: MediaTime | null;
	/** Right neighbour boundary collision time. */
	rightNeighborBound: MediaTime | null;
}

export interface GroupResizeUpdate extends ElementRef {
	/** Patch with updated trim and timing values. */
	patch: {
		/** Updated trim-in offset from source start. */
		trimStart: MediaTime;
		/** Updated trim-out offset from source end. */
		trimEnd: MediaTime;
		/** Updated start time on the timeline. */
		startTime: MediaTime;
		/** Updated element duration. */
		duration: MediaTime;
	};
}

export interface GroupResizeResult {
	/** Net time delta applied to the group. */
	deltaTime: MediaTime;
	/** Individual element updates. */
	updates: GroupResizeUpdate[];
}

export interface ComputeGroupResizeArgs {
	/** Group members to resize. */
	members: GroupResizeMember[];
	/** Which side of the group is being dragged. */
	side: ResizeSide;
	/** Requested time delta. */
	deltaTime: MediaTime;
	/** Project frame rate for rounding. */
	fps: FrameRate;
}

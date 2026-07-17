/**
 * Group resize barrel — computes simultaneous multi-element resize
 * respecting neighbor boundaries.
 *
 * @module timeline/group-resize
 */

export { computeGroupResize } from "./compute-resize";

/** Documentation for this export. */
export type {
	ComputeGroupResizeArgs,
	GroupResizeMember,
	GroupResizeResult,
	GroupResizeUpdate,
	ResizeSide,
} from "./types";

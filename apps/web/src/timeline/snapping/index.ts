/**
 * Snapping system barrel export — build, resolve, threshold, and types.
 *
 * @module timeline/snapping
 */

export { buildTimelineSnapPoints } from "./build";
export { resolveTimelineSnap } from "./resolve";
export { getTimelineSnapThresholdInTicks } from "./threshold";
export type {
	SnapPoint,
	SnapPointType,
	SnapResult,
	TimelineSnapPointSource,
} from "./types";

/**
 * Snapping type definitions — snap point variants, snap results,
 * and lazily-generated snap source factories.
 *
 * @module timeline/snapping/types
 */

import type { MediaTime } from "@/wasm";

/** Discriminator for snap point origin (element edge, playhead, etc.). */
export type SnapPointType =
	| "element-start"
	| "element-end"
	| "playhead"
	| "bookmark"
	| "keyframe";

/** A single snap point at a specific timeline time. */
export interface SnapPoint {
	time: MediaTime;
	type: SnapPointType;
	elementId?: string;
	trackId?: string;
}

/** The result of a snap resolution — the snapped time and distance. */
export interface SnapResult {
	snappedTime: MediaTime;
	snapPoint: SnapPoint | null;
	snapDistance: number;
}

/** A factory that lazily yields snap points (e.g. from element edges). */
export type TimelineSnapPointSource = () => Iterable<SnapPoint>;

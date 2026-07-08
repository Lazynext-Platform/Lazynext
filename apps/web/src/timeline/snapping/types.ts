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
	/** Snap point time. */
	time: MediaTime;
	/** Snap point origin type. */
	type: SnapPointType;
	/** Optional element identifier. */
	elementId?: string;
	/** Optional track identifier. */
	trackId?: string;
}

/** The result of a snap resolution — the snapped time and distance. */
export interface SnapResult {
	/** Resolved snapped time. */
	snappedTime: MediaTime;
	/** Source snap point or null. */
	snapPoint: SnapPoint | null;
	/** Distance in ticks from target to snap. */
	snapDistance: number;
}

/** A factory that lazily yields snap points (e.g. from element edges). */
export type TimelineSnapPointSource = () => Iterable<SnapPoint>;

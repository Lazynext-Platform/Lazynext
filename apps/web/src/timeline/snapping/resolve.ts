/**
 * Resolves the closest snap point to a target time within the max
 * snap distance, returning the snapped time and distance info.
 *
 * @module timeline/snapping/resolve
 */

import type { SnapPoint, SnapResult } from "./types";
import type { MediaTime } from "@/wasm";

/**
 * Finds the closest snap point within `maxSnapDistance` ticks of the
 * target time. If none is within range, returns the original time.
 */
export function resolveTimelineSnap({
	targetTime,
	snapPoints,
	maxSnapDistance,
}: {
	targetTime: MediaTime;
	snapPoints: SnapPoint[];
	maxSnapDistance: number;
}): SnapResult {
	let closestSnapPoint: SnapPoint | null = null;
	let closestDistance = Infinity;

	for (const snapPoint of snapPoints) {
		const distance = Math.abs(targetTime - snapPoint.time);
		if (distance <= maxSnapDistance && distance < closestDistance) {
			closestDistance = distance;
			closestSnapPoint = snapPoint;
		}
	}

	return {
		snappedTime: closestSnapPoint ? closestSnapPoint.time : targetTime,
		snapPoint: closestSnapPoint,
		snapDistance: closestDistance,
	};
}

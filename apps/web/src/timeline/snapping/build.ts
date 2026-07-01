/**
 * Collects snap points from multiple lazily-evaluated sources.
 *
 * @module timeline/snapping/build
 */

import type { SnapPoint, TimelineSnapPointSource } from "./types";

/**
 * Iterates all registered snap sources and concatenates their snap
 * points into a flat array.
 */
export function buildTimelineSnapPoints({
	sources,
}: {
	sources: TimelineSnapPointSource[];
}): SnapPoint[] {
	const snapPoints: SnapPoint[] = [];

	for (const source of sources) {
		for (const snapPoint of source()) {
			snapPoints.push(snapPoint);
		}
	}

	return snapPoints;
}

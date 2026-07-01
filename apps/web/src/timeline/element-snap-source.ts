/**
 * Emits snap points at the start and end edges of every timeline element.
 *
 * @module timeline/element-snap-source
 */

import type { SceneTracks } from "@/timeline";
import type { SnapPoint } from "@/timeline/snapping";
import { addMediaTime } from "@/wasm";

/**
 * Collects start/end edge snap points for all elements across all tracks,
 * excluding those in the optional exclusion set.
 *
 * @param tracks - the scene tracks to scan.
 * @param excludeElementIds - optional set of element IDs to skip.
 * @returns an array of element-start and element-end snap points.
 */
export function getElementEdgeSnapPoints({
	tracks,
	excludeElementIds,
}: {
	tracks: SceneTracks;
	excludeElementIds?: Set<string>;
}): SnapPoint[] {
	const snapPoints: SnapPoint[] = [];
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];

	for (const track of orderedTracks) {
		for (const element of track.elements) {
			if (excludeElementIds?.has(element.id)) {
				continue;
			}

			snapPoints.push(
				{
					time: element.startTime,
					type: "element-start",
					elementId: element.id,
					trackId: track.id,
				},
				{
					time: addMediaTime({ a: element.startTime, b: element.duration }),
					type: "element-end",
					elementId: element.id,
					trackId: track.id,
				},
			);
		}
	}

	return snapPoints;
}

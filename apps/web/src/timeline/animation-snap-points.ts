/**
 * Generates snap points from animation keyframes for timeline interactions.
 *
 * Walks every element across all tracks and emits a keyframe-type snap point
 * at each keyframe time (offset by the element's start time).
 *
 * @module timeline/animation-snap-points
 */

import { getElementKeyframes } from "@/animation";
import type { SceneTracks } from "@/timeline";
import type { SnapPoint } from "@/timeline/snapping";
import { addMediaTime } from "@/wasm";

/**
 * Collects keyframe snap points from all elements across the given tracks.
 *
 * @param tracks - the scene tracks to scan for keyframes.
 * @param excludeElementIds - optional set of element IDs to skip.
 * @returns an array of keyframe snap points.
 */
export function getAnimationKeyframeSnapPointsForTimeline({
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

			for (const keyframe of getElementKeyframes({
				animations: element.animations,
			})) {
				snapPoints.push({
					time: addMediaTime({ a: element.startTime, b: keyframe.time }),
					type: "keyframe",
					elementId: element.id,
					trackId: track.id,
				});
			}
		}
	}

	return snapPoints;
}

/**
 * Overlap detection for placement — checks whether a set of time spans
 * conflicts with existing elements on a track.
 *
 * @module timeline/placement/overlap
 */

import type { TimelineElement } from "@/timeline";
import type { PlacementTimeSpan } from "./types";

interface TrackWithElements {
	/** Elements currently on the track. */
	elements: TimelineElement[];
}

function wouldElementOverlap({
	elements,
	startTime,
	endTime,
	excludeElementId,
}: {
	elements: TimelineElement[];
	startTime: number;
	endTime: number;
	excludeElementId?: string;
}): boolean {
	return elements.some((element) => {
		if (excludeElementId && element.id === excludeElementId) {
			return false;
		}

		const elementEnd = element.startTime + element.duration;
		return startTime < elementEnd && endTime > element.startTime;
	});
}

/**
 * Returns `true` if every time span can be placed on the track without
 * overlapping existing elements.
 */
export function canPlaceTimeSpansOnTrack({
	track,
	timeSpans,
}: {
	track: TrackWithElements;
	timeSpans: PlacementTimeSpan[];
}): boolean {
	return timeSpans.every(({ startTime, duration, excludeElementId }) => {
		return !wouldElementOverlap({
			elements: track.elements,
			startTime,
			endTime: startTime + duration,
			excludeElementId,
		});
	});
}

/**
 * Main-track placement rules — the main track anchors the timeline;
 * elements pushed to its start snap to zero, and the earliest element's
 * position constrains new placements.
 *
 * @module timeline/placement/main-track
 */

import type { SceneTracks, TimelineElement, VideoTrack } from "@/timeline";
import { type MediaTime, ZERO_MEDIA_TIME } from "@/wasm";

export const MAIN_TRACK_NAME = "Main Track";

/**
 * Returns the earliest element on the main track, excluding the optional
 * element ID.
 */
export function getEarliestMainTrackElement({
	mainTrack,
	excludeElementId,
}: {
	mainTrack: VideoTrack;
	excludeElementId?: string;
}): TimelineElement | null {
	const elements = mainTrack.elements.filter((element) => {
		return !excludeElementId || element.id !== excludeElementId;
	});
	if (elements.length === 0) {
		return null;
	}

	return elements.reduce((earliestElement, element) => {
		return element.startTime < earliestElement.startTime
			? element
			: earliestElement;
	});
}

/**
 * Clamps a start time for the main track: elements that would become
 * the earliest are forced to zero; others keep their requested time.
 */
export function enforceMainTrackStart({
	tracks,
	targetTrackId,
	requestedStartTime,
	excludeElementId,
}: {
	tracks: SceneTracks;
	targetTrackId: string;
	requestedStartTime: MediaTime;
	excludeElementId?: string;
}): MediaTime {
	if (tracks.main.id !== targetTrackId) {
		return requestedStartTime;
	}

	const earliestElement = getEarliestMainTrackElement({
		mainTrack: tracks.main,
		excludeElementId,
	});
	if (!earliestElement) {
		return ZERO_MEDIA_TIME;
	}

	if (requestedStartTime <= earliestElement.startTime) {
		return ZERO_MEDIA_TIME;
	}

	return requestedStartTime;
}

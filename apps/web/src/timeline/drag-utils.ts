/**
 * Utility for converting mouse pixel positions to timeline media times
 * during drag interactions.
 *
 * @module timeline/drag-utils
 */

import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/timeline/scale";
import { mediaTime, type MediaTime, TICKS_PER_SECOND } from "@/wasm";

/**
 * Converts a client X coordinate to a timeline media time, accounting
 * for container offset, scroll position, and zoom level.
 *
 * @param clientX - the mouse event clientX value.
 * @param containerRect - the bounding rect of the timeline container.
 * @param zoomLevel - the current zoom multiplier.
 * @param scrollLeft - the current horizontal scroll offset.
 * @returns the corresponding media time in ticks.
 */
export function getMouseTimeFromClientX({
	clientX,
	containerRect,
	zoomLevel,
	scrollLeft,
}: {
	clientX: number;
	containerRect: DOMRect;
	zoomLevel: number;
	scrollLeft: number;
}): MediaTime {
	const mouseX = clientX - containerRect.left + scrollLeft;
	const seconds = Math.max(
		0,
		mouseX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
	);
	return mediaTime({
		ticks: Math.round(seconds * TICKS_PER_SECOND),
	});
}

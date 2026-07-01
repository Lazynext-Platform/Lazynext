/**
 * Zoom level computation — minimum zoom to fit content, padding
 * ratios, and linear↔exponential slider mapping.
 *
 * @module timeline/zoom-utils
 */

import {
	BASE_TIMELINE_PIXELS_PER_SECOND,
	TIMELINE_ZOOM_MAX,
} from "@/timeline/scale";
import { TICKS_PER_SECOND } from "@/wasm";

const PADDING_MAX_RATIO = 0.75;
const PADDING_MIN_RATIO = 0.15;
const PADDING_MIN_AT_ZOOM_PERCENT = 0.2;

/**
 * Computes the minimum zoom level such that the entire timeline
 * duration fits within the container, capped at the max zoom.
 *
 * @param duration - total project duration in ticks.
 * @param containerWidth - current container width in pixels.
 */
export function getTimelineZoomMin({
	duration,
	containerWidth,
}: {
	duration: number;
	containerWidth: number | null | undefined;
}): number {
	const safeDurationSeconds = Math.max(duration / TICKS_PER_SECOND, 1);
	const safeContainerWidth = containerWidth ?? 1000;
	const contentRatioAtMinZoom = 1 - PADDING_MAX_RATIO;
	const availableWidth = safeContainerWidth * contentRatioAtMinZoom;
	const zoomToFit =
		availableWidth / (safeDurationSeconds * BASE_TIMELINE_PIXELS_PER_SECOND);

	return Math.min(TIMELINE_ZOOM_MAX, zoomToFit);
}

/**
 * Returns the pixel-width of the leading/trailing padding area for the
 * timeline at the current zoom, interpolating between min and max ratios.
 */
export function getTimelinePaddingPx({
	containerWidth,
	zoomLevel,
	minZoom,
}: {
	containerWidth: number;
	zoomLevel: number;
	minZoom: number;
}): number {
	const zoomPercent = getZoomPercent({ zoomLevel, minZoom });
	const paddingTransitionPercent = Math.min(
		zoomPercent / PADDING_MIN_AT_ZOOM_PERCENT,
		1,
	);
	const paddingRatio =
		PADDING_MAX_RATIO -
		(PADDING_MAX_RATIO - PADDING_MIN_RATIO) * paddingTransitionPercent;

	return containerWidth * paddingRatio;
}

/**
 * Returns the current zoom level as a 0–1 fraction of the zoom range.
 */
export function getZoomPercent({
	zoomLevel,
	minZoom,
}: {
	zoomLevel: number;
	minZoom: number;
}): number {
	return (zoomLevel - minZoom) / (TIMELINE_ZOOM_MAX - minZoom);
}

/**
 * Converts a linear slider position (0–1) to an exponential zoom level.
 * At low slider values zoom changes are small; at high values changes are large.
 */
export function sliderToZoom({
	sliderPosition,
	minZoom,
	maxZoom = TIMELINE_ZOOM_MAX,
}: {
	sliderPosition: number;
	minZoom: number;
	maxZoom?: number;
}): number {
	const clampedPosition = Math.max(0, Math.min(1, sliderPosition));
	return minZoom * (maxZoom / minZoom) ** clampedPosition;
}

/**
 * Converts an exponential zoom level back to a linear slider position (0–1).
 */
export function zoomToSlider({
	zoomLevel,
	minZoom,
	maxZoom = TIMELINE_ZOOM_MAX,
}: {
	zoomLevel: number;
	minZoom: number;
	maxZoom?: number;
}): number {
	const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
	return Math.log(clampedZoom / minZoom) / Math.log(maxZoom / minZoom);
}

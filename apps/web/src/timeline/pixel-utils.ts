/**
 * Pixel ↔ timeline-time conversion utilities for the timeline renderer.
 *
 * All position calculations account for zoom level and device pixel ratio
 * so that indicator lines and element bounds render at sub-pixel precision.
 *
 * @module timeline/pixel-utils
 */

import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/timeline/scale";
import { TICKS_PER_SECOND } from "@/wasm";

/** Standard width in CSS pixels for timeline indicator lines (playhead, snap). */
export const TIMELINE_INDICATOR_LINE_WIDTH_PX = 2;

function getDevicePixelRatio({
	devicePixelRatio,
}: {
	devicePixelRatio?: number;
}): number {
	if (
		typeof devicePixelRatio === "number" &&
		Number.isFinite(devicePixelRatio) &&
		devicePixelRatio > 0
	) {
		return devicePixelRatio;
	}

	if (typeof window === "undefined") {
		return 1;
	}

	if (Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0) {
		return window.devicePixelRatio;
	}

	return 1;
}

/**
 * Returns the number of CSS pixels per second of timeline content at
 * the given zoom level.
 *
 * @param zoomLevel - the current timeline zoom multiplier.
 */
export function getTimelinePixelsPerSecond({
	zoomLevel,
}: {
	zoomLevel: number;
}): number {
	return BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel;
}

/**
 * Converts a timeline time (in ticks) to a pixel position on the ruler.
 *
 * @param time - the time in WASM ticks.
 * @param zoomLevel - the current timeline zoom multiplier.
 */
export function timelineTimeToPixels({
	time,
	zoomLevel,
}: {
	time: number;
	zoomLevel: number;
}): number {
	return (time / TICKS_PER_SECOND) * getTimelinePixelsPerSecond({ zoomLevel });
}

/**
 * Snaps a raw pixel value to the nearest physical pixel boundary for
 * the given device pixel ratio, preventing sub-pixel rendering artifacts.
 *
 * @param pixel - the raw pixel value.
 * @param devicePixelRatio - optional override; defaults to `window.devicePixelRatio`.
 */
export function snapPixelToDeviceGrid({
	pixel,
	devicePixelRatio,
}: {
	pixel: number;
	devicePixelRatio?: number;
}): number {
	const safeDevicePixelRatio = getDevicePixelRatio({ devicePixelRatio });
	return Math.round(pixel * safeDevicePixelRatio) / safeDevicePixelRatio;
}

/**
 * Combines time-to-pixel conversion with device-grid snapping in one call.
 *
 * @param time - the time in WASM ticks.
 * @param zoomLevel - the current timeline zoom multiplier.
 * @param devicePixelRatio - optional override for device pixel ratio.
 */
export function timelineTimeToSnappedPixels({
	time,
	zoomLevel,
	devicePixelRatio,
}: {
	time: number;
	zoomLevel: number;
	devicePixelRatio?: number;
}): number {
	const rawPixel = timelineTimeToPixels({ time, zoomLevel });
	return snapPixelToDeviceGrid({ pixel: rawPixel, devicePixelRatio });
}

/**
 * Computes the CSS `left` value needed to center a line at the given
 * pixel position.
 *
 * @param centerPixel - the desired center of the line.
 * @param lineWidthPx - the line width in CSS pixels (default 2).
 */
export function getCenteredLineLeft({
	centerPixel,
	lineWidthPx = TIMELINE_INDICATOR_LINE_WIDTH_PX,
}: {
	centerPixel: number;
	lineWidthPx?: number;
}): number {
	return centerPixel - lineWidthPx / 2;
}

/** @module Preview zoom constants and preset zoom levels for the canvas viewport */
export const PREVIEW_ZOOM_PRESETS = [25, 50, 75, 100, 150, 200];

/** Utility representing PREVIEW_ZOOM. */
export const PREVIEW_ZOOM = {
	min: 0.25,
	max: 16,
	step: 1.25,
} as const;

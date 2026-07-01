/**
 * Z-index layer constants for the timeline — track content,
 * drag line, playhead, and snap indicator stacking order.
 *
 * @module timeline/components/layers
 */

export const TIMELINE_LAYERS = {
	trackContent: 10,
	dragLine: 20,
	playhead: 30,
	snapIndicator: 40,
} as const;

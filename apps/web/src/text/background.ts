/** @module TextBackground type definition and constraints for text element background styling (color, radius, padding) */

export const CORNER_RADIUS_MIN = 0;
/** Utility representing CORNER_RADIUS_MAX. */
export const CORNER_RADIUS_MAX = 100;

/** Type definition for TextBackground. */
export interface TextBackground {
	/** Whether the background fill is enabled. */
	enabled: boolean;
	/** Background fill color. */
	color: string;
	/** Corner rounding radius. */
	cornerRadius?: number;
	/** Horizontal padding. */
	paddingX?: number;
	/** Vertical padding. */
	paddingY?: number;
	/** Horizontal offset from the text bounds. */
	offsetX?: number;
	/** Vertical offset from the text bounds. */
	offsetY?: number;
}

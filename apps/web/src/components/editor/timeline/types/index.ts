/**
 * Timeline type definitions — Animation, Size, and related types for
 * element properties, transitions, and metadata used across the editor.
 *
 * @module components/editor/timeline/types
 */

export type Animation = {
	/** Animation preset name. */
	name: string;
	/** Interval between animation cycles. */
	interval?: number;
	/** Animation duration. */
	duration?: number;
	/** Animation intensity. */
	intensity?: number;
	/** Which phase the animation applies to. */
	animate?: "enter" | "exit" | "both";
	/** Animation direction mode. */
	mode?: "in" | "out";
	/** Directional origin of the animation. */
	direction?: "up" | "down" | "left" | "right" | "center";
	/** Available configuration ranges for the animation. */
	options?: {
		/** Allowed animate phases. */
		animate?: ("enter" | "exit" | "both")[];
		/** Allowed direction modes. */
		mode?: ("in" | "out")[];
		/** Allowed directions. */
		direction?: ("left" | "right" | "center" | "up" | "down")[];
		/** Allowed intensity range. */
		intensity?: [number, number];
		/** Allowed interval range. */
		interval?: [number, number];
		/** Allowed duration range. */
		duration?: [number, number];
	};
	/** Returns a sample representation of the animation. */
	getSample?: (animation?: Animation) => string;
};

export type Size = {
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
};

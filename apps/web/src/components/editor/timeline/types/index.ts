/**
 * Timeline type definitions — Animation, Size, and related types for
 * element properties, transitions, and metadata used across the editor.
 *
 * @module components/editor/timeline/types
 */

export type Animation = {
	name: string;
	interval?: number;
	duration?: number;
	intensity?: number;
	animate?: "enter" | "exit" | "both";
	mode?: "in" | "out";
	direction?: "up" | "down" | "left" | "right" | "center";
	options?: {
		animate?: ("enter" | "exit" | "both")[];
		mode?: ("in" | "out")[];
		direction?: ("left" | "right" | "center" | "up" | "down")[];
		intensity?: [number, number];
		interval?: [number, number];
		duration?: [number, number];
	};
	getSample?: (animation?: Animation) => string;
};

export type Size = {
	width: number;
	height: number;
};

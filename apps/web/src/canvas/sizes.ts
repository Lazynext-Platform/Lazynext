/** @module Default canvas size presets and the default canvas dimensions */
import type { TCanvasSize } from "@/project/types";

/** Utility representing DEFAULT_CANVAS_PRESETS. */
export const DEFAULT_CANVAS_PRESETS: TCanvasSize[] = [
	{ width: 1920, height: 1080 },
	{ width: 1080, height: 1920 },
	{ width: 1080, height: 1080 },
	{ width: 1440, height: 1080 },
];

/** Utility representing DEFAULT_CANVAS_SIZE. */
export const DEFAULT_CANVAS_SIZE: TCanvasSize = { width: 1920, height: 1080 };

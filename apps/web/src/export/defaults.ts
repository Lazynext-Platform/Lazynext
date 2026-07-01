/**
 * Default export settings — MP4 format, high quality, audio included.
 *
 * @module export/defaults
 */

import type { ExportOptions } from "./index";

/** Sensible defaults for video export. */
export const DEFAULT_EXPORT_OPTIONS = {
	format: "mp4",
	quality: "high",
	includeAudio: true,
} satisfies ExportOptions;

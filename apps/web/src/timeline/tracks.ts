/**
 * Default human-readable track names keyed by track type.
 *
 * @module timeline/tracks
 */

import type { TrackType } from "@/timeline";

/** Default names displayed in the timeline UI when creating new tracks. */
export const DEFAULT_TRACK_NAMES: Record<TrackType, string> = {
	video: "Video track",
	text: "Text track",
	audio: "Audio track",
	graphic: "Graphic track",
	effect: "Effect track",
} as const;

/**
 * Timeline layout constants — track heights, gap, ruler height,
 * scrollbar size, and label column width.
 *
 * @module timeline/components/layout
 */

import type { TrackType } from "@/timeline";

/** Utility representing TIMELINE_TRACK_HEIGHTS_PX. */
export const TIMELINE_TRACK_HEIGHTS_PX: Record<TrackType, number> = {
	video: 65,
	text: 25,
	audio: 50,
	graphic: 25,
	effect: 25,
} as const;

/** Utility representing KEYFRAME_LANE_HEIGHT_PX. */
export const KEYFRAME_LANE_HEIGHT_PX = 20;
/** Utility representing KEYFRAME_DIAMOND_SIZE_PX. */
export const KEYFRAME_DIAMOND_SIZE_PX = 14;
/** Utility representing EXPANDED_GROUP_HEADER_HEIGHT_PX. */
export const EXPANDED_GROUP_HEADER_HEIGHT_PX = 18;

/** Utility representing TIMELINE_TRACK_GAP_PX. */
export const TIMELINE_TRACK_GAP_PX = 6;
/** Utility representing TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX. */
export const TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX = 112;
/** Utility representing TIMELINE_RULER_HEIGHT_PX. */
export const TIMELINE_RULER_HEIGHT_PX = 22;
/** Utility representing TIMELINE_BOOKMARK_ROW_HEIGHT_PX. */
export const TIMELINE_BOOKMARK_ROW_HEIGHT_PX = 16;
/** Utility representing TIMELINE_SCROLLBAR_SIZE_PX. */
export const TIMELINE_SCROLLBAR_SIZE_PX = 12;
/** Utility representing TIMELINE_CONTENT_TOP_PADDING_PX. */
export const TIMELINE_CONTENT_TOP_PADDING_PX = 2;

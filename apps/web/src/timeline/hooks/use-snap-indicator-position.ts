/**
 * Computes the CSS position (left, top, height) for the snap-indicator
 * line based on the current snap point and zoom level.
 *
 * @module timeline/hooks/use-snap-indicator-position
 */

import { useContainerSize } from "@/hooks/use-container-size";
import { timelineTimeToSnappedPixels } from "@/timeline";
import { TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX } from "@/timeline/components/layout";
import { useScrollPosition } from "./use-scroll-position";
interface UseSnapIndicatorPositionParams {
	snapPoint: { time: number } | null;
	zoomLevel: number;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

interface SnapIndicatorPosition {
	leftPosition: number;
	topPosition: number;
	height: number;
}

/**
 * Returns the pixel position for a snap indicator line so it aligns
 * with the snapped time on the timeline.
 */
export function useSnapIndicatorPosition({
	snapPoint,
	zoomLevel,
	timelineRef,
	tracksScrollRef,
}: UseSnapIndicatorPositionParams): SnapIndicatorPosition {
	const { height: timelineHeight } = useContainerSize({
		containerRef: timelineRef,
	});
	const { scrollLeft } = useScrollPosition({ scrollRef: tracksScrollRef });
	const timelineContainerHeight = timelineHeight || 400;
	const totalHeight = timelineContainerHeight - 8; // 8px padding from edges

	const timelinePosition = timelineTimeToSnappedPixels({
		time: snapPoint?.time ?? 0,
		zoomLevel,
	});
	const leftPosition =
		TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX + timelinePosition - scrollLeft;

	return {
		leftPosition,
		topPosition: 0,
		height: totalHeight,
	};
}

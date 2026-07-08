/**
 * Snap indicator line — rendered when dragging/resizing and a snap
 * point is active, showing where the element will snap.
 *
 * @module timeline/components/snap-indicator
 */

"use client";

import { useSnapIndicatorPosition } from "@/timeline/hooks/use-snap-indicator-position";
import type { SnapPoint } from "@/timeline/snapping";
import {
	getCenteredLineLeft,
	TIMELINE_INDICATOR_LINE_WIDTH_PX,
} from "@/timeline";
import { TIMELINE_LAYERS } from "./layers";
interface SnapIndicatorProps {
	/** Active snap point or null. */
	snapPoint: SnapPoint | null;
	/** Current zoom level. */
	zoomLevel: number;
	/** Whether the indicator is visible. */
	isVisible: boolean;
	/** Ref to the timeline container. */
	timelineRef: React.RefObject<HTMLDivElement | null>;
	/** Ref to the tracks scroll container. */
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Displays a snap indicator line at the snap point position when visible.
 */
export function SnapIndicator({
	snapPoint,
	zoomLevel,
	isVisible,
	timelineRef,
	tracksScrollRef,
}: SnapIndicatorProps) {
	const { leftPosition, topPosition, height } = useSnapIndicatorPosition({
		snapPoint,
		zoomLevel,
		timelineRef,
		tracksScrollRef,
	});

	if (!isVisible || !snapPoint) {
		return null;
	}

	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: `${getCenteredLineLeft({ centerPixel: leftPosition })}px`,
				top: topPosition,
				height: `${height}px`,
				width: `${TIMELINE_INDICATOR_LINE_WIDTH_PX}px`,
				zIndex: TIMELINE_LAYERS.snapIndicator,
			}}
		>
			<div className={"bg-primary/40 h-full w-0.5 opacity-80"} />
		</div>
	);
}

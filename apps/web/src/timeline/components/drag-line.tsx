/**
 * Drop target line — horizontal line showing where a dragged element
 * or external drop will land on the timeline.
 *
 * @module timeline/components/drag-line
 */

import { getDropLineY } from "./drop-target";
import type { TimelineTrack, DropTarget } from "@/timeline";
import { TIMELINE_LAYERS } from "./layers";

interface DragLineProps {
	dropTarget: DropTarget | null;
	tracks: TimelineTrack[];
	isVisible: boolean;
	headerHeight?: number;
}

/**
 * Renders a horizontal drop-target indicator line, or null if invisible.
 */
export function DragLine({
	dropTarget,
	tracks,
	isVisible,
	headerHeight = 0,
}: DragLineProps) {
	if (!isVisible || !dropTarget) return null;

	const y = getDropLineY({ dropTarget, tracks });
	const lineTop = y + headerHeight;

	return (
		<div
			className="bg-primary pointer-events-none absolute right-0 left-0 h-0.5"
			style={{ top: `${lineTop}px`, zIndex: TIMELINE_LAYERS.dragLine }}
		/>
	);
}

/**
 * Renders a single tick mark (and optional label) on the timeline ruler.
 *
 * @module timeline/components/timeline-tick
 */

"use client";

import type { FrameRate } from "lazynext-wasm";
import { timelineTimeToSnappedPixels } from "@/timeline";
import { formatRulerLabel } from "@/timeline/ruler-utils";

interface TimelineTickProps {
	/** Tick time in media time ticks. */
	time: number;
	/** Tick time in seconds. */
	timeInSeconds: number;
	/** Current zoom level. */
	zoomLevel: number;
	/** Project frame rate. */
	fps: FrameRate;
	/** Whether to render a label for this tick. */
	showLabel: boolean;
}

/** React component rendering TimelineTick. */
export function TimelineTick({
	time,
	timeInSeconds,
	zoomLevel,
	fps,
	showLabel,
}: TimelineTickProps) {
	const leftPosition = timelineTimeToSnappedPixels({ time, zoomLevel });

	if (showLabel) {
		const label = formatRulerLabel({ timeInSeconds, fps });
		return (
			<span
				className="text-muted-foreground/85 absolute top-1 select-none text-[10px] leading-none"
				style={{ left: `${leftPosition}px` }}
			>
				{label}
			</span>
		);
	}

	return (
		<div
			className="border-muted-foreground/25 absolute top-1.5 h-1.5 border-l"
			style={{ left: `${leftPosition}px` }}
		/>
	);
}

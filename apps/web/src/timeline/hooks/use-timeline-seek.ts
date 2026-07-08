/**
 * React hook wrapping {@link SeekController} — detects click-vs-drag
 * on the ruler/tracks and seeks the playhead on click.
 *
 * @module timeline/hooks/use-timeline-seek
 */

import { useEffect, useState, type RefObject } from "react";
import { useEditor } from "@/editor/use-editor";
import { useCommittedRef } from "@/hooks/use-committed-ref";
import {
	SeekController,
	type SeekConfig,
} from "@/timeline/controllers/seek-controller";
import type { MediaTime } from "@/wasm";

interface UseTimelineSeekProps {
	/** Ref to the playhead DOM element. */
	playheadRef: RefObject<HTMLDivElement | null>;
	/** Ref to the track labels DOM element. */
	trackLabelsRef: RefObject<HTMLDivElement | null>;
	/** Ref to the ruler scroll container. */
	rulerScrollRef: RefObject<HTMLDivElement | null>;
	/** Ref to the tracks scroll container. */
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	/** Current timeline zoom level. */
	zoomLevel: number;
	/** Total timeline duration in media ticks. */
	duration: MediaTime;
	/** Whether a box-select is active. */
	isSelecting: boolean;
	/** Clears all selected elements. */
	clearSelectedElements: () => void;
	/** Seeks the playhead to the given time. */
	seek: (time: MediaTime) => void;
}

/**
 * Returns mouse-down and click handlers for seeking by clicking the
 * ruler or tracks area.
 */
export function useTimelineSeek({
	playheadRef,
	trackLabelsRef,
	rulerScrollRef,
	tracksScrollRef,
	zoomLevel,
	duration,
	isSelecting,
	clearSelectedElements,
	seek,
}: UseTimelineSeekProps) {
	const editor = useEditor();
	const config: SeekConfig = {
		zoomLevel,
		duration,
		isSelecting,
		getPlayheadEl: () => playheadRef.current,
		getTrackLabelsEl: () => trackLabelsRef.current,
		getRulerScrollEl: () => rulerScrollRef.current,
		getTracksScrollEl: () => tracksScrollRef.current,
		getActiveProjectFps: () => editor.project.getActive()?.settings.fps ?? null,
		clearSelectedElements,
		seek,
		setTimelineViewState: ({ zoomLevel, scrollLeft, playheadTime }) =>
			editor.project.setTimelineViewState({
				viewState: {
					zoomLevel,
					scrollLeft,
					playheadTime,
				},
			}),
	};
	const configRef = useCommittedRef(config);
	const [controller] = useState(() => new SeekController({ configRef }));

	useEffect(() => () => controller.destroy(), [controller]);

	return {
		handleTracksMouseDown: controller.onTracksMouseDown,
		handleTracksClick: controller.onTracksClick,
		handleRulerMouseDown: controller.onRulerMouseDown,
		handleRulerClick: controller.onRulerClick,
	};
}

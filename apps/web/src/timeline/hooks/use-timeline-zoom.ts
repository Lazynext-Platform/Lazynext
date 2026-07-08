/** @module Timeline zoom hook with mouse wheel, pinch-to-zoom, and animated zoom-to-fit support */

import {
	type WheelEvent as ReactWheelEvent,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useReducer,
	useState,
} from "react";
import { useEditor } from "@/editor/use-editor";
import { useCommittedRef } from "@/hooks/use-committed-ref";
import { TIMELINE_ZOOM_MIN } from "@/timeline/scale";
import {
	ZoomController,
	type ZoomConfig,
} from "@/timeline/controllers/zoom-controller";
import type { MediaTime } from "@/wasm";

interface UseTimelineZoomProps {
	/** Ref to the timeline container element. */
	containerRef: RefObject<HTMLDivElement | null>;
	/** Minimum allowed zoom level. */
	minZoom?: number;
	/** Initial zoom level. */
	initialZoom?: number;
	/** Initial horizontal scroll offset. */
	initialScrollLeft?: number;
	/** Initial playhead time to restore. */
	initialPlayheadTime?: MediaTime;
	/** Ref to the tracks scroll element. */
	tracksScrollRef: RefObject<HTMLDivElement | null>;
	/** Ref to the ruler scroll element. */
	rulerScrollRef: RefObject<HTMLDivElement | null>;
}

interface UseTimelineZoomReturn {
	/** Current zoom level. */
	zoomLevel: number;
	/** Sets the zoom level. */
	setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
	/** Wheel event handler for zooming. */
	handleWheel: (event: ReactWheelEvent) => void;
	/** Saves the current scroll position. */
	saveScrollPosition: () => void;
}

/**
 * Connects the zoom controller to the React lifecycle, providing
 * zoom level, setter, wheel handler, and scroll-save callback.
 */
/**
 * Connects the zoom controller to the React lifecycle, providing
 * zoom level, setter, wheel handler, and scroll-save callback.
 */
export function useTimelineZoom({
	containerRef,
	minZoom = TIMELINE_ZOOM_MIN,
	initialZoom,
	initialScrollLeft,
	initialPlayheadTime,
	tracksScrollRef,
	rulerScrollRef,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
	const editor = useEditor();
	const config: ZoomConfig = {
		minZoom,
		getContainerEl: () => containerRef.current,
		getTracksScrollEl: () => tracksScrollRef.current,
		getRulerScrollEl: () => rulerScrollRef.current,
		getCurrentPlayheadTime: () => editor.playback.getCurrentTime(),
		seek: (time) => editor.playback.seek({ time }),
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
	const [controller] = useState(
		() => new ZoomController({ configRef, initialZoom }),
	);
	const zoomLevel = controller.zoomLevel;

	const [, rerender] = useReducer((n: number) => n + 1, 0);
	useEffect(() => controller.subscribe(rerender), [controller]);

	useEffect(() => {
		controller.reconcileInitialAndMinZoom({ minZoom, initialZoom });
	}, [controller, minZoom, initialZoom]);

	useLayoutEffect(() => {
		controller.applyZoomLayout(zoomLevel);
	}, [controller, zoomLevel]);

	useEffect(() => {
		return controller.restoreInitialScrollIfNeeded(initialScrollLeft);
	}, [controller, initialScrollLeft]);

	useEffect(() => {
		controller.restoreInitialPlayheadIfNeeded(initialPlayheadTime);
	}, [controller, initialPlayheadTime]);

	useEffect(() => controller.bindPreventBrowserZoom(), [controller]);

	useEffect(() => () => controller.destroy(), [controller]);

	return {
		zoomLevel,
		setZoomLevel: controller.setZoomLevel,
		handleWheel: controller.handleWheel,
		saveScrollPosition: controller.saveScrollPosition,
	};
}

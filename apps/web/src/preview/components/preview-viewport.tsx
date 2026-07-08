/** @module Preview viewport component managing video canvas rendering, zoom, and pan */
"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useCommittedRef } from "@/hooks/use-committed-ref";
import {
	canvasToOverlay,
	getDisplayScale,
	positionToOverlay,
	screenPixelsToLogicalThreshold,
	screenToCanvas,
} from "@/preview/preview-coords";
import { clamp, isNearlyEqual } from "@/utils/math";
import { PREVIEW_ZOOM } from "@/preview/zoom";

const MIDDLE_MOUSE_BUTTON = 1;
const IS_AT_FIT_EPSILON = 0.001;
const IS_AT_ACTUAL_SIZE_EPSILON = 0.01;

interface PreviewViewportContextValue {
	/** Whether the viewport can currently be panned. */
	canPan: boolean;
	/** Whether the viewport is at fit-to-screen zoom. */
	isAtFit: boolean;
	/** Whether the viewport is at actual (100%) size. */
	isAtActualSize: boolean;
	/** Whether a pan gesture is in progress. */
	isPanning: boolean;
	/** Rendered scene height in pixels. */
	sceneHeight: number;
	/** Rendered scene left offset in pixels. */
	sceneLeft: number;
	/** Rendered scene top offset in pixels. */
	sceneTop: number;
	/** Rendered scene width in pixels. */
	sceneWidth: number;
	/** Current zoom level as a percentage. */
	zoomPercent: number;
	/** Converts canvas coordinates to overlay coordinates. */
	canvasToOverlay: ({
		canvasX,
		canvasY,
	}: {
		/** Canvas X coordinate */
		canvasX: number;
		/** Canvas Y coordinate */
		canvasY: number;
	}) => { x: number; y: number };
	/** Resets zoom and pan to fit the screen. */
	fitToScreen: () => void;
	/** Returns the current display scale factors. */
	getDisplayScale: () => { x: number; y: number };
	/** Handles pointer down for panning; returns whether handled. */
	handlePanPointerDown: ({ event }: { event: React.PointerEvent }) => boolean;
	/** Handles pointer move for panning; returns whether handled. */
	handlePanPointerMove: ({ event }: { event: React.PointerEvent }) => boolean;
	/** Handles pointer up for panning; returns whether handled. */
	handlePanPointerUp: ({ event }: { event: React.PointerEvent }) => boolean;
	/** Converts element position to overlay coordinates. */
	positionToOverlay: ({
		positionX,
		positionY,
	}: {
		/** Element X position in canvas space */
		positionX: number;
		/** Element Y position in canvas space */
		positionY: number;
	}) => { x: number; y: number };
	/** Pans the viewport by a screen-space delta. */
	panByScreenDelta: ({
		deltaX,
		deltaY,
	}: {
		/** Horizontal delta in screen pixels */
		deltaX: number;
		/** Vertical delta in screen pixels */
		deltaY: number;
	}) => void;
	/** Resets the pan to center. */
	resetPan: () => void;
	/** Multiplies zoom by the given factor. */
	scaleZoom: ({ factor }: { factor: number }) => void;
	/** Converts a screen-pixel threshold to logical canvas units. */
	screenPixelsToLogicalThreshold: ({
		screenPixels,
	}: {
		/** Threshold in screen pixels */
		screenPixels: number;
	}) => { x: number; y: number };
	/** Converts screen coordinates to canvas coordinates. */
	screenToCanvas: ({
		clientX,
		clientY,
	}: {
		/** Client X coordinate in screen space */
		clientX: number;
		/** Client Y coordinate in screen space */
		clientY: number;
	}) => { x: number; y: number } | null;
	/** Sets zoom to actual (100%) size. */
	setActualSize: () => void;
	/** Sets zoom to the given percentage. */
	setViewportPercent: ({ percent }: { percent: number }) => void;
	/** Increases zoom by one step. */
	zoomIn: () => void;
	/** Decreases zoom by one step. */
	zoomOut: () => void;
}

const PreviewViewportContext =
	createContext<PreviewViewportContextValue | null>(null);

interface PreviewViewportProviderProps {
	/** Child nodes rendered within the provider. */
	children: React.ReactNode;
	/** Viewport context value to provide. */
	value: PreviewViewportContextValue;
}

interface PreviewViewportStateOptions {
	/** Canvas height in logical units. */
	canvasHeight: number;
	/** Canvas width in logical units. */
	canvasWidth: number;
	/** Viewport height in pixels. */
	viewportHeight: number;
	/** Ref to the viewport DOM element. */
	viewportRef: React.RefObject<HTMLDivElement | null>;
	/** Viewport width in pixels. */
	viewportWidth: number;
}

interface PanSession {
	/** Viewport center x at pan start. */
	centerX: number;
	/** Viewport center y at pan start. */
	centerY: number;
	/** Pointer client x at pan start. */
	clientX: number;
	/** Pointer client y at pan start. */
	clientY: number;
	/** Identifier of the panning pointer. */
	pointerId: number;
}

function getClampedCenterAxis({
	axisSize,
	center,
	scale,
	viewportSize,
}: {
	axisSize: number;
	center: number;
	scale: number;
	viewportSize: number;
}): number {
	if (axisSize <= 0 || scale <= 0 || viewportSize <= 0) {
		return axisSize / 2;
	}

	const visibleHalfSpan = viewportSize / (2 * scale);
	if (visibleHalfSpan >= axisSize / 2) {
		return axisSize / 2;
	}

	return clamp({
		value: center,
		min: visibleHalfSpan,
		max: axisSize - visibleHalfSpan,
	});
}

function clampViewportCenter({
	canvasHeight,
	canvasWidth,
	centerX,
	centerY,
	scale,
	viewportHeight,
	viewportWidth,
}: {
	canvasHeight: number;
	canvasWidth: number;
	centerX: number;
	centerY: number;
	scale: number;
	viewportHeight: number;
	viewportWidth: number;
}): { x: number; y: number } {
	return {
		x: getClampedCenterAxis({
			center: centerX,
			axisSize: canvasWidth,
			scale,
			viewportSize: viewportWidth,
		}),
		y: getClampedCenterAxis({
			center: centerY,
			axisSize: canvasHeight,
			scale,
			viewportSize: viewportHeight,
		}),
	};
}

function getFitScale({
	canvasHeight,
	canvasWidth,
	viewportHeight,
	viewportWidth,
}: {
	canvasHeight: number;
	canvasWidth: number;
	viewportHeight: number;
	viewportWidth: number;
}): number {
	if (
		canvasHeight <= 0 ||
		canvasWidth <= 0 ||
		viewportHeight <= 0 ||
		viewportWidth <= 0
	) {
		return 1;
	}

	return Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight);
}

function getClampedZoom({ zoom }: { zoom: number }): number {
	return clamp({
		value: zoom,
		min: PREVIEW_ZOOM.min,
		max: PREVIEW_ZOOM.max,
	});
}

export function PreviewViewportProvider({
	children,
	value,
}: PreviewViewportProviderProps) {
	return (
		<PreviewViewportContext.Provider value={value}>
			{children}
		</PreviewViewportContext.Provider>
	);
}

export function usePreviewViewportState({
	canvasHeight,
	canvasWidth,
	viewportHeight,
	viewportRef,
	viewportWidth,
}: PreviewViewportStateOptions): PreviewViewportContextValue {
	const [zoom, setZoomState] = useState(1);
	const [center, setCenter] = useState(() => ({
		x: canvasWidth / 2,
		y: canvasHeight / 2,
	}));
	const [isPanning, setIsPanning] = useState(false);
	const panSessionRef = useRef<PanSession | null>(null);
	const centerRef = useCommittedRef(center);

	const fitScale = useMemo(
		() =>
			getFitScale({
				canvasHeight,
				canvasWidth,
				viewportHeight,
				viewportWidth,
			}),
		[canvasHeight, canvasWidth, viewportHeight, viewportWidth],
	);
	const viewportScale = fitScale * zoom;
	const geometry = useMemo(
		() => ({
			canvasHeight,
			canvasWidth,
			centerX: center.x,
			centerY: center.y,
			scale: viewportScale,
			viewportHeight,
			viewportWidth,
		}),
		[
			canvasHeight,
			canvasWidth,
			center.x,
			center.y,
			viewportHeight,
			viewportScale,
			viewportWidth,
		],
	);

	const scaleZoom = useCallback(({ factor }: { factor: number }) => {
		setZoomState((previousZoom) =>
			getClampedZoom({
				zoom: previousZoom * factor,
			}),
		);
	}, []);

	const panByScreenDelta = useCallback(
		({ deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
			if (zoom <= 1 || (deltaX === 0 && deltaY === 0)) {
				return;
			}

			setCenter((previousCenter) =>
				clampViewportCenter({
					canvasHeight,
					canvasWidth,
					centerX: previousCenter.x + deltaX / viewportScale,
					centerY: previousCenter.y + deltaY / viewportScale,
					scale: viewportScale,
					viewportHeight,
					viewportWidth,
				}),
			);
		},
		[
			canvasHeight,
			canvasWidth,
			viewportHeight,
			viewportScale,
			viewportWidth,
			zoom,
		],
	);

	const resetPan = useCallback(() => {
		setCenter({
			x: canvasWidth / 2,
			y: canvasHeight / 2,
		});
	}, [canvasHeight, canvasWidth]);

	const fitToScreen = useCallback(() => {
		setZoomState(1);
		setCenter({
			x: canvasWidth / 2,
			y: canvasHeight / 2,
		});
	}, [canvasHeight, canvasWidth]);

	const zoomIn = useCallback(() => {
		setZoomState((previousZoom) =>
			getClampedZoom({
				zoom: previousZoom * PREVIEW_ZOOM.step,
			}),
		);
	}, []);

	const zoomOut = useCallback(() => {
		setZoomState((previousZoom) =>
			getClampedZoom({
				zoom: previousZoom / PREVIEW_ZOOM.step,
			}),
		);
	}, []);

	const setActualSize = useCallback(() => {
		const actualSizeZoom = fitScale > 0 ? 1 / fitScale : 1;
		setZoomState(
			getClampedZoom({
				zoom: actualSizeZoom,
			}),
		);
	}, [fitScale]);

	const setViewportPercent = useCallback(
		({ percent }: { percent: number }) => {
			const targetZoom = fitScale > 0 ? percent / 100 / fitScale : 1;
			setZoomState(getClampedZoom({ zoom: targetZoom }));
		},
		[fitScale],
	);

	const getViewportRect = useCallback(
		() => viewportRef.current?.getBoundingClientRect() ?? null,
		[viewportRef],
	);

	const screenToCanvasWithViewport = useCallback(
		({ clientX, clientY }: { clientX: number; clientY: number }) => {
			const viewportRect = getViewportRect();
			if (!viewportRect) return null;

			return screenToCanvas({
				clientX,
				clientY,
				geometry,
				viewportRect,
			});
		},
		[getViewportRect, geometry],
	);

	const canvasToOverlayWithViewport = useCallback(
		({ canvasX, canvasY }: { canvasX: number; canvasY: number }) =>
			canvasToOverlay({
				canvasX,
				canvasY,
				geometry,
			}),
		[geometry],
	);

	const positionToOverlayWithViewport = useCallback(
		({ positionX, positionY }: { positionX: number; positionY: number }) =>
			positionToOverlay({
				geometry,
				positionX,
				positionY,
			}),
		[geometry],
	);

	const getDisplayScaleWithViewport = useCallback(
		() => getDisplayScale({ geometry }),
		[geometry],
	);

	const getLogicalThresholdForScreenPixels = useCallback(
		({ screenPixels }: { screenPixels: number }) =>
			screenPixelsToLogicalThreshold({
				geometry,
				screenPixels,
			}),
		[geometry],
	);

	const handlePanPointerDown = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			if (event.button !== MIDDLE_MOUSE_BUTTON || zoom <= 1) {
				return false;
			}

			event.preventDefault();
			event.stopPropagation();

			panSessionRef.current = {
				centerX: centerRef.current.x,
				centerY: centerRef.current.y,
				clientX: event.clientX,
				clientY: event.clientY,
				pointerId: event.pointerId,
			};
			setIsPanning(true);
			event.currentTarget.setPointerCapture(event.pointerId);
			return true;
		},
		[centerRef, zoom],
	);

	const handlePanPointerMove = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			const panSession = panSessionRef.current;
			if (!panSession) {
				return false;
			}

			event.preventDefault();
			event.stopPropagation();

			const deltaX = event.clientX - panSession.clientX;
			const deltaY = event.clientY - panSession.clientY;
			const nextCenter = clampViewportCenter({
				canvasHeight,
				canvasWidth,
				centerX: panSession.centerX - deltaX / viewportScale,
				centerY: panSession.centerY - deltaY / viewportScale,
				scale: viewportScale,
				viewportHeight,
				viewportWidth,
			});

			setCenter(nextCenter);
			return true;
		},
		[canvasHeight, canvasWidth, viewportHeight, viewportScale, viewportWidth],
	);

	const handlePanPointerUp = useCallback(
		({ event }: { event: React.PointerEvent }) => {
			const panSession = panSessionRef.current;
			if (!panSession) {
				return false;
			}

			if (event.currentTarget.hasPointerCapture(panSession.pointerId)) {
				event.currentTarget.releasePointerCapture(panSession.pointerId);
			}

			panSessionRef.current = null;
			setIsPanning(false);
			return true;
		},
		[],
	);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setZoomState(1);
		setCenter({
			x: canvasWidth / 2,
			y: canvasHeight / 2,
		});
		panSessionRef.current = null;
		setIsPanning(false);
	}, [canvasHeight, canvasWidth]);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setCenter((previousCenter) =>
			clampViewportCenter({
				canvasHeight,
				canvasWidth,
				centerX: previousCenter.x,
				centerY: previousCenter.y,
				scale: viewportScale,
				viewportHeight,
				viewportWidth,
			}),
		);
	}, [canvasHeight, canvasWidth, viewportHeight, viewportScale, viewportWidth]);

	const sceneWidth = canvasWidth * viewportScale;
	const sceneHeight = canvasHeight * viewportScale;
	const sceneLeft = viewportWidth / 2 - center.x * viewportScale;
	const sceneTop = viewportHeight / 2 - center.y * viewportScale;
	const canPan = zoom > 1;
	const zoomPercent = Math.round(viewportScale * 100);

	return useMemo(
		() => ({
			canPan,
			isAtActualSize: isNearlyEqual({
				leftValue: viewportScale,
				rightValue: 1,
				epsilon: IS_AT_ACTUAL_SIZE_EPSILON,
			}),
			isAtFit: isNearlyEqual({
				leftValue: zoom,
				rightValue: 1,
				epsilon: IS_AT_FIT_EPSILON,
			}),
			isPanning,
			sceneHeight,
			sceneLeft,
			sceneTop,
			sceneWidth,
			zoomPercent,
			canvasToOverlay: canvasToOverlayWithViewport,
			fitToScreen,
			getDisplayScale: getDisplayScaleWithViewport,
			handlePanPointerDown,
			handlePanPointerMove,
			handlePanPointerUp,
			panByScreenDelta,
			positionToOverlay: positionToOverlayWithViewport,
			resetPan,
			scaleZoom,
			screenPixelsToLogicalThreshold: getLogicalThresholdForScreenPixels,
			screenToCanvas: screenToCanvasWithViewport,
			setActualSize,
			setViewportPercent,
			zoomIn,
			zoomOut,
		}),
		[
			canPan,
			viewportScale,
			zoom,
			isPanning,
			sceneHeight,
			sceneLeft,
			sceneTop,
			sceneWidth,
			zoomPercent,
			canvasToOverlayWithViewport,
			fitToScreen,
			getDisplayScaleWithViewport,
			handlePanPointerDown,
			handlePanPointerMove,
			handlePanPointerUp,
			panByScreenDelta,
			positionToOverlayWithViewport,
			resetPan,
			scaleZoom,
			getLogicalThresholdForScreenPixels,
			screenToCanvasWithViewport,
			setActualSize,
			setViewportPercent,
			zoomIn,
			zoomOut,
		],
	);
}

export function usePreviewViewport() {
	const context = useContext(PreviewViewportContext);
	if (!context) {
		throw new Error(
			"usePreviewViewport must be used within PreviewViewportProvider",
		);
	}

	return context;
}

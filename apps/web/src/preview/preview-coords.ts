/**
 * @module Preview coordinate conversion between viewport and video coordinate spaces.
 *
 * The preview viewport renders the compositor output at an arbitrary zoom/pan state.
 * This module converts between three coordinate spaces:
 * - **Screen space**: DOM pixel coordinates (mouse events)
 * - **Viewport space**: Canvas-local coordinates (origin at top-left of canvas element)
 * - **Canvas space**: Video-resolution coordinates (origin at center, scaled by zoom)
 *
 * The `PreviewViewportGeometry` struct captures the current zoom/pan/scale state
 * and is used by all conversion functions to map between spaces.
 */

/** Current viewport geometry: canvas size, zoom scale, and pan offset. */
export interface PreviewViewportGeometry {
	/** Total canvas element height in CSS pixels */
	canvasHeight: number;
	/** Total canvas element width in CSS pixels */
	canvasWidth: number;
	/** Pan center X in canvas-space units */
	centerX: number;
	/** Pan center Y in canvas-space units */
	centerY: number;
	/** Zoom scale factor (1.0 = 100%) */
	scale: number;
	/** Viewport container height in CSS pixels */
	viewportHeight: number;
	/** Viewport container width in CSS pixels */
	viewportWidth: number;
}

function getCanvasOrigin({ geometry }: { geometry: PreviewViewportGeometry }): {
	x: number;
	y: number;
} {
	return {
		x: geometry.viewportWidth / 2 - geometry.centerX * geometry.scale,
		y: geometry.viewportHeight / 2 - geometry.centerY * geometry.scale,
	};
}

export function screenToCanvas({
	clientX,
	clientY,
	geometry,
	viewportRect,
}: {
	clientX: number;
	clientY: number;
	geometry: PreviewViewportGeometry;
	viewportRect: DOMRect;
}): { x: number; y: number } {
	const overlayX = clientX - viewportRect.left;
	const overlayY = clientY - viewportRect.top;

	return {
		x:
			geometry.centerX +
			(overlayX - geometry.viewportWidth / 2) / geometry.scale,
		y:
			geometry.centerY +
			(overlayY - geometry.viewportHeight / 2) / geometry.scale,
	};
}

export function canvasToOverlay({
	canvasX,
	canvasY,
	geometry,
}: {
	canvasX: number;
	canvasY: number;
	geometry: PreviewViewportGeometry;
}): { x: number; y: number } {
	const canvasOrigin = getCanvasOrigin({ geometry });

	return {
		x: canvasOrigin.x + canvasX * geometry.scale,
		y: canvasOrigin.y + canvasY * geometry.scale,
	};
}

export function positionToOverlay({
	positionX,
	positionY,
	geometry,
}: {
	positionX: number;
	positionY: number;
	geometry: PreviewViewportGeometry;
}): { x: number; y: number } {
	return canvasToOverlay({
		canvasX: geometry.canvasWidth / 2 + positionX,
		canvasY: geometry.canvasHeight / 2 + positionY,
		geometry,
	});
}

export function getDisplayScale({
	geometry,
}: {
	geometry: PreviewViewportGeometry;
}): { x: number; y: number } {
	return {
		x: geometry.scale,
		y: geometry.scale,
	};
}

export function screenPixelsToLogicalThreshold({
	geometry,
	screenPixels,
}: {
	geometry: PreviewViewportGeometry;
	screenPixels: number;
}): { x: number; y: number } {
	return {
		x: screenPixels / geometry.scale,
		y: screenPixels / geometry.scale,
	};
}

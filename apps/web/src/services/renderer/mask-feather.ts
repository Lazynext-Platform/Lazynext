/** @module Mask feather effect using GPU renderer for soft-edged mask boundaries */
import { gpuRenderer } from "./gpu-renderer";

/** Utility representing applyMaskFeather. */
export function applyMaskFeather({
	maskCanvas,
	width,
	height,
	feather,
}: {
	maskCanvas: OffscreenCanvas;
	width: number;
	height: number;
	feather: number;
}): OffscreenCanvas {
	return gpuRenderer.applyMaskFeather({
		maskCanvas,
		width,
		height,
		feather,
	});
}

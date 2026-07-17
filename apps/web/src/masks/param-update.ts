/** @module Mask parameter update utilities for computing feather and handle transformations */
import { FEATHER_HANDLE_SCALE, MAX_FEATHER } from "@/masks/feather";

/** Utility representing computeFeatherUpdate. */
export function computeFeatherUpdate({
	startFeather,
	deltaX,
	deltaY,
	directionX,
	directionY,
}: {
	startFeather: number;
	deltaX: number;
	deltaY: number;
	directionX: number;
	directionY: number;
}): { feather: number } {
	const projection = deltaX * directionX + deltaY * directionY;
	return {
		feather: Math.max(
			0,
			Math.min(
				MAX_FEATHER,
				Math.round(startFeather + projection / FEATHER_HANDLE_SCALE),
			),
		),
	};
}

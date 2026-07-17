/**
 * @module animation/resolve
 * @description Converts timeline time to element-local time and resolves
 *   animated property values at a given time point, including color
 *   decomposition for composite RGBA channels.
 */

import type { AnimationPath, ElementAnimations } from "@/animation/types";
import { formatLinearRgba, parseColorToLinearRgba } from "@/params";
import type { ParamValue } from "@/params";
import { isCompositeChannelData, isLeafChannelData } from "./channel-data";
import { getChannelValueAtTime, isScalarChannel } from "./interpolation";

/**
 * Converts a global timeline time to an element-local time, clamped to
 * `[0, elementDuration]`.
 */
export function getElementLocalTime({
	timelineTime,
	elementStartTime,
	elementDuration,
}: {
	timelineTime: number;
	elementStartTime: number;
	elementDuration: number;
}): number {
	const localTime = timelineTime - elementStartTime;
	if (localTime <= 0) {
		return 0;
	}

	if (localTime >= elementDuration) {
		return elementDuration;
	}

	return localTime;
}

/**
 * Resolves the value of an animation property path at a given local
 * time. For color properties, decomposes the color into RGBA
 * components, samples each channel individually, and recomposes.
 * Falls back to the provided value when no animation data exists.
 */
export function resolveAnimationPathValueAtTime({
	animations,
	propertyPath,
	localTime,
	fallbackValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	localTime: number;
	fallbackValue: number;
}): number;
/** Utility representing resolveAnimationPathValueAtTime. */
export function resolveAnimationPathValueAtTime({
	animations,
	propertyPath,
	localTime,
	fallbackValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	localTime: number;
	fallbackValue: string;
}): string;
/** Utility representing resolveAnimationPathValueAtTime. */
export function resolveAnimationPathValueAtTime({
	animations,
	propertyPath,
	localTime,
	fallbackValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	localTime: number;
	fallbackValue: boolean;
}): boolean;
/** Utility representing resolveAnimationPathValueAtTime. */
export function resolveAnimationPathValueAtTime({
	animations,
	propertyPath,
	localTime,
	fallbackValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	localTime: number;
	fallbackValue: ParamValue;
}): ParamValue;
/** Utility representing resolveAnimationPathValueAtTime. */
export function resolveAnimationPathValueAtTime({
	animations,
	propertyPath,
	localTime,
	fallbackValue,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	localTime: number;
	fallbackValue: ParamValue;
}): ParamValue {
	const data = animations?.[propertyPath];
	if (!data) {
		return fallbackValue;
	}
	if (isLeafChannelData(data)) {
		if (typeof fallbackValue === "number") {
			return getChannelValueAtTime({
				channel: isScalarChannel(data) ? data : undefined,
				time: localTime,
				fallbackValue,
			});
		}
		if (
			typeof fallbackValue === "string" ||
			typeof fallbackValue === "boolean"
		) {
			return getChannelValueAtTime({
				channel: !isScalarChannel(data) ? data : undefined,
				time: localTime,
				fallbackValue,
			});
		}
		return fallbackValue;
	}
	if (!isCompositeChannelData(data)) {
		return fallbackValue;
	}

	if (
		typeof fallbackValue !== "string" ||
		!("r" in data) ||
		!("g" in data) ||
		!("b" in data) ||
		!("a" in data)
	) {
		return fallbackValue;
	}

	const fallbackComponents = parseColorToLinearRgba({ color: fallbackValue });
	if (fallbackComponents === null) {
		return fallbackValue;
	}

	return formatLinearRgba({
		color: {
			r: getChannelValueAtTime({
				channel: data.r && isScalarChannel(data.r) ? data.r : undefined,
				time: localTime,
				fallbackValue: fallbackComponents.r,
			}),
			g: getChannelValueAtTime({
				channel: data.g && isScalarChannel(data.g) ? data.g : undefined,
				time: localTime,
				fallbackValue: fallbackComponents.g,
			}),
			b: getChannelValueAtTime({
				channel: data.b && isScalarChannel(data.b) ? data.b : undefined,
				time: localTime,
				fallbackValue: fallbackComponents.b,
			}),
			a: getChannelValueAtTime({
				channel: data.a && isScalarChannel(data.a) ? data.a : undefined,
				time: localTime,
				fallbackValue: fallbackComponents.a,
			}),
		},
	});
}

/**
 * @module animation/path
 * @description Type guards that recognise animation property paths —
 *   whether they come from the fixed set of built-in properties, from
 *   graphic params, or from effect params.
 */

import type { AnimationPath, AnimationPropertyPath } from "@/animation/types";
import { ANIMATION_PROPERTY_PATHS } from "./types";
import { isEffectParamPath } from "./effect-param-channel";
import { isGraphicParamPath } from "./graphic-param-channel";

const ANIMATION_PROPERTY_PATH_SET = new Set<string>(ANIMATION_PROPERTY_PATHS);

/**
 * Guard for the fixed set of built-in animation property paths
 * (e.g. `"transform.positionX"`, `"opacity"`).
 */
export function isAnimationPropertyPath(
	propertyPath: string,
): propertyPath is AnimationPropertyPath {
	return ANIMATION_PROPERTY_PATH_SET.has(propertyPath);
}

/**
 * Guard for any recognised animation path — built-in properties,
 * graphic params, and effect params.
 */
export function isAnimationPath(
	propertyPath: string,
): propertyPath is AnimationPath {
	return (
		isAnimationPropertyPath(propertyPath) ||
		isGraphicParamPath(propertyPath) ||
		isEffectParamPath(propertyPath)
	);
}

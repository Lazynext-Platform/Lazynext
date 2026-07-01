/**
 * @module animation/effect-param-channel
 * @description Builds, validates, parses, and resolves effect param
 *   animation paths. Effect params have the shape
 *   `effects.<effectId>.params.<paramKey>`.
 */

import type { ElementAnimations, EffectParamPath } from "@/animation/types";
import type { ParamValues } from "@/params";
import { removeElementKeyframe } from "./keyframes";
import { resolveAnimationPathValueAtTime } from "./resolve";

/** Prefix for all effect param animation paths. */
export const EFFECT_PARAM_PATH_PREFIX = "effects.";
/** Separator between the effect ID and the param key. */
export const EFFECT_PARAM_PATH_SUFFIX = ".params.";

/**
 * Constructs a full effect param animation path from an effect ID and
 * a param key.
 */
export function buildEffectParamPath({
	effectId,
	paramKey,
}: {
	effectId: string;
	paramKey: string;
}): EffectParamPath {
	return `${EFFECT_PARAM_PATH_PREFIX}${effectId}${EFFECT_PARAM_PATH_SUFFIX}${paramKey}`;
}

/** Returns `true` when the string matches the effect param path pattern. */
export function isEffectParamPath(
	propertyPath: string,
): propertyPath is EffectParamPath {
	return (
		propertyPath.startsWith(EFFECT_PARAM_PATH_PREFIX) &&
		propertyPath.includes(EFFECT_PARAM_PATH_SUFFIX)
	);
}

/**
 * Parses an effect param path into its constituent effect ID and param
 * key. Returns `null` if the path is malformed.
 */
export function parseEffectParamPath({
	propertyPath,
}: {
	propertyPath: string;
}): { effectId: string; paramKey: string } | null {
	if (!isEffectParamPath(propertyPath)) {
		return null;
	}

	const withoutPrefix = propertyPath.slice(EFFECT_PARAM_PATH_PREFIX.length);
	const separatorIndex = withoutPrefix.indexOf(EFFECT_PARAM_PATH_SUFFIX);
	if (separatorIndex <= 0) {
		return null;
	}

	const effectId = withoutPrefix.slice(0, separatorIndex);
	const paramKey = withoutPrefix.slice(
		separatorIndex + EFFECT_PARAM_PATH_SUFFIX.length,
	);
	if (!effectId || !paramKey) {
		return null;
	}

	return { effectId, paramKey };
}

/**
 * Resolves all effect params at a given local time, mixing static
 * defaults with any animated keyframe values.
 */
export function resolveEffectParamsAtTime({
	effectId,
	params,
	animations,
	localTime,
}: {
	effectId: string;
	params: ParamValues;
	animations: ElementAnimations | undefined;
	localTime: number;
}): ParamValues {
	const safeLocalTime = Math.max(0, localTime);
	const resolved: ParamValues = {};

	for (const [paramKey, staticValue] of Object.entries(params)) {
		const path = buildEffectParamPath({ effectId, paramKey });
		resolved[paramKey] = animations?.[path]
			? resolveAnimationPathValueAtTime({
					animations,
					propertyPath: path,
					localTime: safeLocalTime,
					fallbackValue: staticValue,
				})
			: staticValue;
	}

	return resolved;
}

/**
 * Removes a single keyframe from an effect param's animation channel.
 */
export function removeEffectParamKeyframe({
	animations,
	effectId,
	paramKey,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	effectId: string;
	paramKey: string;
	keyframeId: string;
}): ElementAnimations | undefined {
	return removeElementKeyframe({
		animations,
		propertyPath: buildEffectParamPath({ effectId, paramKey }),
		keyframeId,
	});
}

/**
 * @module animation/graphic-param-channel
 * @description Builds, validates, parses, and resolves graphic param
 *   animation paths. Graphic param paths have the shape
 *   `params.<paramKey>`.
 */

import type { ElementAnimations, GraphicParamPath } from "@/animation/types";
import type { ParamDefinition, ParamValues } from "@/params";
import { resolveAnimationPathValueAtTime } from "./resolve";

/** Prefix for all graphic param animation paths. */
export const GRAPHIC_PARAM_PATH_PREFIX = "params.";

/**
 * Constructs a full graphic param animation path from a param key.
 */
export function buildGraphicParamPath({
	paramKey,
}: {
	paramKey: string;
}): GraphicParamPath {
	return `${GRAPHIC_PARAM_PATH_PREFIX}${paramKey}`;
}

/** Returns `true` when the string matches the graphic param path pattern. */
export function isGraphicParamPath(
	propertyPath: string,
): propertyPath is GraphicParamPath {
	return propertyPath.startsWith(GRAPHIC_PARAM_PATH_PREFIX);
}

/**
 * Parses a graphic param path to extract the param key.
 * Returns `null` if the path is malformed.
 */
export function parseGraphicParamPath({
	propertyPath,
}: {
	propertyPath: string;
}): { paramKey: string } | null {
	if (!isGraphicParamPath(propertyPath)) {
		return null;
	}

	const paramKey = propertyPath.slice(GRAPHIC_PARAM_PATH_PREFIX.length);
	return paramKey.length > 0 ? { paramKey } : null;
}

/**
 * Resolves all graphic params at a given local time, mixing static
 * defaults with any animated keyframe values.
 */
export function resolveGraphicParamsAtTime({
	params,
	definitions,
	animations,
	localTime,
}: {
	params: ParamValues;
	definitions: ParamDefinition[];
	animations?: ElementAnimations;
	localTime: number;
}): ParamValues {
	const resolved: ParamValues = { ...params };

	for (const param of definitions) {
		const path = buildGraphicParamPath({ paramKey: param.key });
		if (!animations?.[path]) {
			continue;
		}

		resolved[param.key] = resolveAnimationPathValueAtTime({
			animations,
			propertyPath: path,
			localTime: Math.max(0, localTime),
			fallbackValue: params[param.key] ?? param.default,
		});
	}

	return resolved;
}

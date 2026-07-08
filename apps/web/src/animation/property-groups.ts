/**
 * @module animation/property-groups
 * @description Queries keyframe groups — collections of related animation
 *   properties (e.g. `transform.scale` maps to both X and Y). Used by
 *   the timeline UI to select/unlock grouped keyframes together.
 */

import type {
	AnimationPropertyGroup,
	AnimationPropertyPath,
	ElementAnimations,
} from "@/animation/types";
import { ANIMATION_PROPERTY_GROUPS } from "@/animation/types";
import { getKeyframeAtTime } from "./keyframe-query";

/** Reference to a keyframe within an animation property group. */
export interface GroupKeyframeRef {
	/** Animation property path. */
	propertyPath: AnimationPropertyPath;
	/** Keyframe identifier. */
	keyframeId: string;
}

/**
 * Returns all keyframe references that exist at the given time across
 * all properties in the group.
 */
export function getGroupKeyframesAtTime({
	animations,
	group,
	time,
}: {
	animations: ElementAnimations | undefined;
	group: AnimationPropertyGroup;
	time: number;
}): GroupKeyframeRef[] {
	return ANIMATION_PROPERTY_GROUPS[group].flatMap((propertyPath) => {
		const keyframe = getKeyframeAtTime({ animations, propertyPath, time });
		return keyframe ? [{ propertyPath, keyframeId: keyframe.id }] : [];
	});
}

/**
 * Returns `true` when any property in the group has a keyframe at the
 * given time.
 */
export function hasGroupKeyframeAtTime({
	animations,
	group,
	time,
}: {
	animations: ElementAnimations | undefined;
	group: AnimationPropertyGroup;
	time: number;
}): boolean {
	return getGroupKeyframesAtTime({ animations, group, time }).length > 0;
}

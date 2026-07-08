/**
 * @module animation/graph-channels
 * @description Derives the UI-facing scalar channel graph data from raw
 *   element animations. Responsible for resolving editable scalar
 *   channels and keyframe contexts used by graph editors.
 */

import type {
	AnimationPath,
	ElementAnimations,
	ChannelData,
	ScalarAnimationChannel,
	ScalarGraphChannel,
	ScalarGraphKeyframeContext,
} from "@/animation/types";
import type { ChannelEasingMode } from "@/params";
import { isCompositeChannelData, isLeafChannelData } from "./channel-data";
import { isScalarChannel } from "./interpolation";

/** A collection of editable scalar channels with a shared easing mode. */
export interface EditableScalarChannels {
	/** Channel easing mode. */
	easingMode: ChannelEasingMode;
	/** Editable scalar graph channels. */
	channels: ScalarGraphChannel[];
}

function isScalarAnimationChannel(
	channel: ChannelData | undefined,
): channel is ScalarAnimationChannel {
	return isLeafChannelData(channel) && isScalarChannel(channel);
}

function getEasingModeForChannelData({
	data,
}: {
	data: ChannelData | undefined;
}): ChannelEasingMode {
	return isCompositeChannelData(data) &&
		["r", "g", "b", "a"].every((componentKey) => componentKey in data)
		? "shared"
		: "independent";
}

/**
 * Resolves all editable scalar channels for a given property path from
 * the element's animation data. Returns `null` if no scalar channel data
 * exists for the path.
 */
export function getEditableScalarChannels({
	animations,
	propertyPath,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
}): EditableScalarChannels | null {
	const data = animations?.[propertyPath];
	if (!data) {
		return null;
	}

	const channelEntries = isLeafChannelData(data)
		? [["value", data] as const]
		: Object.entries(data);
	const channels = channelEntries.flatMap(([componentKey, channel]) => {
		if (!isScalarAnimationChannel(channel)) {
			return [];
		}

		return [
			{
				propertyPath,
				componentKey,
				channel,
			} satisfies ScalarGraphChannel,
		];
	});

	return { easingMode: getEasingModeForChannelData({ data }), channels };
}

/**
 * Like {@link getEditableScalarChannels} but returns only the channel
 * matching a specific component key (e.g. `"r"`, `"x"`).
 */
export function getEditableScalarChannel({
	animations,
	propertyPath,
	componentKey,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	componentKey: string;
}): ScalarGraphChannel | null {
	const result = getEditableScalarChannels({ animations, propertyPath });
	return (
		result?.channels.find((channel) => channel.componentKey === componentKey) ??
		null
	);
}

/**
 * Resolves the full keyframe context for a specific keyframe by ID,
 * including its index and neighbouring keys for curve editing.
 */
export function getScalarKeyframeContext({
	animations,
	propertyPath,
	componentKey,
	keyframeId,
}: {
	animations: ElementAnimations | undefined;
	propertyPath: AnimationPath;
	componentKey: string;
	keyframeId: string;
}): ScalarGraphKeyframeContext | null {
	const scalarChannel = getEditableScalarChannel({
		animations,
		propertyPath,
		componentKey,
	});
	if (!scalarChannel) {
		return null;
	}

	const keyframeIndex = scalarChannel.channel.keys.findIndex(
		(keyframe) => keyframe.id === keyframeId,
	);
	if (keyframeIndex < 0) {
		return null;
	}

	return {
		...scalarChannel,
		keyframe: scalarChannel.channel.keys[keyframeIndex],
		keyframeIndex,
		previousKey: scalarChannel.channel.keys[keyframeIndex - 1] ?? null,
		nextKey: scalarChannel.channel.keys[keyframeIndex + 1] ?? null,
	};
}

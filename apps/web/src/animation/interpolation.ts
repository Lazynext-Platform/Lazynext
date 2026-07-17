/**
 * @module animation/interpolation
 * @description Channel value evaluation and interpolation helpers.
 *   Delegates to WASM for scalar / discrete channel sampling.
 */

import type {
	AnimationChannel,
	AnimationInterpolation,
	Channel,
	DiscreteAnimationChannel,
	DiscreteValue,
	ScalarAnimationChannel,
	ScalarSegmentType,
} from "@/animation/types";
import type { ParamValue } from "@/params";
import { evaluateScalarChannel, evaluateDiscreteChannel } from "@/wasm";

/** Returns `true` when a channel contains scalar (numeric) keyframes. */
export function isScalarChannel(
	channel: AnimationChannel,
): channel is ScalarAnimationChannel {
	return (
		"extrapolation" in channel ||
		channel.keys.some((keyframe) => "segmentToNext" in keyframe)
	);
}

/**
 * Normalises a channel before passing to WASM. Now a no-op since WASM
 * handles normalisation internally; retained for API compatibility.
 */
export function normalizeChannel({
	channel,
}: {
	channel: ScalarAnimationChannel;
}): ScalarAnimationChannel;
/** Utility representing normalizeChannel. */
export function normalizeChannel({
	channel,
}: {
	channel: DiscreteAnimationChannel;
}): DiscreteAnimationChannel;
/** Utility representing normalizeChannel. */
export function normalizeChannel({
	channel,
}: {
	channel: AnimationChannel;
}): AnimationChannel;
/** Utility representing normalizeChannel. */
export function normalizeChannel({
	channel,
}: {
	channel: AnimationChannel;
}): AnimationChannel {
	return channel;
}

/**
 * Converts a raw scalar segment type to the user-facing interpolation
 * mode.
 */
export function getScalarSegmentInterpolation({
	segment,
}: {
	segment: ScalarSegmentType;
}): AnimationInterpolation {
	if (segment === "step") {
		return "hold";
	}

	return segment === "bezier" ? "bezier" : "linear";
}

/**
 * Evaluates a scalar (numeric) channel at a given time, falling back
 * to the provided value when the channel is empty.
 */
export function getScalarChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: Channel<number> | undefined;
	time: number;
	fallbackValue: number;
}): number {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	return evaluateScalarChannel(channel, time, fallbackValue);
}

/**
 * Evaluates a discrete channel at a given time, falling back to the
 * provided value when the channel is empty.
 */
export function getDiscreteChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: Channel<DiscreteValue> | undefined;
	time: number;
	fallbackValue: DiscreteValue;
}): DiscreteValue {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	const result = evaluateDiscreteChannel(channel, time, fallbackValue as string);
	return result as DiscreteValue;
}

/**
 * Polymorphic channel evaluator — dispatches to
 * {@link getScalarChannelValueAtTime} or
 * {@link getDiscreteChannelValueAtTime} based on the fallback value type.
 */
export function getChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: Channel<number> | undefined;
	time: number;
	fallbackValue: number;
}): number;
/** Utility representing getChannelValueAtTime. */
export function getChannelValueAtTime<TValue extends DiscreteValue>({
	channel,
	time,
	fallbackValue,
}: {
	channel: DiscreteAnimationChannel | undefined;
	time: number;
	fallbackValue: TValue;
}): TValue;
/** Utility representing getChannelValueAtTime. */
export function getChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: AnimationChannel | undefined;
	time: number;
	fallbackValue: ParamValue;
}): ParamValue {
	if (!channel || channel.keys.length === 0) {
		return fallbackValue;
	}

	if (typeof fallbackValue === "number") {
		return isScalarChannel(channel)
			? getScalarChannelValueAtTime({
					channel,
					time,
					fallbackValue,
				})
			: fallbackValue;
	}

	if (typeof fallbackValue !== "string" && typeof fallbackValue !== "boolean") {
		return fallbackValue;
	}

	return getDiscreteChannelValueAtTime({
		channel: isScalarChannel(channel) ? undefined : channel,
		time,
		fallbackValue: fallbackValue as DiscreteValue,
	});
}

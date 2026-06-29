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

export function isScalarChannel(
	channel: AnimationChannel,
): channel is ScalarAnimationChannel {
	return (
		"extrapolation" in channel ||
		channel.keys.some((keyframe) => "segmentToNext" in keyframe)
	);
}

// Retained for any components that expect to call normalizeChannel before passing to WASM,
// though WASM now handles normalization internally. We return the channel as-is to avoid breaking signatures.
export function normalizeChannel({
	channel,
}: {
	channel: ScalarAnimationChannel;
}): ScalarAnimationChannel;
export function normalizeChannel({
	channel,
}: {
	channel: DiscreteAnimationChannel;
}): DiscreteAnimationChannel;
export function normalizeChannel({
	channel,
}: {
	channel: AnimationChannel;
}): AnimationChannel;
export function normalizeChannel({
	channel,
}: {
	channel: AnimationChannel;
}): AnimationChannel {
	return channel;
}

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

	// wasm-bindgen requires strings or numbers. 
	// Our discrete values are primarily strings, so we pass string representation.
	const result = evaluateDiscreteChannel(channel, time, fallbackValue as string);
	return result as DiscreteValue;
}

export function getChannelValueAtTime({
	channel,
	time,
	fallbackValue,
}: {
	channel: Channel<number> | undefined;
	time: number;
	fallbackValue: number;
}): number;
export function getChannelValueAtTime<TValue extends DiscreteValue>({
	channel,
	time,
	fallbackValue,
}: {
	channel: DiscreteAnimationChannel | undefined;
	time: number;
	fallbackValue: TValue;
}): TValue;
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

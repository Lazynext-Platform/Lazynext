/**
 * @module animation/types
 * @description Core type definitions for the animation system.
 *   Enumerates property paths, keyframe structures, channel layouts,
 *   and graph-editor context types used throughout the NLE engine.
 */

import type { MediaTime } from "@/wasm";
import type { ParamValue } from "@/params";

/** Built-in animation property paths. */
export const ANIMATION_PROPERTY_PATHS = [
	"transform.positionX",
	"transform.positionY",
	"transform.scaleX",
	"transform.scaleY",
	"transform.rotate",
	"opacity",
	"volume",
	"color",
	"background.color",
	"background.paddingX",
	"background.paddingY",
	"background.offsetX",
	"background.offsetY",
	"background.cornerRadius",
] as const;

/** A built-in animation property (one of {@link ANIMATION_PROPERTY_PATHS}). */
export type AnimationPropertyPath = (typeof ANIMATION_PROPERTY_PATHS)[number];
/** A path for a graphic element's animatable param. */
export type GraphicParamPath = `params.${string}`;
/** A path for an effect's animatable param. */
export type EffectParamPath = `effects.${string}.params.${string}`;
/** Any recognised animation property path (built-in, graphic, or effect). */
export type AnimationPath = string;

/** Groups of related animation properties (e.g. scale X/Y). */
export const ANIMATION_PROPERTY_GROUPS = {
	"transform.scale": ["transform.scaleX", "transform.scaleY"],
} as const satisfies Record<string, ReadonlyArray<AnimationPropertyPath>>;

export type AnimationPropertyGroup = keyof typeof ANIMATION_PROPERTY_GROUPS;

/** Values animatable via discrete (hold-only) channels. */
export type DiscreteValue = boolean | string;

/** Min/max/step constraints for numeric sliders. */
export interface NumericSpec {
	/** Minimum allowed value. */
	min?: number;
	/** Maximum allowed value. */
	max?: number;
	/** Step increment for slider controls. */
	step?: number;
}

/** Property paths that resolve to a color value. */
export type AnimationColorPropertyPath = Extract<
	AnimationPropertyPath,
	"color" | "background.color"
>;
/** Property paths that resolve to a numeric value. */
export type AnimationNumericPropertyPath = Exclude<
	AnimationPropertyPath,
	AnimationColorPropertyPath
>;

/** Interpolation modes for continuous keyframes. */
export type ContinuousKeyframeInterpolation = "linear" | "hold" | "bezier";
/** Discrete keyframes always use "hold". */
export type DiscreteKeyframeInterpolation = "hold";
/** Union of all keyframe interpolation modes. */
export type AnimationInterpolation =
	| ContinuousKeyframeInterpolation
	| DiscreteKeyframeInterpolation;

/** Segment types describing the curve from one keyframe to the next. */
export type ScalarSegmentType = "step" | "linear" | "bezier";
/** Tangent handle modes for bezier keyframes. */
export type TangentMode = "auto" | "aligned" | "broken" | "flat";
/** Extrapolation behaviour before the first / after the last keyframe. */
export type ChannelExtrapolationMode = "hold" | "linear";

/** A single tangent handle (time delta + value delta). */
export interface CurveHandle {
	/** Time delta in ticks. */
	dt: MediaTime;
	/** Value delta. */
	dv: number;
}

interface BaseAnimationKeyframe<TValue extends ParamValue> {
	/** Unique keyframe identifier. */
	id: string;
	/** Relative to element start time. */
	time: MediaTime;
	/** Keyframe value at this point in time. */
	value: TValue;
}

/** A single keyframe in a scalar (numeric) animation channel. */
export interface ScalarAnimationKey extends BaseAnimationKeyframe<number> {
	/** Incoming tangent handle. */
	leftHandle?: CurveHandle;
	/** Outgoing tangent handle. */
	rightHandle?: CurveHandle;
	/** Segment interpolation from this key to the next. */
	segmentToNext: ScalarSegmentType;
	/** Tangent handle mode for the bezier curve. */
	tangentMode: TangentMode;
}

/** A single keyframe in a discrete animation channel. */
export type DiscreteAnimationKey = BaseAnimationKeyframe<DiscreteValue>;

/** Discriminated keyframe: scalar if value is number, discrete otherwise. */
export type Keyframe<TValue extends ParamValue = ParamValue> =
	TValue extends number
		? ScalarAnimationKey
		: TValue extends DiscreteValue
			? DiscreteAnimationKey
			: never;

/** A scalar (numeric) animation channel with optional extrapolation settings. */
export interface ScalarChannel {
	/** Ordered list of scalar keyframes. */
	keys: ScalarAnimationKey[];
	/** Optional extrapolation behaviour before/after the keyframe range. */
	extrapolation?: {
		/** Behaviour before the first keyframe. */
		before: ChannelExtrapolationMode;
		/** Behaviour after the last keyframe. */
		after: ChannelExtrapolationMode;
	};
}

/** A discrete animation channel (hold-only keyframes). */
export interface DiscreteChannel {
	/** Ordered list of discrete keyframes. */
	keys: DiscreteAnimationKey[];
}

/** Discriminated channel: scalar if TValue is number, discrete otherwise. */
export type Channel<TValue extends ParamValue = ParamValue> =
	TValue extends number
		? ScalarChannel
		: TValue extends DiscreteValue
			? DiscreteChannel
			: never;

export type ScalarAnimationChannel = Channel<number>;
export type DiscreteAnimationChannel = Channel<DiscreteValue>;
/** Any animation channel (scalar or discrete). */
export type AnimationChannel = Channel;

/** A record of named component sub-channels (e.g. `{ r, g, b, a }`). */
export type CompositeChannelData = Record<string, AnimationChannel | undefined>;
/** Either a single leaf channel or a composite of sub-channels. */
export type ChannelData = AnimationChannel | CompositeChannelData;

/** An element's keyed animation data keyed by property path. */
export interface ElementAnimations {
	[propertyPath: AnimationPath]: ChannelData | undefined;
}

/** A 4-tuple representing a normalised cubic bezier curve. */
export type NormalizedCubicBezier = [number, number, number, number];

export interface ScalarGraphChannelTarget {
	/** Animation property path. */
	propertyPath: AnimationPath;
	/** Sub-component key within the property. */
	componentKey: string;
}

/** A scalar channel with its metadata, suitable for graph editors. */
export interface ScalarGraphChannel extends ScalarGraphChannelTarget {
	/** The underlying scalar animation channel. */
	channel: ScalarAnimationChannel;
}

/** A reference to a specific keyframe within a scalar graph channel. */
export interface ScalarGraphKeyframeRef extends ScalarGraphChannelTarget {
	/** Unique keyframe identifier. */
	keyframeId: string;
}

/** Full context for a keyframe in the scalar graph: the key itself plus neighbours. */
export interface ScalarGraphKeyframeContext extends ScalarGraphChannel {
	/** The selected keyframe. */
	keyframe: ScalarAnimationKey;
	/** Index of this keyframe within the channel. */
	keyframeIndex: number;
	/** Preceding keyframe, if any. */
	previousKey: ScalarAnimationKey | null;
	/** Following keyframe, if any. */
	nextKey: ScalarAnimationKey | null;
}

/** A partial update to a keyframe's curve handles and segment type. */
export interface ScalarCurveKeyframePatch {
	/** Updated incoming tangent handle. */
	leftHandle?: CurveHandle | null;
	/** Updated outgoing tangent handle. */
	rightHandle?: CurveHandle | null;
	/** Updated segment interpolation type. */
	segmentToNext?: ScalarSegmentType;
	/** Updated tangent handle mode. */
	tangentMode?: TangentMode;
}

/** A flattened representation of a single keyframe for the timeline UI. */
export interface ElementKeyframe {
	/** Animation property path. */
	propertyPath: AnimationPath;
	/** Unique keyframe identifier. */
	id: string;
	/** Keyframe time relative to element start. */
	time: MediaTime;
	/** Keyframe value. */
	value: ParamValue;
	/** Interpolation mode for this keyframe. */
	interpolation: AnimationInterpolation;
}

/** Identifies a selected keyframe by its track, element, path, and keyframe ID. */
export interface SelectedKeyframeRef {
	/** Track identifier. */
	trackId: string;
	/** Element identifier. */
	elementId: string;
	/** Animation property path. */
	propertyPath: AnimationPath;
	/** Unique keyframe identifier. */
	keyframeId: string;
}

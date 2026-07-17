/** @module Parameter system types and utilities for editor parameters (color, stroke, scalar channels, etc.) */

import { converter, formatHex, formatHex8, parse } from "culori";
import { clamp, snapToStep } from "@/utils/math";

/** Type definition for ParamValue. */
export type ParamValue = number | string | boolean;
/** Type definition for ParamValues. */
export type ParamValues = Record<string, ParamValue>;

/** Type definition for ParamGroup. */
export type ParamGroup = "stroke";

/** Type definition for ChannelValueKind. */
export type ChannelValueKind = "scalar" | "discrete";
/** Type definition for ChannelEasingMode. */
export type ChannelEasingMode = "independent" | "shared";

/** Type definition for LinearRgba. */
export interface LinearRgba {
	/** Red channel in linear space [0, 1]. */
	r: number;
	/** Green channel in linear space [0, 1]. */
	g: number;
	/** Blue channel in linear space [0, 1]. */
	b: number;
	/** Alpha channel [0, 1]. */
	a: number;
}

/** Type definition for ChannelComponentDefinition. */
export interface ChannelComponentDefinition<TKey extends string = string> {
	/** Component key (e.g. "value", "r", "g", "b", "a"). */
	key: TKey;
	/** Whether this component holds scalar or discrete values. */
	valueKind: ChannelValueKind;
	/** Default interpolation mode for new keyframes. */
	defaultInterpolation: "linear" | "hold";
}

/** Type definition for LeafChannelLayout. */
export interface LeafChannelLayout<TValue extends ParamValue = ParamValue> {
	/** Discriminator for leaf channel layout. */
	kind: "leaf";
	/** Single component definition for this leaf channel. */
	component: ChannelComponentDefinition<"value">;
	/** Easing mode (always independent for leaf channels). */
	easingMode: "independent";
	/** Decompose a value into its component mapping. */
	decompose: (value: TValue) => { value: TValue };
	/** Compose a value from component values. */
	compose: (components: { value?: TValue }) => TValue | null;
}

/** Type definition for CompositeChannelLayout. */
export interface CompositeChannelLayout<
	TValue extends ParamValue = ParamValue,
	TComponents extends object = Record<string, ParamValue>,
> {
	/** Discriminator for composite channel layout. */
	kind: "composite";
	/** Component definitions for each sub-channel. */
	components: Array<ChannelComponentDefinition<keyof TComponents & string>>;
	/** Easing mode (independent or shared across components). */
	easingMode: ChannelEasingMode;
	/** Decompose a value into its component mapping. */
	decompose: (value: TValue) => TComponents | null;
	/** Compose a value from partial component values. */
	compose: (components: Partial<TComponents>) => TValue | null;
}

/** Type definition for ChannelLayout. */
export type ChannelLayout<
	TValue extends ParamValue = ParamValue,
	TComponents extends object = Record<string, ParamValue>,
> = LeafChannelLayout<TValue> | CompositeChannelLayout<TValue, TComponents>;

/** Type definition for ParamChannelLayout. */
export type ParamChannelLayout =
	| LeafChannelLayout<number>
	| LeafChannelLayout<boolean>
	| LeafChannelLayout<string>
	| CompositeChannelLayout<string, LinearRgba>;

const toRgb = converter("rgb");

function srgbToLinear({ value }: { value: number }): number {
	return value <= 0.04045
		? value / 12.92
		: Math.pow((value + 0.055) / 1.055, 2.4);
}

function linearToSrgb({ value }: { value: number }): number {
	const clamped = clamp({ value, min: 0, max: 1 });
	return clamped <= 0.0031308
		? clamped * 12.92
		: 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/** Utility representing parseColorToLinearRgba. */
export function parseColorToLinearRgba({
	color,
}: {
	color: string;
}): LinearRgba | null {
	const parsed = parse(color);
	const rgb = parsed ? toRgb(parsed) : null;
	if (!rgb) {
		return null;
	}

	return {
		r: srgbToLinear({ value: rgb.r ?? 0 }),
		g: srgbToLinear({ value: rgb.g ?? 0 }),
		b: srgbToLinear({ value: rgb.b ?? 0 }),
		a: clamp({ value: rgb.alpha ?? 1, min: 0, max: 1 }),
	};
}

/** Utility representing formatLinearRgba. */
export function formatLinearRgba({ color }: { color: LinearRgba }): string {
	const rgb: {
		mode: "rgb";
		r: number;
		g: number;
		b: number;
		alpha: number;
	} = {
		mode: "rgb",
		r: linearToSrgb({ value: color.r }),
		g: linearToSrgb({ value: color.g }),
		b: linearToSrgb({ value: color.b }),
		alpha: clamp({ value: color.a, min: 0, max: 1 }),
	};
	return rgb.alpha < 1 ? formatHex8(rgb) : formatHex(rgb);
}

function createLeafChannelLayout<TValue extends ParamValue>({
	valueKind,
	defaultInterpolation,
}: {
	valueKind: ChannelValueKind;
	defaultInterpolation: "linear" | "hold";
}): LeafChannelLayout<TValue> {
	return {
		kind: "leaf",
		component: {
			key: "value",
			valueKind,
			defaultInterpolation,
		},
		easingMode: "independent",
		decompose: (value) => ({ value }),
		compose: ({ value }) => value ?? null,
	};
}

/** Utility representing NUMBER_CHANNEL_LAYOUT. */
export const NUMBER_CHANNEL_LAYOUT: LeafChannelLayout<number> =
	createLeafChannelLayout<number>({
		valueKind: "scalar",
		defaultInterpolation: "linear",
	});

/** Utility representing BOOLEAN_CHANNEL_LAYOUT. */
export const BOOLEAN_CHANNEL_LAYOUT: LeafChannelLayout<boolean> =
	createLeafChannelLayout<boolean>({
		valueKind: "discrete",
		defaultInterpolation: "hold",
	});

/** Utility representing STRING_CHANNEL_LAYOUT. */
export const STRING_CHANNEL_LAYOUT: LeafChannelLayout<string> =
	createLeafChannelLayout<string>({
		valueKind: "discrete",
		defaultInterpolation: "hold",
	});

const colorComponent = (
	key: keyof LinearRgba,
): ChannelComponentDefinition<keyof LinearRgba> => ({
	key,
	valueKind: "scalar",
	defaultInterpolation: "linear",
});

/** Utility representing COLOR_CHANNEL_LAYOUT. */
export const COLOR_CHANNEL_LAYOUT: CompositeChannelLayout<string, LinearRgba> =
	{
		kind: "composite",
		components: [
			colorComponent("r"),
			colorComponent("g"),
			colorComponent("b"),
			colorComponent("a"),
		],
		easingMode: "shared",
		decompose: (value) => parseColorToLinearRgba({ color: value }),
		compose: ({ r, g, b, a }) =>
			typeof r === "number" &&
			typeof g === "number" &&
			typeof b === "number" &&
			typeof a === "number"
				? formatLinearRgba({ color: { r, g, b, a } })
				: null,
	};

interface BaseParamDefinition<TKey extends string = string> {
	/** Unique parameter key. */
	key: TKey;
	/** Human-readable label for UI display. */
	label: string;
	/** Optional logical group for organization. */
	group?: ParamGroup;
	/** Whether this parameter supports keyframe animation. */
	keyframable?: boolean;
	/** Dependencies on other parameter values. */
	dependencies?: Array<{ param: string; equals: ParamValue }>;
}

/** Type definition for NumberParamDefinition. */
export interface NumberParamDefinition<
	TKey extends string = string,
> extends BaseParamDefinition<TKey> {
	type: "number";
	default: number;
	channels?: LeafChannelLayout<number>;
	/** Minimum allowed value. */
	min: number;
	/** Maximum allowed value. */
	max?: number;
	/** Step increment for slider controls. */
	step: number;
	/** When set, min/max/step are in display space. display = stored * displayMultiplier. */
	displayMultiplier?: number;
	/** Show as percentage of max. min/max/step/default stay in stored space. */
	unit?: "percent";
	/** Short label shown as the scrub handle icon in the number field (e.g. "W", "R"). */
	shortLabel?: string;
}

/** Type definition for BooleanParamDefinition. */
export interface BooleanParamDefinition<
	TKey extends string = string,
> extends BaseParamDefinition<TKey> {
	type: "boolean";
	/** Default boolean value. */
	default: boolean;
	channels?: LeafChannelLayout<boolean>;
}

/** Type definition for ColorParamDefinition. */
export interface ColorParamDefinition<
	TKey extends string = string,
> extends BaseParamDefinition<TKey> {
	type: "color";
	/** Default color value as a CSS color string. */
	default: string;
	channels?: ChannelLayout<string, LinearRgba>;
}

/** Type definition for SelectParamDefinition. */
export interface SelectParamDefinition<
	TKey extends string = string,
> extends BaseParamDefinition<TKey> {
	type: "select";
	/** Default selected option value. */
	default: string;
	channels?: LeafChannelLayout<string>;
	/** Available selectable options. */
	options: Array<{ value: string; label: string }>;
}

/** Type definition for TextParamDefinition. */
export interface TextParamDefinition<
	TKey extends string = string,
> extends BaseParamDefinition<TKey> {
	type: "text";
	/** Default text string. */
	default: string;
	channels?: LeafChannelLayout<string>;
}

/** Type definition for FontParamDefinition. */
export interface FontParamDefinition<
	TKey extends string = string,
> extends BaseParamDefinition<TKey> {
	type: "font";
	/** Default font family string. */
	default: string;
	channels?: LeafChannelLayout<string>;
}

/** Type definition for ParamDefinition. */
export type ParamDefinition<TKey extends string = string> =
	| NumberParamDefinition<TKey>
	| BooleanParamDefinition<TKey>
	| ColorParamDefinition<TKey>
	| SelectParamDefinition<TKey>
	| TextParamDefinition<TKey>
	| FontParamDefinition<TKey>;

/** Utility representing getParamChannelLayout. */
export function getParamChannelLayout({
	param,
}: {
	param: ParamDefinition;
}): ParamChannelLayout {
	switch (param.type) {
		case "number":
			return param.channels ?? NUMBER_CHANNEL_LAYOUT;
		case "boolean":
			return param.channels ?? BOOLEAN_CHANNEL_LAYOUT;
		case "color":
			return param.channels ?? COLOR_CHANNEL_LAYOUT;
		case "select":
		case "text":
		case "font":
			return param.channels ?? STRING_CHANNEL_LAYOUT;
		default: {
			const exhaustive: never = param;
			return exhaustive;
		}
	}
}

/** Utility representing getParamValueKind. */
export function getParamValueKind({
	param,
}: {
	param: ParamDefinition;
}): "number" | "color" | "discrete" {
	const layout = getParamChannelLayout({ param });
	if (layout.kind === "composite") {
		return "color";
	}
	if (layout.component.valueKind === "scalar") {
		return "number";
	}
	return "discrete";
}

/** Utility representing getParamDefaultInterpolation. */
export function getParamDefaultInterpolation({
	param,
}: {
	param: ParamDefinition;
}): "linear" | "hold" {
	const layout = getParamChannelLayout({ param });
	if (layout.kind === "leaf") {
		return layout.component.defaultInterpolation;
	}
	return layout.components[0]?.defaultInterpolation ?? "linear";
}

/** Utility representing getParamNumericRange. */
export function getParamNumericRange({
	param,
}: {
	param: ParamDefinition;
}): { min?: number; max?: number; step?: number } | undefined {
	if (param.type !== "number") {
		return undefined;
	}

	return {
		min: param.min,
		max: param.max,
		step: param.step,
	};
}

/** Utility representing coerceParamValue. */
export function coerceParamValue({
	param,
	value,
}: {
	param: ParamDefinition;
	value: unknown;
}): ParamValue | null {
	switch (param.type) {
		case "number": {
			if (typeof value !== "number" || Number.isNaN(value)) {
				return null;
			}

			const steppedValue = snapToStep({ value, step: param.step });
			const maxValue = param.max ?? Number.POSITIVE_INFINITY;
			return Math.min(maxValue, Math.max(param.min, steppedValue));
		}
		case "boolean":
			return typeof value === "boolean" ? value : null;
		case "color":
		case "text":
		case "font":
			return typeof value === "string" ? value : null;
		case "select":
			return typeof value === "string" &&
				param.options.some((option) => option.value === value)
				? value
				: null;
		default: {
			const exhaustive: never = param;
			return exhaustive;
		}
	}
}

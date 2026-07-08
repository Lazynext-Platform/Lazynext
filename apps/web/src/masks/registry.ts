/** @module Masks registry for registering and looking up mask definitions */
import { MAX_FEATHER } from "@/masks/feather";
import type { ParamDefinition } from "@/params";
import type {
	BaseMaskParams,
	Mask,
	MaskDefaultContext,
	MaskDefinition,
	MaskParamUpdateArgs,
	MaskRenderer,
	MaskType,
} from "@/masks/types";
import type { HugeiconsIconProps } from "@hugeicons/react";
import { DefinitionRegistry } from "@/params/registry";

export type MaskIconProps = {
	/** Hugeicons icon reference. */
	icon: HugeiconsIconProps["icon"];
	/** Stroke width override. */
	strokeWidth?: number;
};

type RegisteredMaskWithoutId = Mask extends infer TMask
	? TMask extends Mask
		? Omit<TMask, "id">
		: never
	: never;

export type MaskDefinitionForRegistration = {
	[TType in MaskType]: MaskDefinition<TType>;
}[MaskType];

export const BASE_MASK_PARAM_DEFINITIONS: ParamDefinition<
	keyof BaseMaskParams & string
>[] = [
	{
		key: "feather",
		label: "Feather",
		type: "number",
		default: 0,
		min: 0,
		max: MAX_FEATHER,
		step: 1,
		unit: "percent",
	},
	{
		key: "strokeWidth",
		label: "Stroke width",
		type: "number",
		default: 0,
		min: 0,
		max: 100,
		step: 1,
	},
	{
		key: "strokeColor",
		label: "Stroke color",
		type: "color",
		default: "#ffffff",
	},
];

export interface RegisteredMaskDefinition {
	/** Mask type discriminator. */
	type: MaskType;
	/** Display name. */
	name: string;
	/** Feature flags. */
	features: MaskDefinition["features"];
	/** Parameter definitions. */
	params: ParamDefinition<string>[];
	/** Mask renderer function. */
	renderer: MaskRenderer<BaseMaskParams>;
	/** Interaction handler. */
	interaction: MaskDefinition["interaction"];
	/** Whether the mask is active given current params. */
	/** Whether the mask is active given current params. */
	isActive?(params: BaseMaskParams): boolean;
	/** Builds default mask data. */
	buildDefault(context: MaskDefaultContext): RegisteredMaskWithoutId;
	/** Computes parameter updates. */
	computeParamUpdate(
		/** Handle-drag arguments (handle id, delta, current params). */
		args: MaskParamUpdateArgs<BaseMaskParams>,
	): Partial<BaseMaskParams>;
	/** Mask icon configuration. */
	icon: MaskIconProps;
}

export class MasksRegistry extends DefinitionRegistry<
	MaskType,
	RegisteredMaskDefinition
> {
	constructor() {
		super("mask");
	}

	registerMask({
		definition,
		icon,
	}: {
		/** Mask definition to register. */
		definition: MaskDefinitionForRegistration;
		/** Icon configuration for the mask. */
		icon: MaskIconProps;
	}): void {
		const withBaseParams: RegisteredMaskDefinition = {
			type: definition.type,
			name: definition.name,
			features: definition.features,
			params: [...definition.params, ...BASE_MASK_PARAM_DEFINITIONS],
			renderer: definition.renderer,
			interaction: definition.interaction,
			isActive: definition.isActive,
			buildDefault: definition.buildDefault,
			computeParamUpdate: definition.computeParamUpdate,
			icon,
		};
		this.register({
			key: definition.type,
			definition: withBaseParams,
		});
	}
}

export const masksRegistry = new MasksRegistry();

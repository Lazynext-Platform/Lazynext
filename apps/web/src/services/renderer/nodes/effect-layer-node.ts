/** @module Effect layer render node for applying GPU effect passes in the compositor tree */
import type { EffectPass } from "@/effects/types";
import type { ParamValues } from "@/params";
import { BaseNode } from "./base-node";

/** Type definition for EffectLayerNodeParams. */
export type EffectLayerNodeParams = {
	/** Identifier for the effect in the registry. */
	effectType: string;
	/** Resolved parameter values for the effect. */
	effectParams: ParamValues;
	/** Time offset on the timeline. */
	timeOffset: number;
	/** Duration in seconds. */
	duration: number;
};

/** Type definition for ResolvedEffectLayerNodeState. */
export type ResolvedEffectLayerNodeState = {
	/** Array of GPU effect passes to apply. */
	passes: EffectPass[];
};

/** Class representing EffectLayerNode. */
export class EffectLayerNode extends BaseNode<
	EffectLayerNodeParams,
	ResolvedEffectLayerNodeState
> {}

/** @module Visual render node base class for nodes with effects, masks, and transforms */
import { BaseNode } from "./base-node";
import type { Effect, EffectPass } from "@/effects/types";
import type { Mask } from "@/masks/types";
import type { Transform } from "@/primitives/transform";
import type { BlendMode } from "@/primitives/blend-mode";
import type { RetimeConfig, VisualElement } from "@/timeline";

export interface VisualNodeParams {
	/** Element duration in media ticks. */
	duration: number;
	/** Time offset within the element. */
	timeOffset: number;
	/** Trim start in media ticks. */
	trimStart: number;
	/** Trim end in media ticks. */
	trimEnd: number;
	/** Optional retime configuration. */
	retime?: RetimeConfig;
	/** Spatial transform. */
	transform: Transform;
	/** Optional animation channels. */
	animations?: VisualElement["animations"];
	/** Opacity (0-1). */
	opacity: number;
	/** Optional blend mode. */
	blendMode?: BlendMode;
	/** Optional effects applied to this node. */
	effects?: Effect[];
	/** Optional masks applied to this node. */
	masks?: Mask[];
}

export interface ResolvedVisualNodeState {
	/** Resolved local time within the element. */
	localTime: number;
	/** Resolved spatial transform. */
	transform: Transform;
	/** Resolved opacity. */
	opacity: number;
	/** Resolved effect passes grouped by stage. */
	effectPasses: EffectPass[][];
}

export interface ResolvedVisualSourceNodeState extends ResolvedVisualNodeState {
	/** Source canvas image element. */
	source: CanvasImageSource;
	/** Source width in pixels. */
	sourceWidth: number;
	/** Source height in pixels. */
	sourceHeight: number;
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
	Resolved extends ResolvedVisualNodeState = ResolvedVisualNodeState,
> extends BaseNode<Params, Resolved> {}

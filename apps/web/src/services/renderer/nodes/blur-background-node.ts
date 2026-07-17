/** @module Blur background render node for applying background blur effects in the compositor tree */
import type { EffectPass } from "@/effects/types";
import type { RetimeConfig } from "@/timeline";
import { BaseNode } from "./base-node";

/** Type definition for BlurBackgroundNodeParams. */
export type BlurBackgroundNodeParams = {
	/** Source media identifier. */
	mediaId: string;
	/** Source media URL. */
	url: string;
	/** Source media file. */
	file: File;
	/** Type of the source media. */
	mediaType: "video" | "image";
	/** Media duration. */
	duration: number;
	/** Offset from the timeline start. */
	timeOffset: number;
	/** Trim offset from the media start. */
	trimStart: number;
	/** Trim offset from the media end. */
	trimEnd: number;
	/** Optional retiming configuration. */
	retime?: RetimeConfig;
	/** Background blur intensity. */
	blurIntensity: number;
};

/** Type definition for BackdropSource. */
export type BackdropSource = {
	/** Image source used as the backdrop. */
	source: CanvasImageSource;
	/** Backdrop width in pixels. */
	width: number;
	/** Backdrop height in pixels. */
	height: number;
};

/** Type definition for ResolvedBlurBackgroundNodeState. */
export interface ResolvedBlurBackgroundNodeState {
	/** Resolved backdrop source. */
	backdropSource: BackdropSource;
	/** Effect passes to apply. */
	passes: EffectPass[];
}

/** Class representing BlurBackgroundNode. */
export class BlurBackgroundNode extends BaseNode<
	BlurBackgroundNodeParams,
	ResolvedBlurBackgroundNodeState
> {}

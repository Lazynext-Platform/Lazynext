/** @module TypeScript type definitions for compositor frame descriptors, texture descriptors, and render items */

import type { BlendMode } from "@/primitives/blend-mode";
import type { EffectPass } from "@/effects/types";

export type FrameDescriptor = {
	/** Frame width in pixels. */
	width: number;
	/** Frame height in pixels. */
	height: number;
	/** Clear color for the frame. */
	clear: {
		/** RGBA color quadruple. */
		color: [number, number, number, number];
	};
	/** Items to render in this frame. */
	items: FrameItemDescriptor[];
};

export type FrameItemDescriptor =
	| {
			type: "layer";
			textureId: string;
			transform: QuadTransformDescriptor;
			opacity: number;
			blendMode: BlendMode;
			effectPassGroups: EffectPass[][];
			mask: LayerMaskDescriptor | null;
	  }
	| {
			type: "sceneEffect";
			effectPassGroups: EffectPass[][];
	  };

export type QuadTransformDescriptor = {
	/** Horizontal center of the quad. */
	centerX: number;
	/** Vertical center of the quad. */
	centerY: number;
	/** Width of the quad. */
	width: number;
	/** Height of the quad. */
	height: number;
	/** Rotation in degrees. */
	rotationDegrees: number;
	/** Whether to flip horizontally. */
	flipX: boolean;
	/** Whether to flip vertically. */
	flipY: boolean;
};

export type LayerMaskDescriptor = {
	/** Texture ID of the mask. */
	textureId: string;
	/** Feather radius in pixels. */
	feather: number;
	/** Whether the mask is inverted. */
	inverted: boolean;
};

export type TextureCanvasDrawFn = (
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
) => void;

/**
 * A layer texture whose pixels come from somewhere outside the renderer —
 * typically a decoded video/image frame or a sticker. Cached by reference
 * identity of the source object.
 */
export type ExternalTextureDescriptor = {
	/** Discriminant for external textures. */
	kind: "external";
	/** Unique texture identifier. */
	id: string;
	/** Source image element for the texture. */
	source: CanvasImageSource;
	/** Texture width in pixels. */
	width: number;
	/** Texture height in pixels. */
	height: number;
};

/**
 * A layer texture that the renderer rasterizes from scene state (color fill,
 * text layout, mask shape, blur backdrop). Cached by `contentHash`: when it
 * matches the previous frame's hash for this id, the upload is skipped
 * entirely and the persistent canvas is not even cleared.
 */
export type RenderedTextureDescriptor = {
	/** Discriminant for rendered textures. */
	kind: "rendered";
	/** Unique texture identifier. */
	id: string;
	/** Hash of the content for cache invalidation. */
	contentHash: string;
	/** Texture width in pixels. */
	width: number;
	/** Texture height in pixels. */
	height: number;
	/** Draw function that rasterizes the texture content. */
	draw: TextureCanvasDrawFn;
};

export type TextureUploadDescriptor =
	| ExternalTextureDescriptor
	| RenderedTextureDescriptor;

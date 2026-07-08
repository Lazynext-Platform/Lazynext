/** @module Sticker render node for rendering sticker images on the compositor */
import { resolveStickerId } from "@/stickers";
import {
	VisualNode,
	type ResolvedVisualSourceNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface StickerNodeParams extends VisualNodeParams {
	/** Identifier for the sticker in the sticker registry. */
	stickerId: string;
	/** Override the intrinsic width of the sticker. */
	intrinsicWidth?: number;
	/** Override the intrinsic height of the sticker. */
	intrinsicHeight?: number;
}

interface CachedStickerSource {
	/** Loaded image element. */
	source: HTMLImageElement;
	/** Natural width of the loaded image. */
	width: number;
	/** Natural height of the loaded image. */
	height: number;
}

const stickerSourceCache = new Map<string, Promise<CachedStickerSource>>();

export function loadStickerSource({
	stickerId,
}: {
	stickerId: string;
}): Promise<CachedStickerSource> {
	const cached = stickerSourceCache.get(stickerId);
	if (cached) return cached;

	const promise = (async (): Promise<CachedStickerSource> => {
		const url = resolveStickerId({
			stickerId,
			options: { width: 200, height: 200 },
		});

		const image = new Image();

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () =>
				reject(new Error(`Failed to load sticker: ${stickerId}`));
			image.src = url;
		});

		return {
			source: image,
			width: image.naturalWidth,
			height: image.naturalHeight,
		};
	})();

	stickerSourceCache.set(stickerId, promise);
	return promise;
}

export class StickerNode extends VisualNode<
	StickerNodeParams,
	ResolvedVisualSourceNodeState
> {}

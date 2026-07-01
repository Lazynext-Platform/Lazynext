/**
 * @module Lightweight sticker provider registry built on the generic
 * DefinitionRegistry. Holds all registered StickerProvider instances.
 */

import type { StickerProvider } from "@/stickers/types";
import { DefinitionRegistry } from "@/params/registry";

export class StickersRegistry extends DefinitionRegistry<
	string,
	StickerProvider
> {
	constructor() {
		super("sticker provider");
	}
}

export const stickersRegistry = new StickersRegistry();

/**
 * @module Core type definitions for the stickers system — provider contract,
 * search/browse results, and sticker item shape.
 */

import type { STICKER_CATEGORIES } from "@/stickers/categories";

export type StickerCategory = keyof typeof STICKER_CATEGORIES;

export interface StickerItem {
	/** Unique identifier for the sticker. */
	id: string;
	/** Identifier of the provider that supplied this sticker. */
	provider: string;
	/** Human-readable sticker name. */
	name: string;
	/** URL of the sticker preview thumbnail. */
	previewUrl: string;
	/** Provider-specific metadata for the sticker. */
	metadata: Record<string, unknown>;
}

export interface StickerSearchResult {
	/** Matching sticker items for the query. */
	items: StickerItem[];
	/** Total number of matching stickers available. */
	total: number;
	/** Whether more results can be fetched. */
	hasMore: boolean;
}

export interface StickerBrowseSection {
	/** Unique identifier for the browse section. */
	id: string;
	/** Optional display title for the section. */
	title?: string;
	/** Sticker items shown in this section. */
	items: StickerItem[];
	/** Whether more items can be loaded in this section. */
	hasMore?: boolean;
	/** Layout style for rendering the section. */
	layout?: "grid" | "row";
	/** Optional action associated with the section. */
	action?: {
		/** Action type discriminator. */
		type: "see-all";
		/** Category to navigate to, if applicable. */
		category?: StickerCategory;
		/** Section identifier to navigate to. */
		sectionId?: string;
	};
}

export interface StickerBrowseResult {
	/** Browse sections returned by the provider. */
	sections: StickerBrowseSection[];
}

export interface StickerProviderSearchOptions {
	/** Maximum number of results to return. */
	limit?: number;
}

export interface StickerProviderBrowseOptions {
	/** Page number to fetch. */
	page?: number;
	/** Maximum number of results per page. */
	limit?: number;
}

export interface StickerResolveOptions {
	/** Desired width of the resolved sticker. */
	width?: number;
	/** Desired height of the resolved sticker. */
	height?: number;
}

export interface StickerProvider {
	/** Unique identifier for the provider. */
	id: string;
	/** Searches the provider for stickers matching a query. */
	search({
		query,
		options,
	}: {
		/** The search query string. */
		query: string;
		/** Optional search parameters. */
		options?: StickerProviderSearchOptions;
	}): Promise<StickerSearchResult>;
	/** Browses the provider's sticker catalog. */
	browse({
		options,
	}: {
		/** Optional browse parameters. */
		options?: StickerProviderBrowseOptions;
	}): Promise<StickerBrowseResult>;
	/** Resolves a sticker ID to a usable asset URL. */
	resolveUrl({
		stickerId,
		options,
	}: {
		/** Sticker identifier to resolve. */
		stickerId: string;
		/** Optional resolution parameters. */
		options?: StickerResolveOptions;
	}): string;
}

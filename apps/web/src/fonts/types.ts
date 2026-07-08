/** @module Font type definitions for font options and atlas glyph data */
export interface FontOption {
	/** Unique font value identifier. */
	value: string;
	/** Display label. */
	label: string;
	/** Font source category. */
	category: "system" | "google" | "custom";
	/** Available font weights. */
	weights?: number[];
	/** Whether a CSS class name is available. */
	hasClassName?: boolean;
}

export interface GoogleFontMeta {
	/** Font family name. */
	family: string;
	/** Google category string. */
	category: string;
}

export interface FontAtlasEntry {
	/** Atlas X offset. */
	x: number;
	/** Atlas Y offset. */
	y: number;
	/** Glyph width. */
	w: number;
	/** Character height. */
	ch: number;
	/** Supported character strings. */
	s: string[];
}

export interface FontAtlas {
	/** Map of font family to atlas entry. */
	fonts: Record<string, FontAtlasEntry>;
}

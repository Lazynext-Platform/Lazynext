/** @module TypeScript type definitions for subtitle styling, placement, and per-chunk style overrides */

import type { TextBackground } from "@/text/background";
import type {
	TextAlign,
	TextDecoration,
	TextFontStyle,
	TextFontWeight,
} from "@/text/primitives";
import type { CaptionChunk } from "@/transcription/types";

/** Type definition for SubtitlePlacementStyle. */
export interface SubtitlePlacementStyle {
	/** Vertical alignment relative to the canvas. */
	verticalAlign?: "top" | "middle" | "bottom";
	/** Left margin as a ratio of canvas width. */
	marginLeftRatio?: number;
	/** Right margin as a ratio of canvas width. */
	marginRightRatio?: number;
	/** Top/bottom margin as a ratio of canvas height. */
	marginVerticalRatio?: number;
}

/** Type definition for SubtitleStyleOverrides. */
export interface SubtitleStyleOverrides {
	/**
	 * Font size in app units (same coordinate space as TextElement.fontSize).
	 * Use fontSizeRatioOfPlayHeight when the source coordinate space is unknown
	 * (e.g. ASS files, where font size is relative to the script's play resolution).
	 */
	fontSize?: number;
	/**
	 * Font size expressed as a fraction of the reference canvas height.
	 * Set by the ASS parser so the builder can convert to app units without
	 * the parser needing to know about the app's coordinate system.
	 * Takes precedence over fontSize when both are present.
	 */
	fontSizeRatioOfPlayHeight?: number;
	/** CSS font-family string. */
	fontFamily?: string;
	/** Text fill color. */
	color?: string;
	/** Text background styling overrides. */
	background?: Pick<TextBackground, "enabled" | "color"> &
		Partial<Omit<TextBackground, "enabled" | "color">>;
	/** Horizontal text alignment. */
	textAlign?: TextAlign;
	/** Font weight (normal or bold). */
	fontWeight?: TextFontWeight;
	/** Font style (normal or italic). */
	fontStyle?: TextFontStyle;
	/** Text decoration style. */
	textDecoration?: TextDecoration;
	/** Additional spacing between characters. */
	letterSpacing?: number;
	/** Line height as a multiplier of font size. */
	lineHeight?: number;
	/** Subtitle placement and margin overrides. */
	placement?: SubtitlePlacementStyle;
}

/** Type definition for SubtitleCue. */
export interface SubtitleCue extends CaptionChunk {
	/** Optional style overrides for this cue. */
	style?: SubtitleStyleOverrides;
}

/** Type definition for ParseSubtitleResult. */
export interface ParseSubtitleResult {
	/** Parsed subtitle cues. */
	captions: SubtitleCue[];
	/** Number of cues skipped during parsing. */
	skippedCueCount: number;
	/** Non-fatal parse warnings. */
	warnings: string[];
}

/**
 * Drag-and-drop data types for timeline interactions.
 *
 * Defines the typed payloads carried by browser drag events when media,
 * text, stickers, graphics, or effects are dragged from the asset panel
 * onto the timeline.
 *
 * @module timeline/drag
 */

import type { MaskableElement, VisualElement } from "./types";
import type { ParamValues } from "@/params";

interface BaseDragData {
	/** Unique identifier. */
	id: string;
	/** Human-readable name. */
	name: string;
}

/** Payload for dragging a media asset (image, video, or audio) onto the timeline. */
export interface MediaDragData extends BaseDragData {
	/** Discriminant identifying a media drag payload. */
	type: "media";
	/** The type of media being dragged. */
	mediaType: "image" | "video" | "audio";
	/** Optional target element types for drop validation. */
	targetElementTypes?: MaskableElement["type"][];
}

/** Payload for dragging a text snippet onto the timeline. */
export interface TextDragData extends BaseDragData {
	/** Discriminant identifying a text drag payload. */
	type: "text";
	/** The text content. */
	content: string;
}

/** Payload for dragging a sticker asset onto the timeline. */
export interface StickerDragData extends BaseDragData {
	/** Discriminant identifying a sticker drag payload. */
	type: "sticker";
	/** The sticker asset ID. */
	stickerId: string;
}

/** Payload for dragging a graphic definition onto the timeline with initial params. */
export interface GraphicDragData extends BaseDragData {
	/** Discriminant identifying a graphic drag payload. */
	type: "graphic";
	/** The graphic definition ID. */
	definitionId: string;
	/** Initial param values. */
	params: Partial<ParamValues>;
}

/** Payload for dragging an effect onto an existing visual timeline element. */
export interface EffectDragData extends BaseDragData {
	/** Discriminant identifying an effect drag payload. */
	type: "effect";
	/** The effect type identifier. */
	effectType: string;
	/** Allowed target element types. */
	targetElementTypes: VisualElement["type"][];
}

/** Union of all possible drag payloads carried by the timeline. */
export type TimelineDragData =
	| MediaDragData
	| TextDragData
	| StickerDragData
	| GraphicDragData
	| EffectDragData;

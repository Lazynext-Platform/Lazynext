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
	id: string;
	name: string;
}

/** Payload for dragging a media asset (image, video, or audio) onto the timeline. */
export interface MediaDragData extends BaseDragData {
	type: "media";
	mediaType: "image" | "video" | "audio";
	targetElementTypes?: MaskableElement["type"][];
}

/** Payload for dragging a text snippet onto the timeline. */
export interface TextDragData extends BaseDragData {
	type: "text";
	content: string;
}

/** Payload for dragging a sticker asset onto the timeline. */
export interface StickerDragData extends BaseDragData {
	type: "sticker";
	stickerId: string;
}

/** Payload for dragging a graphic definition onto the timeline with initial params. */
export interface GraphicDragData extends BaseDragData {
	type: "graphic";
	definitionId: string;
	params: Partial<ParamValues>;
}

/** Payload for dragging an effect onto an existing visual timeline element. */
export interface EffectDragData extends BaseDragData {
	type: "effect";
	effectType: string;
	targetElementTypes: VisualElement["type"][];
}

/** Union of all possible drag payloads carried by the timeline. */
export type TimelineDragData =
	| MediaDragData
	| TextDragData
	| StickerDragData
	| GraphicDragData
	| EffectDragData;

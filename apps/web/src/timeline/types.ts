/**
 * Core types for the timeline data model — tracks, elements, scenes,
 * bookmarks, and drag state.
 *
 * Every timeline element shares a base shape (id, duration, startTime,
 * params, animations) and specializes by type (video, image, text,
 * sticker, graphic, audio, effect).
 *
 * @module timeline/types
 */

import type { ElementAnimations } from "@/animation/types";
import type { Effect } from "@/effects/types";
import type { Mask } from "@/masks/types";
import type { ParamValues } from "@/params";
import type { MediaTime } from "@/wasm";

/** Uniquely identifies an element by its track and element IDs. */
export type ElementRef = {
	trackId: string;
	elementId: string;
};

/** A named marker on the timeline, optionally with a note, color, and duration. */
export interface Bookmark {
	time: MediaTime;
	note?: string;
	color?: string;
	duration?: MediaTime;
}

/** A scene containing a set of tracks, bookmarks, and metadata. */
export interface TScene {
	id: string;
	name: string;
	isMain: boolean;
	tracks: SceneTracks;
	bookmarks: Bookmark[];
	createdAt: Date;
	updatedAt: Date;
}

/** Discriminated union tag for the five track variants. */
export type TrackType = "video" | "text" | "audio" | "graphic" | "effect";

interface BaseTrack {
	id: string;
	name: string;
}

/** A video/image track holding visual media elements. */
export interface VideoTrack extends BaseTrack {
	type: "video";
	elements: (VideoElement | ImageElement)[];
	muted: boolean;
	hidden: boolean;
}

/** A text overlay track. */
export interface TextTrack extends BaseTrack {
	type: "text";
	elements: TextElement[];
	hidden: boolean;
}

/** An audio track with audio waveform elements. */
export interface AudioTrack extends BaseTrack {
	type: "audio";
	elements: AudioElement[];
	muted: boolean;
}

/** A track for stickers and parametric graphic elements. */
export interface GraphicTrack extends BaseTrack {
	type: "graphic";
	elements: (StickerElement | GraphicElement)[];
	hidden: boolean;
}

/** A track for GPU effect elements applied to visual layers. */
export interface EffectTrack extends BaseTrack {
	type: "effect";
	elements: EffectElement[];
	hidden: boolean;
}

/** Union of all track variants on the timeline. */
export type TimelineTrack =
	| VideoTrack
	| TextTrack
	| AudioTrack
	| GraphicTrack
	| EffectTrack;

/** Any track type that can appear in the overlay stack (everything but audio). */
export type OverlayTrack = VideoTrack | TextTrack | GraphicTrack | EffectTrack;

/** Ordered track groups that make up a scene: overlay stack, main video track, and audio tracks. */
export interface SceneTracks {
	overlay: OverlayTrack[];
	main: VideoTrack;
	audio: AudioTrack[];
}

/** Speed-ramping configuration for video and audio elements. */
export interface RetimeConfig {
	rate: number;
	maintainPitch?: boolean;
}

interface BaseAudioElement extends BaseTimelineElement {
	type: "audio";
	buffer?: AudioBuffer;
	retime?: RetimeConfig;
}

/** Audio element sourced from a user-uploaded media asset. */
export interface UploadAudioElement extends BaseAudioElement {
	sourceType: "upload";
	mediaId: string;
}

/** Audio element sourced from the built-in library. */
export interface LibraryAudioElement extends BaseAudioElement {
	sourceType: "library";
	sourceUrl: string;
}

/** Union of all audio element variants on the timeline. */
export type AudioElement = UploadAudioElement | LibraryAudioElement;

/** Shared shape of every element on the timeline. */
interface BaseTimelineElement {
	id: string;
	name: string;
	duration: MediaTime;
	startTime: MediaTime;
	trimStart: MediaTime;
	trimEnd: MediaTime;
	sourceDuration?: MediaTime;
	animations?: ElementAnimations;
	params: ParamValues;
}

/** A video clip element on the timeline. */
export interface VideoElement extends BaseTimelineElement {
	type: "video";
	mediaId: string;
	isSourceAudioEnabled?: boolean;
	hidden?: boolean;
	retime?: RetimeConfig;
	effects?: Effect[];
	masks?: Mask[];
}

/** A still-image element on the timeline. */
export interface ImageElement extends BaseTimelineElement {
	type: "image";
	mediaId: string;
	hidden?: boolean;
	effects?: Effect[];
	masks?: Mask[];
}

/** A text overlay element on the timeline. */
export interface TextElement extends BaseTimelineElement {
	type: "text";
	hidden?: boolean;
	effects?: Effect[];
}

/** A sticker element on the timeline. */
export interface StickerElement extends BaseTimelineElement {
	type: "sticker";
	stickerId: string;
	/** Natural dimensions of the sticker asset, stored at insert time. Used by renderer and preview bounds to avoid split-brain geometry. */
	intrinsicWidth?: number;
	intrinsicHeight?: number;
	hidden?: boolean;
	effects?: Effect[];
}

/** A parametric graphic element on the timeline. */
export interface GraphicElement extends BaseTimelineElement {
	type: "graphic";
	definitionId: string;
	hidden?: boolean;
	effects?: Effect[];
	masks?: Mask[];
}

/** A GPU effect element applied to the layer stack. */
export interface EffectElement extends BaseTimelineElement {
	type: "effect";
	effectType: string;
}

/** Partial update that can be applied to a timeline element's params. */
export type ElementUpdatePatch = { params?: Partial<ParamValues> };

/** Union of every element variant on the timeline. */
export type TimelineElement =
	| AudioElement
	| VideoElement
	| ImageElement
	| TextElement
	| StickerElement
	| GraphicElement
	| EffectElement;

/** The discriminator string for each element variant. */
export type ElementType = TimelineElement["type"];

function elementTypes<T extends ElementType[]>(...types: T): T {
	return types;
}

/** Element types that support masks. */
export const MASKABLE_ELEMENT_TYPES = elementTypes("video", "image", "graphic");

/** Subset of timeline elements that can have masks applied. */
export type MaskableElement = Extract<
	TimelineElement,
	{ type: (typeof MASKABLE_ELEMENT_TYPES)[number] }
>;

/** Element types that support speed retiming. */
export const RETIMABLE_ELEMENT_TYPES = elementTypes("video", "audio");

/** Subset of timeline elements that can be speed-ramped. */
export type RetimableElement = Extract<
	TimelineElement,
	{ type: (typeof RETIMABLE_ELEMENT_TYPES)[number] }
>;

/** Element types that produce visual output on the compositor. */
export const VISUAL_ELEMENT_TYPES = elementTypes(
	"video",
	"image",
	"text",
	"sticker",
	"graphic",
);

/** Subset of timeline elements that render to the compositor canvas. */
export type VisualElement = Extract<
	TimelineElement,
	{ type: (typeof VISUAL_ELEMENT_TYPES)[number] }
>;

/** Shape for creating a new upload-sourced audio element (no id). */
export type CreateUploadAudioElement = Omit<UploadAudioElement, "id">;

/** Shape for creating a new library-sourced audio element (no id). */
export type CreateLibraryAudioElement = Omit<LibraryAudioElement, "id">;

/** Union of audio element creation shapes. */
export type CreateAudioElement =
	| CreateUploadAudioElement
	| CreateLibraryAudioElement;

/** Shape for creating a new video element (no id). */
export type CreateVideoElement = Omit<VideoElement, "id">;

/** Shape for creating a new image element (no id). */
export type CreateImageElement = Omit<ImageElement, "id">;

/** Shape for creating a new text element (no id). */
export type CreateTextElement = Omit<TextElement, "id">;

/** Shape for creating a new sticker element (no id). */
export type CreateStickerElement = Omit<StickerElement, "id">;

/** Shape for creating a new graphic element (no id). */
export type CreateGraphicElement = Omit<GraphicElement, "id">;

/** Shape for creating a new effect element (no id). */
export type CreateEffectElement = Omit<EffectElement, "id">;

/** Union of all element creation shapes (all omit the auto-generated `id`). */
export type CreateTimelineElement =
	| CreateAudioElement
	| CreateVideoElement
	| CreateImageElement
	| CreateTextElement
	| CreateStickerElement
	| CreateGraphicElement
	| CreateEffectElement;

/** Mutable state tracking an in-progress element drag operation. */
export interface ElementDragState {
	isDragging: boolean;
	elementId: string | null;
	dragElementIds: string[];
	dragTimeOffsets: Record<string, MediaTime>;
	trackId: string | null;
	startMouseX: number;
	startMouseY: number;
	startElementTime: MediaTime;
	clickOffsetTime: MediaTime;
	currentTime: MediaTime;
	currentMouseY: number;
}

/** Read-only view of element drag state exposed to React components. */
export type ElementDragView =
	| { readonly kind: "idle" }
	| {
			readonly kind: "dragging";
			readonly anchorElementId: string;
			readonly trackId: string;
			readonly memberTimeOffsets: ReadonlyMap<string, MediaTime>;
			readonly startMouseX: number;
			readonly startMouseY: number;
			readonly startElementTime: MediaTime;
			readonly clickOffsetTime: MediaTime;
			readonly currentTime: MediaTime;
			readonly currentMouseX: number;
			readonly currentMouseY: number;
			readonly dropTarget: DropTarget | null;
	  };

/** Describes where a dragged element would be dropped on the timeline. */
export interface DropTarget {
	trackIndex: number;
	isNewTrack: boolean;
	insertPosition?: "above" | "below";
	xPosition: MediaTime;
	targetElement: { elementId: string; trackId: string } | null;
}

/** Parameters for computing a drop target during a drag operation. */
export interface ComputeDropTargetParams {
	elementType: ElementType;
	mouseX: number;
	mouseY: number;
	tracks: SceneTracks;
	playheadTime: MediaTime;
	isExternalDrop: boolean;
	elementDuration: MediaTime;
	pixelsPerSecond: number;
	zoomLevel: number;
	verticalDragDirection?: "up" | "down" | null;
	startTimeOverride?: MediaTime;
	excludeElementId?: string;
	targetElementTypes?: string[];
}

/** A clipboard-ready snapshot of a timeline element. */
export interface ClipboardItem {
	trackId: string;
	trackType: TrackType;
	element: CreateTimelineElement;
}

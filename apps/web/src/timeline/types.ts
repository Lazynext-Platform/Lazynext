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
	/** ID of the track containing the element. */
	trackId: string;
	/** ID of the referenced element. */
	elementId: string;
};

/** A named marker on the timeline, optionally with a note, color, and duration. */
export interface Bookmark {
	/** Timeline position of the marker. */
	time: MediaTime;
	/** Optional note text attached to the marker. */
	note?: string;
	/** Optional display color for the marker. */
	color?: string;
	/** Optional span length of the marker. */
	duration?: MediaTime;
}

/** A scene containing a set of tracks, bookmarks, and metadata. */
export interface TScene {
	/** Unique scene identifier. */
	id: string;
	/** Human-readable scene name. */
	name: string;
	/** Whether this is the project's main scene. */
	isMain: boolean;
	/** Track groups belonging to the scene. */
	tracks: SceneTracks;
	/** Bookmarks placed within the scene. */
	bookmarks: Bookmark[];
	/** Scene creation timestamp. */
	createdAt: Date;
	/** Scene last-modified timestamp. */
	updatedAt: Date;
}

/** Discriminated union tag for the five track variants. */
export type TrackType = "video" | "text" | "audio" | "graphic" | "effect";

interface BaseTrack {
	/** Unique track identifier. */
	id: string;
	/** Human-readable track name. */
	name: string;
}

/** A video/image track holding visual media elements. */
export interface VideoTrack extends BaseTrack {
	/** Discriminator tag for video tracks. */
	type: "video";
	/** Video and image elements on the track. */
	elements: (VideoElement | ImageElement)[];
	/** Whether the track's audio is muted. */
	muted: boolean;
	/** Whether the track is hidden from output. */
	hidden: boolean;
}

/** A text overlay track. */
export interface TextTrack extends BaseTrack {
	/** Discriminator tag for text tracks. */
	type: "text";
	/** Text elements on the track. */
	elements: TextElement[];
	/** Whether the track is hidden from output. */
	hidden: boolean;
}

/** An audio track with audio waveform elements. */
export interface AudioTrack extends BaseTrack {
	/** Discriminator tag for audio tracks. */
	type: "audio";
	/** Audio elements on the track. */
	elements: AudioElement[];
	/** Whether the track is muted. */
	muted: boolean;
}

/** A track for stickers and parametric graphic elements. */
export interface GraphicTrack extends BaseTrack {
	/** Discriminator tag for graphic tracks. */
	type: "graphic";
	/** Sticker and graphic elements on the track. */
	elements: (StickerElement | GraphicElement)[];
	/** Whether the track is hidden from output. */
	hidden: boolean;
}

/** A track for GPU effect elements applied to visual layers. */
export interface EffectTrack extends BaseTrack {
	/** Discriminator tag for effect tracks. */
	type: "effect";
	/** Effect elements on the track. */
	elements: EffectElement[];
	/** Whether the track is hidden from output. */
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
	/** Stacked overlay tracks rendered above the main track. */
	overlay: OverlayTrack[];
	/** The primary base video track. */
	main: VideoTrack;
	/** Audio tracks in the scene. */
	audio: AudioTrack[];
}

/** Speed-ramping configuration for video and audio elements. */
export interface RetimeConfig {
	/** Playback speed multiplier. */
	rate: number;
	/** Whether to preserve original pitch when retiming. */
	maintainPitch?: boolean;
}

interface BaseAudioElement extends BaseTimelineElement {
	/** Discriminator tag for audio elements. */
	type: "audio";
	/** Decoded audio buffer, if loaded. */
	buffer?: AudioBuffer;
	/** Optional speed-retiming configuration. */
	retime?: RetimeConfig;
}

/** Audio element sourced from a user-uploaded media asset. */
export interface UploadAudioElement extends BaseAudioElement {
	/** Discriminator tag for uploaded audio sources. */
	sourceType: "upload";
	/** ID of the uploaded media asset. */
	mediaId: string;
}

/** Audio element sourced from the built-in library. */
export interface LibraryAudioElement extends BaseAudioElement {
	/** Discriminator tag for library audio sources. */
	sourceType: "library";
	/** URL of the library audio asset. */
	sourceUrl: string;
}

/** Union of all audio element variants on the timeline. */
export type AudioElement = UploadAudioElement | LibraryAudioElement;

/** Shared shape of every element on the timeline. */
interface BaseTimelineElement {
	/** Unique element identifier. */
	id: string;
	/** Human-readable element name. */
	name: string;
	/** Duration of the element on the timeline. */
	duration: MediaTime;
	/** Start position of the element on the timeline. */
	startTime: MediaTime;
	/** Trim offset from the source start. */
	trimStart: MediaTime;
	/** Trim offset from the source end. */
	trimEnd: MediaTime;
	/** Full duration of the underlying source, if known. */
	sourceDuration?: MediaTime;
	/** Keyframe animations applied to the element. */
	animations?: ElementAnimations;
	/** Parameter values driving the element's properties. */
	params: ParamValues;
}

/** A video clip element on the timeline. */
export interface VideoElement extends BaseTimelineElement {
	/** Discriminator tag for video elements. */
	type: "video";
	/** ID of the source media asset. */
	mediaId: string;
	/** Whether the clip's embedded audio is enabled. */
	isSourceAudioEnabled?: boolean;
	/** Whether the element is hidden from output. */
	hidden?: boolean;
	/** Optional speed-retiming configuration. */
	retime?: RetimeConfig;
	/** GPU effects applied to the element. */
	effects?: Effect[];
	/** Masks applied to the element. */
	masks?: Mask[];
}

/** A still-image element on the timeline. */
export interface ImageElement extends BaseTimelineElement {
	/** Discriminator tag for image elements. */
	type: "image";
	/** ID of the source media asset. */
	mediaId: string;
	/** Whether the element is hidden from output. */
	hidden?: boolean;
	/** GPU effects applied to the element. */
	effects?: Effect[];
	/** Masks applied to the element. */
	masks?: Mask[];
}

/** A text overlay element on the timeline. */
export interface TextElement extends BaseTimelineElement {
	/** Discriminator tag for text elements. */
	type: "text";
	/** Whether the element is hidden from output. */
	hidden?: boolean;
	/** GPU effects applied to the element. */
	effects?: Effect[];
}

/** A sticker element on the timeline. */
export interface StickerElement extends BaseTimelineElement {
	/** Discriminator tag for sticker elements. */
	type: "sticker";
	/** ID of the sticker asset. */
	stickerId: string;
	/** Natural dimensions of the sticker asset, stored at insert time. Used by renderer and preview bounds to avoid split-brain geometry. */
	intrinsicWidth?: number;
	/** Natural height of the sticker asset, stored at insert time. */
	intrinsicHeight?: number;
	/** Whether the element is hidden from output. */
	hidden?: boolean;
	/** GPU effects applied to the element. */
	effects?: Effect[];
}

/** A parametric graphic element on the timeline. */
export interface GraphicElement extends BaseTimelineElement {
	/** Discriminator tag for graphic elements. */
	type: "graphic";
	/** ID of the graphic definition. */
	definitionId: string;
	/** Whether the element is hidden from output. */
	hidden?: boolean;
	/** GPU effects applied to the element. */
	effects?: Effect[];
	/** Masks applied to the element. */
	masks?: Mask[];
}

/** A GPU effect element applied to the layer stack. */
export interface EffectElement extends BaseTimelineElement {
	/** Discriminator tag for effect elements. */
	type: "effect";
	/** Identifier of the GPU effect type. */
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
	/** Whether a drag is currently in progress. */
	isDragging: boolean;
	/** ID of the anchor element being dragged. */
	elementId: string | null;
	/** IDs of all elements included in the drag. */
	dragElementIds: string[];
	/** Per-element time offsets relative to the anchor. */
	dragTimeOffsets: Record<string, MediaTime>;
	/** ID of the track the drag started on. */
	trackId: string | null;
	/** Mouse X position at drag start. */
	startMouseX: number;
	/** Mouse Y position at drag start. */
	startMouseY: number;
	/** Anchor element's start time at drag start. */
	startElementTime: MediaTime;
	/** Time offset between click point and element start. */
	clickOffsetTime: MediaTime;
	/** Current time position of the drag. */
	currentTime: MediaTime;
	/** Current mouse Y position. */
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
	/** Index of the target track. */
	trackIndex: number;
	/** Whether the drop creates a new track. */
	isNewTrack: boolean;
	/** Position relative to an existing track when inserting. */
	insertPosition?: "above" | "below";
	/** Timeline position where the element would be placed. */
	xPosition: MediaTime;
	/** Target element the drop is anchored to, if any. */
	targetElement: { elementId: string; trackId: string } | null;
}

/** Parameters for computing a drop target during a drag operation. */
export interface ComputeDropTargetParams {
	/** Type of the element being dragged. */
	elementType: ElementType;
	/** Current mouse X position. */
	mouseX: number;
	/** Current mouse Y position. */
	mouseY: number;
	/** Track groups of the current scene. */
	tracks: SceneTracks;
	/** Current playhead time. */
	playheadTime: MediaTime;
	/** Whether the drop originates from outside the timeline. */
	isExternalDrop: boolean;
	/** Duration of the dragged element. */
	elementDuration: MediaTime;
	/** Horizontal scale in pixels per second. */
	pixelsPerSecond: number;
	/** Current timeline zoom level. */
	zoomLevel: number;
	/** Direction of vertical drag movement, if any. */
	verticalDragDirection?: "up" | "down" | null;
	/** Explicit start-time override for placement. */
	startTimeOverride?: MediaTime;
	/** Element ID to exclude from target computation. */
	excludeElementId?: string;
	/** Element types eligible as drop targets. */
	targetElementTypes?: string[];
}

/** A clipboard-ready snapshot of a timeline element. */
export interface ClipboardItem {
	/** ID of the source track. */
	trackId: string;
	/** Type of the source track. */
	trackType: TrackType;
	/** Snapshot of the copied element. */
	element: CreateTimelineElement;
}

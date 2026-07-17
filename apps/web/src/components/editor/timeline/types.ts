/**
 * @module Timeline type definitions — Core TypeScript interfaces and types for
 * timeline elements, tracks, keyframes, transitions, frame data, and project
 * serialization structures.
 */
export interface Position {
	/** Horizontal coordinate. */
	x: number;
	/** Vertical coordinate. */
	y: number;
}

/** Type definition for Size. */
export interface Size {
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
}

/** Type definition for Frame. */
export interface Frame {
	/** Horizontal position. */
	x?: number;
	/** Vertical position. */
	y?: number;
	/** Rotation angle in degrees. */
	rotation?: number;
	/** Width in pixels. */
	width?: number;
	/** Height in pixels. */
	height?: number;
	/** Size tuple [width, height] in pixels for image/video elements. */
	size?: [number, number];
}

/** Optional transition metadata on an element (e.g. crossfade to the next clip). */
export interface ElementTransitionJSON {
	/** Target element that this transition leads into. */
	toElementId: string;
	/** Transition length in seconds. */
	duration: number;
	/** Transition type discriminator. */
	kind: string;
}

// Element Types
export interface ElementJSON {
	/** Unique element identifier. */
	id: string;
	/** Element type discriminator. */
	type: string;
	/** Start time in seconds. */
	s: number;
	/** End time in seconds. */
	e: number;
	/** Text content for text elements. */
	t?: string;
	/** Position on the canvas. */
	position?: Position;
	/** Rotation angle in degrees. */
	rotation?: number;
	/** Opacity in range [0, 1]. */
	opacity?: number;
	/** Optional transition metadata. */
	transition?: ElementTransitionJSON;
	/** Arbitrary element-level metadata. */
	metadata?: ElementMetadata;
	/** Additional properties based on element type. */
	/** Extension properties keyed by attribute name. */
	[key: string]: any;
}

/** Type definition for TrackJSON. */
export interface TrackJSON {
	/** Unique track identifier. */
	id: string;
	/** Human-readable track name. */
	name: string;
	/** Track type discriminator for serialization. */
	type?: string;
	/** Language code for subtitle/audio tracks. */
	language?: string;
	/** Arbitrary track-level properties. */
	props?: Record<string, any>;
	/** Ordered child elements on this track. */
	elements: ElementJSON[];
}

/**
 * Lightweight asset descriptor that can be embedded in ProjectJSON to make
 * projects more portable across environments.
 *
 * This mirrors the core fields of the editor MediaItem/MediaAsset type but
 * intentionally omits heavy or provider-specific details.
 */
export interface ProjectAssetJSON {
	/** Stable asset id used by timeline elements (e.g. video/image/audio). */
	id: string;
	/** Logical media type (video, audio, image). */
	type: string;
	/** Primary render URL for this asset. */
	url: string;
	/** Optional preview image URL (thumbnail/poster frame). */
	previewUrl?: string;
	/** Optional duration in milliseconds for audio/video assets. */
	duration?: number;
	/** Pixel dimensions for image/video assets (if known). */
	width?: number;
	/** Pixel height for image/video assets (if known). */
	height?: number;
	/**
	 * Optional high-level source/origin hints.
	 * These are advisory only; renderers should rely primarily on `url`.
	 */
	source?: "user" | "public";
	/** Optional source URL or provider identifier for attribution. */
	origin?: string;
	/**
	 * Provider attribution hints for public assets.
	 * Useful for UI and export workflows that need to show credits.
	 */
	attribution?: {
		/** Attribution text line to display alongside the asset. */
		text?: string;
		/** Name of the asset author. */
		author?: string;
		/** URL to the author's profile or website. */
		authorUrl?: string;
		/** URL to the license terms for this asset. */
		licenseUrl?: string;
	};
}

/** Type definition for ProjectJSON. */
export interface ProjectJSON {
	/** Optional global watermark settings. */
	watermark?: WatermarkJSON;
	/** Background color of the canvas. */
	backgroundColor?: string;
	/** Top-level project metadata. */
	metadata?: ProjectMetadata;
	/**
	 * Optional portable asset manifest for this project.
	 *
	 * - Keys are assetIds referenced from element props (e.g. VideoProps.srcAssetId).
	 * - Values are lightweight asset descriptors that allow projects to be moved
	 *   between environments while still rendering correctly, even if the host
	 *   does not have a separate asset library backing store.
	 *
	 * Renderers and editors SHOULD gracefully handle the case where this is
	 * undefined (legacy projects) or partially populated.
	 */
	assets?: Record<string, ProjectAssetJSON>;
	/** Ordered list of tracks in the project. */
	tracks: TrackJSON[];
	/** Project schema version. */
	version: number;
}

/** Type definition for ChapterMarker. */
export interface ChapterMarker {
	/** Unique chapter identifier. */
	id: string;
	/** Chapter title. */
	title: string;
	/** Chapter start time in seconds. */
	time: number;
	/** Optional chapter description. */
	description?: string;
}

/** Type definition for ProjectMetadata. */
export interface ProjectMetadata {
	/** Project title. */
	title?: string;
	/** Project description. */
	description?: string;
	/** Searchable tags. */
	tags?: string[];
	/** Reference to a template this project was created from. */
	templateId?: string;
	/** Encoding or quality profile. */
	profile?: string;
	/** Chapter markers for navigation. */
	chapters?: ChapterMarker[];
	/** Arbitrary custom metadata. */
	custom?: Record<string, unknown>;
}

/** Type definition for ElementMetadata. */
export type ElementMetadata = Record<string, unknown>;

/** Type definition for WatermarkJSON. */
export interface WatermarkJSON {
	/** Unique watermark identifier. */
	id: string;
	/** Watermark kind: text or image overlay. */
	type: "text" | "image";
	/** Position on the canvas. */
	position?: Position;
	/** Rotation angle in degrees. */
	rotation?: number;
	/** Opacity in range [0, 1]. */
	opacity?: number;
	/** Type-specific rendering props. */
	props: TextProps | ImageProps;
}

// Props Types
export interface BaseMediaProps {
	/** Media source URL. */
	src: string;
	/** Seek time in seconds. */
	time?: number;
	/** Playback speed multiplier. */
	playbackRate?: number;
	/** Volume level [0, 1]. */
	volume?: number;
	/** Whether to autoplay on load. */
	autoPlay?: boolean;
	/** Whether to loop playback. */
	loop?: boolean;
	/** Whether audio is muted. */
	muted?: boolean;
	/** Whether native controls are visible. */
	controls?: boolean;
}

/** Type definition for VideoProps. */
export interface VideoProps extends BaseMediaProps {
	/** Rendered width in pixels. */
	width?: number;
	/** Rendered height in pixels. */
	height?: number;
	/** CSS filter string applied to the video. */
	mediaFilter?: string;
	/** Media source URL (overrides inherited field). */
	src: string;
	/** Seek time in seconds (overrides inherited field). */
	time?: number;
	/** Playback speed multiplier (overrides inherited field). */
	playbackRate?: number;
	/** Volume level [0, 1] (overrides inherited field). */
	volume?: number;
}

/** Type definition for AudioProps. */
export interface AudioProps extends BaseMediaProps {
	/** Media source URL (overrides inherited field). */
	src: string;
	/** Seek time in seconds (overrides inherited field). */
	time?: number;
	/** Playback speed multiplier (overrides inherited field). */
	playbackRate?: number;
	/** Volume level [0, 1] (overrides inherited field). */
	volume?: number;
	/** Whether to loop playback. */
	loop?: boolean;
}

/** Type definition for ImageProps. */
export interface ImageProps {
	/** Image source URL. */
	src: string;
	/** Rendered width in pixels. */
	width?: number;
	/** Rendered height in pixels. */
	height?: number;
	/** CSS object-fit mode. */
	objectFit?: ObjectFit;
	/** CSS filter string. */
	mediaFilter?: string;
}

/** Type definition for TextProps. */
export interface TextProps {
	/** Displayed text content. */
	text: string;
	/** Font size in points. */
	fontSize?: number;
	/** CSS font-family string. */
	fontFamily?: string;
	/** Text fill color. */
	fill?: string;
	/** Text stroke color. */
	stroke?: string;
	/** Drop shadow color. */
	shadowColor?: string;
	/** Shadow offset [x, y] in pixels. */
	shadowOffset?: number[];
	/** Shadow blur radius in pixels. */
	shadowBlur?: number;
	/** Shadow opacity [0, 1]. */
	shadowOpacity?: number;
	/** Stroke width in pixels. */
	strokeWidth?: number;
	/** Horizontal text alignment. */
	textAlign?: TextAlign;
	/** Background fill color behind the text. */
	backgroundColor?: string;
	/** Background opacity [0, 1]. */
	backgroundOpacity?: number;
	/** Font weight (100–900). */
	fontWeight?: number;
	/** Line width for outlines. */
	lineWidth?: number;
	/** Rotation angle in degrees. */
	rotation?: number;
	/** CSS font-style value. */
	fontStyle?: string;
}

/** Type definition for RectProps. */
export interface RectProps {
	/** Fill color. */
	fill: string;
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
	/** Corner radius in pixels. */
	radius: number;
	/** Optional outline color. */
	strokeColor?: string;
	/** Outline stroke width in pixels. */
	lineWidth?: number;
}

/** Type definition for CircleProps. */
export interface CircleProps {
	/** Fill color. */
	fill: string;
	/** Radius in pixels. */
	radius: number;
	/** Height in pixels. */
	height: number;
	/** Width in pixels. */
	width: number;
	/** Optional outline color. */
	strokeColor?: string;
	/** Outline stroke width in pixels. */
	lineWidth?: number;
}

/** Type definition for IconProps. */
export interface IconProps {
	/** Fill color. */
	fill: string;
	/** Icon size in pixels. */
	size?: number;
}

/** Type definition for EmojiProps. */
export interface EmojiProps extends ImageProps {
	/** Emoji character to render. */
	emoji: string;
}

/** Type definition for ArrowProps. */
export interface ArrowProps {
	/** Fill color. */
	fill: string;
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
	/** Outline stroke width in pixels. */
	lineWidth?: number;
}

/** Type definition for LineProps. */
export interface LineProps {
	/** Stroke/fill color for the line body */
	fill: string;
	/** Line length in pixels (mapped to width) */
	width: number;
	/** Line thickness in pixels (mapped to height) */
	height: number;
	/** Corner radius / rounded caps */
	radius?: number;
	/** Optional stroke width for outlines */
	lineWidth?: number;
}

// Effect Types
export interface TextEffect {
	/** Animation duration in seconds. */
	duration: number;
	/** Delay before the effect starts in seconds. */
	delay?: number;
	/** Buffer time in seconds for smooth transitions. */
	bufferTime?: number;
	/** Effect name for text effect deserialization. */
	name: string;
}

/** Type definition for FrameEffectProps. */
export interface FrameEffectProps {
	/** Size of the frame [width, height] in pixels. */
	frameSize: [number, number];
	/** Position of the frame on the canvas. */
	framePosition: Position;
	/** Corner radius of the frame in pixels. */
	radius?: number;
	/** Duration of the frame enter/exit transition. */
	transitionDuration?: number;
	/** CSS object-fit mode. */
	objectFit?: ObjectFit;
}

/** Type definition for FrameEffect. */
export interface FrameEffect {
	/** Start time in seconds. */
	s: number;
	/** End time in seconds. */
	e: number;
	/** Effect rendering properties. */
	props: FrameEffectProps;
}

/** Type definition for EffectProps. */
export interface EffectProps {
	/**
	 * Unique key identifying the effect in the GL effects catalog.
	 * This should map to an EffectKey in @twick/effects.
	 */
	effectKey: string;
	/**
	 * Overall effect intensity, typically in the range [0, 1].
	 * Renderers should clamp values into this range.
	 */
	intensity?: number;
}

// Animation Types
export interface Animation {
	/** Animation preset name. */
	name: string;
	/** Whether the animation applies on enter, exit, or both. */
	animate?: "enter" | "exit" | "both";
	/** Stagger interval between child animations. */
	interval?: number;
	/** Direction for slide/fade animations. */
	direction?: "up" | "down" | "left" | "right" | "center";
	/** Animation intensity [0, 1]. */
	intensity?: number;
	/** Playback mode: in or out. */
	mode?: "in" | "out";
	/** Animation duration in seconds. */
	duration?: number;
}

// Utility Types
export type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down";
/** Type definition for TextAlign. */
export type TextAlign = "left" | "center" | "right" | "justify";

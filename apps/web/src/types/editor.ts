/**
 * @module Shared editor type definitions — Project, Clip, Track, Keyframe,
 * Asset, and related UI display types consumed by EditorProvider and
 * EditorClient.
 */

/** Shared editor types — used by EditorProvider context and EditorClient. */

export interface Project {
	/** Unique project identifier. */
	id: string;
	/** Human-readable project name. */
	name: string;
	/** Canvas width in pixels. */
	width: number;
	/** Canvas height in pixels. */
	height: number;
	/** Frames per second. */
	fps: number;
	/** Total timeline duration in frames. */
	duration_frames: number;
	/** RGBA background color. */
	bg_color: [number, number, number, number];
	/** Ordered timeline tracks. */
	tracks: Track[];
	/** Serialised timeline viewport state. */
	timeline?: {
		/** Timeline content width in pixels. */
		width: number;
		/** Timeline content height in pixels. */
		height: number;
		/** Timeline frame rate. */
		framerate: number;
		/** Timeline track data. */
		tracks: Track[];
	};
	/** Navigable timeline position markers. */
	markers?: TimelineMarker[];
	/** Arbitrary project metadata. */
	data?: Record<string, unknown>;
	/** Creation timestamp. */
	createdAt?: string | Date;
	/** Last update timestamp. */
	updatedAt?: string | Date;
	// Display/settings fields used by EditorClient inspector
	/** Whether burn-in overlay is enabled. */
	burnInEnabled?: boolean;
	/** Burn-in overlay position preset. */
	burnInPosition?: string;
	/** Burn-in overlay font size preset. */
	burnInSize?: string;
	/** Whether hardware acceleration is enabled. */
	useHardwareAcceleration?: boolean;
	/** Whether smart render caching is active. */
	smartRenderCache?: boolean;
	/** Auto-save interval in seconds. */
	autoSaveInterval?: number;
	/** Whether to bypass all effects for preview. */
	bypassEffects?: boolean;
}

export interface Clip {
	/** Unique clip identifier. */
	id: string;
	/** Display name for the clip. */
	name?: string;
	/** Start frame on the timeline. */
	start_frame: number;
	/** Media source offset in frames. */
	media_offset_frames?: number;
	/** Clip duration in frames. */
	duration_frames: number;
	/** Clip media type. */
	type: string;
	/** Media source URL. */
	sourceUrl?: string;
	/** Arbitrary clip property overrides. */
	properties?: Record<string, unknown>;
	/** Keyframes for animated properties. */
	keyframes?: Keyframe[];
	/** Expression scripts bound to properties. */
	expressions?: Record<string, string>;
	/** Filter effect values keyed by filter name. */
	filters?: Record<string, number>;
	/** Spatial transform properties. */
	transform?: {
		/** Horizontal position. */
		x?: number;
		/** Vertical position. */
		y?: number;
		/** Uniform scale factor. */
		scale?: number;
		/** Rotation in degrees. */
		rotation?: number;
		/** Opacity from 0 to 1. */
		opacity?: number;
	};
	/** Audio volume level. */
	volume?: number;
	/** Audio stereo pan. */
	pan?: number;
	/** Crop region offsets. */
	crop?: Record<string, number>;
	/** Clip border radius. */
	border_radius?: number;
	/** Drop shadow parameters. */
	shadow?: {
		/** Shadow offset distance. */
		distance?: number;
		/** Shadow light angle. */
		angle?: number;
		/** Shadow blur radius. */
		blur?: number;
		/** RGBA shadow color. */
		color?: [number, number, number, number];
	};
	/** Director notes attached to the clip. */
	notes?: ClipNote[];
	/** Clip-local frame markers. */
	markers?: ClipMarker[];
	/** Whether the clip is hidden. */
	hidden?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	/** Arbitrary parameter overrides. */
	params?: Record<string, any>;
}

export interface Keyframe {
	/** Frame index of the keyframe. */
	frame: number;
	/** Animated property name. */
	property: string;
	/** Keyframe value at this frame. */
	value: number;
	/** Easing function for interpolation. */
	easing?:
		| "linear"
		| "ease-in"
		| "ease-out"
		| "ease-in-out"
		| "step"
		| "custom";
	/** Cubic bezier control points for custom easing. */
	bezierCurve?: [number, number, number, number];
}

export interface Track {
	/** Unique track identifier. */
	id: string;
	/** Display name for the track. */
	name: string;
	/** Track media type. */
	type: "video" | "audio" | "overlay";
	/** Z-index for layering order. */
	zIndex?: number;
	/** Ordered clips on this track. */
	clips: Clip[];
	/** Ordered timeline elements on this track. */
	elements: TimelineElement[];
}

export interface TimelineElement {
	/** Unique element identifier. */
	id: string;
	/** Start time on the timeline. */
	startTime: number;
	/** Element duration. */
	duration: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export interface Asset {
	/** Unique asset identifier. */
	id: string;
	/** Asset media type. */
	type: "video" | "audio" | "image";
	/** Display name. */
	name: string;
	/** Duration in frames. */
	duration_frames: number;
	/** Placeholder color. */
	color?: string;
	/** Source URL for the asset. */
	url?: string;
	/** Duration in seconds. */
	duration?: number;
	/** Source path or URL. */
	src?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	/** Decoded Web Audio buffer. */
	audioBuffer?: any;
}

export interface AgentEvent {
	/** Event type discriminator. */
	type: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	/** Event data payload. */
	payload?: Record<string, any>;
	/** Event timestamp. */
	timestamp?: number;
}

export interface TimelineMarker {
	/** Frame position of the marker. */
	frame: number;
	/** Marker label text. */
	label: string;
	/** Marker color. */
	color?: string;
	/** Unique marker identifier. */
	id?: string;
}

export interface ClipNote {
	/** Unique note identifier. */
	id: string;
	/** Frame at which the note is placed. */
	frame: number;
	/** Note text content. */
	text: string;
}

export interface ClipMarker {
	/** Frame offset from clip start. */
	frameOffset: number;
	/** Marker label text. */
	label: string;
	/** Marker color. */
	color?: string;
}

// ─── UI / Display types ───

export type ScopeType = "parade" | "vectorscope" | "waveform";

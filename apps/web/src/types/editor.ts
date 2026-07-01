/**
 * @module Shared editor type definitions — Project, Clip, Track, Keyframe,
 * Asset, and related UI display types consumed by EditorProvider and
 * EditorClient.
 */

/** Shared editor types — used by EditorProvider context and EditorClient. */

export interface Project {
	id: string;
	name: string;
	width: number;
	height: number;
	fps: number;
	duration_frames: number;
	bg_color: [number, number, number, number];
	tracks: Track[];
	timeline?: {
		width: number;
		height: number;
		framerate: number;
		tracks: Track[];
	};
	markers?: TimelineMarker[];
	data?: Record<string, unknown>;
	createdAt?: string | Date;
	updatedAt?: string | Date;
	// Display/settings fields used by EditorClient inspector
	burnInEnabled?: boolean;
	burnInPosition?: string;
	burnInSize?: string;
	useHardwareAcceleration?: boolean;
	smartRenderCache?: boolean;
	autoSaveInterval?: number;
	bypassEffects?: boolean;
}

export interface Clip {
	id: string;
	name?: string;
	start_frame: number;
	media_offset_frames?: number;
	duration_frames: number;
	type: string;
	sourceUrl?: string;
	properties?: Record<string, unknown>;
	keyframes?: Keyframe[];
	expressions?: Record<string, string>;
	filters?: Record<string, number>;
	transform?: {
		x?: number;
		y?: number;
		scale?: number;
		rotation?: number;
		opacity?: number;
	};
	volume?: number;
	pan?: number;
	crop?: Record<string, number>;
	border_radius?: number;
	shadow?: {
		distance?: number;
		angle?: number;
		blur?: number;
		color?: [number, number, number, number];
	};
	notes?: ClipNote[];
	markers?: ClipMarker[];
	hidden?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	params?: Record<string, any>;
}

export interface Keyframe {
	frame: number;
	property: string;
	value: number;
	easing?:
		| "linear"
		| "ease-in"
		| "ease-out"
		| "ease-in-out"
		| "step"
		| "custom";
	bezierCurve?: [number, number, number, number];
}

export interface Track {
	id: string;
	name: string;
	type: "video" | "audio" | "overlay";
	zIndex?: number;
	clips: Clip[];
	elements: TimelineElement[];
}

export interface TimelineElement {
	id: string;
	startTime: number;
	duration: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
}

export interface Asset {
	id: string;
	type: "video" | "audio" | "image";
	name: string;
	duration_frames: number;
	color?: string;
	url?: string;
	duration?: number;
	src?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	audioBuffer?: any;
}

export interface AgentEvent {
	type: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	payload?: Record<string, any>;
	timestamp?: number;
}

export interface TimelineMarker {
	frame: number;
	label: string;
	color?: string;
	id?: string;
}

export interface ClipNote {
	id: string;
	frame: number;
	text: string;
}

export interface ClipMarker {
	frameOffset: number;
	label: string;
	color?: string;
}

// ─── UI / Display types ───

export type ScopeType = "parade" | "vectorscope" | "waveform";

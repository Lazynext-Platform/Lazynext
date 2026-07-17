/**
 * Core project type definitions for the NLE.
 *
 * Covers project metadata, settings, timeline view state, and the
 * top-level TProject structure that is serialized to the database.
 *
 * @module project/types
 */

import type { FrameRate } from "lazynext-wasm";
import type { TScene } from "@/timeline/types";
import type { MediaTime } from "@/wasm";

/** Type definition for TBackground. */
export type TBackground =
	| {
			type: "color";
			color: string;
	  }
	| {
			type: "blur";
			blurIntensity: number;
	  };

/** Type definition for TCanvasSize. */
export interface TCanvasSize {
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
}

/** Type definition for TProjectMetadata. */
export interface TProjectMetadata {
	/** Unique project identifier. */
	id: string;
	/** Human-readable project name. */
	name: string;
	/** Thumbnail image URL. */
	thumbnail?: string;
	/** Total project duration in media time. */
	duration: MediaTime;
	/** Project creation date. */
	createdAt: Date;
	/** Last modification date. */
	updatedAt: Date;
}

/** Type definition for TProjectSettings. */
export interface TProjectSettings {
	/** Frames per second. */
	fps: FrameRate;
	/** Canvas dimensions in pixels. */
	canvasSize: TCanvasSize;
	/** How the canvas size was determined. */
	canvasSizeMode?: "preset" | "custom";
	/** Most recent custom canvas size. */
	lastCustomCanvasSize?: TCanvasSize | null;
	/** Original canvas size before any resize. */
	originalCanvasSize?: TCanvasSize | null;
	/** Background style configuration. */
	background: TBackground;
}

/** Type definition for TTimelineViewState. */
export interface TTimelineViewState {
	/** Current zoom level. */
	zoomLevel: number;
	/** Horizontal scroll position in pixels. */
	scrollLeft: number;
	/** Playhead time in media time. */
	playheadTime: MediaTime;
}

/** Type definition for TProject. */
export interface TProject {
	/** Project metadata. */
	metadata: TProjectMetadata;
	/** Ordered array of scenes. */
	scenes: TScene[];
	/** ID of the currently active scene. */
	currentSceneId: string;
	/** Project-level settings. */
	settings: TProjectSettings;
	/** Data schema version. */
	version: number;
	/** Persisted timeline viewport state. */
	timelineViewState?: TTimelineViewState;
}

/** Type definition for TProjectSortKey. */
export type TProjectSortKey = "createdAt" | "updatedAt" | "name" | "duration";
/** Type definition for TSortOrder. */
export type TSortOrder = "asc" | "desc";
/** Type definition for TProjectSortOption. */
export type TProjectSortOption = `${TProjectSortKey}-${TSortOrder}`;

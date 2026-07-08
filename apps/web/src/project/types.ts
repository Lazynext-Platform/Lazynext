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

export type TBackground =
	| {
			type: "color";
			color: string;
	  }
	| {
			type: "blur";
			blurIntensity: number;
	  };

export interface TCanvasSize {
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
}

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

export interface TTimelineViewState {
	/** Current zoom level. */
	zoomLevel: number;
	/** Horizontal scroll position in pixels. */
	scrollLeft: number;
	/** Playhead time in media time. */
	playheadTime: MediaTime;
}

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

export type TProjectSortKey = "createdAt" | "updatedAt" | "name" | "duration";
export type TSortOrder = "asc" | "desc";
export type TProjectSortOption = `${TProjectSortKey}-${TSortOrder}`;

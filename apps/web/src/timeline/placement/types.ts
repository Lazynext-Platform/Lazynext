/**
 * Placement engine types — time spans, strategies, and resolved results
 * for positioning elements on (or creating) timeline tracks.
 *
 * @module timeline/placement/types
 */

import type { ElementType, TrackType } from "@/timeline";
import type { MediaTime } from "@/wasm";

/** A contiguous time range an element should occupy on the timeline. */
export interface PlacementTimeSpan {
	startTime: MediaTime;
	duration: MediaTime;
	excludeElementId?: string;
}

/** Either an element type or track type — what's being placed. */
export type PlacementSubject =
	| { elementType: ElementType }
	| { trackType: TrackType };

/** Strategy for choosing which track an element lands on. */
export type PlacementStrategy =
	| { type: "explicit"; trackId: string }
	| { type: "firstAvailable" }
	| {
			type: "preferIndex";
			trackIndex: number;
			hoverDirection: "above" | "below";
			verticalDragDirection?: "up" | "down" | null;
			createNewTrackOnly?: boolean;
	  }
	| { type: "aboveSource"; sourceTrackIndex: number }
	| { type: "alwaysNew"; position: "highest" | "default" };

/** Resolved location where an element should be placed. */
export type PlacementResult =
	| {
			kind: "existingTrack";
			trackId: string;
			trackIndex: number;
			trackType: TrackType;
			adjustedStartTime?: MediaTime;
	  }
	| {
			kind: "newTrack";
			insertIndex: number;
			insertPosition?: "above" | "below";
			trackType: TrackType;
	  };

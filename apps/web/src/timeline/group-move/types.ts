/**
 * Group move types — move group members, planned moves, track
 * creation entries, and resolved move results.
 *
 * @module timeline/group-move/types
 */

import type { ElementRef, ElementType, TrackType } from "@/timeline";
import type { MediaTime } from "@/wasm";

/** Type definition for GroupTrackSection. */
export type GroupTrackSection = "overlay" | "main" | "audio";

/** Type definition for GroupMember. */
export interface GroupMember extends ElementRef {
	/** Element type discriminator. */
	elementType: ElementType;
	/** Element duration in media time. */
	duration: MediaTime;
	/** Time offset from the anchor element. */
	timeOffset: MediaTime;
	/** Which section of the track layout this belongs to. */
	trackSection: GroupTrackSection;
	/** Index within the section. */
	sectionIndex: number;
	/** Visual display ordering index. */
	displayIndex: number;
}

/** Type definition for MoveGroup. */
export interface MoveGroup {
	/** Anchor member used for position calculations. */
	anchor: GroupMember;
	/** All members in the move group. */
	members: GroupMember[];
}

/** Type definition for PlannedTrackCreation. */
export interface PlannedTrackCreation {
	/** ID for the new track. */
	id: string;
	/** Track type. */
	type: TrackType;
	/** Insertion index in the track list. */
	index: number;
}

/** Type definition for PlannedElementMove. */
export interface PlannedElementMove {
	/** ID of the source track. */
	sourceTrackId: string;
	/** ID of the target track. */
	targetTrackId: string;
	/** ID of the element being moved. */
	elementId: string;
	/** New start time on the target track. */
	newStartTime: MediaTime;
}

/** Type definition for GroupMoveResult. */
export interface GroupMoveResult {
	/** Resolved element moves. */
	moves: PlannedElementMove[];
	/** Tracks that need to be created. */
	createTracks: PlannedTrackCreation[];
	/** Elements that should be selected after the move. */
	targetSelection: ElementRef[];
}

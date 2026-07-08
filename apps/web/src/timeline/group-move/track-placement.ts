/**
 * Track placement helpers — maps track IDs and display indices to
 * {@link TrackPlacement} descriptors for group-move resolution.
 *
 * @module timeline/group-move/track-placement
 */

import type { SceneTracks, TimelineTrack } from "@/timeline";
import type { GroupTrackSection } from "./types";

/** Describes a track's position in the display order and section. */
export interface TrackPlacement {
	/** Track identifier. */
	trackId: string;
	/** Type of the track. */
	trackType: TimelineTrack["type"];
	/** Section the track belongs to. */
	section: GroupTrackSection;
	/** Index within the track's section. */
	sectionIndex: number;
	/** Index in the overall display order. */
	displayIndex: number;
}

/** Returns tracks in display order: overlays, main, then audio. */
export function getDisplayTracks({
	tracks,
}: {
	tracks: SceneTracks;
}): TimelineTrack[] {
	return [...tracks.overlay, tracks.main, ...tracks.audio];
}

/** Resolves a track ID to its placement in the display order. */
export function getTrackPlacementById({
	tracks,
	trackId,
}: {
	tracks: SceneTracks;
	trackId: string;
}): TrackPlacement | null {
	if (tracks.main.id === trackId) {
		return {
			trackId,
			trackType: tracks.main.type,
			section: "main",
			sectionIndex: -1,
			displayIndex: tracks.overlay.length,
		};
	}

	const overlayTrackIndex = tracks.overlay.findIndex(
		(track) => track.id === trackId,
	);
	if (overlayTrackIndex >= 0) {
		return {
			trackId,
			trackType: tracks.overlay[overlayTrackIndex].type,
			section: "overlay",
			sectionIndex: overlayTrackIndex,
			displayIndex: overlayTrackIndex,
		};
	}

	const audioTrackIndex = tracks.audio.findIndex(
		(track) => track.id === trackId,
	);
	if (audioTrackIndex >= 0) {
		return {
			trackId,
			trackType: tracks.audio[audioTrackIndex].type,
			section: "audio",
			sectionIndex: audioTrackIndex,
			displayIndex: tracks.overlay.length + 1 + audioTrackIndex,
		};
	}

	return null;
}

/** Resolves a display index to its track placement. */
export function getTrackPlacementByDisplayIndex({
	tracks,
	displayIndex,
}: {
	tracks: SceneTracks;
	displayIndex: number;
}): TrackPlacement | null {
	const displayTracks = getDisplayTracks({ tracks });
	const track = displayTracks[displayIndex];
	if (!track) {
		return null;
	}

	return getTrackPlacementById({
		tracks,
		trackId: track.id,
	});
}

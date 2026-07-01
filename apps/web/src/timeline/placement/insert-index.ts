/**
 * Insert-index helpers for placing new tracks within the overlay/audio
 * ordering, respecting the main track position.
 *
 * @module timeline/placement/insert-index
 */

import type { SceneTracks, TrackType } from "@/timeline";

/**
 * Returns the default insert index for a new track of the given type.
 */
export function getDefaultInsertIndexForTrack({
	tracks,
	trackType,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
}): number {
	if (trackType === "audio") {
		return tracks.overlay.length + 1 + tracks.audio.length;
	}

	if (trackType === "effect") {
		return 0;
	}

	return tracks.overlay.length;
}

/**
 * Returns the highest (farthest right) insert index for a new track.
 */
export function getHighestInsertIndexForTrack({
	tracks,
	trackType,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
}): number {
	if (trackType === "audio") {
		return tracks.overlay.length + 1;
	}

	return 0;
}

/**
 * Resolves the insert index and position (above/below) for a new track,
 * keeping audio tracks always below the main track.
 */
export function resolvePreferredNewTrackPlacement({
	tracks,
	trackType,
	preferredIndex,
	direction,
}: {
	tracks: SceneTracks;
	trackType: TrackType;
	preferredIndex: number;
	direction: "above" | "below";
}): { insertIndex: number; insertPosition: "above" | "below" | null } {
	const trackCount = tracks.overlay.length + 1 + tracks.audio.length;
	if (trackCount === 0) {
		return {
			insertIndex: 0,
			insertPosition: trackType === "audio" ? "below" : null,
		};
	}

	const safePreferredIndex = Math.min(
		Math.max(preferredIndex, 0),
		trackCount - 1,
	);
	const mainTrackIndex = tracks.overlay.length;

	if (trackType === "audio") {
		if (safePreferredIndex <= mainTrackIndex) {
			return {
				insertIndex: mainTrackIndex + 1,
				insertPosition: "below",
			};
		}

		return {
			insertIndex:
				direction === "above" ? safePreferredIndex : safePreferredIndex + 1,
			insertPosition: direction,
		};
	}

	const insertIndex =
		direction === "above" ? safePreferredIndex : safePreferredIndex + 1;
	if (mainTrackIndex >= 0 && insertIndex > mainTrackIndex) {
		return {
			insertIndex: mainTrackIndex,
			insertPosition: "above",
		};
	}

	return {
		insertIndex,
		insertPosition: direction,
	};
}

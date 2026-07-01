/**
 * Immutable helpers for updating tracks and elements within
 * {@link SceneTracks}.
 *
 * @module timeline/track-element-update
 */

import type { SceneTracks, TimelineElement, TimelineTrack } from "@/timeline";

/**
 * Finds a track by ID within a scene's track collection.
 *
 * @returns the matching track or null if not found.
 */
export function findTrackInSceneTracks({
	tracks,
	trackId,
}: {
	tracks: SceneTracks;
	trackId: string;
}): TimelineTrack | null {
	if (tracks.main.id === trackId) {
		return tracks.main;
	}

	return (
		tracks.overlay.find((track) => track.id === trackId) ??
		tracks.audio.find((track) => track.id === trackId) ??
		null
	);
}

/**
 * Applies an immutable update to the track identified by `trackId`,
 * returning a new SceneTracks with the updated track.
 */
export function updateTrackInSceneTracks({
	tracks,
	trackId,
	update,
}: {
	tracks: SceneTracks;
	trackId: string;
	update: <TTrack extends TimelineTrack>(track: TTrack) => TTrack;
}): SceneTracks {
	if (tracks.main.id === trackId) {
		return {
			...tracks,
			main: update(tracks.main),
		};
	}

	const overlayTrackIndex = tracks.overlay.findIndex(
		(track) => track.id === trackId,
	);
	if (overlayTrackIndex >= 0) {
		return {
			...tracks,
			overlay: tracks.overlay.map((track, index) =>
				index === overlayTrackIndex ? update(track) : track,
			),
		};
	}

	const audioTrackIndex = tracks.audio.findIndex(
		(track) => track.id === trackId,
	);
	if (audioTrackIndex >= 0) {
		return {
			...tracks,
			audio: tracks.audio.map((track, index) =>
				index === audioTrackIndex ? update(track) : track,
			),
		};
	}

	return tracks;
}

function updateElementInTrack<TTrack extends TimelineTrack>({
	track,
	elementId,
	update,
	elementPredicate,
}: {
	track: TTrack;
	elementId: string;
	update: (element: TimelineElement) => TimelineElement;
	elementPredicate?: (element: TimelineElement) => boolean;
}): TTrack {
	const nextElements = track.elements.map((element) => {
		if (element.id !== elementId) {
			return element;
		}
		if (elementPredicate && !elementPredicate(element)) {
			return element;
		}
		return update(element);
	});

	return {
		...track,
		elements: nextElements,
	} as TTrack;
}

/**
 * Finds the element by ID within the given track and applies an
 * immutable update, returning new SceneTracks. An optional predicate
 * can gate whether the update is applied.
 */
export function updateElementInSceneTracks({
	tracks,
	trackId,
	elementId,
	update,
	elementPredicate,
}: {
	tracks: SceneTracks;
	trackId: string;
	elementId: string;
	update: (element: TimelineElement) => TimelineElement;
	elementPredicate?: (element: TimelineElement) => boolean;
}): SceneTracks {
	if (tracks.main.id === trackId) {
		return {
			...tracks,
			main: updateElementInTrack({
				track: tracks.main,
				elementId,
				update,
				elementPredicate,
			}),
		};
	}

	const overlayTrackIndex = tracks.overlay.findIndex(
		(track) => track.id === trackId,
	);
	if (overlayTrackIndex >= 0) {
		return {
			...tracks,
			overlay: tracks.overlay.map((track, index) =>
				index === overlayTrackIndex
					? updateElementInTrack({
							track,
							elementId,
							update,
							elementPredicate,
						})
					: track,
			),
		};
	}

	const audioTrackIndex = tracks.audio.findIndex(
		(track) => track.id === trackId,
	);
	if (audioTrackIndex >= 0) {
		return {
			...tracks,
			audio: tracks.audio.map((track, index) =>
				index === audioTrackIndex
					? updateElementInTrack({
							track,
							elementId,
							update,
							elementPredicate,
						})
					: track,
			),
		};
	}

	return tracks;
}

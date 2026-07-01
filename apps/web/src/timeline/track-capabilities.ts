/**
 * Track capability checks used by UI controls (mute, hide, solo).
 *
 * @module timeline/track-capabilities
 */

import type {
	TimelineTrack,
	VideoTrack,
	AudioTrack,
	GraphicTrack,
	TextTrack,
	EffectTrack,
} from "@/timeline";

/**
 * Type predicate: returns `true` if the track supports audio controls.
 *
 * @param track - the timeline track to inspect.
 * @returns `true` for video and audio tracks.
 */
export function canTrackHaveAudio(
	track: TimelineTrack,
): track is VideoTrack | AudioTrack {
	return track.type === "audio" || track.type === "video";
}

/**
 * Type predicate: returns `true` if the track can be hidden.
 *
 * @param track - the timeline track to inspect.
 * @returns `true` for all track types except audio.
 */
export function canTrackBeHidden(
	track: TimelineTrack,
): track is VideoTrack | TextTrack | GraphicTrack | EffectTrack {
	return track.type !== "audio";
}

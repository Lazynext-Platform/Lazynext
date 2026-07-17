/**
 * Track factory — creates empty tracks of each type with default settings.
 *
 * @module timeline/placement/track-factory
 */

import { DEFAULT_TRACK_NAMES } from "@/timeline/tracks";
import type {
	AudioTrack,
	EffectTrack,
	GraphicTrack,
	TextTrack,
	TrackType,
	TimelineTrack,
	VideoTrack,
} from "@/timeline";

/** Utility representing buildEmptyTrack. */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: "video";
	name?: string;
}): VideoTrack;
/** Utility representing buildEmptyTrack. */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: "text";
	name?: string;
}): TextTrack;
/** Utility representing buildEmptyTrack. */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: "audio";
	name?: string;
}): AudioTrack;
/** Utility representing buildEmptyTrack. */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: "graphic";
	name?: string;
}): GraphicTrack;
/** Utility representing buildEmptyTrack. */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: "effect";
	name?: string;
}): EffectTrack;

/** Utility representing buildEmptyTrack. */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: TrackType;
	name?: string;
}): TimelineTrack;
/**
 * Creates a new empty track of the given type with no elements.
 * Overloads provide type-narrowed return types for each track variant.
 */
export function buildEmptyTrack({
	id,
	type,
	name,
}: {
	id: string;
	type: TrackType;
	name?: string;
}): TimelineTrack {
	const trackName = name ?? DEFAULT_TRACK_NAMES[type];

	switch (type) {
		case "video":
			return {
				id,
				name: trackName,
				type: "video",
				elements: [],
				hidden: false,
				muted: false,
			};
		case "text":
			return {
				id,
				name: trackName,
				type: "text",
				elements: [],
				hidden: false,
			};
		case "graphic":
			return {
				id,
				name: trackName,
				type: "graphic",
				elements: [],
				hidden: false,
			};
		case "audio":
			return {
				id,
				name: trackName,
				type: "audio",
				elements: [],
				muted: false,
			};
		case "effect":
			return {
				id,
				name: trackName,
				type: "effect",
				elements: [],
				hidden: false,
			};
		default:
			throw new Error(`Unsupported track type: ${type}`);
	}
}

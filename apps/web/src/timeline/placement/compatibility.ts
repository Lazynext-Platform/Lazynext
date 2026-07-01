/**
 * Element↔track compatibility checks and validation.
 *
 * Maps element types to track types and provides predicates for
 * determining whether an element can be placed on a given track.
 *
 * @module timeline/placement/compatibility
 */

import type { ElementType, TrackType } from "@/timeline";

const ELEMENT_TRACK_MAP: Record<ElementType, TrackType> = {
	audio: "audio",
	text: "text",
	sticker: "graphic",
	graphic: "graphic",
	effect: "effect",
	video: "video",
	image: "video",
};

/**
 * Returns the track type that accommodates the given element type.
 */
export function getTrackTypeForElementType({
	elementType,
}: {
	elementType: ElementType;
}): TrackType {
	return ELEMENT_TRACK_MAP[elementType];
}

/**
 * Returns `true` if the element type can be placed on the given track type.
 */
export function canElementGoOnTrack({
	elementType,
	trackType,
}: {
	elementType: ElementType;
	trackType: TrackType;
}): boolean {
	return getTrackTypeForElementType({ elementType }) === trackType;
}

/**
 * Validates element/track compatibility, returning an error message
 * when incompatible.
 */
export function validateElementTrackCompatibility({
	element,
	track,
}: {
	element: { type: ElementType };
	track: { type: TrackType };
}): { isValid: boolean; errorMessage?: string } {
	const isValid = canElementGoOnTrack({
		elementType: element.type,
		trackType: track.type,
	});

	if (!isValid) {
		return {
			isValid: false,
			errorMessage: `${element.type} elements cannot be placed on ${track.type} tracks`,
		};
	}

	return { isValid: true };
}

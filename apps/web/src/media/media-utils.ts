/**
 * Media utility helpers — audio support checks and MIME-type-based media
 * type inference from browser File objects.
 *
 * @module media/media-utils
 */

import type { MediaAsset, MediaType } from "@/media/types";

export const SUPPORTS_AUDIO: readonly MediaType[] = ["audio", "video"];

/** Returns true if the media asset type supports an audio track. */
export function mediaSupportsAudio({


	media,
}: {
	media: MediaAsset | null | undefined;
}): boolean {
	if (!media) return false;
	return SUPPORTS_AUDIO.includes(media.type);
}

/** Infers a MediaType from the MIME type of a browser File, returning null for unsupported types. */
export const getMediaTypeFromFile = ({
	file,
}: {
	file: File;
}): MediaType | null => {
	const { type } = file;

	if (type.startsWith("image/")) {
		return "image";
	}
	if (type.startsWith("video/")) {
		return "video";
	}
	if (type.startsWith("audio/")) {
		return "audio";
	}

	return null;
};

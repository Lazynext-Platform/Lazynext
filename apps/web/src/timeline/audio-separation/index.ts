/**
 * Source audio separation — extract, recover, and toggle audio from
 * video elements as independent audio tracks.
 *
 * @module timeline/audio-separation
 */

import { cloneAnimations } from "@/animation";
import type { ElementAnimations } from "@/animation/types";
import type { MediaAsset } from "@/media/types";
import { DEFAULTS } from "@/timeline/defaults";
import type {
	CreateUploadAudioElement,
	TimelineElement,
	AudioElement,
	VideoElement,
} from "../types";

type MediaAudioState = Pick<MediaAsset, "hasAudio">;

/** Returns `true` if the source audio is still embedded in the video element. */
export function isSourceAudioEnabled({
	element,
}: {
	element: VideoElement;
}): boolean {
	return element.isSourceAudioEnabled !== false;
}

/** Returns `true` if the source audio has been extracted from the video. */
export function isSourceAudioSeparated({
	element,
}: {
	element: VideoElement;
}): boolean {
	return !isSourceAudioEnabled({ element });
}

/** Type predicate: video element with source audio that can be extracted. */
export function canExtractSourceAudio(
	element: TimelineElement,
	mediaAsset: MediaAudioState | null | undefined,
): element is VideoElement {
	return (
		element.type === "video" &&
		isSourceAudioEnabled({ element }) &&
		!!mediaAsset &&
		mediaAsset.hasAudio !== false
	);
}

/** Type predicate: video element whose audio was previously extracted. */
export function canRecoverSourceAudio(
	element: TimelineElement,
): element is VideoElement {
	return element.type === "video" && isSourceAudioSeparated({ element });
}

/** Type predicate: video element whose source audio can be toggled. */
export function canToggleSourceAudio(
	element: TimelineElement,
	mediaAsset: MediaAudioState | null | undefined,
): element is VideoElement {
	return (
		canRecoverSourceAudio(element) || canExtractSourceAudio(element, mediaAsset)
	);
}

/** Returns `true` if the element has currently enabled audio. */
export function doesElementHaveEnabledAudio({
	element,
	mediaAsset,
}: {
	element: AudioElement | VideoElement;
	mediaAsset?: MediaAudioState | null;
}): boolean {
	if (element.type === "audio") {
		return true;
	}

	return (
		!!mediaAsset &&
		mediaAsset.hasAudio !== false &&
		isSourceAudioEnabled({ element })
	);
}

/**
 * Builds a standalone audio element cloned from a video element's
 * source audio, copying trim, retime, and volume animation keyframes.
 */
export function buildSeparatedAudioElement({
	sourceElement,
}: {
	sourceElement: VideoElement;
}): CreateUploadAudioElement {
	return {
		type: "audio",
		sourceType: "upload",
		mediaId: sourceElement.mediaId,
		name: sourceElement.name,
		duration: sourceElement.duration,
		startTime: sourceElement.startTime,
		trimStart: sourceElement.trimStart,
		trimEnd: sourceElement.trimEnd,
		sourceDuration: sourceElement.sourceDuration,
		params: {
			volume:
				typeof sourceElement.params.volume === "number"
					? sourceElement.params.volume
					: DEFAULTS.element.volume,
			muted: sourceElement.params.muted === true,
		},
		retime: sourceElement.retime
			? {
					rate: sourceElement.retime.rate,
					maintainPitch: sourceElement.retime.maintainPitch,
				}
			: undefined,
		animations: cloneVolumeAnimations({
			animations: sourceElement.animations,
		}),
	};
}

/** Returns the label to show on the source-audio toggle button. */
export function getSourceAudioActionLabel({
	element,
}: {
	element: VideoElement;
}): "Extract audio" | "Recover audio" {
	return isSourceAudioSeparated({ element })
		? "Recover audio"
		: "Extract audio";
}

function cloneVolumeAnimations({
	animations,
}: {
	animations: ElementAnimations | undefined;
}): ElementAnimations | undefined {
	const volumeData = animations?.volume;
	if (!volumeData) {
		return undefined;
	}

	return cloneAnimations({
		animations: { volume: volumeData },
		shouldRegenerateKeyframeIds: true,
	});
}

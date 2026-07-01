/**
 * Element utility functions — type predicates, element factory builders,
 * and query helpers for timeline tracks.
 *
 * @module timeline/element-utils
 */

import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import {
	MASKABLE_ELEMENT_TYPES,
	RETIMABLE_ELEMENT_TYPES,
	VISUAL_ELEMENT_TYPES,
	type CreateEffectElement,
	type CreateGraphicElement,
	type CreateTimelineElement,
	type CreateVideoElement,
	type CreateImageElement,
	type CreateStickerElement,
	type CreateUploadAudioElement,
	type CreateLibraryAudioElement,
	type TextElement,
	type SceneTracks,
	type TimelineElement,
	type AudioElement,
	type VideoElement,
	type ImageElement,
	type MaskableElement,
	type RetimableElement,
	type VisualElement,
	type UploadAudioElement,
} from "@/timeline";
import { DEFAULTS } from "@/timeline/defaults";
import type { MediaType } from "@/media/types";
import { buildDefaultEffectInstance } from "@/effects";
import { buildDefaultGraphicInstance } from "@/graphics";
import type { ParamValues } from "@/params";
import {
	buildDefaultParamValues,
	getBuiltInElementParams,
} from "@/params/registry";
import { capitalizeFirstLetter } from "@/utils/string";
import { type MediaTime, ZERO_MEDIA_TIME } from "@/wasm";

/** Type predicate for elements that carry audio (audio or video). */
export function canElementHaveAudio(
	element: TimelineElement,
): element is AudioElement | VideoElement {
	return element.type === "audio" || element.type === "video";
}

/** Type predicate for elements that render visually on the compositor. */
export function isVisualElement(
	element: TimelineElement,
): element is VisualElement {
	return (VISUAL_ELEMENT_TYPES as readonly string[]).includes(element.type);
}

/** Type predicate for elements that can have masks applied. */
export function isMaskableElement(
	element: TimelineElement,
): element is MaskableElement {
	return (MASKABLE_ELEMENT_TYPES as readonly string[]).includes(element.type);
}

/** Type predicate for elements that support speed retiming. */
export function isRetimableElement(
	element: TimelineElement,
): element is RetimableElement {
	return (RETIMABLE_ELEMENT_TYPES as readonly string[]).includes(element.type);
}

/** Type predicate for elements that can be hidden on the timeline. */
export function canElementBeHidden(
	element: TimelineElement,
): element is VisualElement {
	return isVisualElement(element);
}

/** Returns `true` if the visual element has at least one attached effect. */
export function hasElementEffects({
	element,
}: {
	element: TimelineElement;
}): boolean {
	return isVisualElement(element) && (element.effects?.length ?? 0) > 0;
}

/** Type predicate for elements backed by a media asset ID. */
export function hasMediaId(
	element: TimelineElement,
): element is UploadAudioElement | VideoElement | ImageElement {
	return "mediaId" in element;
}

/** Returns `true` if the element creation shape requires a media ID. */
export function requiresMediaId({
	element,
}: {
	element: CreateTimelineElement;
}): boolean {
	return (
		element.type === "video" ||
		element.type === "image" ||
		(element.type === "audio" && element.sourceType === "upload")
	);
}

function buildDefaultElementParams({
	type,
}: {
	type: TimelineElement["type"];
}): ParamValues {
	return buildDefaultParamValues(getBuiltInElementParams({ type }));
}

/**
 * Builds a text element creation shape from partial data, filling in
 * defaults for missing fields.
 */
export function buildTextElement({
	raw,
	startTime,
}: {
	raw: Partial<Omit<TextElement, "type" | "id">>;
	startTime: MediaTime;
}): CreateTimelineElement {
	const t = raw as Partial<TextElement>;

	return {
		type: "text",
		name: t.name ?? DEFAULTS.text.element.name,
		duration: t.duration ?? DEFAULT_NEW_ELEMENT_DURATION,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		params: {
			...buildDefaultElementParams({ type: "text" }),
			...(t.params ?? {}),
		},
	};
}

/**
 * Builds a new effect element from a registered effect type, with
 * default params and duration.
 */
export function buildEffectElement({
	effectType,
	startTime,
	duration,
}: {
	effectType: string;
	startTime: MediaTime;
	duration?: MediaTime;
}): CreateEffectElement {
	const instance = buildDefaultEffectInstance({ effectType });
	return {
		type: "effect",
		name: capitalizeFirstLetter({ string: instance.type }),
		effectType,
		params: instance.params,
		duration: duration ?? DEFAULT_NEW_ELEMENT_DURATION,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
	};
}

/**
 * Builds a new sticker element from a sticker ID, deriving its name
 * from the ID and using default duration/params.
 */
export function buildStickerElement({
	stickerId,
	name,
	startTime,
	intrinsicWidth,
	intrinsicHeight,
}: {
	stickerId: string;
	name?: string;
	startTime: MediaTime;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}): CreateStickerElement {
	const stickerNameFromId =
		stickerId.split(":").slice(1).pop()?.replaceAll("-", " ") ?? stickerId;
	return {
		type: "sticker",
		name: name ?? stickerNameFromId,
		stickerId,
		intrinsicWidth,
		intrinsicHeight,
		duration: DEFAULT_NEW_ELEMENT_DURATION,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		params: buildDefaultElementParams({ type: "sticker" }),
	};
}

/**
 * Builds a new graphic element from a definition, merging default and
 * instance params with any provided overrides.
 */
export function buildGraphicElement({
	definitionId,
	name,
	startTime,
	params,
}: {
	definitionId: string;
	name?: string;
	startTime: MediaTime;
	params?: Partial<ParamValues>;
}): CreateGraphicElement {
	const instance = buildDefaultGraphicInstance({ definitionId });
	return {
		type: "graphic",
		name: name ?? capitalizeFirstLetter({ string: instance.definitionId }),
		definitionId: instance.definitionId,
		params: mergeParamValues({
			base: {
				...buildDefaultElementParams({ type: "graphic" }),
				...instance.params,
			},
			overrides: params,
		}),
		duration: DEFAULT_NEW_ELEMENT_DURATION,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
	};
}

function mergeParamValues({
	base,
	overrides,
}: {
	base: ParamValues;
	overrides?: Partial<ParamValues>;
}): ParamValues {
	const result: ParamValues = { ...base };
	for (const [key, value] of Object.entries(overrides ?? {})) {
		if (value !== undefined) {
			result[key] = value;
		}
	}
	return result;
}

function buildVideoElement({
	mediaId,
	name,
	duration,
	startTime,
}: {
	mediaId: string;
	name: string;
	duration: MediaTime;
	startTime: MediaTime;
}): CreateVideoElement {
	return {
		type: "video",
		mediaId,
		name,
		duration,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		sourceDuration: duration,
		isSourceAudioEnabled: true,
		hidden: false,
		params: buildDefaultElementParams({ type: "video" }),
	};
}

function buildImageElement({
	mediaId,
	name,
	duration,
	startTime,
}: {
	mediaId: string;
	name: string;
	duration: MediaTime;
	startTime: MediaTime;
}): CreateImageElement {
	return {
		type: "image",
		mediaId,
		name,
		duration,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		hidden: false,
		params: buildDefaultElementParams({ type: "image" }),
	};
}

function buildUploadAudioElement({
	mediaId,
	name,
	duration,
	startTime,
	buffer,
}: {
	mediaId: string;
	name: string;
	duration: MediaTime;
	startTime: MediaTime;
	buffer?: AudioBuffer;
}): CreateUploadAudioElement {
	const element: CreateUploadAudioElement = {
		type: "audio",
		sourceType: "upload",
		mediaId,
		name,
		duration,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		sourceDuration: duration,
		params: buildDefaultElementParams({ type: "audio" }),
	};
	if (buffer) {
		element.buffer = buffer;
	}
	return element;
}

/**
 * Builds an element creation shape from a media asset, dispatching on
 * media type (audio/video/image).
 */
export function buildElementFromMedia({
	mediaId,
	mediaType,
	name,
	duration,
	startTime,
	buffer,
}: {
	mediaId: string;
	mediaType: MediaType;
	name: string;
	duration: MediaTime;
	startTime: MediaTime;
	buffer?: AudioBuffer;
}): CreateTimelineElement {
	switch (mediaType) {
		case "audio":
			return buildUploadAudioElement({
				mediaId,
				name,
				duration,
				startTime,
				buffer,
			});
		case "video":
			return buildVideoElement({ mediaId, name, duration, startTime });
		case "image":
			return buildImageElement({ mediaId, name, duration, startTime });
	}
}

/**
 * Builds a library-sourced audio element from a source URL.
 */
export function buildLibraryAudioElement({
	sourceUrl,
	name,
	duration,
	startTime,
	buffer,
}: {
	sourceUrl: string;
	name: string;
	duration: MediaTime;
	startTime: MediaTime;
	buffer?: AudioBuffer;
}): CreateLibraryAudioElement {
	const element: CreateLibraryAudioElement = {
		type: "audio",
		sourceType: "library",
		sourceUrl,
		name,
		duration,
		startTime,
		trimStart: ZERO_MEDIA_TIME,
		trimEnd: ZERO_MEDIA_TIME,
		sourceDuration: duration,
		params: buildDefaultElementParams({ type: "audio" }),
	};
	if (buffer) {
		element.buffer = buffer;
	}
	return element;
}

/**
 * Returns all elements whose time range contains the given time position.
 */
export function getElementsAtTime({
	tracks,
	time,
}: {
	tracks: SceneTracks;
	time: number;
}): { trackId: string; elementId: string }[] {
	const result: { trackId: string; elementId: string }[] = [];
	const orderedTracks = [...tracks.overlay, tracks.main, ...tracks.audio];

	for (const track of orderedTracks) {
		for (const element of track.elements) {
			const elementStart = element.startTime;
			const elementEnd = element.startTime + element.duration;

			if (time > elementStart && time < elementEnd) {
				result.push({ trackId: track.id, elementId: element.id });
			}
		}
	}

	return result;
}

/**
 * Collects all unique font family strings used by text elements and
 * text masks across all tracks.
 */
export function getElementFontFamilies({
	tracks,
}: {
	tracks: SceneTracks;
}): string[] {
	const families = new Set<string>();
	for (const track of [...tracks.overlay, tracks.main, ...tracks.audio]) {
		for (const element of track.elements) {
			if (
				element.type === "text" &&
				typeof element.params.fontFamily === "string"
			) {
				families.add(element.params.fontFamily);
			}
			if ("masks" in element) {
				for (const mask of element.masks ?? []) {
					if (mask.type === "text" && mask.params.fontFamily) {
						families.add(mask.params.fontFamily);
					}
				}
			}
		}
	}
	return [...families];
}

/**
 * @module animation/channel-data
 * @description Utilities for inspecting and traversing animation channel data
 *   structures. Distinguishes between leaf (single channel) and composite
 *   (multi-component) channel data, and provides helpers to extract channels
 *   and channel entries from either form.
 */

import type {
	AnimationChannel,
	ChannelData,
	CompositeChannelData,
} from "@/animation/types";

const LEGACY_ANIMATION_STORAGE_KEYS = new Set(["bindings", "channels"]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * Returns `true` when the channel data represents a single animation
 * channel (i.e. contains a `keys` array directly).
 */
export function isLeafChannelData(
	data: ChannelData | undefined,
): data is AnimationChannel {
	return isRecord(data) && Array.isArray(data.keys);
}

/**
 * Returns `true` when the channel data is a composite record of named
 * sub-channels rather than a single leaf channel.
 */
export function isCompositeChannelData(
	data: ChannelData | undefined,
): data is CompositeChannelData {
	return isRecord(data) && !Array.isArray(data.keys);
}

/**
 * Extracts all leaf {@link AnimationChannel}s from channel data,
 * flattening composite data when necessary.
 */
export function getChannelsFromData({
	data,
}: {
	data: ChannelData | undefined;
}): AnimationChannel[] {
	if (isLeafChannelData(data)) {
		return [data];
	}
	if (!isCompositeChannelData(data)) {
		return [];
	}
	return Object.values(data).filter(isLeafChannelData);
}

/**
 * Like {@link getChannelsFromData} but preserves the component key
 * (e.g. `"r"`, `"g"`, `"b"`, `"a"`) alongside each channel for use
 * when reconstructing composite values.
 */
export function getChannelEntriesFromData({
	data,
}: {
	data: ChannelData | undefined;
}): Array<[string, AnimationChannel]> {
	if (isLeafChannelData(data)) {
		return [["value", data]];
	}
	if (!isCompositeChannelData(data)) {
		return [];
	}
	return Object.entries(data).flatMap(([componentKey, channel]) =>
		isLeafChannelData(channel) ? [[componentKey, channel]] : [],
	);
}

/**
 * Filters out legacy storage keys (`bindings`, `channels`) so only
 * the current animation property paths are considered.
 */
export function isAnimationStorageKey({ key }: { key: string }): boolean {
	return !LEGACY_ANIMATION_STORAGE_KEYS.has(key);
}

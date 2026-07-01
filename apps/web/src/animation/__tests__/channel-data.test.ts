/** @module __tests__/channel-data Test suite for channel data utilities */
import { describe, expect, it } from "bun:test";
import {
	isLeafChannelData,
	isCompositeChannelData,
	getChannelsFromData,
	getChannelEntriesFromData,
	isAnimationStorageKey,
} from "../channel-data";
import type {
	AnimationChannel,
	ChannelData,
	CompositeChannelData,
} from "@/animation/types";
import { type MediaTime } from "@/wasm";

// --- Helpers ---

function createScalarChannel(): AnimationChannel {
	return {
		keys: [
			{
				id: "k1",
				time: 0 as MediaTime,
				value: 0,
				segmentToNext: "linear",
				tangentMode: "flat",
			},
		],
	};
}

function createCompositeChannelData(): CompositeChannelData {
	return {
		x: createScalarChannel(),
		y: createScalarChannel(),
	};
}

// --- Tests ---

describe("isLeafChannelData", () => {
	it("returns true for channel with keys array", () => {
		expect(isLeafChannelData(createScalarChannel())).toBe(true);
	});

	it("returns false for composite data", () => {
		expect(isLeafChannelData(createCompositeChannelData())).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isLeafChannelData(undefined)).toBe(false);
	});

	it("returns false for null", () => {
		expect(isLeafChannelData(null as any)).toBe(false);
	});

	it("returns false for non-object values", () => {
		expect(isLeafChannelData("string" as any)).toBe(false);
		expect(isLeafChannelData(123 as any)).toBe(false);
	});
});

describe("isCompositeChannelData", () => {
	it("returns true for composite data", () => {
		expect(isCompositeChannelData(createCompositeChannelData())).toBe(true);
	});

	it("returns false for leaf channel", () => {
		expect(isCompositeChannelData(createScalarChannel())).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isCompositeChannelData(undefined)).toBe(false);
	});
});

describe("getChannelsFromData", () => {
	it("returns single channel for leaf data", () => {
		const channel = createScalarChannel();
		const result = getChannelsFromData({ data: channel });
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(channel);
	});

	it("returns all channels for composite data", () => {
		const composite = createCompositeChannelData();
		const result = getChannelsFromData({ data: composite });
		expect(result).toHaveLength(2);
	});

	it("returns empty array for undefined", () => {
		expect(getChannelsFromData({ data: undefined })).toEqual([]);
	});

	it("filters out non-leaf entries in composite data", () => {
		const composite: ChannelData = {
			x: createScalarChannel(),
			y: undefined as any,
		};
		const result = getChannelsFromData({ data: composite });
		expect(result).toHaveLength(1);
	});
});

describe("getChannelEntriesFromData", () => {
	it("returns entries for composite data", () => {
		const composite = createCompositeChannelData();
		const result = getChannelEntriesFromData({ data: composite });
		expect(result).toHaveLength(2);
		expect(result[0]![0]).toBe("x");
		expect(result[1]![0]).toBe("y");
	});

	it("returns single entry for leaf data", () => {
		const channel = createScalarChannel();
		const result = getChannelEntriesFromData({ data: channel });
		expect(result).toHaveLength(1);
		expect(result[0]![0]).toBe("value");
	});

	it("returns empty array for undefined", () => {
		expect(getChannelEntriesFromData({ data: undefined })).toEqual([]);
	});
});

describe("isAnimationStorageKey", () => {
	it("returns false for legacy bindings key", () => {
		expect(isAnimationStorageKey({ key: "bindings" })).toBe(false);
	});

	it("returns false for legacy channels key", () => {
		expect(isAnimationStorageKey({ key: "channels" })).toBe(false);
	});

	it("returns true for non-legacy keys (animation property paths)", () => {
		expect(isAnimationStorageKey({ key: "transform.positionX" })).toBe(true);
		expect(isAnimationStorageKey({ key: "opacity" })).toBe(true);
		expect(isAnimationStorageKey({ key: "volume" })).toBe(true);
		expect(isAnimationStorageKey({ key: "random" })).toBe(true);
		expect(isAnimationStorageKey({ key: "name" })).toBe(true);
		expect(isAnimationStorageKey({ key: "" })).toBe(true);
	});
});

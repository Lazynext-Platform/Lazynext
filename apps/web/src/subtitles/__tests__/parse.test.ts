/** @module __tests__/parse Test suite for subtitle parsing */
import { describe, expect, it } from "bun:test";
import { parseSubtitleFile } from "../parse";

describe("parseSubtitleFile", () => {
	it("throws for unsupported format", () => {
		expect(() =>
			parseSubtitleFile({ fileName: "test.vtt", input: "" }),
		).toThrow();
	});

	it("throws for no extension", () => {
		expect(() => parseSubtitleFile({ fileName: "test", input: "" })).toThrow();
	});

	it("parses empty SRT", () => {
		const result = parseSubtitleFile({ fileName: "test.srt", input: "" });
		expect(result.captions).toEqual([]);
	});

	it("parses single SRT cue", () => {
		const input = "1\n00:00:01,000 --> 00:00:05,000\nHello World\n";
		const result = parseSubtitleFile({ fileName: "test.srt", input });
		expect(result.captions).toHaveLength(1);
		expect(result.captions[0]!.text).toBe("Hello World");
	});

	it("parses SRT with index", () => {
		const input =
			"1\n00:00:01,000 --> 00:00:02,500\nFirst line\n\n2\n00:00:03,000 --> 00:00:04,000\nSecond line\n";
		const result = parseSubtitleFile({ fileName: "test.srt", input });
		expect(result.captions).toHaveLength(2);
	});
});

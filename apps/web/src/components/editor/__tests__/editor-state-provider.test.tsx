import { describe, it, expect } from "bun:test";

/**
 * EditorStateProvider context tests — validates exports and provider shape.
 * Full rendering tests require jsdom/browser environment.
 */
describe("EditorStateProvider", () => {
	it("exports EditorStateProvider and useEditorState", async () => {
		const mod = await import("../useEditorState");

		expect(mod.EditorStateProvider).toBeDefined();
		expect(mod.useEditorState).toBeDefined();
		expect(typeof mod.EditorStateProvider).toBe("function");
		expect(typeof mod.useEditorState).toBe("function");
	});

	it("EditorStateProvider is a React component (function name check)", async () => {
		const mod = await import("../useEditorState");
		// Provider should be a named function (React component convention)
		expect(mod.EditorStateProvider.name).toBe("EditorStateProvider");
	});

	it("useEditorState is a named function", async () => {
		const mod = await import("../useEditorState");
		expect(mod.useEditorState.name).toBe("useEditorState");
	});
});

describe("editor-defaults", () => {
	it("INITIAL_ASSETS has valid structure", async () => {
		const { INITIAL_ASSETS } = await import("../editor-defaults");
		expect(Array.isArray(INITIAL_ASSETS)).toBe(true);
		expect(INITIAL_ASSETS).toHaveLength(3);
		for (const asset of INITIAL_ASSETS) {
			expect(asset).toHaveProperty("id");
			expect(asset).toHaveProperty("type");
			expect(asset).toHaveProperty("name");
			expect(asset).toHaveProperty("duration_frames");
		}
	});
});

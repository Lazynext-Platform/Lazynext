import { describe, it, expect } from "bun:test";

// EditorErrorBoundary is a class component that requires React DOM to test properly.
// These tests verify the component structure and smoke-test the exports.

describe("EditorErrorBoundary", () => {
  it("exports EditorErrorBoundary and EditorPane", async () => {
    const mod = await import("../EditorErrorBoundary");
    expect(mod.EditorErrorBoundary).toBeDefined();
    expect(mod.EditorPane).toBeDefined();
    // Verify they are functions/classes
    expect(typeof mod.EditorErrorBoundary).toBe("function");
    expect(typeof mod.EditorPane).toBe("function");
  });
});

describe("EditorProvider", () => {
  it("exports EditorProvider and useEditorState", async () => {
    const mod = await import("../useEditorState");
    expect(mod.EditorProvider).toBeDefined();
    expect(mod.useEditorState).toBeDefined();
    expect(typeof mod.EditorProvider).toBe("function");
    expect(typeof mod.useEditorState).toBe("function");
  });
});

describe("editor-defaults", () => {
  it("exports INITIAL_ASSETS with 3 items", async () => {
    const { INITIAL_ASSETS } = await import("../editor-defaults");
    expect(Array.isArray(INITIAL_ASSETS)).toBe(true);
    expect(INITIAL_ASSETS).toHaveLength(3);
    expect(INITIAL_ASSETS[0]).toHaveProperty("type", "video");
    expect(INITIAL_ASSETS[1]).toHaveProperty("type", "video");
    expect(INITIAL_ASSETS[2]).toHaveProperty("type", "audio");
  });
});

describe("FeatureToolbar", () => {
  it("exports FeatureToolbar", async () => {
    const mod = await import("../FeatureToolbar");
    expect(mod.FeatureToolbar).toBeDefined();
    expect(typeof mod.FeatureToolbar).toBe("function");
  });
});

describe("ExperimentalPanels", () => {
  it("exports ExperimentalPanels", async () => {
    const mod = await import("../ExperimentalPanels");
    expect(mod.ExperimentalPanels).toBeDefined();
    expect(typeof mod.ExperimentalPanels).toBe("function");
  });
});

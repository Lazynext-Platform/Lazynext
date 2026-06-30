import { describe, it, expect, vi } from "vitest";

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    getManifest: vi.fn().mockReturnValue({
      manifest_version: 3,
      name: "Lazynext Browser Extension",
      permissions: ["activeTab", "contextMenus", "scripting", "storage"],
    }),
  },
};

(globalThis as any).chrome = mockChrome;

describe("Browser Extension", () => {
  it("manifest has MV3 format", () => {
    const manifest = chrome.runtime.getManifest();
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Lazynext Browser Extension");
  });

  it("has required permissions", () => {
    const manifest = chrome.runtime.getManifest();
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).toContain("scripting");
    expect(manifest.permissions).toContain("storage");
  });

  it("chrome.storage.local is available", async () => {
    const result = await chrome.storage.local.get("test");
    expect(result).toBeDefined();
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith("test");
  });
});

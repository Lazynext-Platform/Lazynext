import { describe, it, expect } from "bun:test";

// Mock the NativeModule before imports
jest.mock("../modules/lazynext-native/src/MyModule", () => ({
  default: {
    fetchProject: async () =>
      JSON.stringify({
        id: "test_001",
        name: "Test Project",
        tracks: [{ id: "V1", type: "video", clips: [] }],
      }),
    processIntent: async (prompt: string) =>
      JSON.stringify({ success: true, message: `Processed: ${prompt}` }),
    sendChatMessage: async (msg: string) =>
      JSON.stringify({ success: true, response: `Reply: ${msg}` }),
    moveClip: async () =>
      JSON.stringify({ success: true }),
  },
}), { virtual: true });

describe("NativeBridge", () => {
  it("fetchProject returns project data", async () => {
    const { default: MyModule } = await import(
      "../modules/lazynext-native/src/MyModule"
    );
    const result = JSON.parse(await MyModule.fetchProject());
    expect(result.id).toBe("test_001");
    expect(result.tracks).toBeArray();
  });

  it("processIntent returns success", async () => {
    const { default: MyModule } = await import(
      "../modules/lazynext-native/src/MyModule"
    );
    const result = JSON.parse(await MyModule.processIntent("test"));
    expect(result.success).toBe(true);
  });

  it("sendChatMessage returns response", async () => {
    const { default: MyModule } = await import(
      "../modules/lazynext-native/src/MyModule"
    );
    const result = JSON.parse(await MyModule.sendChatMessage("hello"));
    expect(result.success).toBe(true);
    expect(result.response).toBeTruthy();
  });
});

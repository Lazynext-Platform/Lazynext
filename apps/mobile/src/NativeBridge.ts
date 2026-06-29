import { Platform } from 'react-native';
// @ts-ignore
import MyModule from '../modules/lazynext-native/src/MyModule';

export const NativeBridge = {
  async fetchProject(): Promise<{
    name: string;
    tracks: Array<{ id: string; name: string; trackType: string; clips: Array<{ id: string; name: string; start: number; duration: number }> }>;
  }> {
    try {
      const dataStr = await MyModule.getProjectInfo();
      const data = JSON.parse(dataStr);
      
      return {
        name: data.name || "Lazynext Project",
        tracks: data.tracks || [],
      };
    } catch (e) {
      console.warn("NativeModule fetch error, falling back:", e);
      return { name: "Offline Project", tracks: [] };
    }
  },

  async processIntent(prompt: string): Promise<string> {
    try {
      const result = await MyModule.processIntent(prompt, false);
      return result || "Edit applied successfully.";
    } catch (e) {
      console.warn("NativeModule processIntent error:", e);
      return "Error processing intent via Native Engine.";
    }
  },

  async sendChatMessage(message: string): Promise<string> {
    try {
      const result = await MyModule.processIntent(message, true);
      return result || "I've processed your request.";
    } catch (e) {
      console.warn("NativeModule chat error:", e);
      return "Chronos Copilot is currently offline.";
    }
  },

  async moveClip(clipId: string, newStart: number): Promise<void> {
    try {
      await MyModule.moveClip(clipId, newStart);
    } catch (e) {
      console.warn("NativeModule moveClip error:", e);
    }
  },
};

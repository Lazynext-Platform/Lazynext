/** @module NativeBridge Native bridge interface for mobile */
import { Platform } from 'react-native';
// @ts-ignore — native module available only on device; JS fallback below
import MyModule from '../modules/lazynext-native/src/MyModule';

const MOCK_PROJECT = {
  name: "Demo Cut (Offline)",
  tracks: [
    {
      id: "track_1",
      name: "Video",
      trackType: "video",
      clips: [
        { id: "clip_001", name: "Opening Shot", start: 0, duration: 150 },
        { id: "clip_002", name: "B-Roll Montage", start: 150, duration: 210 },
        { id: "clip_003", name: "Hero Close-up", start: 360, duration: 90 },
      ],
    },
    {
      id: "track_2",
      name: "Audio",
      trackType: "audio",
      clips: [
        { id: "clip_004", name: "Background Music", start: 0, duration: 450 },
      ],
    },
  ],
};

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
      return MOCK_PROJECT;
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

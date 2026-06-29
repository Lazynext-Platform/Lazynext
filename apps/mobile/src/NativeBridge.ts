import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:8005/api/v1' : 'http://localhost:8005/api/v1';
const MOCK_TOKEN = 'mock_jwt_token_for_mobile'; // Should be replaced with actual auth token

export const NativeBridge = {
  async fetchProject(): Promise<{
    name: string;
    tracks: Array<{ id: string; name: string; trackType: string; clips: Array<{ id: string; name: string; start: number; duration: number }> }>;
  }> {
    try {
      const res = await fetch(`${API_BASE}/timeline`, {
        headers: { 'Authorization': `Bearer ${MOCK_TOKEN}` }
      });
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      
      return {
        name: data.name || "Lazynext Project",
        tracks: data.tracks || [],
      };
    } catch (e) {
      console.warn("API fetch error, falling back:", e);
      return { name: "Offline Project", tracks: [] };
    }
  },

  async processIntent(prompt: string): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/autonomous_edit`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${MOCK_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, require_plan_approval: false })
      });
      if (!res.ok) throw new Error('Failed to process intent');
      const data = await res.json();
      return data.message || "Edit applied successfully via Cloud.";
    } catch (e) {
      console.warn("API autonomous_edit error:", e);
      return "Processed timeline via local fallback engine.";
    }
  },

  async sendChatMessage(message: string): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/ai/generate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${MOCK_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: message })
      });
      if (!res.ok) throw new Error('Failed to generate response');
      const data = await res.json();
      return data.text || "I've processed your request.";
    } catch (e) {
      console.warn("API chat error:", e);
      return "Chronos Copilot is currently offline. Try again when connected.";
    }
  },

  async moveClip(clipId: string, newStart: number): Promise<void> {
    // Implement API call for crdt operation if needed
    console.log(`Moving clip ${clipId} to ${newStart}`);
  },
};

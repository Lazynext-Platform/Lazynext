import { registerWebModule, NativeModule } from "expo";

class MyModule extends NativeModule<{}> {
  async fetchProject(): Promise<string> {
    try {
      const res = await fetch("http://localhost:8005/api/v1/projects");
      if (res.ok) {
        const data = await res.json();
        return JSON.stringify(data);
      }
    } catch {
      // API gateway unreachable — return demo data for web preview
    }
    return JSON.stringify({
      id: "web_demo_001",
      name: "Demo Web Project",
      tracks: [
        { id: "V1", name: "Video 1", type: "video", order: 0, zIndex: 0, clips: [] },
        { id: "A1", name: "Audio 1", type: "audio", order: 1, zIndex: 1, clips: [] },
      ],
      clips: [],
    });
  }

  async processIntent(prompt: string): Promise<string> {
    try {
      const res = await fetch("http://localhost:8005/api/v1/autonomous_edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, require_plan_approval: false }),
      });
      if (res.ok) {
        const data = await res.json();
        return JSON.stringify(data);
      }
    } catch {
      // API gateway unreachable
    }
    return JSON.stringify({
      success: false,
      message: "API gateway not available (start at :8005)",
    });
  }

  async sendChatMessage(message: string): Promise<string> {
    try {
      const res = await fetch("http://localhost:8005/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        const data = await res.json();
        return JSON.stringify(data);
      }
    } catch {
      // AI agents unreachable
    }
    return JSON.stringify({
      success: false,
      message: "AI agents service not available (start at :8002)",
    });
  }

  async moveClip(
    _clipId: string,
    _newPosition: number,
  ): Promise<string> {
    return JSON.stringify({
      success: false,
      message: "Clip manipulation available via native UniFFI bridge only",
    });
  }
}

export default registerWebModule(MyModule, "MyModule");

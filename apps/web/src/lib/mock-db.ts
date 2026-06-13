// Mock Database Service for Lazynext Architecture Admin Dashboards

export type Organization = {
  id: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  renderHoursUsed: number;
  aiCreditsUsed: number;
  members: Array<{
    name: string;
    email: string;
    role: "Owner" | "Admin" | "Editor" | "Viewer";
    lastActive: string;
  }>;
};

export type TelemetryData = {
  activeRustNodes: number;
  ffmpegQueueSize: number;
  totalActiveUsers: number;
  totalMRR: number;
  systemLogs: string[];
};

export type AIProviderMetrics = {
  name: string;
  provider: string;
  colorHex: string;
  requestsPerMin: number;
  avgLatencyMs: number;
  status: "Operational" | "Degraded" | "Failing" | "Local Fast";
};

class LazynextDB {
  private orgs: Record<string, Organization> = {
    "org_lazynext_123": {
      id: "org_lazynext_123",
      name: "Lazynext Video Corp",
      memberCount: 12,
      maxMembers: 15,
      renderHoursUsed: 142,
      aiCreditsUsed: 45200,
      members: [
        { name: "Alice Smith", email: "alice@lazynext.com", role: "Owner", lastActive: "Just now" },
        { name: "Bob Jones", email: "bob@lazynext.com", role: "Editor", lastActive: "2 hours ago" },
        { name: "Charlie Davis", email: "charlie@lazynext.com", role: "Editor", lastActive: "1 day ago" },
      ]
    }
  };

  private telemetry: TelemetryData = {
    activeRustNodes: 34,
    ffmpegQueueSize: 142,
    totalActiveUsers: 8492,
    totalMRR: 42000,
    systemLogs: [
      "[INFO] New user sign-up: vaspatel@gmail.com",
      "[SYSTEM] Spawning 3 new Rust compositor instances...",
      "[WARN] FFmpeg worker #42 timeout parsing 8K H.265",
      "[INFO] Processed 12 tool calls from Claude 3.5 Agent",
      "[STRIPE] Webhook received: invoice.payment_succeeded for $19.00"
    ]
  };

  private aiMetrics: AIProviderMetrics[] = [
    { name: "Claude 3.5 Sonnet", provider: "Anthropic", colorHex: "#a855f7", requestsPerMin: 1402, avgLatencyMs: 420, status: "Operational" },
    { name: "GPT-4o", provider: "OpenAI", colorHex: "#22c55e", requestsPerMin: 940, avgLatencyMs: 510, status: "Operational" },
    { name: "Gemini 1.5 Pro", provider: "Google", colorHex: "#3b82f6", requestsPerMin: 420, avgLatencyMs: 1200, status: "Degraded" },
    { name: "Local Llama 3", provider: "Ollama", colorHex: "#f97316", requestsPerMin: 89, avgLatencyMs: 150, status: "Local Fast" },
  ];

  async getOrganization(orgId: string): Promise<Organization | null> {
    return this.orgs[orgId] || null;
  }

  async getGlobalTelemetry(): Promise<TelemetryData> {
    return this.telemetry;
  }

  async getAIProviderMetrics(): Promise<AIProviderMetrics[]> {
    return this.aiMetrics;
  }
}

export const mockDb = new LazynextDB();

// Admin Data Service — Real PostgreSQL queries for admin dashboards.
// Replaces the mock-db.ts fake data with live Drizzle queries.
// Graceful degradation: returns empty/null data when DB is unreachable.

import { db } from "@/db";
import { user, subscriptions, projects } from "@/db/schema";
import { sql, count, sum } from "drizzle-orm";

export type AdminMetrics = {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  totalProjects: number;
};

export type SystemStatus = {
  activeRustNodes: number | null;
  ffmpegQueueSize: number | null;
  lastUpdated: string;
};

export type AIProviderMetric = {
  name: string;
  provider: string;
  colorHex: string;
  requestsPerMin: number | null;
  avgLatencyMs: number | null;
  status: "Operational" | "Degraded" | "Failing" | "Local Fast" | "Unknown";
};

async function getAdminMetrics(): Promise<AdminMetrics> {
  try {
    const [userCount] = await db
      .select({ count: count() })
      .from(user);
    const [subCount] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(sql`${subscriptions.tier} != 'free'`);
    const [projectCount] = await db
      .select({ count: count() })
      .from(projects);

    return {
      totalUsers: userCount?.count ?? 0,
      activeSubscriptions: subCount?.count ?? 0,
      monthlyRecurringRevenue: (subCount?.count ?? 0) * 29,
      totalProjects: projectCount?.count ?? 0,
    };
  } catch (error) {
    console.error("[admin-data] Failed to fetch metrics:", error);
    return {
      totalUsers: 0,
      activeSubscriptions: 0,
      monthlyRecurringRevenue: 0,
      totalProjects: 0,
    };
  }
}

async function getSystemStatus(): Promise<SystemStatus> {
  // Runtime metrics (Rust nodes, FFmpeg queue) require a separate monitoring
  // endpoint. Return null for now and direct users to Grafana dashboards.
  return {
    activeRustNodes: null,
    ffmpegQueueSize: null,
    lastUpdated: new Date().toISOString(),
  };
}

async function getAIProviderMetrics(): Promise<AIProviderMetric[]> {
  // AI provider metrics are runtime data from the ai-agents service.
  // Return the configured providers with "Unknown" status until we wire
  // a real monitoring endpoint.
  return [
    {
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      colorHex: "#a855f7",
      requestsPerMin: null,
      avgLatencyMs: null,
      status: "Unknown",
    },
    {
      name: "GPT-4o",
      provider: "OpenAI",
      colorHex: "#22c55e",
      requestsPerMin: null,
      avgLatencyMs: null,
      status: "Unknown",
    },
    {
      name: "Gemini 1.5 Pro",
      provider: "Google",
      colorHex: "#3b82f6",
      requestsPerMin: null,
      avgLatencyMs: null,
      status: "Unknown",
    },
    {
      name: "Local Llama 3",
      provider: "Ollama",
      colorHex: "#f97316",
      requestsPerMin: null,
      avgLatencyMs: null,
      status: "Unknown",
    },
  ];
}

export async function getRecentUsers(limit = 10) {
  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(sql`${user.createdAt} DESC`)
      .limit(limit);

    return users.map((u) => ({
      ...u,
      lastActive: "Unknown", // requires session tracking table
    }));
  } catch (error) {
    console.error("[admin-data] Failed to fetch recent users:", error);
    return [];
  }
}

export const adminData = {
  getAdminMetrics,
  getSystemStatus,
  getAIProviderMetrics,
  getRecentUsers,
};

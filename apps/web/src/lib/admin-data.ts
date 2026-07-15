/**
 * Admin data service — real PostgreSQL queries for admin dashboards.
 *
 * Queries user counts, subscription metrics, project totals, and recent
 * user registrations via Drizzle ORM. Gracefully degrades to empty/null
 * data when the database is unreachable.
 *
 * @module lib/admin-data
 */

// Replaces the mock-db.ts fake data with live Drizzle queries.
// Graceful degradation: returns empty/null data when DB is unreachable.

import { db } from "@/db";
import { user, subscriptions, projects } from "@/db/schema";
import { sql, count } from "drizzle-orm";

export type AdminMetrics = {
  /** Total number of registered users. */
  totalUsers: number;
  /** Number of active paid subscriptions. */
  activeSubscriptions: number;
  /** Estimated monthly recurring revenue. */
  monthlyRecurringRevenue: number;
  /** Total number of projects. */
  totalProjects: number;
};

export type SystemStatus = {
  /** Number of active Rust render nodes, or null if unknown. */
  activeRustNodes: number | null;
  /** Current FFmpeg queue size, or null if unknown. */
  ffmpegQueueSize: number | null;
  /** ISO timestamp of when the status was captured. */
  lastUpdated: string;
};

export type AIProviderMetric = {
  /** Display name of the AI model. */
  name: string;
  /** Provider organization name. */
  provider: string;
  /** Brand color hex code for the provider. */
  colorHex: string;
  /** Requests per minute, or null if unknown. */
  requestsPerMin: number | null;
  /** Average latency in milliseconds, or null if unknown. */
  avgLatencyMs: number | null;
  /** Operational status of the provider. */
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
      name: "Gemini 3.5 Flash / 3.1 Pro",
      provider: "Google Gemini",
      colorHex: "#4285F4",
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

/**
 * Admin data tests — unit tests for admin dashboard data aggregation
 * and metrics calculations.
 *
 * @module lib/admin-data.test
 */

import { describe, it, expect } from "bun:test";
import { adminData } from "./admin-data";

describe("adminData", () => {
  it("getAdminMetrics returns metrics object with all fields", async () => {
    const metrics = await adminData.getAdminMetrics();
    expect(metrics).toBeObject();
    expect(metrics).toHaveProperty("totalUsers");
    expect(metrics).toHaveProperty("activeSubscriptions");
    expect(metrics).toHaveProperty("monthlyRecurringRevenue");
    expect(metrics).toHaveProperty("totalProjects");
    expect(typeof metrics.totalUsers).toBe("number");
    expect(typeof metrics.activeSubscriptions).toBe("number");
    expect(typeof metrics.monthlyRecurringRevenue).toBe("number");
    expect(typeof metrics.totalProjects).toBe("number");
  });

  it("getSystemStatus returns status with lastUpdated", async () => {
    const status = await adminData.getSystemStatus();
    expect(status).toHaveProperty("lastUpdated");
    expect(status).toHaveProperty("activeRustNodes");
    expect(status).toHaveProperty("ffmpegQueueSize");
    // Runtime metrics may be null when monitoring is not wired
    if (status.activeRustNodes !== null) {
      expect(typeof status.activeRustNodes).toBe("number");
    }
  });

  it("getAIProviderMetrics returns non-empty array", async () => {
    const providers = await adminData.getAIProviderMetrics();
    expect(providers).toBeArray();
    expect(providers.length).toBeGreaterThan(0);
    for (const p of providers) {
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("provider");
      expect(p).toHaveProperty("status");
    }
  });

  it("getRecentUsers returns array", async () => {
    const users = await adminData.getRecentUsers(5);
    expect(users).toBeArray();
    // May be empty if no users in DB — that's valid
  });
});

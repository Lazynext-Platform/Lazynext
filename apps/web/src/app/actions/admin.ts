/**
 * Admin server actions — authenticated fetch wrappers for the Lazynext
 * Rust API Gateway admin endpoints (dashboard metrics, user listings).
 *
 * All actions require an active Better Auth session and route through
 * the Rust API Gateway at {@link RUST_API_GATEWAY_URL}.
 *
 * @module admin/actions
 */

"use server";

import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

async function requireAuth() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session || !session.user) throw new Error("Unauthorized");
	return session.user;
}

export async function getDashboardMetrics() {
	await requireAuth();

	const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/admin/dashboard`, {
		cache: "no-store",
	});

	if (!res.ok) {
		throw new Error("Failed to fetch admin metrics");
	}

	const data = await res.json();
	return data.metrics;
}

export async function getRecentUsers(limit = 10): Promise<any[]> {
  await requireAuth();

  try {
    const res = await fetch(
      `${RUST_API_GATEWAY_URL}/api/v1/admin/users?limit=${limit}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch users: ${res.status}`);
    }

    const data = await res.json();
    return data.users ?? [];
  } catch (error) {
    console.error("[admin] Failed to fetch recent users:", error);
    // Graceful degradation — return empty array on fetch failure
    return [];
  }
}

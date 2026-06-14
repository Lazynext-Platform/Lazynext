"use server";

import { db } from "@/db";
import { user, subscriptions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

async function requireAdmin() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session || !session.user) throw new Error("Unauthorized");

	const dbUser = await db.query.user.findFirst({
		where: eq(user.id, session.user.id),
	});

	if (!dbUser || dbUser.role !== "admin") throw new Error("Forbidden");
	return dbUser;
}

export async function getDashboardMetrics() {
	await requireAdmin();

	// Get total users
	const totalUsersResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(user);

	// Get active pro subscriptions
	const activeSubsResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(subscriptions)
		.where(eq(subscriptions.tier, "pro"));

	return {
		totalUsers: totalUsersResult[0].count,
		activeSubscriptions: activeSubsResult[0].count,
		monthlyRecurringRevenue: activeSubsResult[0].count * 29, // $29/mo
	};
}

export async function getRecentUsers() {
	await requireAdmin();

	return await db.query.user.findMany({
		limit: 10,
		orderBy: (users, { desc }) => [desc(users.createdAt)],
	});
}

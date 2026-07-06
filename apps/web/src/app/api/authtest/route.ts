/**
 * GET /api/authtest
 *
 * Diagnostic endpoint — returns sanitised info about the DATABASE_URL.
 * Requires admin authentication to prevent information disclosure.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

export async function GET() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userRole = (session.user as { role?: string }).role;
	if (userRole !== "admin" && userRole !== "superadmin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const url = process.env.DATABASE_URL || "NOT SET";
	return NextResponse.json({
		url_prefix: url.substring(0, 30),
		url_length: url.length,
		has_at: url.includes("@"),
		has_slash: url.includes("/"),
		starts_postgres:
			url.startsWith("postgresql://") || url.startsWith("postgres://"),
	});
}

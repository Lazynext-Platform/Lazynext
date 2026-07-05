/** @module Debug API endpoint — requires authentication */
import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

export async function GET() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session || !session.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userWithRole = session.user as { role?: string };
	const isAdmin =
		userWithRole.role === "admin" || userWithRole.role === "superadmin";
	if (!isAdmin) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const results: Record<string, unknown> = {};

	results.env = {
		NODE_ENV: process.env.NODE_ENV || "MISSING",
		DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "set" : "MISSING",
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "MISSING",
	};

	return NextResponse.json(results);
}

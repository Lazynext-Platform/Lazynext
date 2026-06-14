import { NextResponse } from "next/server";

export async function GET() {
	const results: Record<string, unknown> = {};

	// Check env vars
	results.env = {
		NODE_ENV: process.env.NODE_ENV || "MISSING",
		DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? "set" : "MISSING",
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "MISSING",
	};

	return NextResponse.json(results);
}

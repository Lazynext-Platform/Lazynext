/**
 * GET /api/authtest
 *
 * Diagnostic endpoint that returns sanitised info about the
 * DATABASE_URL environment variable.
 */

import { NextResponse } from "next/server";

export async function GET() {
	const url = process.env.DATABASE_URL || "NOT SET";
	// Safe: show prefix and length, not full URL
	return NextResponse.json({
		url_prefix: url.substring(0, 30),
		url_length: url.length,
		has_at: url.includes("@"),
		has_slash: url.includes("/"),
		starts_postgres:
			url.startsWith("postgresql://") || url.startsWith("postgres://"),
	});
}

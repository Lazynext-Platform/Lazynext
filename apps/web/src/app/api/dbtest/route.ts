/**
 * GET /api/dbtest
 *
 * Diagnostic endpoint — connects to the database and returns the
 * list of public tables. Requires admin authentication.
 *
 * @module app/api/dbtest/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

export async function GET() {
	try {
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

		const { Pool } = await import("pg");
		const pool = new Pool({ connectionString: process.env.DATABASE_URL });
		const tables = await pool.query(
			"SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
		);
		const count = await pool.query(
			"SELECT count(*) as total FROM information_schema.tables WHERE table_schema='public'",
		);
		await pool.end();
		return NextResponse.json({
			tableCount: count.rows[0].total,
			tables: tables.rows.map((r: Record<string, unknown>) => r.table_name),
		});
	} catch (e) {
		return NextResponse.json({ error: (e as Error).message }, { status: 500 });
	}
}

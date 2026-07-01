/**
 * GET /api/dbtest
 *
 * Diagnostic endpoint — connects to the database and returns the
 * list of public tables.
 */

import { NextResponse } from "next/server";

export async function GET() {
	try {
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

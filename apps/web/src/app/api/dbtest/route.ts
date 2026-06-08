import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query("SELECT 1 as ok");
    await pool.end();
    return NextResponse.json({ db: "ok", test: result.rows[0] });
  } catch (e) {
    return NextResponse.json({ db: "FAILED", error: (e as Error).message }, { status: 500 });
  }
}

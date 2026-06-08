import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, unknown> = {};
  
  // Test 1: DB connection
  try {
    const { db } = await import("@/db");
    results.db = typeof db;
  } catch (e) { results.db = "FAIL: " + String(e); }
  
  // Test 2: Auth import
  try {
    const { auth } = await import("@/auth/server");
    results.auth = { type: typeof auth, keys: Object.keys(auth).slice(0, 10) };
  } catch (e) {
    results.auth = "FAIL: " + String(e);
    const err = e as Error;
    if (err.stack) results.stack = err.stack.substring(0, 500);
  }
  
  return NextResponse.json(results);
}

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const mod = await import("@/auth/server");
    const a = mod.auth;
    return NextResponse.json({ type: typeof a, keys: Object.keys(a).slice(0, 10), hasHandler: "handler" in a });
  } catch (e) {
    return NextResponse.json({ error: String(e), stack: (e as Error).stack?.substring(0, 300) }, { status: 500 });
  }
}

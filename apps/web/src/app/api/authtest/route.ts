import { NextResponse } from "next/server";
import { auth } from "@/auth/server";

export async function GET() {
  try {
    return NextResponse.json({ 
      type: typeof auth, 
      keys: Object.keys(auth).slice(0, 10),
      hasHandler: "handler" in auth,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

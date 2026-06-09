import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { email, password, name } = (await req.json()) as { email?: string; password?: string; name?: string };
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Min 8 characters" }, { status: 400 });

    // Check existing
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    // Hash password
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + "lazynext-salt"));
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Create user
    const id = crypto.randomUUID();
    await db.insert(users).values({
      id,
      email,
      name: name || email.split("@")[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, userId: id, email });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

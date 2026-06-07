import { auth } from "@/auth/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { name } = (await request.json()) as { name?: string };
	if (!name || typeof name !== "string") {
		return NextResponse.json({ error: "Name is required" }, { status: 400 });
	}

	await db.update(users).set({ name }).where(eq(users.id, session.user.id));

	return NextResponse.json({ success: true, name });
}

export async function GET(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	return NextResponse.json({
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		image: session.user.image,
	});
}

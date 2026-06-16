import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/auth/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const dbUser = await db.query.user.findFirst({
			where: eq(user.id, session.user.id),
		});

		if (!dbUser) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({
			aiCredits: dbUser.aiCredits ?? 0,
		});
	} catch (error) {
		console.error("GET /api/user/credits error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

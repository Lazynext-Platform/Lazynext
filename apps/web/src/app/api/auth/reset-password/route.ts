import { auth } from "@/auth/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	const { token, password } = (await request.json()) as {
		token?: string;
		password?: string;
	};

	if (!token || !password) {
		return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
	}

	if (password.length < 8) {
		return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
	}

	try {
		await auth.api.resetPassword({
			body: { newPassword: password, token },
		});
		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
	}
}

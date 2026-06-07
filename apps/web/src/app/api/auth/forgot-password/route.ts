import { auth } from "@/auth/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	const { email } = (await request.json()) as { email?: string };

	if (!email) {
		return NextResponse.json({ error: "Email is required" }, { status: 400 });
	}

	try {
		await auth.api.resetPassword({
			body: { newPassword: "", token: "" },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any).catch(() => {});
		// Better Auth handles the actual forget-password flow server-side.
		// This endpoint is a stub — implement email sending via resend/sendgrid.
		console.log(`Password reset requested for: ${email}`);
		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json({ success: true });
	}
}

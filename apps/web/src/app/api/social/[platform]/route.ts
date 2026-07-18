import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const RUST_API_GATEWAY_URL =
	process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ platform: string }> },
) {
	try {
		const { platform } = await params;
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const token = (session as any)?.session?.token;
		if (!session || !session.user || !token) {
			return NextResponse.redirect(new URL("/sign-in", request.url));
		}

		// Redirect to API Gateway to initiate OAuth
		const targetUrl = new URL(`${RUST_API_GATEWAY_URL}/api/v1/auth/social/${platform}`);
		targetUrl.searchParams.set("token", token);
		
		return NextResponse.redirect(targetUrl);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
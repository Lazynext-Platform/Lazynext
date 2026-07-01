/**
 * Proxy: POST /api/ai/autonomous-edit → Rust API Gateway.
 * Server-side (no CORS), authenticated via internal API key.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await req.json();

		const res = await fetch(`${GATEWAY_URL}/api/v1/autonomous_edit`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Internal-API-Key":
					process.env.INTERNAL_API_KEY || "lazynext-internal-dev-key",
			},
			body: JSON.stringify(body),
		});

		const data = await res.json();
		return NextResponse.json(data, { status: res.status });
	} catch (error: any) {
		console.error("[autonomous-edit proxy]", error?.message || error);
		return NextResponse.json(
			{ error: error?.message || String(error) },
			{ status: 500 },
		);
	}
}

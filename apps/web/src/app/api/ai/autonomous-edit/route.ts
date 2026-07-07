/**
 * Proxy: POST /api/ai/autonomous-edit → Rust API Gateway.
 * Server-side (no CORS), authenticated via internal API key.
 *
 * @module app/api/ai/autonomous-edit/route
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { autonomousEditSchema } from "@/lib/validation";

const GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

function getInternalApiKey(): string {
	if (INTERNAL_API_KEY) return INTERNAL_API_KEY;
	if (process.env.NODE_ENV === "production") {
		throw new Error("INTERNAL_API_KEY must be set in production");
	}
	return "lazynext-internal-dev-key";
}

export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		if (!session || !session.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const rawBody = await req.json();
		const parsed = autonomousEditSchema.safeParse(rawBody);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message || "Invalid input" },
				{ status: 400 },
			);
		}

		const apiKey = getInternalApiKey();

		const res = await fetch(`${GATEWAY_URL}/api/v1/autonomous_edit`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Internal-API-Key": apiKey,
			},
			body: JSON.stringify(parsed.data),
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

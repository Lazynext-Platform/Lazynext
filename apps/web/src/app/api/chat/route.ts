/**
 * @module AI chat endpoint — forwards natural-language edit prompts to the
 * Rust API Gateway's autonomous_edit endpoint and returns the result.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { chatSchema } from "@/lib/validation";

/**
 * Resolve the internal API key used to authenticate server→gateway calls.
 * In production this must be configured; in development a fixed dev key is
 * used so local flows work without extra setup.
 */
function getInternalApiKey(): string {
	const key = process.env.INTERNAL_API_KEY;
	if (key) return key;
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
		const parsed = chatSchema.safeParse(rawBody);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.issues[0]?.message || "Invalid input" },
				{ status: 400 },
			);
		}

		const { prompt } = parsed.data;

		const rustGatewayUrl = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

		const response = await fetch(`${rustGatewayUrl}/api/v1/autonomous_edit`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Internal-API-Key": getInternalApiKey(),
			},
			body: JSON.stringify({
				prompt,
				require_plan_approval: false,
				source_files: [],
			}),
		});

		if (!response.ok) {
			const errText = await response.text();
			throw new Error(`Rust Gateway error ${response.status}: ${errText}`);
		}

		const data = await response.json();

		if (!data.success) {
			throw new Error(data.error || "Unknown error from Rust Gateway");
		}

		return NextResponse.json({
			response: data.message || "Autonomously processed your edit via the Rust engine.",
			mode: "rust-gateway",
		});
	} catch (error: unknown) {
		console.error("Agent proxy error:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

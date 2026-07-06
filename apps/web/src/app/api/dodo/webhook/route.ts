/**
 * @module Dodo Payments webhook proxy — forwards incoming Dodo Payments
 * events to the Rust API Gateway for server-side processing.
 *
 * HMAC verification is performed by the Rust gateway; this route
 * requires the internal API key to prevent abuse.
 */

import { NextResponse } from "next/server";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function POST(req: Request) {
	try {
		const payload = await req.json();
		const signature = req.headers.get("dodo-signature");

		if (!signature) {
			return NextResponse.json({ error: "Missing dodo-signature header" }, { status: 400 });
		}

		const apiKey = process.env.INTERNAL_API_KEY;
		if (process.env.NODE_ENV === "production" && !apiKey) {
			console.error("INTERNAL_API_KEY not configured in production");
			return NextResponse.json({ error: "Internal configuration error" }, { status: 500 });
		}

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/dodo/webhook`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"dodo-signature": signature,
				"X-Internal-API-Key": apiKey || "lazynext-internal-dev-key",
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			throw new Error("Rust gateway failed to process webhook");
		}

		return NextResponse.json({ received: true });
	} catch (error: any) {
		console.error("Dodo Payments webhook proxy error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

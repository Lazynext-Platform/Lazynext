/**
 * @module Dodo Payments webhook proxy — forwards incoming Dodo Payments
 * events to the Rust API Gateway for server-side processing.
 */

import { NextResponse } from "next/server";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

/**
 * POST /api/dodo/webhook
 * Receives a Dodo Payments webhook payload and proxies it to the Rust API Gateway.
 */
export async function POST(req: Request) {
	try {
		const payload = await req.json();
		const signature = req.headers.get("dodo-signature");

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/dodo/webhook`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"dodo-signature": signature || "",
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

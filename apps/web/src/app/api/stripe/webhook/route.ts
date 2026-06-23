import { NextResponse } from "next/server";

const RUST_API_GATEWAY_URL = process.env.RUST_API_GATEWAY_URL || "http://127.0.0.1:8005";

export async function POST(req: Request) {
	try {
		const payload = await req.json();

		const res = await fetch(`${RUST_API_GATEWAY_URL}/api/v1/stripe/webhook`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			throw new Error("Rust gateway failed to process webhook");
		}

		return NextResponse.json({ received: true });
	} catch (error: any) {
		console.error("Stripe webhook proxy error:", error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

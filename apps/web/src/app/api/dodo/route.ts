/** @module Dodo Payments webhook handler for subscription events */
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

const DODO_API_KEY = process.env.DODO_API_KEY || "";
const webhookSecret = process.env.DODO_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
	try {
		const body = await req.text();
		const signature = req.headers.get("dodo-signature");

		if (!webhookSecret) {
			console.error("DODO_WEBHOOK_SECRET not configured — rejecting webhook");
			return NextResponse.json(
				{ error: "Webhook secret not configured" },
				{ status: 500 },
			);
		}

		if (!DODO_API_KEY) {
			console.error("DODO_API_KEY not configured — rejecting webhook");
			return NextResponse.json(
				{ error: "API key not configured" },
				{ status: 500 },
			);
		}

		if (!signature) {
			return NextResponse.json({ error: "Missing dodo-signature header" }, { status: 400 });
		}

		const hmac = createHmac("sha256", webhookSecret);
		hmac.update(body);
		const expectedSignature = hmac.digest("hex");

		if (signature !== expectedSignature) {
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		const event = JSON.parse(body);
		console.log("Dodo Payments webhook verified:", event.type);

		switch (event.type) {
			case "payment_link.completed":
			case "payment_link.failed":
			case "payment_link.expired":
				break;
		}

		return NextResponse.json({ received: true, verified: true });
	} catch (err: any) {
		return NextResponse.json(
			{
				error: "Webhook Error",
				details: err instanceof Error ? err.message : "Unknown",
			},
			{ status: 400 },
		);
	}
}

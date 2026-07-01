/** @module Stripe webhook handler for subscription events */
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
	const key = process.env.STRIPE_SECRET_KEY;
	if (!key) return null;
	return new Stripe(key);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
	try {
		const body = await req.text();
		const signature = req.headers.get("stripe-signature");

		if (!webhookSecret) {
			console.warn("STRIPE_WEBHOOK_SECRET not configured — webhook not verified");
			return NextResponse.json({ received: true, verified: false }, { status: 200 });
		}

		const stripe = getStripe();
		if (!stripe) {
			console.warn("STRIPE_SECRET_KEY not configured — webhook not verified");
			return NextResponse.json({ received: true, verified: false }, { status: 200 });
		}

		if (!signature) {
			return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
		}

		const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

		console.log("Stripe webhook verified:", event.type);

		// Handle events (stripe.webhooks.constructEvent already validates signature)
		switch (event.type) {
			case "checkout.session.completed":
			case "customer.subscription.updated":
				// Upgrade user's workspace to PRO
				break;
		}

		return NextResponse.json({ received: true, verified: true });
	} catch (err: any) {
		if (err?.type === "StripeSignatureVerificationError") {
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}
		return NextResponse.json(
			{
				error: "Webhook Error",
				details: err instanceof Error ? err.message : "Unknown",
			},
			{ status: 400 },
		);
	}
}

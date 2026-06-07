import { NextResponse } from "next/server";

// Stripe webhook handler for subscription lifecycle events.
// Set STRIPE_WEBHOOK_SECRET in .env.local.
export async function POST(request: Request) {
	const signature = request.headers.get("stripe-signature");
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!signature || !webhookSecret) {
		return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
let event: { type: string; data: { object: any } };

	try {
		const body = await request.text();
		// Stripe requires raw body — verify signature using stripe-node would go here.
		// For now, parse and handle common events.
		event = JSON.parse(body) as typeof event;
	} catch {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	switch (event.type) {
		case "checkout.session.completed": {
			const session = event.data.object;
			const userId = session.metadata?.userId as string | undefined;
			console.log(`Payment completed for user ${userId}: ${session.id as string}`);
			// TODO: Update user subscription in database
			break;
		}
		case "customer.subscription.deleted": {
			const subscription = event.data.object;
			console.log(`Subscription canceled: ${subscription.id as string}`);
			// TODO: Downgrade user to free tier
			break;
		}
		case "invoice.payment_succeeded": {
			const invoice = event.data.object;
			console.log(`Invoice paid: ${invoice.id as string}`);
			break;
		}
		case "invoice.payment_failed": {
			const invoice = event.data.object;
			console.log(`Invoice failed: ${invoice.id as string}`);
			break;
		}
		default:
			console.log(`Unhandled Stripe event: ${event.type}`);
	}

	return NextResponse.json({ received: true });
}

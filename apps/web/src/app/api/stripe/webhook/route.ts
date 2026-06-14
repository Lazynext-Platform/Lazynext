import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { subscriptions, user } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
	apiVersion: "2024-04-10",
});

export async function POST(req: Request) {
	const body = await req.text();
	const reqHeaders = await headers();
	const signature = reqHeaders.get("Stripe-Signature") as string;

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET || "whsec_123",
		);
	} catch (error: any) {
		return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
	}

	const session = event.data.object as Stripe.Checkout.Session;

	if (event.type === "checkout.session.completed") {
		const subscription = await stripe.subscriptions.retrieve(
			session.subscription as string,
		);

		if (!session?.metadata?.userId) {
			return new NextResponse("User id is required", { status: 400 });
		}

		// Insert new subscription
		await db.insert(subscriptions).values({
			id: `sub_${Date.now()}`,
			userId: session.metadata.userId,
			stripeSubscriptionId: subscription.id,
			stripePriceId: subscription.items.data[0].price.id,
			stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
			tier: "pro",
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Update user with stripe customer ID
		await db
			.update(user)
			.set({ stripeCustomerId: subscription.customer as string })
			.where(eq(user.id, session.metadata.userId));
	}

	if (event.type === "invoice.payment_succeeded") {
		const subscription = await stripe.subscriptions.retrieve(
			session.subscription as string,
		);

		await db
			.update(subscriptions)
			.set({
				stripePriceId: subscription.items.data[0].price.id,
				stripeCurrentPeriodEnd: new Date(
					subscription.current_period_end * 1000,
				),
				updatedAt: new Date(),
			})
			.where(eq(subscriptions.stripeSubscriptionId, subscription.id));
	}

	return new NextResponse(null, { status: 200 });
}

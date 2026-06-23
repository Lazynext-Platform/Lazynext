import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { subscriptions, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
	apiVersion: "2026-05-27.dahlia",
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
	} catch (error: unknown) {
		const errMsg = error instanceof Error ? error.message : String(error);
		return new NextResponse(`Webhook Error: ${errMsg}`, { status: 400 });
	}

	const session = event.data.object as Stripe.Checkout.Session;

	if (event.type === "checkout.session.completed") {
		if (!session?.metadata?.userId) {
			return new NextResponse("User id is required", { status: 400 });
		}

		if (session.mode === "subscription") {
			const subscription = await stripe.subscriptions.retrieve(
				session.subscription as string,
			);

			// Insert new subscription
			await db.insert(subscriptions).values({
				id: `sub_${Date.now()}`,
				userId: session.metadata.userId,
				stripeSubscriptionId: subscription.id,
				stripePriceId: subscription.items.data[0].price.id,
				stripeCurrentPeriodEnd: new Date(
					(subscription as unknown as Record<string, number>)
						.current_period_end * 1000,
				),
				tier: "pro",
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Update user with stripe customer ID and grant 1000 monthly credits
			await db
				.update(user)
				.set({
					stripeCustomerId: subscription.customer as string,
					aiCredits: sql`${user.aiCredits} + 1000`,
				})
				.where(eq(user.id, session.metadata.userId));
		} else if (session.mode === "payment") {
			// One-off payment for Credit Pack (e.g. 5000 credits)
			await db
				.update(user)
				.set({ aiCredits: sql`${user.aiCredits} + 5000` })
				.where(eq(user.id, session.metadata.userId));
		}
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
					(subscription as unknown as Record<string, number>)
						.current_period_end * 1000,
				),
				updatedAt: new Date(),
			})
			.where(eq(subscriptions.stripeSubscriptionId, subscription.id));
	}

	return new NextResponse(null, { status: 200 });
}

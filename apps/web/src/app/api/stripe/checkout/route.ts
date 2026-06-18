import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth/server";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_123", {
	apiVersion: "2025-06-15",
});

export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.user) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const { priceId, mode = "subscription" } = await req.json();

		const checkoutSession = await stripe.checkout.sessions.create({
			mode: mode as "subscription" | "payment",
			payment_method_types: ["card"],
			customer_email: session.user.email,
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
			cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
			metadata: {
				userId: session.user.id,
			},
		});

		return NextResponse.json({ url: checkoutSession.url });
	} catch (error) {
		console.error("[STRIPE_CHECKOUT]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}

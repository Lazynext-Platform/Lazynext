import { auth } from "@/auth/server";
import { NextResponse } from "next/server";

// Stripe checkout session creation.
// Requires STRIPE_SECRET_KEY and STRIPE_PRICE_ID in .env.local.
export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { priceId, successUrl, cancelUrl } = (await request.json()) as {
		priceId?: string;
		successUrl?: string;
		cancelUrl?: string;
	};

	const stripeKey = process.env.STRIPE_SECRET_KEY;
	if (!stripeKey) {
		return NextResponse.json(
			{ error: "Stripe not configured. Set STRIPE_SECRET_KEY." },
			{ status: 500 },
		);
	}

	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

	try {
		const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${stripeKey}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				"customer_email": session.user.email ?? "",
				"line_items[0][price]": priceId ?? process.env.STRIPE_PRICE_ID ?? "price_placeholder",
				"line_items[0][quantity]": "1",
				"mode": "subscription",
				"success_url": successUrl ?? `${baseUrl}/billing?success=true`,
				"cancel_url": cancelUrl ?? `${baseUrl}/billing?canceled=true`,
				"metadata[userId]": session.user.id,
			}).toString(),
		});

		const data = (await response.json()) as { url?: string; error?: { message: string } };

		if (!response.ok) {
			return NextResponse.json(
				{ error: data.error?.message ?? "Stripe error" },
				{ status: response.status },
			);
		}

		return NextResponse.json({ url: data.url });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

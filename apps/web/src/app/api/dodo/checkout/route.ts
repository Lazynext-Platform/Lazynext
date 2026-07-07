/**
 * POST /api/dodo/checkout
 *
 * Creates a Dodo Payments payment link for the authenticated user.
 * Requires a valid Better Auth session.
 *
 * @module app/api/dodo/checkout/route
 */
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { dodoCheckoutSchema } from "@/lib/validation";

const DODO_API_KEY = process.env.DODO_API_KEY || "";
const DODO_API_BASE = "https://api.dodopayments.com/api/v1";

/** POST handler — creates a Dodo Payments payment link for the authed user. */
export async function POST(req: Request) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.user) {
			return new NextResponse("Unauthorized", { status: 401 });
		}

		const rawBody = await req.json();
		const parsed = dodoCheckoutSchema.safeParse(rawBody);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid priceId" },
				{ status: 400 },
			);
		}

		const { priceId } = parsed.data;

		// Map price IDs to amounts (in paise/cents)
		const priceMap: Record<string, number> = {
			[process.env.NEXT_PUBLIC_DODO_PRO_PRICE_ID || "pro_monthly"]: 1900,
			[process.env.NEXT_PUBLIC_DODO_STUDIO_PRICE_ID || "studio_monthly"]: 9900,
		};

		const amount = priceMap[priceId] || 1900;

		const response = await fetch(`${DODO_API_BASE}/payment_links`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${DODO_API_KEY}`,
			},
			body: JSON.stringify({
				amount,
				currency: "INR",
				description: "Lazynext Pro",
			}),
		});

		if (!response.ok) {
			throw new Error("Failed to create Dodo payment link");
		}

		const data = await response.json();

		return NextResponse.json({ url: data.payment_link_url || data.url });
	} catch (error) {
		console.error("[DODO_CHECKOUT]", error);
		return new NextResponse("Internal Error", { status: 500 });
	}
}
